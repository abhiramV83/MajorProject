import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Scale, AlertTriangle, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

const DEMO_ACCOUNTS = [
  { role: 'Administrator', email: 'admin@example.com', password: 'Admin123!', color: 'bg-purple-100 text-purple-700' },
  { role: 'Judge', email: 'judge@example.com', password: 'Judge123!', color: 'bg-blue-100 text-blue-700' },
  { role: 'Case Manager', email: 'manager@example.com', password: 'Manager123!', color: 'bg-teal-100 text-teal-700' },
  { role: 'Treatment Provider', email: 'provider@example.com', password: 'Provider123!', color: 'bg-green-100 text-green-700' },
  { role: 'Probation Officer', email: 'officer@example.com', password: 'Officer123!', color: 'bg-orange-100 text-orange-700' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Signed in successfully');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (account) => {
    setEmail(account.email);
    setPassword(account.password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
          <Scale size={28} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Drug Court DSS</h1>
        <p className="text-blue-300 text-sm mt-1">Decision Support System</p>
      </div>

      {/* Disclaimer */}
      <div className="w-full max-w-md mb-4 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
        <div className="flex items-start gap-2">
          <AlertTriangle size={15} className="text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-200 leading-relaxed">
            <strong>Research Prototype:</strong> This system uses synthetic/demo data only.
            All predictions are advisory and must be reviewed by qualified professionals.
            Not for operational or clinical use.
          </p>
        </div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-blue-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Sign In</h2>
          <p className="text-blue-200 text-xs mt-0.5">Enter your credentials to access the system</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Email Address</label>
            <input
              type="email"
              className="input"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="input pr-10"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-2.5"
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Signing in...</>
            ) : 'Sign In'}
          </button>
        </form>

        {/* Demo Accounts */}
        <div className="border-t border-slate-100 px-6 pb-6">
          <button
            onClick={() => setShowDemo(!showDemo)}
            className="flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800 mt-4 mb-3"
          >
            {showDemo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Demo Credentials
          </button>
          {showDemo && (
            <div className="space-y-1.5">
              <p className="text-xs text-slate-500 mb-2">Click any account to auto-fill credentials:</p>
              {DEMO_ACCOUNTS.map(acc => (
                <button
                  key={acc.email}
                  onClick={() => fillDemo(acc)}
                  className="w-full flex items-center justify-between px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${acc.color}`}>{acc.role}</span>
                  <span className="text-xs text-slate-500">{acc.email}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-500 text-center max-w-sm">
        Based on research: "Designing transparent, equitable, and efficient decision support systems for drug courts using machine learning"
      </p>
    </div>
  );
}
