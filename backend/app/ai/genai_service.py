"""
GenAI Narrative & Intervention Recommendation Service
=====================================================
Implements Section 4 (Implementation) and Section 3.2.2 of the base research paper:
- Combines: (1) Feature Definitions, (2) Actual Participant Values, (3) Local SHAP Scores
- Translates ML attributions into plain-language, actionable clinical recommendations
- Dual-engine: Calls OpenAI / Gemini API when configured, with an offline clinical
  heuristic rule engine fallback (zero-dependency, never fails).
"""

import os
import json
import logging
from typing import List, Dict, Any, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)

FEATURE_DICT_PATH = Path(__file__).resolve().parent.parent.parent.parent / "data" / "feature_dictionary.json"


def load_feature_dictionary() -> Dict[str, Any]:
    """Load the feature glossary used for LLM prompt context."""
    if FEATURE_DICT_PATH.exists():
        try:
            with open(FEATURE_DICT_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Could not load feature dictionary: {e}")
    return {}


# Pre-computed clinical domain intervention templates for fallback
CLINICAL_KNOWLEDGE_BASE = {
    "substance_use": {
        "title": "Substance Use Disorder (SUD) Clinical Treatment",
        "why_relevant": "Toxicology and substance history indicate elevated risk of chemical relapse.",
        "suggested_action": "Refer to licensed clinical provider for intensive outpatient counseling (IOP) with randomized 2x weekly urinalysis."
    },
    "employment": {
        "title": "Vocational Rehabilitation & Employment Support",
        "why_relevant": "Unemployment or unstable work history correlates with lack of structured routine and financial stress.",
        "suggested_action": "Enroll in court-partnered workforce development, vocational job readiness training, and schedule reviews."
    },
    "sanctions": {
        "title": "Behavioral Accountability & Compliance Supervision",
        "why_relevant": "Past program non-compliance or sanctions indicate need for structured accountability.",
        "suggested_action": "Implement tiered positive incentive schedules alongside increased case management check-ins to reinforce compliance."
    },
    "trauma_ace": {
        "title": "Trauma-Informed Mental Health Intervention",
        "why_relevant": "Elevated adverse childhood experiences (ACE) or trauma scores indicate unaddressed psychological triggers.",
        "suggested_action": "Coordinate with licensed mental health professional for Cognitive Behavioral Therapy (CBT) and trauma-focused counseling."
    },
    "criminal_history": {
        "title": "Prosocial Peer Engagement & Mentorship",
        "why_relevant": "Early system involvement and felony record require prosocial restructuring.",
        "suggested_action": "Assign a peer recovery support specialist and require weekly attendance at approved community recovery support groups."
    },
    "education": {
        "title": "Educational Advancement & Cognitive Skills",
        "why_relevant": "Educational deficits limit legitimate career pathways.",
        "suggested_action": "Refer to local adult education center for GED preparation and cognitive behavioral life skills curriculum."
    }
}


def rule_based_fallback(
    features: Dict[str, Any],
    top_shap_features: List[Dict[str, Any]],
    risk_info: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Intelligent clinical heuristic engine.
    Derives personalized interventions directly from top SHAP features and values.
    """
    recommendations = []
    seen_categories = set()

    # Analyze top SHAP features driving risk upward
    for feat_item in top_shap_features:
        feat_name = (feat_item.get("feature") or feat_item.get("name") or "").lower()
        shap_val = feat_item.get("shap_value", 0.0)

        # Prioritize features pushing risk higher (positive SHAP)
        if "drug" in feat_name or "substance" in feat_name or "thc" in feat_name or "meth" in feat_name or "cocaine" in feat_name:
            if "substance_use" not in seen_categories:
                recommendations.append(CLINICAL_KNOWLEDGE_BASE["substance_use"])
                seen_categories.add("substance_use")
        elif "employ" in feat_name or "job" in feat_name or "income" in feat_name:
            if "employment" not in seen_categories:
                recommendations.append(CLINICAL_KNOWLEDGE_BASE["employment"])
                seen_categories.add("employment")
        elif "sanction" in feat_name or "violation" in feat_name or "absence" in feat_name or "report" in feat_name:
            if "sanctions" not in seen_categories:
                recommendations.append(CLINICAL_KNOWLEDGE_BASE["sanctions"])
                seen_categories.add("sanctions")
        elif "trauma" in feat_name or "ace" in feat_name or "mental" in feat_name:
            if "trauma_ace" not in seen_categories:
                recommendations.append(CLINICAL_KNOWLEDGE_BASE["trauma_ace"])
                seen_categories.add("trauma_ace")
        elif "arrest" in feat_name or "felony" in feat_name or "conviction" in feat_name:
            if "criminal_history" not in seen_categories:
                recommendations.append(CLINICAL_KNOWLEDGE_BASE["criminal_history"])
                seen_categories.add("criminal_history")

        if len(recommendations) >= 3:
            break

    # If fewer than 3 were identified, fill with high-relevance defaults based on feature values
    if len(recommendations) < 3:
        if features.get("employment_status") in ["Unemployed", "Part-time"] and "employment" not in seen_categories:
            recommendations.append(CLINICAL_KNOWLEDGE_BASE["employment"])
            seen_categories.add("employment")

    if len(recommendations) < 3 and "substance_use" not in seen_categories:
        recommendations.append(CLINICAL_KNOWLEDGE_BASE["substance_use"])
        seen_categories.add("substance_use")

    if len(recommendations) < 3 and "sanctions" not in seen_categories:
        recommendations.append(CLINICAL_KNOWLEDGE_BASE["sanctions"])

    # Ensure format and priorities
    formatted = []
    for idx, rec in enumerate(recommendations[:3]):
        formatted.append({
            "title": rec["title"],
            "why_relevant": rec["why_relevant"],
            "suggested_action": rec["suggested_action"],
            "priority": idx + 1
        })

    return formatted


def generate_recommendations(
    features: Dict[str, Any],
    top_shap_features: List[Dict[str, Any]],
    risk_result: Dict[str, Any],
    openai_api_key: str = None,
    groq_api_key: str = None,
    groq_model: str = "openai/gpt-oss-120b",
    openai_model: str = "gpt-4o-mini",
) -> Tuple[List[Dict[str, Any]], str]:
    """
    Main entry point: Generates narrative interventions.
    Uses Groq when configured, OpenAI otherwise, and clinical rules on failure.
    """
    groq_key = groq_api_key or os.getenv("GROQ_API_KEY")
    openai_key = openai_api_key or os.getenv("OPENAI_API_KEY")
    api_key = groq_key or openai_key

    if not api_key:
        logger.info("No LLM API key configured. Utilizing clinical rule-based engine.")
        return rule_based_fallback(features, top_shap_features, risk_result), "rule_based"

    # Try LLM Call
    try:
        import openai
        provider = "groq" if groq_key else "openai"
        client = openai.OpenAI(
            api_key=api_key,
            base_url="https://api.groq.com/openai/v1" if groq_key else None,
            timeout=20.0,
        )

        # Build prompt matching the base research paper excerpt (Page 7)
        feature_dict = load_feature_dictionary()
        if isinstance(feature_dict, list):
            dict_summary = "\n".join(
                f"- {item.get('feature_name', '')}: {item.get('description', '')}"
                for item in feature_dict[:20] if isinstance(item, dict)
            )
        else:
            dict_summary = "\n".join(
                f"- {name}: {detail.get('description', '')}"
                for name, detail in list(feature_dict.items())[:20]
            )

        prompt = f"""
You are an expert clinical psychologist and case manager advising a Drug Treatment Court judge.
Here is the feature glossary for drug court participants:
{dict_summary}

Participant Feature Values:
{json.dumps(features, indent=2)}

Top SHAP Explainability Drivers (features with highest impact on predicted recidivism risk):
{json.dumps(top_shap_features, indent=2)}

Model Risk Assessment:
- Estimated Recidivism Risk: {risk_result.get('probability', 0.5) * 100:.1f}%
- Risk Classification: {risk_result.get('risk_level', 'MEDIUM')}

Task:
Propose exactly 3 personalized, concrete, evidence-based interventions to reduce recidivism risk.
Return ONLY valid JSON in this exact structure:
{{"interventions": [
  {{
    "title": "Short Intervention Title",
    "why_relevant": "1-2 sentences explaining why this fits based on their specific SHAP drivers and history",
    "suggested_action": "Specific concrete steps for the court/caseworker",
    "priority": 1
  }},
  ...
]}}
"""
        response = client.chat.completions.create(
            model=groq_model if groq_key else openai_model,
            messages=[
                {"role": "system", "content": "Return a valid JSON object only."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        parsed = json.loads(response.choices[0].message.content or "{}")
        recs = parsed.get("interventions", parsed.get("recommendations", []))
        if isinstance(recs, list) and len(recs) == 3 and all(
            isinstance(rec, dict) and all(rec.get(key) for key in (
                "title", "why_relevant", "suggested_action"
            )) for rec in recs
        ):
            return recs, provider

    except Exception as e:
        logger.warning(f"LLM API call failed or timed out: {e}. Falling back to clinical rules.")

    return rule_based_fallback(features, top_shap_features, risk_result), "rule_based_fallback"

