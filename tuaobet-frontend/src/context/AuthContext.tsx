import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../services/api';
import { getSocket, refreshSocketAuth } from '../services/socket';

const TOKEN_KEY = 'tuaobet_token';
const USER_KEY = 'tuaobet_user';

export type UserRole = 'USER' | 'ADMIN';

export type UserAccountStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';

export interface User {
  id: string;
  username: string;
  email: string;
  balance: number;
  xp?: number;
  role?: UserRole;
  status?: UserAccountStatus;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  /** Primeiro /me após abrir a app (evita mostrar "sem permissão" antes da sessão atualizar). */
  authReady: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setUserBalance: (balance: number) => void;
  isLoginModalOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  isRegisterModalOpen: boolean;
  openRegisterModal: () => void;
  closeRegisterModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const persistUser = useCallback((u: User | null) => {
    if (u) {
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setUser(null);
      setAuthReady(true);
      return;
    }
    try {
      const me = await apiFetch<User>('/api/auth/me');
      setUser(me);
      persistUser(me);
      getSocket();
      refreshSocketAuth();
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      persistUser(null);
    } finally {
      setAuthReady(true);
    }
  }, [persistUser]);

  useEffect(() => {
    const saved = localStorage.getItem(USER_KEY);
    const token = localStorage.getItem(TOKEN_KEY);
    if (saved && token) {
      try {
        setUser(JSON.parse(saved) as User);
      } catch {
        localStorage.removeItem(USER_KEY);
      }
    }
    void refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const s = getSocket();
    const onBalance = (payload: { balance: number }) => {
      setUser((prev) => {
        if (!prev) return prev;
        const next = { ...prev, balance: payload.balance };
        persistUser(next);
        return next;
      });
    };
    s.on('wallet:balance', onBalance);
    return () => {
      s.off('wallet:balance', onBalance);
    };
  }, [persistUser]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await apiFetch<{ user: User; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem(TOKEN_KEY, data.token);
      setUser(data.user);
      persistUser(data.user);
      refreshSocketAuth();
      setIsLoginModalOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await apiFetch<{ user: User; token: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
      });
      localStorage.setItem(TOKEN_KEY, data.token);
      setUser(data.user);
      persistUser(data.user);
      refreshSocketAuth();
      setIsRegisterModalOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    persistUser(null);
    refreshSocketAuth();
  };

  const setUserBalance = useCallback((balance: number) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, balance };
      persistUser(next);
      return next;
    });
  }, [persistUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        authReady,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
        setUserBalance,
        isLoginModalOpen,
        openLoginModal: () => setIsLoginModalOpen(true),
        closeLoginModal: () => setIsLoginModalOpen(false),
        isRegisterModalOpen,
        openRegisterModal: () => setIsRegisterModalOpen(true),
        closeRegisterModal: () => setIsRegisterModalOpen(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
