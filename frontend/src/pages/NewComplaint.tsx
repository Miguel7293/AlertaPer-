import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page, Card, Button, Field, TextArea, Alert, Stepper } from '../components/ui';
import { api } from '../api/client';

type Step = 'tipo' | 'lugar' | 'narrativa' | 'objetos' | 'sospechosos' | 'testigos' | 'review' | 'done';
const ORDER: Step[] = ['tipo', 'lugar', 'narrativa', 'objetos', 'sospechosos', 'testigos', 'review', 'done'];

interface Objeto { nombre: string; marcaModelo: string; valorAproximado: string }
interface Testigo { nombre: string; relacion: string; telefono: string }

const RELACIONES = ['familia directa', 'familia indirecta', 'amigo y/o conocido', 'extraño'];

export default function NewComplaint() {
  const nav = useNavigate();
  const [step, setStep] = useState<Step>('tipo');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [reportId, setReportId] = useState<string | null>(null);
  const [tipo, setTipo] = useState<'robo' | 'hurto' | ''>('');
  const [hora, setHora] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [provincia, setProvincia] = useState('');
  const [distrito, setDistrito] = useState('');
  const [referenciaUbicacion, setReferencia] = useState('');
  const [narrativa, setNarrativa] = useState('');
  const [objetos, setObjetos] = useState<Objeto[]>([{ nombre: '', marcaModelo: '', valorAproximado: '' }]);
  const [sospPersonal, setSospPersonal] = useState('');
  const [sospHuida, setSospHuida] = useState('');
  const [testigos, setTestigos] = useState<Testigo[]>([{ nombre: '', relacion: 'extraño', telefono: '' }]);
  const [resultado, setResultado] = useState<any>(null);

  const idx = ORDER.indexOf(step);
  const next = () => { setError(''); setStep(ORDER[idx + 1]); };

  async function ensure(): Promise<string> {
    if (reportId) return reportId;
    const r = await api.post('/denuncias');
    setReportId(r.id);
    return r.id;
  }
  async function save(patch: any) {
    const id = await ensure();
    await api.patch(`/denuncias/${id}`, patch);
  }

  async function enviar() {
    setError(''); setBusy(true);
    try {
      const id = await ensure();
      for (const o of objetos) {
        if (o.nombre.trim()) {
          await api.post(`/denuncias/${id}/objetos`, {
            nombre: o.nombre,
            marcaModelo: o.marcaModelo || undefined,
            valorAproximado: o.valorAproximado ? Number(o.valorAproximado) : undefined,
          });
        }
      }
      if (sospPersonal.trim() || sospHuida.trim()) {
        await api.post(`/denuncias/${id}/sospechosos`, {
          descripcionPersonal: sospPersonal || undefined,
          descripcionHuida: sospHuida || undefined,
        });
      }
      for (const t of testigos) {
        if (t.nombre.trim()) {
          await api.post(`/denuncias/${id}/testigos`, { nombre: t.nombre, relacion: t.relacion, telefono: t.telefono || undefined });
        }
      }
      const res = await api.post(`/denuncias/${id}/enviar`, { consentimientos: ['truthfulness', 'data_processing'] });
      setResultado(res);
      setStep('done');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      {step !== 'done' && (
        <>
          <p className="mb-2 text-sm font-medium text-slate-500">Nueva denuncia · paso {idx + 1} de {ORDER.length - 1}</p>
          <Stepper steps={ORDER.slice(0, -1)} current={idx} />
        </>
      )}
      {error && <div className="mb-4"><Alert kind="error">{error}</Alert></div>}

      {step === 'tipo' && (
        <Card>
          <h2 className="mb-1 text-lg font-bold text-slate-900">¿Qué ocurrió?</h2>
          <p className="mb-4 text-sm text-slate-500">Selecciona el tipo de hecho.</p>
          <div className="space-y-3">
            {(['robo', 'hurto'] as const).map((t) => (
              <button key={t} onClick={() => setTipo(t)} className={`w-full rounded-xl border p-3 text-left ${tipo === t ? 'border-brand-500 ring-2 ring-brand-100' : 'border-slate-300'}`}>
                <p className="font-semibold capitalize text-slate-900">{t}</p>
                <p className="text-sm text-slate-500">{t === 'robo' ? 'Con violencia o amenaza' : 'Sin violencia'}</p>
              </button>
            ))}
            <Button disabled={!tipo || busy} onClick={async () => { await save({ tipo }); next(); }}>Continuar</Button>
          </div>
        </Card>
      )}

      {step === 'lugar' && (
        <Card>
          <h2 className="mb-4 text-lg font-bold text-slate-900">¿Cuándo y dónde?</h2>
          <div className="space-y-4">
            <Field label="Fecha y hora del hecho" type="datetime-local" value={hora} onChange={setHora} />
            <Field label="Departamento" value={departamento} onChange={setDepartamento} placeholder="Ej. Lima" />
            <Field label="Provincia" value={provincia} onChange={setProvincia} placeholder="Ej. Lima" />
            <Field label="Distrito" value={distrito} onChange={setDistrito} placeholder="Ej. Miraflores" hint="Determina la comisaría asignada" />
            <Field label="Referencia del lugar" value={referenciaUbicacion} onChange={setReferencia} placeholder="Av. / cruce / referencia" />
            <Button disabled={busy} onClick={async () => { await save({ hora, departamento, provincia, distrito, referenciaUbicacion }); next(); }}>Continuar</Button>
          </div>
        </Card>
      )}

      {step === 'narrativa' && (
        <Card>
          <h2 className="mb-4 text-lg font-bold text-slate-900">Describe lo que pasó</h2>
          <div className="space-y-4">
            <TextArea label="Relato de los hechos" value={narrativa} onChange={setNarrativa} rows={6} placeholder="Cuenta qué pasó, cómo y qué te sustrajeron." />
            <Button disabled={!narrativa.trim() || busy} onClick={async () => { await save({ narrativa }); next(); }}>Continuar</Button>
          </div>
        </Card>
      )}

      {step === 'objetos' && (
        <Card>
          <h2 className="mb-1 text-lg font-bold text-slate-900">Objetos sustraídos</h2>
          <p className="mb-4 text-sm text-slate-500">Opcional, pero ayuda a tu caso.</p>
          <div className="space-y-4">
            {objetos.map((o, i) => (
              <div key={i} className="space-y-2 rounded-xl bg-slate-50 p-3">
                <Field label={`Objeto ${i + 1}`} value={o.nombre} onChange={(v) => setObjetos(objetos.map((x, j) => j === i ? { ...x, nombre: v } : x))} placeholder="Ej. Celular" />
                <Field label="Marca / modelo" value={o.marcaModelo} onChange={(v) => setObjetos(objetos.map((x, j) => j === i ? { ...x, marcaModelo: v } : x))} />
                <Field label="Valor aprox. (S/)" type="number" value={o.valorAproximado} onChange={(v) => setObjetos(objetos.map((x, j) => j === i ? { ...x, valorAproximado: v } : x))} />
              </div>
            ))}
            <button onClick={() => setObjetos([...objetos, { nombre: '', marcaModelo: '', valorAproximado: '' }])} className="text-sm font-semibold text-brand-600">+ Agregar otro objeto</button>
            <Button onClick={next}>Continuar</Button>
          </div>
        </Card>
      )}

      {step === 'sospechosos' && (
        <Card>
          <h2 className="mb-1 text-lg font-bold text-slate-900">Sospechosos</h2>
          <p className="mb-4 text-sm text-slate-500">Si los viste, descríbelos. Opcional.</p>
          <div className="space-y-4">
            <TextArea label="Descripción física" value={sospPersonal} onChange={setSospPersonal} rows={3} placeholder="Estatura, contextura, ropa, rasgos…" />
            <TextArea label="Cómo huyeron" value={sospHuida} onChange={setSospHuida} rows={2} placeholder="A pie, en moto, vehículo, dirección…" />
            <Button onClick={next}>Continuar</Button>
          </div>
        </Card>
      )}

      {step === 'testigos' && (
        <Card>
          <h2 className="mb-1 text-lg font-bold text-slate-900">Testigos</h2>
          <p className="mb-4 text-sm text-slate-500">Opcional.</p>
          <div className="space-y-4">
            {testigos.map((t, i) => (
              <div key={i} className="space-y-2 rounded-xl bg-slate-50 p-3">
                <Field label={`Testigo ${i + 1}`} value={t.nombre} onChange={(v) => setTestigos(testigos.map((x, j) => j === i ? { ...x, nombre: v } : x))} placeholder="Nombre" />
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Relación</span>
                  <select value={t.relacion} onChange={(e) => setTestigos(testigos.map((x, j) => j === i ? { ...x, relacion: e.target.value } : x))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                    {RELACIONES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </label>
                <Field label="Teléfono" value={t.telefono} onChange={(v) => setTestigos(testigos.map((x, j) => j === i ? { ...x, telefono: v } : x))} />
              </div>
            ))}
            <button onClick={() => setTestigos([...testigos, { nombre: '', relacion: 'extraño', telefono: '' }])} className="text-sm font-semibold text-brand-600">+ Agregar otro testigo</button>
            <Button onClick={next}>Continuar</Button>
          </div>
        </Card>
      )}

      {step === 'review' && (
        <Card>
          <h2 className="mb-4 text-lg font-bold text-slate-900">Revisa tu denuncia</h2>
          <dl className="space-y-2 text-sm">
            <Row k="Tipo" v={tipo} />
            <Row k="Cuándo" v={hora} />
            <Row k="Distrito" v={distrito} />
            <Row k="Lugar" v={referenciaUbicacion} />
            <Row k="Relato" v={narrativa} />
            <Row k="Objetos" v={objetos.filter((o) => o.nombre.trim()).map((o) => o.nombre).join(', ') || '—'} />
            <Row k="Testigos" v={testigos.filter((t) => t.nombre.trim()).map((t) => t.nombre).join(', ') || '—'} />
          </dl>
          <label className="mt-4 flex items-start gap-2 text-sm text-slate-600">
            <input type="checkbox" defaultChecked className="mt-0.5" />
            Declaro que la información es verdadera y autorizo su tratamiento (Ley 29733).
          </label>
          <div className="mt-5"><Button onClick={enviar} disabled={busy}>{busy ? 'Enviando…' : 'Enviar denuncia'}</Button></div>
        </Card>
      )}

      {step === 'done' && resultado && (
        <div className="text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Denuncia registrada</h2>
          <p className="mt-1 text-sm text-slate-500">{resultado.siguiente_pasos}</p>
          <div className="mx-auto mt-5 max-w-xs rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Código</p>
            <p className="text-lg font-bold tracking-wide text-slate-900">{resultado.codigo_seguimiento}</p>
            <p className="mt-2 text-xs text-slate-500">{resultado.comisaria} · {resultado.oficina_actual}</p>
          </div>
          <div className="mt-6 space-y-3">
            <Button onClick={() => nav(`/denuncia/${reportId}`)}>Ver seguimiento</Button>
            <Button variant="outline" onClick={() => nav('/app')}>Ir al inicio</Button>
          </div>
        </div>
      )}
    </Page>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 pb-2">
      <dt className="text-slate-500">{k}</dt>
      <dd className="max-w-[60%] text-right font-medium text-slate-800">{v || '—'}</dd>
    </div>
  );
}
