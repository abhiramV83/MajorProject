import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return (
      <div className="p-10 max-w-xl mx-auto text-center mt-12 glass-card rounded-3xl border border-border-ui/40 dark:border-white/10 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto mb-4 font-bold text-xl">
          <ShieldAlert size={26} />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-bg-raised text-text-primary border border-border-ui/40 dark:border-white/10 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)] shrink-0" />
          ROLE ACCESS RESTRICTION
        </div>
        <h2 className="text-xl font-bold text-text-primary font-display">Restricted Judicial Role</h2>
        <p className="text-xs text-text-muted mt-2 leading-relaxed">
          Your active simulated role (<span className="font-semibold text-accent-text font-mono">{role}</span>) does
          not have authorization for this module. You can switch judicial roles using the selector in the top
          navigation bar.
        </p>
      </div>
    );
  }

  return children;
}
