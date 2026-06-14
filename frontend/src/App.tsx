import { Navigate, Route, Routes } from 'react-router-dom';
import { ReactNode } from 'react';
import { useAuth } from './auth/AuthContext';
import Landing from './pages/Landing';
import Register from './pages/Register';
import Login from './pages/Login';
import Tutorial from './pages/Tutorial';
import EmailVerify from './pages/EmailVerify';
import FacialOnboarding from './pages/FacialOnboarding';
import Dashboard from './pages/Dashboard';
import NewComplaint from './pages/NewComplaint';
import MyReports from './pages/MyReports';
import ReportDetail from './pages/ReportDetail';
import Track from './pages/Track';
import OficialLogin from './pages/OficialLogin';
import OficialPanel from './pages/OficialPanel';

function Loading() {
  return <div className="grid min-h-screen place-items-center text-slate-400">Cargando…</div>;
}

// Logged in only
function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Logged in AND onboarding complete (email verified + facial done)
function RequireOnboarding({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.correoVerificado) return <Navigate to="/onboarding/correo" replace />;
  if (!user.facialCompleto) return <Navigate to="/onboarding/rostro" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/seguimiento" element={<Track />} />
      <Route path="/oficial/login" element={<OficialLogin />} />
      <Route path="/oficial" element={<OficialPanel />} />

      <Route path="/tutorial" element={<Protected><Tutorial /></Protected>} />
      <Route path="/onboarding/correo" element={<Protected><EmailVerify /></Protected>} />
      <Route path="/onboarding/rostro" element={<Protected><FacialOnboarding /></Protected>} />

      <Route path="/app" element={<RequireOnboarding><Dashboard /></RequireOnboarding>} />
      <Route path="/denuncia/nueva" element={<RequireOnboarding><NewComplaint /></RequireOnboarding>} />
      <Route path="/mis-denuncias" element={<RequireOnboarding><MyReports /></RequireOnboarding>} />
      <Route path="/denuncia/:id" element={<RequireOnboarding><ReportDetail /></RequireOnboarding>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
