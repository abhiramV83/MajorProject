import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const isDemoEnabled = import.meta.env.VITE_ENABLE_DEMO_AUTH === 'true' || (import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_AUTH !== 'false');

  const [user, setUser] = useState(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const demo = params.get('demo_auth');
    if (isDemoEnabled && demo === 'judge') {
      return { id: 2, email: 'judge@drugcourt.gov', full_name: 'Hon. Patricia Vance', role: 'JUDGE' };
    }
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const demo = params.get('demo_auth');
    if (isDemoEnabled && demo === 'judge') {
      const demoToken = 'mock-jwt-token-lexis-ultra-judge';
      localStorage.setItem('access_token', demoToken);
      return demoToken;
    }
    return localStorage.getItem('access_token');
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      localStorage.setItem('access_token', token);
    } else {
      localStorage.removeItem('access_token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const demo = params.get('demo_auth');
    if (isDemoEnabled && demo === 'judge') {
      authAPI.login('judge@drugcourt.gov', 'judge123').then((res) => {
        if (res?.data?.access_token) {
          setToken(res.data.access_token);
          setUser(res.data.user);
          localStorage.setItem('access_token', res.data.access_token);
          localStorage.setItem('user', JSON.stringify(res.data.user));
        }
      }).finally(() => setLoading(false));
      return;
    }
    if (!token) {
      setLoading(false);
      return;
    }
    authAPI.getMe().then((response) => setUser(response.data)).catch(() => {
      setToken(null);
      setUser(null);
    }).finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await authAPI.login(email, password);
      setToken(res.data.access_token);
      setUser(res.data.user);
      toast.success(`Welcome, ${res.data.user.full_name}`);
      return res.data.user;
    } catch (err) {
      toast.error('Invalid credentials');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    toast.success('Signed out successfully');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        role: user?.role || 'JUDGE',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
