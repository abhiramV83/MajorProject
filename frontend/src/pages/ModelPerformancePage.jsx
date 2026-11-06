import { useEffect, useState } from 'react';
import { Trophy, ShieldCheck, Sparkles } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { modelAPI } from '../services/api';
import { MOCK_MODEL_BENCHMARKS } from '../services/mockData';

export default function ModelPerformancePage() {
  const [benchmarks, setBenchmarks] = useState(MOCK_MODEL_BENCHMARKS);

  useEffect(() => {
    modelAPI
      .getPerformance()
      .then((res) => {
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setBenchmarks(res.data);
        }
      })
      .catch(() => {
        setBenchmarks(MOCK_MODEL_BENCHMARKS);
      });
  }, []);

  const chartData = benchmarks.map((b) => ({
    name: b.model_name.replace(' (Champion)', '').replace(' (Zolbanin Baseline)', ''),
    accuracy: b.accuracy,
    roc_auc: Math.round(b.roc_auc * 1000) / 10,
    recall: b.recall,
  }));

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div>
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-accent-text/10 text-accent-text border border-accent-text/20 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-text animate-pulse" />
          MACHINE LEARNING BENCHMARKS & AUDITING
        </span>
        <h1 className="text-3xl font-black text-text-primary mt-1 tracking-tight font-display">
          Model Evaluation & Optimization Laboratory
        </h1>
        <p className="text-xs text-text-muted mt-1">
          Comparative empirical evaluation across 9 machine learning architectures on the official NIJ Recidivism Challenge dataset (25,835 records).
        </p>
      </div>

      {/* Champion Model Callout */}
      <div className="grid md:grid-cols-2 gap-5">
        <div className="glass-card rounded-3xl p-6 sm:p-7 text-text-primary shadow-xs border border-accent-text/40 relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-border-ui/30 dark:border-white/10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-accent-primary text-accent-primary-text shadow-xs">
              <Trophy size={14} /> DYNAMIC CHAMPION MODEL
            </span>
            <span className="text-xs font-mono text-accent-text font-bold">Seed: 42 · 60 Features</span>
          </div>

          <h2 className="text-xl font-bold mt-4 font-display text-text-primary">Supervision Ensemble Champion</h2>
          <p className="text-xs text-text-muted mt-1 leading-relaxed">
            Incorporates intake criminal history + 19 dynamic supervision features (attendance compliance, drug screens, employment).
          </p>

          <div className="grid grid-cols-4 gap-2 mt-5 text-center font-mono">
            <div className="bg-bg-base/40 dark:bg-white/[0.03] rounded-2xl p-2.5 border border-border-ui/30 dark:border-white/10">
              <span className="text-[10px] text-text-muted block font-bold">Accuracy</span>
              <span className="text-lg font-black text-accent-text">75.02%</span>
            </div>
            <div className="bg-bg-base/40 dark:bg-white/[0.03] rounded-2xl p-2.5 border border-border-ui/30 dark:border-white/10">
              <span className="text-[10px] text-text-muted block font-bold">ROC-AUC</span>
              <span className="text-lg font-black text-accent-text">0.8197</span>
            </div>
            <div className="bg-bg-base/40 dark:bg-white/[0.03] rounded-2xl p-2.5 border border-border-ui/30 dark:border-white/10">
              <span className="text-[10px] text-text-muted block font-bold">Recall</span>
              <span className="text-lg font-black text-accent-text">84.23%</span>
            </div>
            <div className="bg-bg-base/40 dark:bg-white/[0.03] rounded-2xl p-2.5 border border-border-ui/30 dark:border-white/10">
              <span className="text-[10px] text-text-muted block font-bold">F1-Score</span>
              <span className="text-lg font-black text-accent-text">79.48%</span>
            </div>
          </div>
        </div>

        <div className="glass-card border border-border-ui/40 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border-ui/30 dark:border-white/10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-bg-raised/60 dark:bg-white/5 border border-border-ui/40 dark:border-white/10 text-text-secondary font-mono">
                <ShieldCheck size={14} className="text-accent-text" /> INTAKE CHAMPION MODEL
              </span>
              <span className="text-xs font-mono text-text-muted font-bold">41 Static Features</span>
            </div>

            <h2 className="text-xl font-bold text-text-primary mt-4 font-display">Baseline Intake Classifier</h2>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Static pre-supervision baseline. Replaces the base paper&apos;s Random Forest with native categorical gradient boosting.
            </p>

            <div className="grid grid-cols-4 gap-2 mt-5 text-center font-mono">
              <div className="bg-bg-base/40 dark:bg-white/[0.03] rounded-2xl p-2.5 border border-border-ui/30 dark:border-white/10">
                <span className="text-[10px] text-text-muted block font-bold">Accuracy</span>
                <span className="text-lg font-black text-text-primary">68.57%</span>
              </div>
              <div className="bg-bg-base/40 dark:bg-white/[0.03] rounded-2xl p-2.5 border border-border-ui/30 dark:border-white/10">
                <span className="text-[10px] text-text-muted block font-bold">ROC-AUC</span>
                <span className="text-lg font-black text-text-primary">0.7355</span>
              </div>
              <div className="bg-bg-base/40 dark:bg-white/[0.03] rounded-2xl p-2.5 border border-border-ui/30 dark:border-white/10">
                <span className="text-[10px] text-text-muted block font-bold">Recall</span>
                <span className="text-lg font-black text-text-primary">80.28%</span>
              </div>
              <div className="bg-bg-base/40 dark:bg-white/[0.03] rounded-2xl p-2.5 border border-border-ui/30 dark:border-white/10">
                <span className="text-[10px] text-text-muted block font-bold">Threshold</span>
                <span className="text-lg font-black text-text-primary">0.515</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comparative Bar Chart */}
      <div className="glass-card border border-border-ui/40 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-border-ui/30 dark:border-white/10">
          <div>
            <h3 className="font-bold text-text-primary text-sm font-display">Holdout Accuracy & ROC-AUC Comparison (%)</h3>
            <p className="text-xs text-text-muted">Evaluated on official holdout test partition (7,807 rows)</p>
          </div>
          <span className="text-xs font-mono text-accent-text bg-bg-raised border border-border-ui/40 dark:border-white/10 px-3 py-1 rounded-full font-bold">
            NIJ Dataset Split
          </span>
        </div>

        <div className="h-72 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 25 }}>
              <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={10} angle={-15} textAnchor="end" />
              <YAxis domain={[50, 90]} stroke="var(--color-text-muted)" fontSize={11} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-bg-surface)',
                  borderColor: 'var(--color-border-ui)',
                  borderRadius: '12px',
                  color: 'var(--color-text-primary)',
                  fontSize: '12px',
                }}
              />
              <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: '10px' }} />
              <Bar dataKey="accuracy" name="Holdout Accuracy (%)" fill="#38BDF8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="roc_auc" name="ROC-AUC (%)" fill="#34D399" radius={[4, 4, 0, 0]} />
              <Bar dataKey="recall" name="Holdout Recall (%)" fill="#A78BFA" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Complete Benchmark Matrix Table */}
      <div className="glass-card border border-border-ui/40 dark:border-white/10 rounded-3xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-border-ui/30 dark:border-white/10">
          <h3 className="font-bold text-text-primary text-sm font-display">Official Holdout Benchmark Matrix</h3>
          <p className="text-xs text-text-muted">Single source of truth benchmark across all 9 tested architectures</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-bg-base/40 text-text-muted font-bold uppercase tracking-wider text-[11px] border-b border-border-ui/20 dark:border-white/10">
              <tr>
                <th className="px-6 py-3.5">Model Architecture</th>
                <th className="px-4 py-3.5">Feature Scope</th>
                <th className="px-4 py-3.5">Accuracy</th>
                <th className="px-4 py-3.5">ROC-AUC</th>
                <th className="px-4 py-3.5">Recall</th>
                <th className="px-4 py-3.5">F1-Score</th>
                <th className="px-4 py-3.5">Optimal Threshold</th>
                <th className="px-6 py-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-ui/20 dark:divide-white/5">
              {benchmarks.map((b) => (
                <tr
                  key={b.model_name}
                  className={b.is_champion ? 'bg-accent-text/5 font-semibold' : 'hover:bg-bg-raised/40 transition-colors'}
                >
                  <td className="px-6 py-4">
                    <p className="font-bold text-text-primary">{b.model_name}</p>
                  </td>
                  <td className="px-4 py-4 text-text-secondary">{b.stage}</td>
                  <td className="px-4 py-4 font-mono font-bold text-text-primary">{b.accuracy.toFixed(2)}%</td>
                  <td className="px-4 py-4 font-mono font-bold text-accent-text">{b.roc_auc.toFixed(4)}</td>
                  <td className="px-4 py-4 font-mono font-bold text-text-primary">{b.recall.toFixed(2)}%</td>
                  <td className="px-4 py-4 font-mono text-text-secondary">{b.f1_score.toFixed(2)}%</td>
                  <td className="px-4 py-4 font-mono text-text-muted">{b.optimal_threshold.toFixed(3)}</td>
                  <td className="px-6 py-4 text-right">
                    {b.is_champion ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-accent-primary text-accent-primary-text shadow-xs">
                        <Trophy size={11} /> CHAMPION
                      </span>
                    ) : (
                      <span className="text-[11px] text-text-muted font-medium">Benchmarked</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
