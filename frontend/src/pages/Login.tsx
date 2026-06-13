import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Page, Card, Button, Field, Alert } from '../components/ui';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [identificador, setIdentificador] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(''); setBusy(true);
    try {
      const user = await login(identificador, contrasena);
      if (!user.correoVerificado) nav('/onboarding/correo');
      else if (!user.facialCompleto) nav('/onboarding/rostro');
      else nav('/app');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <h1 className="mb-1 text-xl font-bold text-slate-900">Iniciar sesión</h1>
      <p className="mb-5 text-sm text-slate-500">Ingresa como denunciante.</p>
      <Card>
        <div className="space-y-4">
          {error && <Alert kind="error">{error}</Alert>}
          <Field label="DNI o correo" value={identificador} onChange={setIdentificador} />
          <Field label="Contraseña" type="password" value={contrasena} onChange={setContrasena} />
          <Button onClick={submit} disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</Button>
          <p className="text-center text-sm text-slate-500">
            ¿No tienes cuenta? <Link to="/register" className="font-semibold text-brand-600">Regístrate</Link>
          </p>
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-center text-xs text-slate-400">
            Demo: DNI <b>12345678</b> · contraseña <b>Demo1234</b>
          </div>
        </div>
      </Card>
    </Page>
  );
}
