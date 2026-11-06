import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Users,
  title = 'No Records Found',
  description = 'There are no active items available for this docket or query.',
  actionLabel,
  actionTo,
  onAction,
}) {
  return (
    <div className="p-12 sm:p-16 text-center rounded-3xl glass-card border border-border-ui/40 dark:border-white/10 max-w-lg mx-auto my-6 shadow-xs">
      <div className="w-14 h-14 rounded-2xl bg-bg-raised/80 dark:bg-white/5 text-text-muted flex items-center justify-center mx-auto mb-4 border border-border-ui/30 dark:border-white/10">
        <Icon size={26} />
      </div>
      <h3 className="text-base font-bold text-text-primary tracking-tight font-display">{title}</h3>
      <p className="text-xs text-text-muted mt-1.5 leading-relaxed">{description}</p>

      {(actionLabel && (actionTo || onAction)) && (
        <div className="mt-5">
          {actionTo ? (
            <Link
              to={actionTo}
              className="px-6 py-2.5 rounded-full bg-accent-primary hover:bg-accent-hover text-accent-primary-text text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-all hover:scale-[1.01] cursor-pointer"
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAction}
              className="px-6 py-2.5 rounded-full bg-accent-primary hover:bg-accent-hover text-accent-primary-text text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-all hover:scale-[1.01] cursor-pointer"
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
