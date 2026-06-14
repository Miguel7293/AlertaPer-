import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Page, Card, Button, Field, Alert } from '../components/ui';
import { api, setAccessToken } from '../api/client';

export default function OficialLogin() {
  const nav = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(''); setBusy(true);
    try {
      const res = await api.post('/auth/oficial/login', { usuario, contrasena }, false);
      setAccessToken(res.access_token);
      nav('/oficial');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <h1 className="mb-1 text-xl font-bold text-slate-900">Acceso institucional</h1>
      <p className="mb-5 text-sm text-slate-500">Personal PNP / Ministerio Público.</p>
      <Card>
        <div className="space-y-4">
          {error && <Alert kind="error">{error}</Alert>}
          <Field label="Usuario" value={usuario} onChange={setUsuario} maxLength={120} placeholder="usuario, correo o DNI" />
          <Field label="Contraseña" type="password" value={contrasena} onChange={setContrasena} maxLength={72} />
          <Button onClick={submit} disabled={busy || !usuario || !contrasena}>{busy ? 'Ingresando…' : 'Ingresar'}</Button>
          <p className="text-center text-sm text-slate-500">
            ¿Eres ciudadano? <Link to="/login" className="font-semibold text-brand-600">Inicia sesión aquí</Link>
          </p>
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-center text-xs text-slate-400">
            Demo: <b>admin/Admin1234</b> · <b>encargado/Encargado1234</b> · <b>policia/Policia1234</b> · <b>fiscal/Fiscal1234</b>
          </div>
        </div>
      </Card>
    </Page>
  );
}
