import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import BrandWordmark from '../components/BrandWordmark';
import {
  Scale,
  Brain,
  Sliders,
  ShieldCheck,
  ArrowRight,
  Sun,
  Moon,
  ChevronRight,
  Lock,
  Layers,
  Activity,
  UserCheck,
} from 'lucide-react';

export default function LandingPage() {
  const { isDark, toggleTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const [activeStage, setActiveStage] = useState(0);

  const pipelineStages = [
    {
      id: 1,
      title: '1. Intake & Criminal History',
      badge: '41 Static Features',
      description:
        'Captures pre-supervision criminal history, prior arrests, felony indictments, age at first arrest, trauma score, and adverse childhood experiences (ACE).',
      detail: 'Mathematically capped at ~68.5% accuracy when used alone (Intake CatBoost Champion: 68.57% Acc, 0.7355 AUC).',
      icon: Layers,
    },
    {
      id: 2,
      title: '2. Dynamic Supervision Tracking',
      badge: '19 Ongoing Levers',
      description:
        'Continuous ingestion of supervised court attendances, unexcused absence infractions, verified employment days, and urinalysis toxicology screens.',
      detail: 'Breaks the static prediction ceiling to reach 75.02% Accuracy and 0.8197 ROC-AUC with 84.23% Recall.',
      icon: Activity,
    },
    {
      id: 3,
      title: '3. TreeSHAP Local Attribution',
      badge: 'Exact Shapley Values',
      description:
        'Every risk prediction is decomposed into mathematical Shapley attributions: factors mitigating risk decrease score, factors escalating risk increase score.',
      detail: 'Eliminates black-box opacity; provides defense counsel and judges with clear clinical justifications.',
      icon: Brain,
    },
    {
      id: 4,
      title: '4. What-If Counterfactual Studio',
      badge: 'Quantitative Simulation',
      description:
        'Judges simulate counterfactual supervision adjustments (e.g. increasing attendance to 24 sessions + zero drug failures) to quantitatively evaluate expected risk drop (ΔRisk).',
      detail: 'Allows one-click adoption of simulated parameters directly into the court-mandated treatment order.',
      icon: Sliders,
    },
    {
      id: 5,
      title: '5. Human-in-the-Loop Disposition',
      badge: 'Judicial Primacy',
      description:
        'Mandatory judicial review workflow: The presiding judge reviews the recommendation and formally records ACCEPT, MODIFY, REJECT, or DEFER with written legal findings.',
      detail: 'Cryptographically logged to an immutable audit chain. AI serves strictly as decision support, never automated sentencing.',
      icon: UserCheck,
    },
  ];

  const featureStrip = [
    { icon: Layers, label: 'Intake Baseline', sub: '41 Static Factors' },
    { icon: Activity, label: 'Dynamic Monitoring', sub: '19 Supervision Levers' },
    { icon: Brain, label: 'TreeSHAP Attribution', sub: 'Exact Shapley Values' },
    { icon: Sliders, label: 'What-If Simulation', sub: 'ΔRisk Counterfactuals' },
    { icon: Scale, label: 'Judicial Primacy', sub: 'HITL Review Workflow' },
  ];

  return (
    <div className="min-h-screen w-full max-w-full overflow-hidden bg-bg-base text-text-primary selection:bg-accent-raw/20 transition-colors">
      {/* Glass Pill Centered Top Navigation */}
      <nav className="fixed top-3 sm:top-5 inset-x-0 z-50 px-2.5 sm:px-4 flex justify-center pt-safe">
        <div className="w-full max-w-4xl min-h-14 py-1 glass-pill rounded-full border border-border-ui/40 dark:border-border-ui/40 px-3 sm:px-8 flex items-center justify-between shadow-xs min-w-0">
          <Link to="/" className="flex items-center min-h-[44px] hover:opacity-90 transition-opacity shrink-0">
            <BrandWordmark size="sm" />
          </Link>

          <div className="hidden md:flex items-center gap-8 text-xs font-semibold text-text-secondary">
            <a href="#how-it-works" className="min-h-[44px] flex items-center hover:text-text-primary transition-colors">
              How the Audit Works
            </a>
            <a href="#ethics" className="min-h-[44px] flex items-center hover:text-text-primary transition-colors">
              Equity & Ethics
            </a>
            <a href="#benchmarks" className="min-h-[44px] flex items-center hover:text-text-primary transition-colors">
              Model Benchmark
            </a>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="min-h-[44px] px-4 py-2 rounded-full bg-accent-primary hover:bg-accent-hover text-accent-primary-text text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
              >
                Dashboard <ArrowRight size={14} />
              </Link>
            ) : (
              <Link
                to="/login"
                className="min-h-[44px] px-4 sm:px-5 py-2 rounded-full bg-accent-primary hover:bg-accent-hover text-accent-primary-text text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
              >
                <span><span className="hidden sm:inline">Judicial </span>Portal</span> <ArrowRight size={14} />
              </Link>
            )}

            <button
              onClick={toggleTheme}
              aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
              className="w-11 h-11 rounded-full bg-bg-surface hover:bg-bg-raised border border-border-ui/40 text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section: Blurred Blue-to-Pink Gradient with Ribbed-Glass Stripe Texture */}
      <section className="relative min-h-[92vh] flex flex-col justify-center pt-24 sm:pt-32 pb-16 sm:pb-20 px-3.5 sm:px-6 overflow-hidden">
        {/* Background Ambience Layer with strict overflow clipping */}
        <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-1/4 left-1/4 -translate-x-1/3 w-[650px] h-[480px] rounded-full blur-[140px] opacity-45 dark:opacity-35 bg-accent-raw" />
          <div className="absolute top-1/3 right-1/4 translate-x-1/3 w-[580px] h-[440px] rounded-full blur-[150px] opacity-30 dark:opacity-25 bg-highlight-pink" />
          <div className="ribbed-glass-overlay absolute inset-0" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg-base/40 to-bg-base" />
        </div>

        {/* Hero Content Container */}
        <div className="max-w-5xl mx-auto text-center relative z-10 w-full pt-4">
          {/* Minimalist Display Headline */}
          <h1 className="text-xl sm:text-3xl md:text-5xl lg:text-7xl font-display font-light tracking-tight text-text-primary leading-[1.15] text-balance">
            Transparent, Equitable Decision Support for Drug Courts
          </h1>

          <p className="mt-4 sm:mt-6 text-xs sm:text-base md:text-lg text-text-secondary max-w-3xl mx-auto font-normal leading-relaxed text-balance">
            A state-of-the-art computational justice platform combining CatBoost dynamic risk tracking,
            TreeSHAP local feature explanations, and quantitative counterfactual simulation to assist judges in tailoring rehabilitation orders.
          </p>

          {/* Action CTAs: Crisp White Pill CTA + Text-Link Secondary */}
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-5">
            <Link
              to="/login"
              className="rounded-full bg-accent-primary text-accent-primary-text font-bold text-sm px-8 py-3.5 min-h-[48px] border border-border-ui/40 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all inline-flex items-center gap-2.5 cursor-pointer"
            >
              <span>Launch Judicial Studio</span>
              <ArrowRight size={16} />
            </Link>

            <a
              href="#how-it-works"
              className="text-sm font-semibold min-h-[44px] text-accent-text hover:underline underline-offset-4 inline-flex items-center gap-1.5 transition-colors"
            >
              <span>Explore 5-Stage Audit Pipeline</span>
              <ChevronRight size={15} />
            </a>
          </div>

          {/* Translucent Glass Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 mt-10 sm:mt-14 max-w-4xl mx-auto text-left">
            <div className="glass-card rounded-2xl p-5 border border-border-ui/40 dark:border-border-ui/40 shadow-xs">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-muted">
                Champion Accuracy
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-text-primary mt-1 font-display tabular-nums">
                75.02%
              </p>
              <p className="text-[11px] text-text-secondary mt-1">
                CatBoost Dynamic (60 Feat.)
              </p>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-border-ui/40 dark:border-border-ui/40 shadow-xs">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-muted">
                Holdout ROC-AUC
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-accent-text mt-1 font-display tabular-nums">
                0.8197
              </p>
              <p className="text-[11px] text-text-secondary mt-1">
                84.23% Holdout Recall
              </p>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-border-ui/40 dark:border-border-ui/40 shadow-xs">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-muted">
                Statutory Equity
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-text-primary mt-1 font-display tabular-nums">
                0 Protected
              </p>
              <p className="text-[11px] text-text-secondary mt-1">
                EEOC Four-Fifths Compliant
              </p>
            </div>

            <div className="glass-card rounded-2xl p-5 border border-border-ui/40 dark:border-border-ui/40 shadow-xs">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-muted">
                Explainability
              </span>
              <p className="text-2xl sm:text-3xl font-extrabold text-text-primary mt-1 font-display tabular-nums">
                TreeSHAP
              </p>
              <p className="text-[11px] text-text-secondary mt-1">
                Exact Shapley Attributions
              </p>
            </div>
          </div>

          {/* Five-Column Icon Feature Strip Above a Thin Divider */}
          <div className="mt-16 pt-8 border-t border-border-ui/30 dark:border-border-ui/40">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 text-left">
              {featureStrip.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent-primary/10 border border-accent-primary/20 text-accent-text flex items-center justify-center shrink-0 mt-0.5">
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-text-primary">{item.label}</p>
                      <p className="text-[11px] text-text-muted mt-0.5">{item.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Thin Divider under Feature Strip */}
          <div className="border-t border-border-ui/30 dark:border-border-ui/40 my-10" />
        </div>
      </section>

      {/* Section 2: "How the Audit Works" 5-Stage Interactive Pipeline */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wider bg-accent-primary/10 text-accent-text border border-accent-primary/25">
            END-TO-END SUPERVISION PIPELINE
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary mt-3 tracking-tight font-display">
            How the Algorithmic Decision Audit Operates
          </h2>
          <p className="text-sm text-text-secondary mt-2">
            A 5-stage longitudinal decision system replacing static black-box scoring with dynamic explainability and judicial review.
          </p>
        </div>

        {/* 5-Stage Selector Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {pipelineStages.map((stg, idx) => (
            <button
              key={stg.id}
              onClick={() => setActiveStage(idx)}
              className={`min-h-[44px] px-4 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                activeStage === idx
                  ? 'bg-accent-primary text-accent-primary-text border-accent-primary shadow-xs'
                  : 'bg-bg-surface border-border-ui text-text-secondary hover:text-text-primary hover:border-accent-text'
              }`}
            >
              {stg.title.split('.')[1]}
            </button>
          ))}
        </div>

        {/* Active Stage Detailed Card */}
        {(() => {
          const cur = pipelineStages[activeStage];
          const CurIcon = cur.icon;
          return (
            <div className="bg-bg-surface border border-border-ui rounded-3xl p-8 sm:p-10 shadow-xs transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border-ui/40">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-accent-primary/10 border border-accent-primary/25 text-accent-text flex items-center justify-center shrink-0">
                    <CurIcon size={24} />
                  </div>
                  <div>
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-accent-text">
                      Pipeline Stage 0{cur.id} of 05
                    </span>
                    <h3 className="text-2xl font-bold text-text-primary mt-0.5 font-display">
                      {cur.title}
                    </h3>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-bg-base border border-border-ui text-text-secondary self-start sm:self-center">
                  {cur.badge}
                </span>
              </div>

              <div className="mt-6 grid sm:grid-cols-2 gap-6 text-sm">
                <div>
                  <h4 className="font-bold text-text-primary text-xs uppercase tracking-wider mb-2">
                    Operational Scope
                  </h4>
                  <p className="text-text-secondary leading-relaxed">{cur.description}</p>
                </div>
                <div>
                  <h4 className="font-bold text-text-primary text-xs uppercase tracking-wider mb-2">
                    Empirical Justification
                  </h4>
                  <p className="text-text-muted leading-relaxed font-mono text-xs">{cur.detail}</p>
                </div>
              </div>
            </div>
          );
        })()}
      </section>

      {/* Section 3: Statutory Equity & Ethics */}
      <section id="ethics" className="py-20 px-4 sm:px-6 bg-bg-surface border-y border-border-ui/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wider bg-risk-low/10 text-risk-low border border-risk-low/25">
              STATUTORY COMPLIANCE & GOVERNANCE
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary mt-3 tracking-tight font-display">
              Audited for Equal Opportunity & Fairness
            </h2>
            <p className="text-sm text-text-secondary mt-2">
              Our architecture maintains strict legal and constitutional boundaries to eliminate proxy bias.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-7 rounded-3xl glass-card border border-border-ui/40 dark:border-border-ui/40 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-accent-primary/10 border border-accent-primary/25 text-accent-text flex items-center justify-center">
                <Lock size={20} />
              </div>
              <h3 className="text-lg font-bold text-text-primary font-display">
                Zero Protected-Attribute Ingestion
              </h3>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                Race, gender, ethnicity, marital status, and religion are strictly excluded from the feature space during model training and inference. The CatBoost classifier predicts recidivism risk exclusively from verifiable criminal history and dynamic clinical compliance levers.
              </p>
            </div>

            <div className="p-7 rounded-3xl glass-card border border-border-ui/40 dark:border-border-ui/40 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-risk-low/10 border border-risk-low/25 text-risk-low flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
              <h3 className="text-lg font-bold text-text-primary font-display">
                EEOC Four-Fifths Rule Compliance
              </h3>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                Post-hoc disparate impact auditing confirms that favorable supervision determinations for protected demographic subgroups fall cleanly within the statutory 0.80 &le; DIR &le; 1.25 band, ensuring parity across racial and age classifications.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Model Performance Benchmarks */}
      <section id="benchmarks" className="py-20 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wider bg-accent-primary/10 text-accent-text border border-accent-primary/25">
            EMPIRICAL RIGOR
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-text-primary mt-3 tracking-tight font-display">
            Benchmark Against Base Paper Baseline
          </h2>
          <p className="text-sm text-text-secondary mt-2">
            Tested on 25,835 official NIJ challenge records against the static Random Forest baseline from Zolbanin et al. (Decision Support Systems, 2026).
          </p>
        </div>

        <div className="bg-bg-surface border border-border-ui rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-bg-base text-text-muted font-bold uppercase tracking-wider border-b border-border-ui">
                <tr>
                  <th className="px-6 py-4">Architecture</th>
                  <th className="px-4 py-4">Feature Set</th>
                  <th className="px-4 py-4">Holdout Accuracy</th>
                  <th className="px-4 py-4">ROC-AUC</th>
                  <th className="px-4 py-4">Recall</th>
                  <th className="px-6 py-4 text-right">Advantage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-ui/40 font-mono">
                <tr className="bg-accent-primary/5 font-semibold">
                  <td className="px-6 py-4 font-bold text-text-primary font-sans">
                    CatBoost Dynamic (Champion)
                  </td>
                  <td className="px-4 py-4 text-text-secondary">60 Features (Intake + Dynamic)</td>
                  <td className="px-4 py-4 text-text-primary font-bold">75.02%</td>
                  <td className="px-4 py-4 text-accent-text font-bold">0.8197</td>
                  <td className="px-4 py-4 text-text-primary font-bold">84.23%</td>
                  <td className="px-6 py-4 text-right font-bold text-risk-low font-sans">
                    Champion (+6.45%)
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-bold text-text-primary font-sans">
                    CatBoost Intake (Static)
                  </td>
                  <td className="px-4 py-4 text-text-secondary">41 Static Features</td>
                  <td className="px-4 py-4 text-text-primary">68.57%</td>
                  <td className="px-4 py-4 text-text-secondary">0.7355</td>
                  <td className="px-4 py-4 text-text-secondary">80.28%</td>
                  <td className="px-6 py-4 text-right text-text-muted font-sans">Static Baseline</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 font-bold text-text-primary font-sans">
                    Random Forest (Zolbanin 2026)
                  </td>
                  <td className="px-4 py-4 text-text-secondary">41 Static Features</td>
                  <td className="px-4 py-4 text-text-muted">68.30%</td>
                  <td className="px-4 py-4 text-text-muted">0.7310</td>
                  <td className="px-4 py-4 text-text-muted">79.80%</td>
                  <td className="px-6 py-4 text-right text-text-muted font-sans">Base Paper</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border-ui/40 bg-bg-surface text-center text-xs text-text-muted space-y-2">
        <p className="font-semibold text-text-primary">
          Drug Court Decision Support System (DSS)
        </p>
        <p className="text-[11px]">
          The Drug Court Decision Support System (DSS) is a human-in-the-loop decision platform and does not replace official judicial discretion.
        </p>
      </footer>
    </div>
  );
}
