import {
  TrendingDown,
  TrendingUp,
  MinusCircle,
  Clock,
} from 'lucide-react';

/**
 * Minimalist Luxury Risk Level Badge
 * Clean neutral glass pill with a luminous semantic status dot and inline probability.
 * Eliminates noisy colored background fills and cutoffs while maintaining dual-coded accessibility.
 */
export function RiskLevelBadge({ level, probability, size = 'md' }) {
  const norm = (level || 'PENDING').toUpperCase();
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';
  const pillClasses = `inline-flex items-center gap-1.5 font-medium rounded-full bg-bg-raised/60 dark:bg-bg-raised/40 border border-border-ui/40 dark:border-border-ui/40 text-text-primary ${sizeClasses}`;

  const formatProb = (p) => {
    if (p == null || isNaN(p)) return '';
    const num = Number(p);
    const pct = num <= 1 ? num * 100 : num;
    return `${pct.toFixed(1)}%`;
  };

  const probStr = formatProb(probability);

  if (norm === 'LOW') {
    return (
      <span className={pillClasses}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)] shrink-0" />
        <span className="font-semibold">Low Risk</span>
        {probStr && (
          <span className="font-mono font-bold text-accent-text ml-0.5">· {probStr}</span>
        )}
      </span>
    );
  }

  if (norm === 'MEDIUM') {
    return (
      <span className={pillClasses}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)] shrink-0" />
        <span className="font-semibold">Medium Risk</span>
        {probStr && (
          <span className="font-mono font-bold text-accent-text ml-0.5">· {probStr}</span>
        )}
      </span>
    );
  }

  if (norm === 'HIGH') {
    return (
      <span className={pillClasses}>
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)] shrink-0" />
        <span className="font-semibold">High Risk</span>
        {probStr && (
          <span className="font-mono font-bold text-accent-text ml-0.5">· {probStr}</span>
        )}
      </span>
    );
  }

  return (
    <span className={pillClasses}>
      <span className="w-1.5 h-1.5 rounded-full bg-text-muted shrink-0" />
      <span className="text-text-muted">Pending Evaluation</span>
      {probStr && (
        <span className="font-mono font-bold text-text-muted ml-0.5">· {probStr}</span>
      )}
    </span>
  );
}

/**
 * Minimalist Luxury Longitudinal Trajectory Badge
 * Neutral glass pill with directional trend indicator and clean typography.
 */
export function TrajectoryBadge({ flag, delta, size = 'md' }) {
  const norm = (flag || 'BASELINE').toUpperCase();
  const sizeClasses = size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';
  const pillClasses = `inline-flex items-center gap-1.5 font-medium rounded-full bg-bg-raised/60 dark:bg-bg-raised/40 border border-border-ui/40 dark:border-border-ui/40 text-text-secondary ${sizeClasses}`;

  const deltaStr =
    delta != null
      ? ` (${delta > 0 ? '+' : ''}${(delta * (Math.abs(delta) <= 1 ? 100 : 1)).toFixed(1)}%)`
      : '';

  if (norm === 'IMPROVING') {
    return (
      <span className={pillClasses}>
        <TrendingDown size={13} className="text-risk-low-text dark:text-risk-low-text shrink-0" />
        <span className="text-text-primary">Improving Trajectory{deltaStr}</span>
      </span>
    );
  }

  if (norm === 'ALERT') {
    return (
      <span className={pillClasses}>
        <TrendingUp size={13} className="text-risk-high-text dark:text-risk-high-text shrink-0" />
        <span className="text-text-primary">Critical Risk Alert{deltaStr}</span>
      </span>
    );
  }

  if (norm === 'STABLE') {
    return (
      <span className={pillClasses}>
        <MinusCircle size={13} className="text-risk-med-text dark:text-risk-med-text shrink-0" />
        <span className="text-text-primary">Stable Trajectory{deltaStr}</span>
      </span>
    );
  }

  return (
    <span className={pillClasses}>
      <Clock size={13} className="text-text-muted shrink-0" />
      <span className="text-text-muted">Intake Baseline (t₀)</span>
    </span>
  );
}
