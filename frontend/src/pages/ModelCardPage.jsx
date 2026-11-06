import { BookOpen, Shield, Scale, Brain } from 'lucide-react';

export default function ModelCardPage() {
  const sections = [
    {
      title: 'Model Overview & Architecture',
      icon: Brain,
      items: [
        ['Model Name', 'Drug Court Longitudinal Recidivism DSS (Supervision Ensemble Champion v1)'],
        ['Architectures', 'Gradient Boosted Decision Trees (CatBoost Intake + XGBoost Dynamic Ensemble)'],
        ['Developers', 'KITS Warangal (Batch 8) — Lakavath Ranjani, Veludandi Abhiram, Masadi Hansika Rao, Siribadri Veda Vyshnavi'],
        ['Supervisor', 'Sri. H. Bunny Charles, Assistant Professor, Dept. of CSE'],
        ['Academic Foundation', 'Zolbanin et al., Decision Support Systems, Elsevier (2026)'],
      ],
    },
    {
      title: 'Intended Use & Clinical Scope',
      icon: Scale,
      items: [
        ['Primary Application', 'Decision support for drug court judges, probation officers, and diversion caseworkers.'],
        ['Intended Users', 'Licensed court clinicians, presiding judges, and diversion case managers.'],
        ['Decision Workflow', 'Advisory input only. Human-in-the-Loop (HITL) judicial review is mandatory.'],
        ['Simulation Scope', 'Interactive counterfactual simulation of attendance, employment, and urinalysis compliance.'],
      ],
    },
    {
      title: 'Dataset & Training Specifications',
      icon: BookOpen,
      items: [
        ['Training Corpus', 'National Institute of Justice (NIJ) Recidivism Challenge dataset (25,835 records).'],
        ['Official Split', '70% Training Partition (18,028 rows) / 30% Holdout Test Partition (7,807 rows).'],
        ['Intake Feature Space', '41 static features: past arrest counts, felony indictments, age at first arrest, trauma/ACE scores.'],
        ['Dynamic Feature Space', '60 features: static features + ongoing drug screens, session attendance, employment verification.'],
      ],
    },
    {
      title: 'Ethical Guardrails & Prohibited Uses',
      icon: Shield,
      items: [
        ['Zero Protected Ingestion', 'Race, ethnicity, and gender are strictly excluded from feature training matrices.'],
        ['Prohibited Use 1', 'Fully automated sentencing, bail revocation, or incarceration without judicial oversight.'],
        ['Prohibited Use 2', 'Sole basis for court sanctions or termination without corroborating toxicology reports.'],
        ['Four-Fifths Compliance', 'Post-hoc disparate impact ratios maintained between 0.80 and 1.25 across all subgroups.'],
      ],
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-accent-text/10 text-accent-text border border-accent-text/20 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-text animate-pulse" />
          AI GOVERNANCE & TRANSPARENCY
        </span>
        <h1 className="text-3xl font-black text-text-primary mt-1 tracking-tight font-display">
          Academic Model Card & Regulatory Dossier
        </h1>
        <p className="text-xs text-text-muted mt-1">
          Detailed documentation of model specifications, validation methodology, and ethical constraints (Mitchell et al., 2019).
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {sections.map(({ title, icon: Icon, items }) => (
          <div
            key={title}
            className="glass-card border border-border-ui/40 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col justify-between hover:border-accent-text/40 transition-all"
          >
            <div>
              <div className="flex items-center gap-3 pb-4 border-b border-border-ui/30 dark:border-white/10">
                <div className="w-9 h-9 rounded-xl bg-accent-text/10 text-accent-text border border-accent-text/20 flex items-center justify-center shrink-0">
                  <Icon size={18} />
                </div>
                <h2 className="font-bold text-text-primary text-sm font-display">{title}</h2>
              </div>

              <div className="mt-4 space-y-3.5">
                {items.map(([label, value]) => (
                  <div key={label} className="text-xs">
                    <span className="text-accent-text font-bold font-mono text-[11px] block">{label}</span>
                    <span className="text-text-secondary font-medium leading-relaxed mt-0.5 block">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
