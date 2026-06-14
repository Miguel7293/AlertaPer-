import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, EstadoPill, Field, Logo } from '../components/ui';
import { api, setAccessToken } from '../api/client';

type Section = 'resumen' | 'denuncias' | 'cuentas';

type Oficial = {
  id: string;
  usuario: string;
  primerNombre: string | null;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  correoElectronico: string;
  dni: string;
  rol: string;
  rolNombre: string | null;
  comisariaId: string | null;
  comisaria: string | null;
};

type DenunciaResumen = {
  id: string;
  codigoSeguimiento: string | null;
  tipo: string | null;
  estado: string;
  distrito: string | null;
  comisaria: string | null;
  enviadoEn: string | null;
};

type Resumen = {
  metricas: {
    total: number;
    recibidas: number;
    investigacion: number;
    resueltas: number;
  };
  recientes: DenunciaResumen[];
};

const EMPTY = {
  usuario: '',
  primerNombre: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  dni: '',
  correoElectronico: '',
  contrasena: '',
  rol: 'policia',
  comisariaId: '',
};

const ALCANCE: Record<string, string> = {
  super_admin: 'Cobertura nacional',
  encargado_comisaria: 'Gestión de comisaría',
  policia: 'Atención e investigación',
  fiscal: 'Expedientes derivados',
};

const ROL_NOMBRE: Record<string, string> = {
  super_admin: 'Super Administrador',
  encargado_comisaria: 'Encargado de Comisaría',
  policia: 'Policía',
  fiscal: 'Fiscal',
};

function Icon({ name, className = 'h-5 w-5' }: { name: string; className?: string }) {
  const paths: Record<string, ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h6" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    close: <path d="m18 6-12 12M6 6l12 12" />,
  };
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function NavButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
        active ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  );
}

function MetricCard({
  label,
  value,
  tone,
  note,
}: {
  label: string;
  value: number;
  tone: 'red' | 'amber' | 'blue' | 'green';
  note: string;
}) {
  const colors = {
    red: 'bg-brand-50 text-brand-700 ring-brand-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  }[tone];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`mb-4 inline-flex rounded-xl p-2.5 ring-1 ${colors}`}>
        <Icon name="file" />
      </div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-2 text-xs text-slate-400">{note}</p>
    </div>
  );
}

