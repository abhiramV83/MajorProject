import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import BrandWordmark from '../components/BrandWordmark';
import {
  ArrowRight,
  Lock,
  Mail,
  Scale,
  UserCheck,
  Shield,
  Sun,
  Moon,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const isDemoAuthEnabled = import.meta.env.VITE_ENABLE_DEMO_AUTH === 'true' || (import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_AUTH !== 'false');

  const [email, setEmail] = useState(() => (isDemoAuthEnabled ? 'judge@drugcourt.gov' : ''));
  const [password, setPassword] = useState(() => (isDemoAuthEnabled ? 'judge123' : ''));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isDemoAuthEnabled) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('auto') === 'judge') {
      handleQuickLogin(demoAccounts[0]);
    }
  }, [isDemoAuthEnabled]);

  const demoAccounts = [
    {
      role: 'Judge',
      email: 'judge@drugcourt.gov',
      password: 'judge123',
      icon: Scale,
      desc: 'Full disposition authority (Accept / Modify / Reject / Defer)',
    },
    {
      role: 'Case Manager',
      email: 'casemanager@drugcourt.gov',
      password: 'case123',
      icon: UserCheck,
      desc: 'Dynamic supervision, drug screen logging, intake assessments',
    },
    {
      role: 'Court Administrator',
      email: 'admin@drugcourt.gov',
      password: 'admin123',
      icon: Shield,
      desc: 'System governance, model benchmarks, cryptographic audit logs',
    },
  ];

  const handleQuickLogin = async (acc) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setLoading(true);
    try {
      await login(acc.email, acc.password);
      toast.success(`Logged in as ${acc.role}`);
      navigate('/dashboard');
    } catch {
      toast.error('Unable to authenticate');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!email || !password) return toast.error('Enter email and password');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {
      toast.error('Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-bg-base text-text-primary flex flex-col justify-between selection:bg-accent-raw/20 transition-colors p-3.5 sm:p-6 lg:p-8 relative">
      {/* Background Ambience Layer with strict overflow clipping */}
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-32 left-1/4 -translate-x-1/2 w-[650px] h-[520px] rounded-full blur-[140px] opacity-40 dark:opacity-30 bg-accent-raw" />
        <div className="absolute -bottom-28 right-1/4 translate-x-1/3 w-[550px] h-[450px] rounded-full blur-[150px] opacity-25 dark:opacity-20 bg-highlight-pink" />
        <div className="ribbed-glass-overlay absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg-base/40 to-bg-base" />
      </div>

      {/* Glass Pill Top Bar with Brand & Theme Toggle */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between relative z-10 pt-safe">
        <Link to="/" className="flex items-center min-h-[44px] hover:opacity-90 transition-opacity">
          <BrandWordmark size="sm" />
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="text-xs font-semibold text-text-muted hover:text-text-primary min-h-[44px] px-3.5 py-2 rounded-full bg-bg-surface border border-border-ui/50 hover:border-accent-text transition-colors shrink-0 inline-flex items-center"
          >
            ← <span className="hidden sm:inline">Public </span>Portal
          </Link>

          <button
            onClick={toggleTheme}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            className="w-11 h-11 rounded-full bg-bg-surface border border-border-ui/50 text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            {isDark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </header>

      {/* Main Authentication Grid */}
      <main className="w-full max-w-4xl mx-auto my-auto py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center relative z-10 min-w-0">
        {/* Left Side: System Context & 1-Click Evaluation Roles */}
        <div className="lg:col-span-6 min-w-0 w-full space-y-5 sm:space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-4xl font-extralight tracking-tight text-text-primary font-display">
              Court Decision Support System
            </h1>
            <p className="text-sm text-text-secondary leading-relaxed">
              Transparent, equitable, and dynamic supervision analytics for post-conviction diversion.
            </p>
          </div>

          {/* Quick Demo Switcher Card (Only rendered when demo auth is enabled) */}
          {isDemoAuthEnabled && (
            <div className="p-3.5 sm:p-5 rounded-3xl bg-bg-surface/80 backdrop-blur-md border border-border-ui/50 shadow-xs space-y-3 w-full max-w-full overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-border-ui/30">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted font-mono">
                    Auto Login
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-bold border border-amber-500/25 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Testing Only
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent-primary/10 text-accent-text font-semibold border border-accent-primary/20">
                  1-Click Sign In
                </span>
              </div>

              <p className="text-[11px] text-text-muted leading-relaxed">
                <strong className="text-text-secondary">Testing &amp; Demonstration Only:</strong> Select an auto-login role below for instant workspace evaluation.
              </p>

              <div className="space-y-2 w-full max-w-full">
                {demoAccounts.map((acc) => {
                  const Icon = acc.icon;
                  const isSelected = email === acc.email;
                  return (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => handleQuickLogin(acc)}
                      disabled={loading}
                      className={`w-full max-w-full text-left p-3 rounded-2xl border transition-all flex items-start gap-3 group cursor-pointer overflow-hidden ${
                        isSelected
                          ? 'border-accent-text bg-accent-primary/10 text-text-primary shadow-xs'
                          : 'border-border-ui/40 bg-bg-base hover:bg-bg-surface hover:border-border-ui text-text-secondary'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                          isSelected
                            ? 'bg-accent-primary text-accent-primary-text'
                            : 'bg-bg-surface text-text-muted group-hover:text-text-primary'
                        }`}
                      >
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0 max-w-full overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                          <span className="text-xs font-bold text-text-primary group-hover:text-accent-text transition-colors flex items-center gap-1.5">
                            <span>Auto Login as {acc.role}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase">
                              Testing Only
                            </span>
                          </span>
                          <span className="text-[10px] sm:text-[11px] font-mono text-text-muted">
                            {acc.email}
                          </span>
                        </div>
                        <p className="text-[11px] text-text-muted line-clamp-1 mt-0.5 break-words">
                          {acc.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Credential Form in Clean Card */}
        <div className={isDemoAuthEnabled ? "lg:col-span-6 min-w-0 w-full" : "lg:col-span-6 min-w-0 w-full"}>
          <div className="bg-bg-surface/90 backdrop-blur-md rounded-3xl p-4 sm:p-8 border border-border-ui/50 shadow-sm relative overflow-hidden">
            <div className="space-y-1 mb-6">
              <h2 className="text-xl font-bold tracking-tight text-text-primary font-display">
                Sign In to Judicial Workspace
              </h2>
              <p className="text-xs text-text-muted">
                {isDemoAuthEnabled
                  ? "Enter your institutional credentials or use the auto-login testing roles on the left."
                  : "Enter your official court credentials to access the judicial evaluation system."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Institutional Email
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3.5 top-3.5 text-text-muted pointer-events-none"
                    size={18}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@drugcourt.gov"
                    required
                    className="w-full pl-10 pr-4 py-3 min-h-[48px] rounded-xl bg-bg-base border border-border-ui text-base text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-accent-primary focus:border-accent-primary outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3.5 top-3.5 text-text-muted pointer-events-none"
                    size={18}
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-4 py-3 min-h-[48px] rounded-xl bg-bg-base border border-border-ui text-base text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-accent-primary focus:border-accent-primary outline-none transition-all"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 min-h-[48px] rounded-full bg-accent-primary hover:bg-accent-hover text-accent-primary-text font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    'Verifying Session...'
                  ) : (
                    <>
                      <span>Enter Judicial Studio</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Footer Notice */}
      <footer className="w-full max-w-5xl mx-auto text-center py-4 px-4 text-xs text-text-muted relative z-10 text-balance">
        Drug Court DSS · Human-in-the-Loop Decision Support System · For judicial research & evaluation only.
      </footer>
    </div>
  );
}
