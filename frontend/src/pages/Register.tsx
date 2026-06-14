import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Page, Card, Button, Field, Alert } from '../components/ui';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({
    primerNombre: '', apellidoPaterno: '', apellidoMaterno: '',
    dni: '', fechaNacimiento: '', correoElectronico: '', telefono: '', contrasena: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });

  async function submit() {
    setError(''); setBusy(true);
    try {
      await register(f);
      nav('/onboarding/correo');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <h1 className="mb-1 text-xl font-bold text-slate-900">Crear cuenta</h1>
      <p className="mb-5 text-sm text-slate-500">Regístrate como denunciante y completa tus datos.</p>
      <Card>
        <div className="space-y-4">
          {error && <Alert kind="error">{error}</Alert>}
          <Field label="Primer nombre" value={f.primerNombre} onChange={set('primerNombre')} />
          <Field label="Apellido paterno" value={f.apellidoPaterno} onChange={set('apellidoPaterno')} />
          <Field label="Apellido materno" value={f.apellidoMaterno} onChange={set('apellidoMaterno')} />
          <Field label="DNI" value={f.dni} onChange={set('dni')} placeholder="8 dígitos" />
          <Field label="Fecha de nacimiento" type="date" value={f.fechaNacimiento} onChange={set('fechaNacimiento')} />
          <Field label="Correo electrónico" type="email" value={f.correoElectronico} onChange={set('correoElectronico')} hint="Lo verificaremos en el siguiente paso" />
          <Field label="Celular" value={f.telefono} onChange={set('telefono')} placeholder="opcional" />
          <Field label="Contraseña" type="password" value={f.contrasena} onChange={set('contrasena')} hint="Mínimo 8 caracteres" />
          <Button onClick={submit} disabled={busy}>{busy ? 'Creando…' : 'Crear cuenta'}</Button>
          <p className="text-center text-sm text-slate-500">
            ¿Ya tienes cuenta? <Link to="/login" className="font-semibold text-brand-600">Inicia sesión</Link>
          </p>
        </div>
      </Card>
    </Page>
  );
}
