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
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/"><Logo className="h-11" /></Link>
          <Link to="/login" className="text-sm font-semibold text-brand-700 hover:underline">
            Acceso ciudadano
          </Link>
        </div>
      </header>

      <main className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-brand-50 to-transparent" />
        <div className="relative mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:py-16">
          <section className="max-w-xl">
            <span className="inline-flex rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-brand-700">
              Portal institucional
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl">
              Gestiona denuncias con claridad y trazabilidad.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">
              Revisa los casos de tu ámbito, acepta denuncias y consulta el expediente ciudadano desde un único panel seguro.
            </p>
            <div className="mt-8 grid max-w-lg gap-3 sm:grid-cols-3">
              {[
                ['PNP', 'Recepción y atención'],
                ['Fiscalía', 'Casos derivados'],
                ['MININTER', 'Supervisión nacional'],
              ].map(([title, text]) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="font-bold text-brand-700">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
              <div className="mb-7 flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50">
                  <img src="/IconoDenunciaPE-limpio.png" className="h-9 w-auto" alt="" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-700">Acceso restringido</p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Inicia sesión</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">Usa las credenciales asignadas por tu institución.</p>
                </div>
              </div>

              <form className="space-y-4" onSubmit={submit}>
                {error && <Alert kind="error">{error}</Alert>}
                <Field label="Usuario institucional" value={usuario} onChange={setUsuario} maxLength={120} placeholder="Usuario, correo o DNI" />
                <Field label="Contraseña" type="password" value={contrasena} onChange={setContrasena} maxLength={72} />
                <Button type="submit" disabled={busy || !usuario || !contrasena}>
                  {busy ? 'Ingresando...' : 'Ingresar al panel'}
                </Button>
              </form>

              <p className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
                ¿Necesitas presentar una denuncia?{' '}
                <Link to="/login" className="font-semibold text-brand-700 hover:underline">Ingresa como ciudadano</Link>
              </p>
            </div>

            <details className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
              <summary className="cursor-pointer font-semibold text-slate-700">Credenciales de demostración</summary>
              <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                <span><b>admin</b> / Admin1234</span>
                <span><b>encargado</b> / Encargado1234</span>
                <span><b>policia</b> / Policia1234</span>
                <span><b>fiscal</b> / Fiscal1234</span>
              </div>
            </details>
          </section>
        </div>
      </main>
    </div>
  );
}
