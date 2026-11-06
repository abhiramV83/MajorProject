import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import BrandWordmark from './BrandWordmark';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Activity,
  Scale,
  Brain,
  BookOpen,
  Shield,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

export default function Sidebar() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { isCollapsed, toggleCollapse, isMobileOpen, closeMobile } = useSidebar();

  const isActive = (path) =>
    loc.pathname === path || (path !== '/' && loc.pathname.startsWith(path + '/'));

  const navPrimary = [
    { path: '/dashboard', label: 'Executive Dashboard', short: 'Dashboard', icon: LayoutDashboard },
    { path: '/participants', label: 'Court Participants', short: 'Participants', icon: Users },
    { path: '/assessments', label: 'Risk Assessments', short: 'Assessments', icon: ClipboardList },
    { path: '/interventions', label: 'Intervention Plans', short: 'Interventions', icon: Activity },
  ];

  const navIntelligence = [
    { path: '/model-performance', label: 'Model Benchmarks', short: 'Benchmarks', icon: Brain },
    { path: '/fairness', label: 'Fairness & Equity Audit', short: 'Fairness', icon: Scale },
    { path: '/model-card', label: 'Model Governance Card', short: 'Governance', icon: BookOpen },
    { path: '/audit-logs', label: 'Judicial Audit Logs', short: 'Audit Logs', icon: Shield },
  ];

  const handleLinkClick = () => {
    if (isMobileOpen) closeMobile();
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex flex-col justify-between border-r border-border-ui/30 dark:border-border-ui/40 select-none shadow-xs transition-all duration-300 ease-in-out backdrop-blur-xl bg-bg-surface/95 dark:bg-bg-surface/90 text-text-primary pt-safe pb-safe ${
        isCollapsed ? 'w-20' : 'w-64 max-w-[85vw]'
      } ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
    >
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        {/* Header: Brand + Collapse Toggle */}
        <div
          className={`flex items-center border-b border-border-ui/20 dark:border-border-ui/40 transition-all ${
            isCollapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3 justify-between'
          }`}
        >
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Link
                to="/"
                onClick={handleLinkClick}
                className="w-11 h-11 rounded-2xl bg-accent-primary/10 border border-accent-primary/25 text-accent-text flex items-center justify-center hover:opacity-90 transition-opacity"
                title="Drug Court DSS — Decision Support System"
              >
                <Scale size={20} />
              </Link>
              <button
                type="button"
                onClick={toggleCollapse}
                className="hidden md:flex w-11 h-11 items-center justify-center rounded-full hover:bg-bg-raised text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                title="Expand sidebar (Ctrl+B)"
                aria-label="Expand sidebar"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          ) : (
            <>
              <Link
                to="/"
                onClick={handleLinkClick}
                className="flex items-center min-h-[44px] hover:opacity-90 transition-opacity truncate pr-2"
              >
                <BrandWordmark size="md" />
              </Link>

              <div className="flex items-center gap-1">
                {/* Desktop Collapse Button */}
                <button
                  type="button"
                  onClick={toggleCollapse}
                  className="hidden md:flex w-11 h-11 items-center justify-center rounded-xl hover:bg-bg-raised text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                  title="Collapse sidebar (Ctrl+B)"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose size={17} />
                </button>

                {/* Mobile Close Button (Minimum 44x44px touch target) */}
                <button
                  type="button"
                  onClick={closeMobile}
                  className="flex md:hidden w-11 h-11 items-center justify-center rounded-xl hover:bg-bg-raised text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                  title="Close navigation"
                  aria-label="Close navigation"
                >
                  <X size={20} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Section 1: Core Judicial Operations */}
        <div className="pt-3 pb-1">
          {!isCollapsed && (
            <div className="px-4 pb-2 text-[10px] font-mono font-bold text-text-muted uppercase tracking-widest truncate">
              Judicial Operations
            </div>
          )}
          {isCollapsed && (
            <div className="w-8 mx-auto my-1 border-t border-border-ui/20 dark:border-white/10" />
          )}

          <nav className={`space-y-1.5 ${isCollapsed ? 'px-2' : 'px-3'}`}>
            {navPrimary.map(({ path, label, short, icon: Icon }) => {
              const active = isActive(path);
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={handleLinkClick}
                  title={isCollapsed ? label : undefined}
                  className={`flex items-center rounded-xl text-xs font-semibold min-h-[44px] transition-all group ${
                    isCollapsed
                      ? 'justify-center w-11 h-11 mx-auto'
                      : 'gap-3 px-3.5 py-2.5'
                  } ${
                    active
                      ? 'bg-bg-base/90 dark:bg-bg-raised/70 text-text-primary border border-border-ui/40 dark:border-border-ui/50 font-bold shadow-xs'
                      : 'text-text-secondary hover:bg-bg-raised/60 hover:text-text-primary'
                  }`}
                >
                  <Icon
                    size={18}
                    className={`shrink-0 transition-colors ${
                      active ? 'text-accent-text' : 'text-text-muted group-hover:text-text-primary'
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">{label}</span>}
                  {isCollapsed && active && (
                    <span className="sr-only">(Active)</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Section 2: AI Transparency & Ethics */}
        <div className="pt-3 pb-1">
          {!isCollapsed && (
            <div className="px-4 pb-2 text-[10px] font-mono font-bold text-text-muted uppercase tracking-widest truncate">
              AI Transparency & Ethics
            </div>
          )}
          {isCollapsed && (
            <div className="w-8 mx-auto my-1 border-t border-border-ui/20 dark:border-white/10" />
          )}

          <nav className={`space-y-1.5 ${isCollapsed ? 'px-2' : 'px-3'}`}>
            {navIntelligence.map(({ path, label, short, icon: Icon }) => {
              const active = isActive(path);
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={handleLinkClick}
                  title={isCollapsed ? label : undefined}
                  className={`flex items-center rounded-xl text-xs font-semibold min-h-[44px] transition-all group ${
                    isCollapsed
                      ? 'justify-center w-11 h-11 mx-auto'
                      : 'gap-3 px-3.5 py-2.5'
                  } ${
                    active
                      ? 'bg-bg-base/90 dark:bg-bg-raised/70 text-text-primary border border-border-ui/40 dark:border-border-ui/50 font-bold shadow-xs'
                      : 'text-text-secondary hover:bg-bg-raised/60 hover:text-text-primary'
                  }`}
                >
                  <Icon
                    size={18}
                    className={`shrink-0 transition-colors ${
                      active ? 'text-accent-text' : 'text-text-muted group-hover:text-text-primary'
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">{label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer: Sign Out */}
      <div
        className={`border-t border-border-ui/20 dark:border-border-ui/40 bg-bg-raised/30 transition-all ${
          isCollapsed ? 'p-2 flex flex-col items-center gap-2' : 'p-3'
        }`}
      >
        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/login');
          }}
          title={isCollapsed ? 'Sign Out' : undefined}
          className={`flex items-center justify-center rounded-full text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-bg-raised border border-border-ui/30 dark:border-border-ui/40 min-h-[44px] transition-colors cursor-pointer ${
            isCollapsed ? 'w-11 h-11 p-0' : 'w-full gap-2 px-4 py-2.5'
          }`}
        >
          <LogOut size={16} />
          {!isCollapsed && <span>Sign Out</span>}
        </button>

        {isCollapsed && (
          <button
            type="button"
            onClick={toggleCollapse}
            className="w-10 h-10 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            title="Expand sidebar (Ctrl+B)"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen size={16} />
          </button>
        )}
      </div>
    </aside>
  );
}
