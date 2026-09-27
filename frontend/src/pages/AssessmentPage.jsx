import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { assessmentsAPI, participantsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Play, CheckCircle2, Brain, Sparkles } from 'lucide-react';

export default function AssessmentPage() {
  const { assessmentId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [participants, setParticipants] = useState([]);
  const [participantId, setParticipantId] = useState(params.get('participant') || '');
  const [assessment, setAssessment] = useState(null);
  const [shap, setShap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState({ decision: '', notes: '' });

  const loadAssessment = useCallback(async (id) => {
    try {
      const r = await assessmentsAPI.get(id);
      setAssessment(r.data);
      if (r.data.top_features) {
        const s = await assessmentsAPI.getSHAP(id).catch(() => null);
        if (s) setShap(s.data);
      }
    } catch {
      toast.error('Unable to load assessment');
    }
  }, []);

  useEffect(() => {
    participantsAPI
      .list({ page: 1, size: 100 })
      .then((r) => setParticipants(r.data.items || []))
      .catch(() => {});

    if (assessmentId) {
      loadAssessment(assessmentId);
    }
  }, [assessmentId, loadAssessment]);

  const create = async () => {
    if (!participantId) return toast.error('Select a participant');
    setLoading(true);
    try {
      const r = await assessmentsAPI.create({ participant_id: Number(participantId) });
      setAssessment(r.data);
      toast.success(`Assessment #${r.data.id} created`);
      navigate(`/assessments/${r.data.id}`, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not create assessment');
    } finally {
      setLoading(false);
    }
  };

  const predict = async () => {
    if (!assessment) return;
    setLoading(true);
    try {
      const r = await assessmentsAPI.predict(assessment.id);
      setAssessment(r.data);
      const s = await assessmentsAPI.getSHAP(assessment.id).catch(() => null);
      if (s) setShap(s.data);
      toast.success('Assessment prediction generated');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Prediction failed');
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async () => {
    if (!review.decision) return toast.error('Choose a review decision');
    try {
      const r = await assessmentsAPI.submitReview(assessment.id, review);
      setAssessment(r.data);
      toast.success('Review saved');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not save review');
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="mb-5 text-sm text-slate-500 inline-flex items-center gap-2 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {!assessment && (
        <div className="bg-white border rounded-2xl p-6 shadow-sm max-w-2xl">
          <h1 className="text-2xl font-bold text-slate-900">Start New Assessment</h1>
          <p className="text-slate-500 mt-1">
            Select a participant. The backend will generate the assessment baseline.
          </p>
          <select
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            className="w-full mt-5 border rounded-lg px-3 py-3 focus:ring-2 focus:ring-teal-500 outline-none"
          >
            <option value="">Select participant...</option>
            {participants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.first_name} {p.last_name} — {p.participant_id}
              </option>
            ))}
          </select>
          <button
            disabled={loading}
            onClick={create}
            className="mt-4 px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Assessment'}
          </button>
        </div>
      )}

      {assessment && (
        <>
          <div className="flex flex-col md:flex-row md:justify-between gap-4">
            <div>
              <p className="text-xs text-teal-700 font-bold uppercase tracking-wider">
                Assessment #{assessment.id}
              </p>
              <h1 className="text-3xl font-bold mt-1 text-slate-900">Assessment Result</h1>
              <p className="text-slate-500 mt-1">
                {new Date(assessment.assessment_date).toLocaleString()}
              </p>
            </div>
            <button
              onClick={predict}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold inline-flex gap-2 items-center self-start shadow-sm transition-colors disabled:opacity-50"
            >
              <Play size={17} />
              {loading ? 'Running...' : 'Run / Re-run Prediction'}
            </button>
          </div>

          <div className="grid lg:grid-cols-3 gap-5 mt-6">
            <div className="lg:col-span-1 bg-white border rounded-2xl p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Model-estimated risk</p>
              <p className="text-4xl font-black mt-2 text-slate-900">
                {assessment.risk_level || 'Pending'}
              </p>
              <p className="mt-3 text-slate-600">
                {assessment.recidivism_probability == null
                  ? 'Prediction not run yet'
                  : `${(assessment.recidivism_probability * 100).toFixed(1)}% estimated probability`}
              </p>
              <div className="mt-5 h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-teal-600 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (assessment.recidivism_probability || 0) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-3">
                Model: {assessment.model_version || 'Not available'}
              </p>
            </div>

            <div className="lg:col-span-2 bg-white border rounded-2xl p-6 shadow-sm">
              <div className="flex gap-2 items-center">
                <Brain className="text-teal-700" />
                <h2 className="font-bold text-slate-900">Explainability / SHAP</h2>
              </div>
              {shap?.top_features?.length ? (
                <div className="mt-5 space-y-3">
                  {shap.top_features.map((f, i) => (
                    <div key={i} className="flex justify-between gap-4 p-3 bg-slate-50 rounded-lg">
                      <span className="font-medium text-slate-700">
                        {typeof f === 'string' ? f : f.feature || f.name}
                      </span>
                      <span className="text-sm font-semibold text-slate-500">
                        {typeof f === 'object' && f.shap_value != null
                          ? Number(f.shap_value).toFixed(3)
                          : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 p-5 bg-slate-50 rounded-xl text-sm text-slate-500">
                  Run the prediction to generate local SHAP explanations. If the model explanation
                  service is unavailable, the assessment result will still be shown.
                </div>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-5 mt-5">
            <section className="bg-white border rounded-2xl p-6 shadow-sm">
              <div className="flex gap-2 items-center">
                <Sparkles className="text-teal-700" />
                <h2 className="font-bold text-slate-900">Intervention Recommendations</h2>
              </div>
              {assessment.intervention_recommendations?.length ? (
                <div className="mt-4 space-y-3">
                  {assessment.intervention_recommendations.map((r) => (
                    <div key={r.id} className="border rounded-xl p-4">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-slate-800">{r.title}</h3>
                        <span className="text-xs px-2 py-1 rounded bg-teal-50 text-teal-700 font-semibold">
                          Priority {r.priority}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-2">{r.why_relevant}</p>
                      <p className="text-sm text-slate-700 mt-2">{r.suggested_action}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 mt-4">
                  No recommendations yet. Run the prediction.
                </p>
              )}
            </section>

            <section className="bg-white border rounded-2xl p-6 shadow-sm">
              <div className="flex gap-2 items-center">
                <CheckCircle2 className="text-teal-700" />
                <h2 className="font-bold text-slate-900">Professional Review (HITL)</h2>
              </div>
              <select
                value={review.decision}
                onChange={(e) => setReview({ ...review, decision: e.target.value })}
                className="w-full mt-4 border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-teal-500 outline-none"
              >
                <option value="">Select decision...</option>
                <option value="ACCEPT">ACCEPT</option>
                <option value="MODIFY">MODIFY</option>
                <option value="REJECT">REJECT</option>
                <option value="DEFER">DEFER</option>
              </select>
              <textarea
                value={review.notes}
                onChange={(e) => setReview({ ...review, notes: e.target.value })}
                placeholder="Reviewer notes and justifications"
                rows="4"
                className="w-full mt-3 border rounded-lg p-3 focus:ring-2 focus:ring-teal-500 outline-none"
              />
              <button
                onClick={submitReview}
                className="mt-3 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold transition-colors"
              >
                Save Review
              </button>
              {assessment.reviewer_decision && (
                <p className="text-sm text-emerald-700 font-medium mt-3">
                  Saved Decision: {assessment.reviewer_decision}
                </p>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
