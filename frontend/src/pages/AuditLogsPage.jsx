import { useEffect, useState } from 'react';
import { Shield, Clock, Search, Lock, Code2, X, Check } from 'lucide-react';
import { auditAPI } from '../services/api';
import { MOCK_AUDIT_LOGS } from '../services/mockData';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState(MOCK_AUDIT_LOGS);
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    auditAPI
      .list()
      .then((res) => {
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setLogs(res.data);
        }
      })
      .catch(() => {
        setLogs(MOCK_AUDIT_LOGS);
      });
  }, []);

  const filtered = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      (l.user_name && l.user_name.toLowerCase().includes(search.toLowerCase())) ||
      (l.resource_type && l.resource_type.toLowerCase().includes(search.toLowerCase()))
  );

  const parseDetails = (details) => {
    if (!details) return {};
    if (typeof details === 'object') return details;
    try {
      return JSON.parse(details);
    } catch {
      return { raw: String(details) };
    }
  };

  const renderActionDetails = (log) => {
    const details = parseDetails(log.details);
    const action = (log.action || '').toUpperCase();

    if (action.includes('LOGIN') || log.resource_type === 'auth') {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-base/80 dark:bg-white/[0.04] border border-border-ui/40 dark:border-white/10 text-xs">
            <span className="text-text-muted font-mono uppercase text-[10px] font-bold">Email:</span>
            <span className="text-accent-text font-mono font-bold">{details.email || log.user_name || 'judge@drugcourt.gov'}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-base/80 dark:bg-white/[0.04] border border-border-ui/40 dark:border-white/10 text-xs">
            <span className="text-text-muted font-mono uppercase text-[10px] font-bold">Role:</span>
            <span className="text-text-primary font-mono font-bold">{details.role || log.user_role || 'JUDGE'}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)] shrink-0" />
            Authenticated
          </span>
        </div>
      );
    }

    if (action.includes('REVIEW') || action.includes('DISPOSITION')) {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-base/80 dark:bg-white/[0.04] border border-border-ui/40 dark:border-white/10 text-xs">
            <span className="text-text-muted font-mono uppercase text-[10px] font-bold">Disposition:</span>
            <span className="text-accent-text font-mono font-bold">{details.decision || 'RECORDED'}</span>
          </span>
          {(details.override_reason || details.notes) && (
            <span className="text-xs text-text-secondary italic">
              &ldquo;{details.override_reason || details.notes}&rdquo;
            </span>
          )}
        </div>
      );
    }

    if (action.includes('SIMULATION')) {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-base/80 dark:bg-white/[0.04] border border-border-ui/40 dark:border-white/10 text-xs font-mono">
            <span className="text-text-muted uppercase text-[10px] font-bold">Baseline:</span>
            <span className="text-text-secondary font-bold">{(details.baseline_risk * 100).toFixed(1)}%</span>
            <span className="text-text-muted">&rarr;</span>
            <span className="text-text-muted uppercase text-[10px] font-bold">Simulated:</span>
            <span className="text-accent-text font-bold">{(details.simulated_risk * 100).toFixed(1)}%</span>
          </span>
          {details.delta_risk != null && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">
              &Delta; {(details.delta_risk * 100).toFixed(1)}%
            </span>
          )}
        </div>
      );
    }

    if (action.includes('PREDICTION')) {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-base/80 dark:bg-white/[0.04] border border-border-ui/40 dark:border-white/10 text-xs font-mono">
            <span className="text-text-muted uppercase text-[10px] font-bold">Risk Tier:</span>
            <span className="text-accent-text font-bold">{details.risk_level}</span>
            {details.probability != null && (
              <span className="text-text-secondary">({(details.probability * 100).toFixed(1)}%)</span>
            )}
          </span>
          {details.model && (
            <span className="text-[10px] font-mono text-text-muted">[{details.model}]</span>
          )}
        </div>
      );
    }

    if (action.includes('PARTICIPANT')) {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bg-base/80 dark:bg-white/[0.04] border border-border-ui/40 dark:border-white/10 text-xs">
            <span className="text-text-muted font-mono uppercase text-[10px] font-bold">Intake Name:</span>
            <span className="text-text-primary font-bold">{details.first_name} {details.last_name}</span>
          </span>
        </div>
      );
    }

    // Default object key-value formatter
    const entries = Object.entries(details);
    if (entries.length === 0) {
      return <span className="text-text-muted italic text-xs">No additional metadata</span>;
    }

    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {entries.map(([k, v]) => (
          <span
            key={k}
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-bg-base/80 dark:bg-white/[0.04] border border-border-ui/40 dark:border-white/10 text-[11px]"
          >
            <span className="text-text-muted font-mono uppercase text-[9px] font-bold">{k.replace(/_/g, ' ')}:</span>
            <span className="text-text-primary font-mono font-semibold truncate max-w-xs">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-accent-text/10 text-accent-text border border-accent-text/20 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-text animate-pulse" />
          IMMUTABLE REGULATORY COMPLIANCE
        </span>
        <h1 className="text-3xl font-black text-text-primary mt-1 tracking-tight font-display">
          Immutable Judicial Audit Log
        </h1>
        <p className="text-xs text-text-muted mt-1">
          Cryptographically timestamped chain of judicial sign-offs, AI predictions, and counterfactual simulations.
        </p>
      </div>

      {/* Search Bar */}
      <div className="glass-card border border-border-ui/40 dark:border-white/10 rounded-2xl p-4 shadow-xs relative">
        <Search className="absolute left-7 top-6 text-text-muted pointer-events-none" size={17} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter audit entries by action, author, or resource target..."
          className="w-full pl-10 pr-4 py-2.5 min-h-[44px] rounded-xl bg-bg-base/80 dark:bg-white/5 border border-border-ui/40 dark:border-white/10 text-base text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-accent-raw focus:border-accent-raw outline-none transition-all"
        />
      </div>

      {/* Audit Log Table & Mobile Cards */}
      <div className="glass-card border border-border-ui/40 dark:border-white/10 rounded-3xl shadow-xs overflow-hidden">
        {/* Mobile Stacked Cards (md:hidden) */}
        <div className="md:hidden divide-y divide-border-ui/20 dark:divide-white/5">
          {filtered.map((log) => (
            <div key={log.id} className="p-4 space-y-3 hover:bg-bg-raised/30 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-bg-raised/60 dark:bg-white/5 border border-border-ui/40 dark:border-white/10 text-accent-text font-mono">
                  <Lock size={12} className="text-accent-text" />
                  {log.action}
                </span>
                <span className="text-[11px] text-text-muted font-mono">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div>
                <p className="font-bold text-text-primary text-sm font-display">
                  {log.user_name || 'System Reviewer'}
                </p>
                <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                  <span className="font-mono">{log.user_role || 'STAFF'}</span>
                  <span>•</span>
                  <span className="font-mono text-accent-text">{log.resource_type} #{log.resource_id}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-bg-base/60 dark:bg-bg-raised/40 border border-border-ui/20 text-xs">
                {renderActionDetails(log)}
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-border-ui/20 dark:border-white/5">
                <span className="text-[10px] text-text-muted font-mono">
                  {new Date(log.timestamp).toLocaleDateString()}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedLog(log)}
                  className="min-h-[44px] px-4 py-2 rounded-full border border-border-ui/40 dark:border-white/10 glass-pill hover:bg-bg-raised text-text-primary font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Code2 size={14} /> Payload
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Full Table (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-bg-base/40 text-text-muted font-bold uppercase tracking-wider text-[11px] border-b border-border-ui/20 dark:border-white/10">
              <tr>
                <th className="px-6 py-3.5">Timestamp</th>
                <th className="px-4 py-3.5">Judicial Action</th>
                <th className="px-4 py-3.5">User & Role</th>
                <th className="px-4 py-3.5">Resource Target</th>
                <th className="px-6 py-3.5">Action Details & Findings</th>
                <th className="px-4 py-3.5 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-ui/20 dark:divide-white/5">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-bg-raised/40 transition-colors">
                  <td className="px-6 py-4 text-text-muted font-mono text-[11px] whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-bg-raised/60 dark:bg-white/5 border border-border-ui/40 dark:border-white/10 text-accent-text font-mono">
                      <Lock size={11} className="text-accent-text" />
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-bold text-text-primary text-sm font-display">
                      {log.user_name || 'System Reviewer'}
                    </p>
                    <span className="text-[10px] text-text-muted font-mono">{log.user_role || 'STAFF'}</span>
                  </td>
                  <td className="px-4 py-4 font-mono font-semibold text-text-primary">
                    {log.resource_type} #{log.resource_id}
                  </td>
                  <td className="px-6 py-4 text-text-secondary">
                    {renderActionDetails(log)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedLog(log)}
                      className="min-h-[44px] min-w-[44px] rounded-full border border-border-ui/40 dark:border-white/10 glass-pill hover:bg-bg-raised text-text-secondary hover:text-text-primary inline-flex items-center justify-center transition-colors cursor-pointer"
                      title="Inspect Raw Forensic Payload"
                      aria-label="Inspect raw forensic payload"
                    >
                      <Code2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Forensic Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="glass-card border border-border-ui/40 dark:border-white/10 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border-ui/20 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Lock size={16} className="text-accent-text" />
                <h3 className="font-bold text-text-primary text-sm font-display">
                  Forensic Audit Payload Inspection
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="w-11 h-11 rounded-full hover:bg-bg-raised text-text-muted hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-bg-base/40 p-3 rounded-2xl border border-border-ui/30 dark:border-white/10 font-mono text-[11px]">
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-bold">Action ID:</span>
                  <span className="text-text-primary font-bold">#{selectedLog.id}</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-bold">Target Resource:</span>
                  <span className="text-accent-text font-bold">{selectedLog.resource_type} #{selectedLog.resource_id}</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-bold">Audited Officer:</span>
                  <span className="text-text-primary">{selectedLog.user_name || 'System Reviewer'} ({selectedLog.user_role})</span>
                </div>
                <div>
                  <span className="text-text-muted block text-[10px] uppercase font-bold">Timestamp:</span>
                  <span className="text-text-muted">{new Date(selectedLog.timestamp).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <span className="text-text-muted font-mono font-bold block mb-1 text-[11px]">Decoded Action Details:</span>
                <pre className="p-4 rounded-2xl bg-bg-base/90 dark:bg-black/60 border border-border-ui/40 dark:border-white/10 text-accent-text font-mono text-[11px] overflow-x-auto leading-relaxed max-h-60">
                  {JSON.stringify(parseDetails(selectedLog.details), null, 2)}
                </pre>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-border-ui/20 dark:border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 rounded-full bg-accent-primary hover:bg-accent-hover text-accent-primary-text font-bold text-xs transition-all shadow-xs cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