function SectionTitle({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

export default function OficialPanel() {
  const nav = useNavigate();
  const [section, setSection] = useState<Section>('resumen');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [me, setMe] = useState<Oficial | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [oficiales, setOficiales] = useState<Oficial[]>([]);
  const [comisarias, setComisarias] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [f, setF] = useState({ ...EMPTY });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  const canManage = me?.rol === 'super_admin' || me?.rol === 'encargado_comisaria';
  const isSuper = me?.rol === 'super_admin';
  const set = (key: keyof typeof f) => (value: string) => setF((current) => ({ ...current, [key]: value }));

  async function loadDashboard() {
    const data = await api.get<Resumen>('/auth/oficial/resumen');
    setResumen(data);
  }

  async function loadManage(user: Oficial) {
    if (user.rol !== 'super_admin' && user.rol !== 'encargado_comisaria') return;
    const [usuarios, sedes] = await Promise.all([
      api.get<Oficial[]>('/auth/oficial/usuarios'),
      user.rol === 'super_admin' ? api.get<any[]>('/auth/oficial/comisarias') : Promise.resolve([]),
    ]);
    setOficiales(usuarios);
    setComisarias(sedes);
  }

  useEffect(() => {
    Promise.all([
      api.get<Oficial>('/auth/oficial/me'),
      api.get<Resumen>('/auth/oficial/resumen'),
    ])
      .then(([user, data]) => {
        setMe(user);
        setResumen(data);
        loadManage(user);
      })
      .catch(() => nav('/oficial/login'));
  }, []);

  const filteredOfficials = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return oficiales;
    return oficiales.filter((o) =>
      [o.primerNombre, o.apellidoPaterno, o.usuario, o.dni, o.rolNombre, o.comisaria]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized)),
    );
  }, [oficiales, query]);

  async function logout() {
    try {
      await api.post('/auth/logout', {}, false);
    } finally {
      setAccessToken(null);
      nav('/oficial/login');
    }
  }

  async function crear() {
    setError('');
    setOk('');
    setBusy(true);
    try {
      const payload: any = {
        usuario: f.usuario,
        primerNombre: f.primerNombre,
        apellidoPaterno: f.apellidoPaterno,
        apellidoMaterno: f.apellidoMaterno,
        dni: f.dni,
        correoElectronico: f.correoElectronico,
        contrasena: f.contrasena,
      };
      if (isSuper) {
        payload.rol = f.rol;
        if (f.rol !== 'fiscal') payload.comisariaId = f.comisariaId || undefined;
      }
      const nuevo = await api.post<Oficial>('/auth/oficial/usuarios', payload);
      setOk(`Cuenta creada para ${nuevo.primerNombre} ${nuevo.apellidoPaterno}.`);
      setF({ ...EMPTY });
      if (me) await loadManage(me);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function changeSection(next: Section) {
    setSection(next);
    setMobileMenu(false);
  }

  if (!me || !resumen) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <div className="text-center">
          <img src="/IconoDenunciaPE.png" className="mx-auto h-14 w-auto" alt="" />
          <p className="mt-3 text-sm text-slate-500">Cargando panel institucional...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: 'resumen' as const, label: 'Resumen', icon: 'dashboard' },
    { id: 'denuncias' as const, label: 'Denuncias', icon: 'file' },
    ...(canManage ? [{ id: 'cuentas' as const, label: 'Personal', icon: 'users' }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-20 items-center border-b border-slate-100 px-6">
          <Logo className="h-10" />
        </div>
        <div className="flex-1 px-4 py-6">
          <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Gestión institucional</p>
          <nav className="space-y-1.5">
            {navItems.map((item) => (
              <NavButton key={item.id} active={section === item.id} icon={item.icon} label={item.label} onClick={() => changeSection(item.id)} />
            ))}
          </nav>
        </div>
        <div className="border-t border-slate-100 p-4">
          <div className="mb-3 rounded-xl bg-slate-50 p-3">
            <p className="truncate text-sm font-semibold">{me.primerNombre} {me.apellidoPaterno}</p>
            <p className="truncate text-xs text-slate-500">{me.rolNombre}</p>
          </div>
          <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-brand-50 hover:text-brand-700">
            <Icon name="logout" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:h-20 lg:px-8">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileMenu((open) => !open)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Abrir menú">
                <Icon name={mobileMenu ? 'close' : 'menu'} />
              </button>
              <div className="lg:hidden"><Logo className="h-9" /></div>
              <div className="hidden lg:block">
                <p className="text-sm font-semibold text-slate-800">{ALCANCE[me.rol] ?? 'Acceso institucional'}</p>
                <p className="text-xs text-slate-500">{me.comisaria ?? 'DenunciaPE - Gestión nacional'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold">{me.primerNombre} {me.apellidoPaterno}</p>
                <p className="text-xs text-slate-500">{me.rolNombre}</p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                {(me.primerNombre?.[0] ?? 'U')}{(me.apellidoPaterno?.[0] ?? '')}
              </div>
            </div>
          </div>
          {mobileMenu && (
            <nav className="space-y-1 border-t border-slate-100 bg-white px-4 py-3 lg:hidden">
              {navItems.map((item) => (
                <NavButton key={item.id} active={section === item.id} icon={item.icon} label={item.label} onClick={() => changeSection(item.id)} />
              ))}
              <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
                <Icon name="logout" /> Cerrar sesión
              </button>
            </nav>
          )}
        </header>

        <main className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">
          {section === 'resumen' && (
            <>
              <SectionTitle
                title={`Buenas tardes, ${me.primerNombre ?? 'usuario'}`}
                description={`Este es el estado operativo de ${me.comisaria ?? 'la plataforma nacional'}.`}
                action={<button onClick={loadDashboard} className="self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Actualizar datos</button>}
              />
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Total registradas" value={resumen.metricas.total} tone="red" note="Denuncias dentro de tu alcance" />
                <MetricCard label="Nuevas recibidas" value={resumen.metricas.recibidas} tone="amber" note="Pendientes de atención inicial" />
                <MetricCard label="En investigación" value={resumen.metricas.investigacion} tone="blue" note="Casos actualmente activos" />
                <MetricCard label="Resueltas" value={resumen.metricas.resueltas} tone="green" note="Casos concluidos" />
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.7fr)]">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div>
                      <h2 className="font-bold">Denuncias recientes</h2>
                      <p className="text-xs text-slate-500">Últimos movimientos dentro de tu alcance.</p>
                    </div>
                    <button onClick={() => setSection('denuncias')} className="text-sm font-semibold text-brand-700">Ver todas</button>
                  </div>
                  <DenunciasTable denuncias={resumen.recientes.slice(0, 6)} compact />
                </div>
                <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
                  <div className="mb-6 inline-flex rounded-xl bg-white/10 p-3"><Icon name="shield" /></div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Tu acceso</p>
                  <h2 className="mt-2 text-xl font-bold">{me.rolNombre}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {me.rol === 'super_admin' && 'Administras personal y supervisas denuncias a nivel nacional.'}
                    {me.rol === 'encargado_comisaria' && 'Gestionas el personal y las denuncias asignadas a tu comisaría.'}
                    {me.rol === 'policia' && 'Atiendes y das seguimiento a las denuncias de tu comisaría.'}
                    {me.rol === 'fiscal' && 'Accedes únicamente a expedientes derivados a tu despacho.'}
                  </p>
                  {me.comisaria && <p className="mt-5 border-t border-white/10 pt-4 text-sm font-medium">{me.comisaria}</p>}
                </div>
              </div>
            </>
          )}

          {section === 'denuncias' && (
            <>
              <SectionTitle title="Bandeja de denuncias" description="Consulta los casos disponibles según tu rol y ámbito institucional." />
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-4 sm:p-5">
                  <div className="relative max-w-md">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"><Icon name="search" className="h-4 w-4" /></span>
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por código, distrito o estado" className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
                  </div>
                </div>
                <DenunciasTable
                  denuncias={resumen.recientes.filter((d) =>
                    [d.codigoSeguimiento, d.distrito, d.estado, d.comisaria].filter(Boolean).some((v) => String(v).toLowerCase().includes(query.toLowerCase())),
                  )}
                />
              </div>
            </>
          )}

          {section === 'cuentas' && canManage && (
            <>
              <SectionTitle
                title="Gestión de personal"
                description={isSuper ? 'Administra las cuentas institucionales de DenunciaPE.' : 'Administra a los policías de tu comisaría.'}
                action={
                  <Button full={false} onClick={() => setShowCreate((open) => !open)}>
                    <Icon name={showCreate ? 'close' : 'plus'} className="h-4 w-4" />
                    {showCreate ? 'Cerrar formulario' : 'Nueva cuenta'}
                  </Button>
                }
              />

              {showCreate && (
                <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="mb-5">
                    <h2 className="font-bold text-slate-900">Registrar servidor público</h2>
                    <p className="text-sm text-slate-500">{isSuper ? 'Asigna el rol y la sede correspondiente.' : 'La cuenta quedará vinculada a tu comisaría.'}</p>
                  </div>
                  {error && <div className="mb-4"><Alert kind="error">{error}</Alert></div>}
                  {ok && <div className="mb-4"><Alert kind="success">{ok}</Alert></div>}
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {isSuper && (
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">Rol</span>
                        <select value={f.rol} onChange={(e) => set('rol')(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100">
                          <option value="policia">Policía</option>
                          <option value="encargado_comisaria">Encargado de Comisaría</option>
                          <option value="fiscal">Fiscal</option>
                        </select>
                      </label>
                    )}
                    {isSuper && f.rol !== 'fiscal' && (
                      <label className="block">
                        <span className="mb-1 block text-sm font-medium text-slate-700">Comisaría</span>
                        <select value={f.comisariaId} onChange={(e) => set('comisariaId')(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100">
                          <option value="">Selecciona una sede</option>
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
                    <Field label="Contraseña temporal" type="password" value={f.contrasena} onChange={set('contrasena')} maxLength={72} hint="Entre 8 y 72 caracteres" />
                  </div>
                  <div className="mt-5 flex justify-end">
                    <Button full={false} onClick={crear} disabled={busy}>{busy ? 'Creando...' : 'Crear cuenta'}</Button>
                  </div>
                </div>
              )}

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div>
                    <h2 className="font-bold">Personal registrado</h2>
                    <p className="text-xs text-slate-500">{oficiales.length} cuentas dentro de tu alcance.</p>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"><Icon name="search" className="h-4 w-4" /></span>
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar personal" className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
                  </div>
                </div>
                <PersonalTable oficiales={filteredOfficials} />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function DenunciasTable({ denuncias, compact = false }: { denuncias: DenunciaResumen[]; compact?: boolean }) {
  if (!denuncias.length) return <div className="px-5 py-12 text-center text-sm text-slate-400">No hay denuncias para mostrar.</div>;
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Código</th>
              <th className="px-5 py-3 font-semibold">Tipo</th>
              <th className="px-5 py-3 font-semibold">Ubicación</th>
              <th className="px-5 py-3 font-semibold">Estado</th>
              {!compact && <th className="px-5 py-3 font-semibold">Fecha</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {denuncias.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50">
                <td className="px-5 py-4 font-semibold text-slate-900">{d.codigoSeguimiento ?? 'Sin código'}</td>
                <td className="px-5 py-4 capitalize text-slate-600">{d.tipo ?? '-'}</td>
                <td className="px-5 py-4">
                  <p className="text-slate-700">{d.distrito ?? 'Sin distrito'}</p>
                  <p className="text-xs text-slate-400">{d.comisaria ?? 'Sin asignar'}</p>
                </td>
                <td className="px-5 py-4"><EstadoPill estado={d.estado} /></td>
                {!compact && <td className="px-5 py-4 text-slate-500">{d.enviadoEn ? new Date(d.enviadoEn).toLocaleDateString('es-PE') : '-'}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-slate-100 md:hidden">
        {denuncias.map((d) => (
          <div key={d.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{d.codigoSeguimiento ?? 'Sin código'}</p>
                <p className="mt-1 text-xs capitalize text-slate-500">{d.tipo ?? '-'} · {d.distrito ?? 'Sin distrito'}</p>
              </div>
              <EstadoPill estado={d.estado} />
            </div>
            <p className="mt-3 text-xs text-slate-400">{d.comisaria ?? 'Sin comisaría asignada'}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function PersonalTable({ oficiales }: { oficiales: Oficial[] }) {
  if (!oficiales.length) return <div className="px-5 py-12 text-center text-sm text-slate-400">No se encontraron cuentas.</div>;
  return (
    <div className="divide-y divide-slate-100">
      {oficiales.map((o) => (
        <div key={o.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1.3fr)_minmax(180px,0.8fr)_auto] sm:items-center sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
              {(o.primerNombre?.[0] ?? 'U')}{(o.apellidoPaterno?.[0] ?? '')}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{o.primerNombre} {o.apellidoPaterno}</p>
              <p className="truncate text-xs text-slate-500">@{o.usuario} · {o.correoElectronico}</p>
            </div>
          </div>
          <div>
            <p className="text-sm text-slate-700">{o.comisaria ?? 'Alcance nacional'}</p>
            <p className="text-xs text-slate-400">DNI {o.dni}</p>
          </div>
          <span className="w-fit rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
            {ROL_NOMBRE[o.rol] ?? o.rolNombre ?? o.rol}
          </span>
        </div>
      ))}
    </div>
  );
}
