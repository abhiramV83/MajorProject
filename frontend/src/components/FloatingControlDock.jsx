import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  Sun,
  Moon,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

/**
 * FloatingControlDock Component
 * Positioned fixed at bottom center for rapid judicial actions (Run Audit, Simulate, Export, Review).
 * Luxury frosted glass pill design matching the floating navbar.
 */
export default function FloatingControlDock({
  primaryAction,
  secondaryActions = [],
  statusBadge,
}) {
  const { isDark, toggleTheme } = useTheme();
  const [mobileExpanded, setMobileExpanded] = useState(false);

  return (
    <div className="fixed bottom-[74px] sm:bottom-6 inset-x-0 z-35 flex justify-center px-3 sm:px-4 pointer-events-none select-none pb-safe">
      <div className="pointer-events-auto">
        {/* Desktop View (Full Dock) */}
        <div className="hidden sm:flex items-center gap-2.5 p-2 rounded-full bg-bg-surface/90 dark:bg-bg-surface/90 backdrop-blur-xl border border-border-ui/40 dark:border-border-ui/40 shadow-2xl transition-all">
          {/* Status / Badge slot if provided */}
          {statusBadge && (
            <div className="px-3 py-1 border-r border-border-ui/30 dark:border-border-ui/40 pr-3.5 flex items-center">
              {statusBadge}
            </div>
          )}

          {/* Secondary Actions (Simulate, Export PDF, etc.) */}
          {secondaryActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={action.onClick}
                disabled={action.disabled || action.loading}
                className="min-h-[44px] px-4 py-2 rounded-full text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-bg-raised/60 inline-flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {Icon && <Icon size={15} className="text-accent-text" />}
                <span>{action.loading ? 'Processing...' : action.label}</span>
              </button>
            );
          })}

          {/* Theme Toggle within Dock */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            className="w-11 h-11 rounded-full bg-bg-raised/80 hover:bg-bg-raised border border-border-ui/40 dark:border-border-ui/40 text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors shrink-0 cursor-pointer"
            title="Toggle color theme"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Primary Action Button */}
          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled || primaryAction.loading}
              className="min-h-[44px] px-5 py-2.5 rounded-full bg-accent-primary hover:bg-accent-hover text-accent-primary-text text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 shrink-0 cursor-pointer hover:scale-[1.01]"
            >
              {primaryAction.icon && <primaryAction.icon size={15} />}
              <span>{primaryAction.loading ? 'Executing...' : primaryAction.label}</span>
            </button>
          )}
        </div>

        {/* Mobile View (Collapsible Floating Action Bar) */}
        <div className="sm:hidden flex flex-col items-center">
          {mobileExpanded && (
            <div className="mb-2 p-2 w-72 max-w-[90vw] rounded-2xl bg-bg-surface/98 dark:bg-bg-surface/95 backdrop-blur-xl border border-border-ui/40 dark:border-border-ui/40 shadow-2xl flex flex-col gap-1.5 animate-in slide-in-from-bottom-2 duration-150">
              {secondaryActions.map((action, idx) => {
                const Icon = action.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      action.onClick();
                      setMobileExpanded(false);
                    }}
                    disabled={action.disabled || action.loading}
                    className="w-full text-left px-3.5 py-3 min-h-[44px] rounded-xl text-xs font-bold text-text-primary hover:bg-bg-raised/60 flex items-center gap-2.5 cursor-pointer"
                  >
                    {Icon && <Icon size={16} className="text-accent-text" />}
                    <span>{action.label}</span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={toggleTheme}
                className="w-full text-left px-3.5 py-3 min-h-[44px] rounded-xl text-xs font-bold text-text-primary hover:bg-bg-raised/60 flex items-center gap-2.5 border-t border-border-ui/30 dark:border-border-ui/40 pt-2 cursor-pointer"
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
                <span>{isDark ? 'Light Theme' : 'Dark Theme'}</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 p-1 rounded-full bg-bg-surface/95 dark:bg-bg-surface/95 backdrop-blur-xl border border-border-ui/40 dark:border-border-ui/40 shadow-2xl">
            {secondaryActions.length > 0 && (
              <button
                type="button"
                onClick={() => setMobileExpanded(!mobileExpanded)}
                className="min-h-[44px] px-4 py-2 rounded-full bg-bg-raised text-text-secondary text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>Actions</span>
                {mobileExpanded ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
              </button>
            )}

            {primaryAction && (
              <button
                type="button"
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled || primaryAction.loading}
                className="min-h-[44px] px-5 py-2 rounded-full bg-accent-primary hover:bg-accent-hover text-accent-primary-text text-xs font-bold inline-flex items-center gap-2 shadow-xs cursor-pointer"
              >
                {primaryAction.icon && <primaryAction.icon size={15} />}
                <span>{primaryAction.label}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
