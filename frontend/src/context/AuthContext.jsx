import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setAuthToken, getAuthToken } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(getAuthToken());
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login'); // 'login' | 'register'

  // Initialize session on mount
  useEffect(() => {
    async function initAuth() {
      const storedToken = localStorage.getItem('jal_satark_auth_token');
      if (storedToken) {
        setAuthToken(storedToken);
        setToken(storedToken);
        try {
          const res = await api.getMe();
          if (res.success && res.user) {
            setUser(res.user);
          } else {
            // Token expired or invalid
            setAuthToken(null);
            setToken(null);
            setUser(null);
          }
        } catch (err) {
          console.error('Failed to restore auth session:', err);
          setAuthToken(null);
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    }

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.login({ email, password });
      if (res.success && res.token) {
        setAuthToken(res.token);
        setToken(res.token);
        setUser(res.user);
        setIsAuthModalOpen(false);
        return { success: true, user: res.user };
      }
      return { success: false, error: res.error || 'Login failed. Please verify credentials.' };
    } catch (err) {
      return { success: false, error: err.message || 'Network error during login' };
    }
  };

  const register = async (userData) => {
    try {
      const res = await api.register(userData);
      if (res.success && res.token) {
        setAuthToken(res.token);
        setToken(res.token);
        setUser(res.user);
        setIsAuthModalOpen(false);
        return { success: true, user: res.user };
      }
      return { success: false, error: res.error || 'Registration failed.' };
    } catch (err) {
      return { success: false, error: err.message || 'Network error during registration' };
    }
  };

  const logout = () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
  };

  const openLoginModal = () => {
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  };

  const openRegisterModal = () => {
    setAuthModalMode('register');
    setIsAuthModalOpen(true);
  };

  const isDistrictAdmin = Boolean(
    user && ['district_admin', 'district_health_admin', 'admin', 'government'].includes(user.role?.toLowerCase())
  );
  const isHealthWorker = Boolean(
    user && ['health_worker', 'asha_worker', 'asha'].includes(user.role?.toLowerCase())
  );
  const isCitizen = !user || (!isDistrictAdmin && !isHealthWorker);

  const roleLabel = isDistrictAdmin
    ? 'District Health Admin'
    : isHealthWorker
    ? 'ASHA Worker'
    : 'Citizen / Volunteer';

  return (
    <AuthContext.Provider
      value={{
        user,
        currentUser: user,
        token,
        isAuthenticated: !!user,
        isDistrictAdmin,
        isHealthWorker,
        isCitizen,
        roleLabel,
        isLoading,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        openLoginModal,
        openRegisterModal,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
