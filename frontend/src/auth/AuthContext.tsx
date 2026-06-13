import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, setAccessToken } from '../api/client';

export interface SeguroUser {
  id: string;
  role: string;
  dni: string;
  email: string | null;
  phone: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  hasFiledBefore: boolean;
  tutorialCompletedAt: number | null;
}

interface AuthState {
  user: SeguroUser | null;
  loading: boolean;
  register: (dni: string, password: string, email?: string, phone?: string) => Promise<SeguroUser>;
  login: (identifier: string, password: string) => Promise<SeguroUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const Ctx = createContext<AuthState>(null as any);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SeguroUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const me = await api.get<SeguroUser>('/auth/me');
        setUser(me);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function register(dni: string, password: string, email?: string, phone?: string) {
    const res = await api.post('/auth/register', { dni, password, email, phone }, false);
    setAccessToken(res.access_token);
    setUser(res.user);
    return res.user as SeguroUser;
  }

  async function login(identifier: string, password: string) {
    const res = await api.post('/auth/login', { identifier, password }, false);
    setAccessToken(res.access_token);
    setUser(res.user);
    return res.user as SeguroUser;
  }

  async function logout() {
    try {
      await api.post('/auth/logout', {}, false);
    } catch {
      // ignore
    }
    setAccessToken(null);
    setUser(null);
  }

  async function refreshUser() {
    const me = await api.get<SeguroUser>('/auth/me');
    setUser(me);
  }

  return (
    <Ctx.Provider value={{ user, loading, register, login, logout, refreshUser }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
