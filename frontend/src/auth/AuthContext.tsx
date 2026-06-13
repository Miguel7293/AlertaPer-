import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, setAccessToken } from '../api/client';

export interface SeguroUser {
  id: string;
  tipo: string;
  dni: string;
  correoElectronico: string;
  primerNombre: string | null;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  telefono: string | null;
  correoVerificado: boolean;
  telefonoVerificado: boolean;
  haDenunciadoAntes: boolean;
  estadoIdentidad: string;
  facialCompleto: boolean;
  onboardingCompleto: boolean;
}

export interface RegisterPayload {
  dni: string;
  correoElectronico: string;
  primerNombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  fechaNacimiento: string;
  telefono?: string;
  fechaEmisionDni?: string;
  contrasena: string;
}

interface AuthState {
  user: SeguroUser | null;
  loading: boolean;
  register: (p: RegisterPayload) => Promise<SeguroUser>;
  login: (identificador: string, contrasena: string) => Promise<SeguroUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<SeguroUser>;
}

const Ctx = createContext<AuthState>(null as any);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SeguroUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setUser(await api.get<SeguroUser>('/auth/me'));
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function register(p: RegisterPayload) {
    const res = await api.post('/auth/register', p, false);
    setAccessToken(res.access_token);
    setUser(res.user);
    return res.user as SeguroUser;
  }

  async function login(identificador: string, contrasena: string) {
    const res = await api.post('/auth/login', { identificador, contrasena }, false);
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
    return me;
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
