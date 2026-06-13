import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { ReactNode } from 'react';
import Landing from './pages/Landing';
import Register from './pages/Register';
import Login from './pages/Login';
import Tutorial from './pages/Tutorial';
import Dashboard from './pages/Dashboard';
import NewComplaint from './pages/NewComplaint';
import MyReports from './pages/MyReports';
import ReportDetail from './pages/ReportDetail';
import Track from './pages/Track';

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="grid min-h-screen place-items-center text-slate-400">Cargando…</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/track" element={<Track />} />
      <Route path="/tutorial" element={<Protected><Tutorial /></Protected>} />
      <Route path="/app" element={<Protected><Dashboard /></Protected>} />
      <Route path="/denuncia/nueva" element={<Protected><NewComplaint /></Protected>} />
      <Route path="/mis-denuncias" element={<Protected><MyReports /></Protected>} />
      <Route path="/denuncia/:id" element={<Protected><ReportDetail /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
