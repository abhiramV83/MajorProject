import { useEffect, useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSidebar } from '../context/SidebarContext';
import BrandWordmark from './BrandWordmark';
import {
  Sun,
  Moon,
  ChevronDown,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
} from 'lucide-react';

export default function Navbar() {
  const { role, switchRole } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { isCollapsed, toggleCollapse, toggleMobile } = useSidebar();
  const location = useLocation();

  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const isDemoAuthEnabled = import.meta.env.VITE_ENABLE_DEMO_AUTH === 'true' || (import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_AUTH !== 'false');

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setRoleMenuOpen(false);
      }
    };

    if (roleMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [roleMenuOpen]);

  const roles = [
    { key: 'JUDGE', label: 'Judge' },
    { key: 'CASE_MANAGER', label: 'Case Manager' },
    { key: 'PROBATION_OFFICER', label: 'Probation Officer' },
    { key: 'TREATMENT_PROVIDER', label: 'Treatment Provider' },
    { key: 'ADMIN', label: 'Administrator' },
  ];

  const currentRoleLabel = roles.find((r) => r.key === role)?.label || role;

  return (
    <header className="sticky top-0 z-40 w-full px-3 sm:px-6 py-2.5 pt-safe">
      {/* Centered Floating Glass Pill Navbar */}
      <div className="max-w-7xl mx-auto min-h-14 py-1.5 glass-pill rounded-full border border-border-ui/40 dark:border-border-ui/40 px-3 sm:px-6 flex items-center justify-between shadow-xs transition-colors">
        {/* Left: Sidebar Toggle & Brand Wordmark */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Desktop Toggle Button */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="hidden md:flex w-11 h-11 items-center justify-center rounded-full glass-pill hover:bg-bg-raised text-text-secondary hover:text-text-primary transition-all cursor-pointer border border-border-ui/40 dark:border-white/10"
            title={isCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>

          {/* Mobile Toggle Button (44x44px target) */}
          <button
            type="button"
            onClick={toggleMobile}
            className="flex md:hidden w-11 h-11 items-center justify-center rounded-full glass-pill hover:bg-bg-raised text-text-secondary hover:text-text-primary transition-all cursor-pointer border border-border-ui/40 dark:border-white/10"
            title="Open navigation menu"
            aria-label="Open mobile menu"
          >
            <Menu size={18} />
          </button>

          <Link to="/" className="flex items-center min-h-[44px] gap-2 hover:opacity-95 transition-opacity py-1">
            <BrandWordmark size="sm" />
          </Link>
        </div>

        {/* Center: Navigation Pills (Tablet landscape & Desktop) */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-text-secondary">
          <Link
            to="/dashboard"
            className={`min-h-[44px] px-3.5 py-2 inline-flex items-center rounded-full transition-colors ${
              location.pathname === '/dashboard'
                ? 'bg-bg-raised text-text-primary font-bold shadow-xs'
                : 'hover:text-text-primary hover:bg-bg-raised/60'
            }`}
          >
            Dashboard
          </Link>
          <Link
            to="/participants"
            className={`min-h-[44px] px-3.5 py-2 inline-flex items-center rounded-full transition-colors ${
              location.pathname.startsWith('/participants')
                ? 'bg-bg-raised text-text-primary font-bold shadow-xs'
                : 'hover:text-text-primary hover:bg-bg-raised/60'
            }`}
          >
            Participants
          </Link>
          <Link
            to="/assessments"
            className={`min-h-[44px] px-3.5 py-2 inline-flex items-center rounded-full transition-colors ${
              location.pathname.startsWith('/assessments')
                ? 'bg-bg-raised text-text-primary font-bold shadow-xs'
                : 'hover:text-text-primary hover:bg-bg-raised/60'
            }`}
          >
            Assessments
          </Link>
          <Link
            to="/model-performance"
            className={`min-h-[44px] px-3.5 py-2 inline-flex items-center rounded-full transition-colors ${
              location.pathname === '/model-performance'
                ? 'bg-bg-raised text-text-primary font-bold shadow-xs'
                : 'hover:text-text-primary hover:bg-bg-raised/60'
            }`}
          >
            Benchmarks
          </Link>
        </div>

        {/* Right Controls: Theme Toggle & Role Selector */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Theme Toggle (Dark / Light, 44x44px target) */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            className="w-11 h-11 rounded-full bg-bg-surface hover:bg-bg-raised border border-border-ui/40 dark:border-border-ui/40 text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer"
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Role Display / Switcher (Dropdown only in testing/demo mode) */}
          {isDemoAuthEnabled ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="min-h-[44px] px-3 sm:px-3.5 py-2 rounded-full bg-bg-surface hover:bg-bg-raised border border-border-ui/40 dark:border-border-ui/40 text-text-primary text-xs font-bold inline-flex items-center gap-1 sm:gap-1.5 transition-colors shadow-xs cursor-pointer"
                aria-expanded={roleMenuOpen}
                aria-haspopup="true"
              >
                <span className="hidden sm:inline text-text-muted font-normal text-[11px]">Role:</span>
                <span className="max-w-[85px] sm:max-w-none truncate">{currentRoleLabel}</span>
                <ChevronDown size={14} className="opacity-70 text-text-muted shrink-0" />
              </button>

              {roleMenuOpen && (
                <>
                  {/* Screen backdrop for instant click-outside closure */}
                  <div
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setRoleMenuOpen(false)}
                  />

                  <div className="absolute right-0 mt-2 w-56 bg-bg-surface/95 dark:bg-bg-surface/95 backdrop-blur-xl rounded-2xl shadow-xl border border-border-ui/40 dark:border-border-ui/50 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="space-y-1" role="menu" aria-label="Simulated judicial roles">
                      {roles.map((r) => {
                        const isCurrent = role === r.key;
                        return (
                          <button
                            key={r.key}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              switchRole(r.key);
                              setRoleMenuOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs min-h-[44px] transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                              isCurrent
                                ? 'bg-bg-raised text-text-primary font-bold shadow-xs'
                                : 'text-text-secondary hover:bg-bg-raised/60 hover:text-text-primary'
                            }`}
                          >
                            <span className="font-semibold">{r.label}</span>
                            {isCurrent && <Check size={16} className="text-accent-text" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="min-h-[44px] px-3.5 py-2 rounded-full bg-bg-surface border border-border-ui/40 dark:border-border-ui/40 text-text-primary text-xs font-bold inline-flex items-center gap-1.5 shadow-xs">
              <span className="text-text-muted font-normal text-[11px]">Role:</span>
              <span>{currentRoleLabel}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
