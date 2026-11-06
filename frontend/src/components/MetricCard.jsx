export default function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendPositive,
  color = 'cyan',
}) {
  const colorMap = {
    cyan: 'bg-accent-text/10 text-accent-text border-accent-text/25',
    indigo: 'bg-accent-text/10 text-accent-text border-accent-text/25',
    blue: 'bg-accent-text/10 text-accent-text border-accent-text/25',
    emerald: 'bg-risk-low-fill/10 text-risk-low-text border-risk-low-fill/30',
    red: 'bg-risk-high-fill/10 text-risk-high-text border-risk-high-fill/30',
    amber: 'bg-risk-med-fill/10 text-risk-med-text border-risk-med-fill/30',
    low: 'bg-risk-low-fill/10 text-risk-low-text border-risk-low-fill/30',
    medium: 'bg-risk-med-fill/10 text-risk-med-text border-risk-med-fill/30',
    high: 'bg-risk-high-fill/10 text-risk-high-text border-risk-high-fill/30',
  };

  return (
    <div className="glass-card rounded-2xl p-5 border border-border-ui/40 dark:border-border-ui/40 shadow-xs hover:border-border-ui/70 dark:hover:border-border-ui/50 transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-extrabold text-text-primary mt-2 tracking-tight font-display tabular-nums">
            {value}
          </p>
        </div>
        {Icon && (
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
              colorMap[color] || colorMap.cyan
            }`}
          >
            <Icon size={20} />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        {subtitle && <span className="text-text-muted text-[11px]">{subtitle}</span>}
        {trend && (
          <span
            className={`font-semibold inline-flex items-center gap-1 font-mono text-[11px] ${
              trendPositive ? 'text-risk-low-text' : 'text-risk-high-text'
            }`}
          >
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
