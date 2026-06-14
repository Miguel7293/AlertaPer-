import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page, Card, Button, Field, Alert } from '../components/ui';
import { api, setAccessToken } from '../api/client';

const ALCANCE: Record<string, string> = {
  super_admin: 'Acceso nacional: visualiza todas las denuncias y administra el sistema.',
  encargado_comisaria: 'Gestiona las denuncias de tu comisaría y a tu personal.',
  policia: 'Ves las denuncias de tu comisaría y puedes tomar y dar seguimiento a un caso.',
  fiscal: 'Ves el detalle completo de las denuncias derivadas a fiscalía.',
};

const ROL_NOMBRE: Record<string, string> = {
  super_admin: 'Super Administrador',
  encargado_comisaria: 'Encargado de Comisaría',
  policia: 'Policía',
  fiscal: 'Fiscal',
};

const EMPTY = {
  usuario: '', primerNombre: '', apellidoPaterno: '', apellidoMaterno: '',
  dni: '', correoElectronico: '', contrasena: '', rol: 'policia', comisariaId: '',
};

export default function OficialPanel() {
  const nav = useNavigate();
  const [me, setMe] = useState<any>(null);
  const [oficiales, setOficiales] = useState<any[]>([]);
  const [comisarias, setComisarias] = useState<any[]>([]);
  const [f, setF] = useState({ ...EMPTY });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });

  const canManage = me && (me.rol === 'super_admin' || me.rol === 'encargado_comisaria');
  const isSuper = me?.rol === 'super_admin';

  async function loadManage() {
    try {
      setOficiales(await api.get('/auth/oficial/usuarios'));
      if (me?.rol === 'super_admin') setComisarias(await api.get('/auth/oficial/comisarias'));
    } catch { /* ignore */ }
  }

  useEffect(() => {
    api.get('/auth/oficial/me').then(setMe).catch(() => nav('/oficial/login'));
    // eslint-disable-next-line
  }, []);
  useEffect(() => { if (canManage) loadManage(); /* eslint-disable-next-line */ }, [me]);

  async function logout() {
    try { await api.post('/auth/logout', {}, false); } catch { /* ignore */ }
    setAccessToken(null);
    nav('/oficial/login');
  }

  async function crear() {
    setError(''); setOk(''); setBusy(true);
    try {
      const payload: any = {
        usuario: f.usuario, primerNombre: f.primerNombre, apellidoPaterno: f.apellidoPaterno,
        apellidoMaterno: f.apellidoMaterno, dni: f.dni, correoElectronico: f.correoElectronico,
        contrasena: f.contrasena,
      };
      if (isSuper) {
        payload.rol = f.rol;
        if (f.rol !== 'fiscal') payload.comisariaId = f.comisariaId || undefined;
      }
      const nuevo = await api.post('/auth/oficial/usuarios', payload);
      setOk(`Cuenta creada: ${nuevo.usuario} (${nuevo.rolNombre})`);
      setF({ ...EMPTY });
      loadManage();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!me) return <Page><p className="text-sm text-slate-400">Cargando…</p></Page>;

  return (
    <Page>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Panel institucional</h1>
        <button onClick={logout} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Salir</button>
      </div>

      <Card>
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l7 4v5c0 4-3 7-7 9-4-2-7-5-7-9V7l7-4z" /></svg>
          </div>
          <div>
            <p className="font-semibold text-slate-900">{me.primerNombre} {me.apellidoPaterno}</p>
            <p className="text-sm text-slate-500">@{me.usuario}</p>
          </div>
        </div>
        <dl className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">Rol</dt><dd className="font-medium text-brand-700">{me.rolNombre ?? '—'}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Comisaría</dt><dd className="font-medium">{me.comisaria ?? 'Alcance nacional'}</dd></div>
        </dl>
        <p className="mt-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{ALCANCE[me.rol] ?? 'Acceso institucional.'}</p>
      </Card>

      {canManage && (
        <Card className="mt-4">
          <h2 className="mb-1 font-semibold text-slate-900">Crear cuenta</h2>
          <p className="mb-4 text-sm text-slate-500">
            {isSuper ? 'Crea encargados, policías o fiscales.' : 'Crea policías para tu comisaría.'}
          </p>
          <div className="space-y-3">
            {error && <Alert kind="error">{error}</Alert>}
            {ok && <Alert kind="success">{ok}</Alert>}
            {isSuper && (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Rol</span>
                <select value={f.rol} onChange={(e) => set('rol')(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                  <option value="policia">Policía</option>
                  <option value="encargado_comisaria">Encargado de Comisaría</option>
                  <option value="fiscal">Fiscal</option>
                </select>
              </label>
            )}
            {isSuper && f.rol !== 'fiscal' && (
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Comisaría</span>
                <select value={f.comisariaId} onChange={(e) => set('comisariaId')(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                  <option value="">Selecciona…</option>
                  {comisarias.map((c) => <option key={c.id} value={c.id}>{c.descripcion}</option>)}
                </select>
              </label>
            )}
            <Field label="Usuario" value={f.usuario} onChange={set('usuario')} maxLength={120} placeholder="ej. jperez" />
            <Field label="Primer nombre" value={f.primerNombre} onChange={set('primerNombre')} maxLength={60} />
            <Field label="Apellido paterno" value={f.apellidoPaterno} onChange={set('apellidoPaterno')} maxLength={60} />
            <Field label="Apellido materno" value={f.apellidoMaterno} onChange={set('apellidoMaterno')} maxLength={60} />
            <Field label="DNI" value={f.dni} onChange={set('dni')} digitsOnly maxLength={8} inputMode="numeric" placeholder="8 dígitos" />
            <Field label="Correo institucional" type="email" value={f.correoElectronico} onChange={set('correoElectronico')} maxLength={120} />
            <Field label="Contraseña" type="password" value={f.contrasena} onChange={set('contrasena')} maxLength={72} hint="Entre 8 y 72 caracteres" />
            <Button onClick={crear} disabled={busy}>{busy ? 'Creando…' : 'Crear cuenta'}</Button>
          </div>
        </Card>
      )}

      {canManage && (
        <Card className="mt-4">
          <h2 className="mb-3 font-semibold text-slate-900">Cuentas {isSuper ? 'del sistema' : 'de mi comisaría'} ({oficiales.length})</h2>
          {oficiales.length === 0 ? (
            <p className="text-sm text-slate-400">Aún no hay cuentas.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {oficiales.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{o.primerNombre} {o.apellidoPaterno} <span className="text-slate-400">@{o.usuario}</span></p>
                    <p className="text-xs text-slate-500">{o.comisaria ?? 'Alcance nacional'}</p>
                  </div>
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">{ROL_NOMBRE[o.rol] ?? o.rolNombre}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </Page>
  );
}
