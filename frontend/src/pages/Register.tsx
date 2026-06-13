import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Page, Card, Button, Field, Alert } from '../components/ui';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [dni, setDni] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError('');
    setBusy(true);
    try {
      const user = await register(dni, password, email || undefined, phone || undefined);
      nav(user.hasFiledBefore ? '/app' : '/tutorial');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <h1 className="mb-1 text-xl font-bold text-slate-900">Crear cuenta</h1>
      <p className="mb-5 text-sm text-slate-500">Regístrate como denunciante para iniciar tu denuncia.</p>
      <Card>
        <div className="space-y-4">
          {error && <Alert kind="error">{error}</Alert>}
          <Field label="DNI" value={dni} onChange={setDni} placeholder="8 dígitos" hint="Tu número de documento" />
          <Field label="Correo electrónico" type="email" value={email} onChange={setEmail} placeholder="opcional" />
          <Field label="Celular" value={phone} onChange={setPhone} placeholder="opcional, para notificaciones" />
          <Field label="Contraseña" type="password" value={password} onChange={setPassword} hint="Mínimo 8 caracteres" />
          <Button onClick={submit} disabled={busy}>{busy ? 'Creando…' : 'Crear cuenta'}</Button>
          <p className="text-center text-sm text-slate-500">
            ¿Ya tienes cuenta? <Link to="/login" className="font-semibold text-brand-600">Inicia sesión</Link>
          </p>
        </div>
      </Card>
    </Page>
  );
}
