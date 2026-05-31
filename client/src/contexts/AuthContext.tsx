// ===== 用户认证上下文 =====
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { getAccessHeaders } from '@shared/services/access';
import type { User, UserRole } from '@shared/types';

interface AuthContextType {
  user: User | null;
  loginError: string | null;
  login: (name: string, role: UserRole, password?: string) => Promise<void>;
  register: (name: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
  clearLoginError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('story-ai-user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('story-ai-token');
  });
  const [loginError, setLoginError] = useState<string | null>(null);

  const login = useCallback(async (name: string, role: UserRole, password?: string) => {
    setLoginError(null);
    try {
      const body: any = { name, role };
      if (password) body.password = password;

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAccessHeaders() },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || '登录失败');

      const { user: serverUser, token: serverToken } = data.data;
      localStorage.setItem('story-ai-user', JSON.stringify(serverUser));
      localStorage.setItem('story-ai-token', serverToken);
      setUser(serverUser);
      setToken(serverToken);
    } catch (err: any) {
      const msg = err?.message || '网络连接失败';
      setLoginError(msg);
      throw err;
    }
  }, []);

  const register = useCallback(async (name: string, password: string, role: UserRole) => {
    setLoginError(null);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAccessHeaders() },
      body: JSON.stringify({ name, password, role }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || '注册失败');

    const { user: serverUser, token: serverToken } = data.data;
    localStorage.setItem('story-ai-user', JSON.stringify(serverUser));
    localStorage.setItem('story-ai-token', serverToken);
    setUser(serverUser);
    setToken(serverToken);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('story-ai-user');
    localStorage.removeItem('story-ai-token');
    setUser(null);
    setToken(null);
  }, []);

  const clearLoginError = useCallback(() => setLoginError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loginError,
        login,
        register,
        logout,
        clearLoginError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用');
  return ctx;
}
