import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      authAPI.getMe()
        .then(r => {
          setUser(r.data);
          localStorage.setItem('user', JSON.stringify(r.data));
        })
        .catch(() => {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login(email, password);
    const { access_token, user: userData } = res.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setUser(null);
    toast.success('Logged out successfully');
  }, []);

  const hasRole = useCallback((roles) => {
    if (!user) return false;
    if (typeof roles === 'string') return user.role === roles;
    return roles.includes(user.role);
  }, [user]);

  const canAccess = useCallback((feature) => {
    if (!user) return false;
    const roleAccess = {
      'admin': ['ADMIN'],
      'audit_logs': ['ADMIN', 'JUDGE'],
      'model_performance': ['ADMIN', 'JUDGE', 'CASE_MANAGER'],
      'fairness': ['ADMIN', 'JUDGE'],
      'delete_participant': ['ADMIN'],
      'submit_review': ['JUDGE'],
      'manage_users': ['ADMIN'],
    };
    return roleAccess[feature]?.includes(user.role) ?? true;
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, hasRole, canAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
