import { Link, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { useSidebar } from '../context/SidebarContext';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Activity,
  Menu,
} from 'lucide-react';

export default function AppLayout({ children }) {
  const { isCollapsed, isMobileOpen, closeMobile, toggleMobile } = useSidebar();
  const location = useLocation();

  const isTabActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const bottomTabs = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/participants', label: 'Participants', icon: Users },
    { path: '/assessments', label: 'Assessments', icon: ClipboardList },
    { path: '/interventions', label: 'Plans', icon: Activity },
  ];

  return (
    <div className="min-h-screen relative bg-bg-base text-text-primary flex transition-colors selection:bg-accent-raw/20">
      {/* Background Ambience Layer (Fixed, matches Landing/Hero & Login luxury atmosphere) */}
      <div aria-hidden="true" className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-32 -left-32 w-[650px] h-[520px] rounded-full blur-[140px] opacity-35 dark:opacity-20 bg-accent-raw" />
        <div className="absolute top-1/3 -right-32 w-[600px] h-[520px] rounded-full blur-[160px] opacity-25 dark:opacity-15 bg-highlight-pink" />
        <div className="absolute -bottom-32 left-1/4 w-[700px] h-[550px] rounded-full blur-[180px] opacity-30 dark:opacity-20 bg-accent-raw" />
        <div className="ribbed-glass-overlay absolute inset-0 opacity-80 dark:opacity-60" />
      </div>

      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close navigation sidebar"
          onClick={closeMobile}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Enter') closeMobile();
          }}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-35 md:hidden transition-opacity"
        />
      )}

      {/* Left Sidebar (collapsible drawer on mobile, slide-in) */}
      <Sidebar />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-h-screen min-w-0 relative z-10 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'md:ml-20' : 'md:ml-64'
        }`}
      >
        <Navbar />
        <main className="flex-1 p-3.5 sm:p-6 md:p-8 max-w-7xl w-full mx-auto pb-28 sm:pb-24 min-w-0">
          {children}
        </main>
      </div>

      {/* Phone-First Mobile Bottom Navigation Bar (md:hidden) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 inset-x-0 z-30 md:hidden bg-bg-surface/95 dark:bg-bg-surface/90 backdrop-blur-xl border-t border-border-ui/40 dark:border-border-ui/40 pb-safe shadow-lg select-none"
      >
        <div className="grid grid-cols-5 h-16 items-center px-1">
          {bottomTabs.map(({ path, label, icon: Icon }) => {
            const active = isTabActive(path);
            return (
              <Link
                key={path}
                to={path}
                onClick={closeMobile}
                className={`flex flex-col items-center justify-center min-h-[48px] py-1 rounded-xl transition-colors cursor-pointer ${
                  active
                    ? 'text-accent-text font-bold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <Icon size={19} className={active ? 'text-accent-text' : 'opacity-80'} />
                <span className="text-[10px] mt-0.5 tracking-tight truncate">{label}</span>
              </Link>
            );
          })}

          {/* More / Menu Drawer Trigger */}
          <button
            type="button"
            onClick={toggleMobile}
            className={`flex flex-col items-center justify-center min-h-[48px] py-1 rounded-xl transition-colors cursor-pointer ${
              isMobileOpen
                ? 'text-accent-text font-bold'
                : 'text-text-muted hover:text-text-primary'
            }`}
            aria-label="Open secondary navigation drawer"
          >
            <Menu size={19} className={isMobileOpen ? 'text-accent-text' : 'opacity-80'} />
            <span className="text-[10px] mt-0.5 tracking-tight">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
