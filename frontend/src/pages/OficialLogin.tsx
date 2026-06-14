import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Button, Field, Logo } from '../components/ui';
import { api, setAccessToken } from '../api/client';

export default function OficialLogin() {
  const nav = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    setError('');
    setBusy(true);
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
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[minmax(420px,0.9fr)_minmax(520px,1.1fr)]">
      <section className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-600/20" />
        <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-brand-600/10" />
        <div className="relative">
          <Logo className="h-12" light />
        </div>
        <div className="relative max-w-xl">
          <span className="inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
            Portal institucional
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Gestión segura de denuncias ciudadanas.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
            Accede a la bandeja operativa, administra personal y da seguimiento a los casos dentro de tu ámbito institucional.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-6 text-sm">
            <div><p className="font-bold text-white">PNP</p><p className="mt-1 text-xs text-slate-400">Gestión policial</p></div>
            <div><p className="font-bold text-white">Fiscalía</p><p className="mt-1 text-xs text-slate-400">Casos derivados</p></div>
            <div><p className="font-bold text-white">Mininter</p><p className="mt-1 text-xs text-slate-400">Supervisión nacional</p></div>
          </div>
        </div>
        <p className="relative text-xs text-slate-500">DenunciaPE · Acceso restringido a personal autorizado</p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link to="/"><Logo className="h-11" /></Link>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-7">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">Acceso institucional</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Inicia sesión</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Ingresa tus credenciales asignadas por la institución.</p>
            </div>
            <form className="space-y-4" onSubmit={submit}>
              {error && <Alert kind="error">{error}</Alert>}
              <Field label="Usuario institucional" value={usuario} onChange={setUsuario} maxLength={120} placeholder="Usuario, correo o DNI" />
              <Field label="Contraseña" type="password" value={contrasena} onChange={setContrasena} maxLength={72} />
              <Button type="submit" disabled={busy || !usuario || !contrasena}>{busy ? 'Ingresando...' : 'Ingresar al panel'}</Button>
            </form>
            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="text-center text-sm text-slate-500">
                ¿Eres ciudadano? <Link to="/login" className="font-semibold text-brand-700 hover:underline">Accede aquí</Link>
              </p>
            </div>
          </div>
          <details className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
            <summary className="cursor-pointer font-semibold text-slate-600">Credenciales de demostración</summary>
            <div className="mt-3 grid gap-1.5">
              <span><b>admin</b> / Admin1234</span>
              <span><b>encargado</b> / Encargado1234</span>
              <span><b>policia</b> / Policia1234</span>
              <span><b>fiscal</b> / Fiscal1234</span>
            </div>
          </details>
        </div>
      </section>
    </div>
  );
}
