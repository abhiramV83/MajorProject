import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ArrowRight, FileDown, Search, Sparkles } from 'lucide-react';
import { RiskLevelBadge, TrajectoryBadge } from '../components/RiskBadge';
import { MOCK_ASSESSMENTS, MOCK_PARTICIPANTS } from '../services/mockData';
import { reportsAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function AssessmentsListPage() {
  const [assessments] = useState(MOCK_ASSESSMENTS);
  const [filterStage, setFilterStage] = useState('');
  const [filterRisk, setFilterRisk] = useState('');
  const [search, setSearch] = useState('');

  const getParticipant = (pid) =>
    MOCK_PARTICIPANTS.find((p) => p.id === pid) || {
      first_name: 'Unknown',
      last_name: 'Participant',
      participant_id: `DC-${pid}`,
    };

  const handleDownloadPDF = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await reportsAPI.downloadPDF(id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Court_DSS_Assessment_${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`Assessment #${id} official PDF downloaded`);
    } catch {
      toast.error('Unable to export assessment PDF');
    }
  };

  const filtered = assessments.filter((a) => {
    const p = getParticipant(a.participant_id);
    const nameMatch =
      `${p.first_name} ${p.last_name} ${p.participant_id}`.toLowerCase().includes(search.toLowerCase());
    const stageMatch = !filterStage || a.assessment_stage === filterStage;
    const riskMatch = !filterRisk || a.risk_level === filterRisk;
    return nameMatch && stageMatch && riskMatch;
  });

  const selectOptionClass = "bg-bg-base dark:bg-bg-surface text-text-primary";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-accent-text/10 text-accent-text border border-accent-text/20 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-text animate-pulse" />
            JUDICIAL EVALUATIONS & AUDITING
          </span>
          <h1 className="text-3xl font-black text-text-primary mt-1 tracking-tight font-display">
            Court Risk Assessments & Recommendations
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Browse static intake baselines and dynamic supervision checkpoints with TreeSHAP explanations.
          </p>
        </div>

        <Link
          to="/assessments/new"
          className="min-h-[44px] px-5 py-2.5 rounded-full bg-accent-primary hover:bg-accent-hover text-accent-primary-text font-bold text-xs inline-flex items-center gap-2 transition-all shadow-xs hover:scale-[1.01] self-start md:self-center cursor-pointer"
        >
          <Plus size={16} /> Run New Assessment
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="glass-card border border-border-ui/40 dark:border-border-ui/40 rounded-2xl p-4 shadow-xs grid md:grid-cols-12 gap-3">
        <div className="md:col-span-6 relative">
          <Search className="absolute left-3.5 top-3.5 text-text-muted pointer-events-none" size={17} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by participant name or court ID..."
            className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-xl bg-bg-base/80 dark:bg-bg-raised/40 border border-border-ui/40 dark:border-border-ui/40 text-base text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-accent-raw focus:border-accent-raw outline-none transition-all"
          />
        </div>

        <div className="md:col-span-3">
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-bg-base/80 dark:bg-bg-raised/40 border border-border-ui/40 dark:border-border-ui/40 text-base text-text-primary focus:ring-2 focus:ring-accent-raw focus:border-accent-raw outline-none transition-all cursor-pointer"
          >
            <option value="" className={selectOptionClass}>All Stages (Intake & Dynamic)</option>
            <option value="INTAKE" className={selectOptionClass}>Intake Baseline (t₀)</option>
            <option value="DYNAMIC" className={selectOptionClass}>Dynamic Supervision Checkpoints</option>
          </select>
        </div>

        <div className="md:col-span-3">
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-bg-base/80 dark:bg-bg-raised/40 border border-border-ui/40 dark:border-border-ui/40 text-base text-text-primary focus:ring-2 focus:ring-accent-raw focus:border-accent-raw outline-none transition-all cursor-pointer"
          >
            <option value="" className={selectOptionClass}>All Risk Tiers</option>
            <option value="LOW" className={selectOptionClass}>Low Risk (&lt;35%)</option>
            <option value="MEDIUM" className={selectOptionClass}>Medium Risk (35-65%)</option>
            <option value="HIGH" className={selectOptionClass}>High Risk (&gt;65%)</option>
          </select>
        </div>
      </div>

      {/* Table & Mobile Cards */}
      <div className="glass-card border border-border-ui/40 dark:border-border-ui/40 rounded-3xl shadow-xs overflow-hidden">
        {/* Mobile Stacked Cards (md:hidden) */}
        <div className="md:hidden divide-y divide-border-ui/20 dark:divide-border-ui/30">
          {filtered.map((a) => {
            const p = getParticipant(a.participant_id);
            return (
              <div key={a.id} className="p-4 space-y-3 hover:bg-bg-raised/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted">
                      Assessment #{a.id}
                    </span>
                    <h3 className="font-bold text-text-primary text-base font-display">
                      {p.first_name} {p.last_name}
                    </h3>
                    <p className="text-xs text-accent-text font-mono font-bold mt-0.5">
                      {p.participant_id}
                    </p>
                  </div>
                  <RiskLevelBadge
                    level={a.risk_level}
                    probability={a.recidivism_probability}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-bg-raised/60 dark:bg-bg-raised/40 border border-border-ui/40 dark:border-border-ui/40 text-accent-text font-mono">
                    {a.assessment_stage}
                  </span>
                  <TrajectoryBadge flag={a.trajectory_flag} delta={a.delta_risk} />
                  {a.reviewer_decision && (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-text-primary bg-bg-raised/60 border border-border-ui/40 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-risk-low-fill shadow-sm" />
                      Sign-Off: {a.reviewer_decision}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-border-ui/20 dark:border-border-ui/30">
                  <span className="text-[11px] text-text-muted">
                    {new Date(a.assessment_date).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleDownloadPDF(e, a.id)}
                      className="min-h-[44px] min-w-[44px] rounded-full border border-border-ui/40 dark:border-border-ui/40 glass-pill hover:bg-bg-raised text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer"
                      title="Download DSS Summary Report"
                      aria-label="Download PDF report"
                    >
                      <FileDown size={16} />
                    </button>
                    <Link
                      to={`/assessments/${a.id}`}
                      className="min-h-[44px] px-4 py-2 rounded-full bg-accent-primary hover:bg-accent-hover text-accent-primary-text font-bold text-xs inline-flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                    >
                      Open DSS <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Full Table (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-bg-base/40 text-text-muted font-bold uppercase tracking-wider text-[11px] border-b border-border-ui/20 dark:border-border-ui/40">
              <tr>
                <th className="px-6 py-3.5">Assessment & Date</th>
                <th className="px-4 py-3.5">Participant</th>
                <th className="px-4 py-3.5">Stage</th>
                <th className="px-4 py-3.5">Model Risk Score</th>
                <th className="px-4 py-3.5">Trajectory Delta</th>
                <th className="px-4 py-3.5">Judicial Sign-Off</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-ui/20 dark:divide-border-ui/30">
              {filtered.map((a) => {
                const p = getParticipant(a.participant_id);
                return (
                  <tr key={a.id} className="hover:bg-bg-raised/40 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-text-primary text-sm font-display">
                        Assessment #{a.id}
                      </p>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        {new Date(a.assessment_date).toLocaleDateString()} at{' '}
                        {new Date(a.assessment_date).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <span className="text-[10px] text-accent-text font-mono mt-0.5 block">
                        {a.model_version}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-bold text-text-primary text-sm">
                        {p.first_name} {p.last_name}
                      </p>
                      <p className="text-[11px] text-accent-text font-mono font-bold mt-0.5">
                        {p.participant_id}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-bg-raised/60 dark:bg-bg-raised/40 border border-border-ui/40 dark:border-border-ui/40 text-accent-text font-mono">
                        {a.assessment_stage}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <RiskLevelBadge
                        level={a.risk_level}
                        probability={a.recidivism_probability}
                      />
                    </td>

                    <td className="px-4 py-4">
                      <TrajectoryBadge flag={a.trajectory_flag} delta={a.delta_risk} />
                    </td>

                    <td className="px-4 py-4">
                      {a.reviewer_decision ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-text-primary bg-bg-raised/60 dark:bg-bg-surface/[0.04] border border-border-ui/40 dark:border-border-ui/40 px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-risk-low-fill shadow-sm shrink-0" />
                          Decision: {a.reviewer_decision}
                        </span>
                      ) : (
                        <span className="text-[11px] text-text-muted font-medium">Pending Review</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleDownloadPDF(e, a.id)}
                          className="min-h-[44px] min-w-[44px] rounded-full border border-border-ui/40 dark:border-border-ui/40 glass-pill hover:bg-bg-raised text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer"
                          title="Download DSS Summary Report"
                          aria-label="Download PDF report"
                        >
                          <FileDown size={15} />
                        </button>
                        <Link
                          to={`/assessments/${a.id}`}
                          className="min-h-[44px] px-4 py-2 rounded-full border border-border-ui/40 dark:border-border-ui/40 glass-pill hover:bg-bg-raised font-bold text-xs text-text-primary inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          Open DSS & Simulator <ArrowRight size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
