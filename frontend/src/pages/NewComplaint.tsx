import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ComplaintAssistant } from '../components/ComplaintAssistant';
import { Alert, Button, Card, Field, Page, Stepper, TextArea } from '../components/ui';
import { api } from '../api/client';

type Step = 'tipo' | 'lugar' | 'narrativa' | 'objetos' | 'sospechosos' | 'testigos' | 'review' | 'done';
type Answer = '' | 'si' | 'no';

interface Objeto {
  nombre: string;
  marcaModelo: string;
  valorAproximado: string;
}

interface Testigo {
  nombre: string;
  relacion: string;
  telefono: string;
}

const ORDER: Step[] = ['tipo', 'lugar', 'narrativa', 'objetos', 'sospechosos', 'testigos', 'review', 'done'];
const RELACIONES = ['familia directa', 'familia indirecta', 'amigo y/o conocido', 'extraño'];

const ASSISTANT: Record<Exclude<Step, 'done'>, { title: string; message: string }> = {
  tipo: {
    title: 'Identifiquemos correctamente el hecho',
    message: 'Marca robo si hubo violencia, amenaza o fuerza. Marca hurto si sustrajeron el bien sin violencia. Esta diferencia ayuda a clasificar tu denuncia.',
  },
  lugar: {
    title: 'Ubica el hecho con precisión',
    message: 'Completa todos los datos. La fecha, el distrito y una referencia clara permiten asignar la comisaría correcta y contrastar cámaras cercanas.',
  },
  narrativa: {
    title: 'Cuéntalo en orden',
    message: 'Explica qué ocurrió primero, cómo actuaron, qué te quitaron y qué pasó después. Usa hechos concretos y evita suposiciones.',
  },
  objetos: {
    title: 'Describe al menos un bien',
    message: 'Incluye nombre, marca o alguna característica y valor aproximado. Si no conoces la marca, escribe “No aplica” o una característica visible.',
  },
  sospechosos: {
    title: 'No necesitas inventar información',
    message: 'Indica si pudiste observar a los responsables. Si la respuesta es sí, describe rasgos, ropa y forma de huida. Si no los viste, marca No.',
  },
  testigos: {
    title: 'Los testigos pueden ayudar',
    message: 'Indica si alguien presenció el hecho. Si hubo testigos, registra un nombre y teléfono de contacto. Si no hubo, marca No y continúa.',
  },
  review: {
    title: 'Haz una última revisión',
    message: 'Comprueba que fechas, lugar, relato y objetos sean correctos. Después acepta la declaración de veracidad para registrar la denuncia.',
  },
};

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
  const [observoSospechosos, setObservoSospechosos] = useState<Answer>('');
  const [sospPersonal, setSospPersonal] = useState('');
  const [sospHuida, setSospHuida] = useState('');
  const [huboTestigos, setHuboTestigos] = useState<Answer>('');
  const [testigos, setTestigos] = useState<Testigo[]>([{ nombre: '', relacion: 'extraño', telefono: '' }]);
  const [consentimiento, setConsentimiento] = useState(false);
  const [resultado, setResultado] = useState<any>(null);

  const idx = ORDER.indexOf(step);

  async function ensure(): Promise<string> {
    if (reportId) return reportId;
    const report = await api.post('/denuncias');
    setReportId(report.id);
    return report.id;
  }

  async function save(patch: any) {
    const id = await ensure();
    await api.patch(`/denuncias/${id}`, patch);
  }

  function validate(current: Step): string | null {
    if (current === 'tipo' && !tipo) return 'Selecciona si ocurrió un robo o un hurto.';
    if (current === 'lugar') {
      if (!hora) return 'Selecciona la fecha y hora del hecho.';
      if (new Date(hora).getTime() > Date.now()) return 'La fecha del hecho no puede estar en el futuro.';
      if (!departamento.trim()) return 'Completa el departamento.';
      if (!provincia.trim()) return 'Completa la provincia.';
      if (!distrito.trim()) return 'Completa el distrito.';
      if (!referenciaUbicacion.trim()) return 'Agrega una referencia precisa del lugar.';
    }
    if (current === 'narrativa' && narrativa.trim().length < 30) {
      return 'El relato debe tener al menos 30 caracteres.';
    }
    if (current === 'objetos') {
      if (!objetos.length) return 'Registra al menos un objeto sustraído.';
      const incomplete = objetos.some((o) =>
        o.nombre.trim().length < 2 ||
        o.marcaModelo.trim().length < 2 ||
        !o.valorAproximado ||
        Number(o.valorAproximado) <= 0,
      );
      if (incomplete) return 'Completa nombre, marca o característica y valor de cada objeto.';
    }
    if (current === 'sospechosos') {
      if (!observoSospechosos) return 'Indica si observaste a los sospechosos.';
      if (observoSospechosos === 'si' && (sospPersonal.trim().length < 10 || sospHuida.trim().length < 5)) {
        return 'Completa la descripción física y cómo huyeron.';
      }
    }
    if (current === 'testigos') {
      if (!huboTestigos) return 'Indica si hubo testigos.';
      if (huboTestigos === 'si') {
        if (!testigos.length) return 'Registra al menos un testigo.';
        const incomplete = testigos.some((t) => t.nombre.trim().length < 2 || t.telefono.length !== 9);
        if (incomplete) return 'Completa el nombre y teléfono de 9 dígitos de cada testigo.';
      }
    }
    if (current === 'review' && !consentimiento) {
      return 'Debes aceptar la declaración de veracidad y el tratamiento de datos.';
    }
    return null;
  }

  async function continueStep() {
    const validationError = validate(step);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setBusy(true);
    try {
      if (step === 'tipo') await save({ tipo });
      if (step === 'lugar') await save({ hora, departamento, provincia, distrito, referenciaUbicacion });
      if (step === 'narrativa') await save({ narrativa: narrativa.trim() });
      if (step === 'sospechosos') await save({ observoSospechosos: observoSospechosos === 'si' });
      if (step === 'testigos') await save({ huboTestigos: huboTestigos === 'si' });
      setStep(ORDER[idx + 1]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function back() {
    if (idx > 0) {
      setError('');
      setStep(ORDER[idx - 1]);
    }
  }

  async function enviar() {
    const validationError =
      validate('tipo') ||
      validate('lugar') ||
      validate('narrativa') ||
      validate('objetos') ||
      validate('sospechosos') ||
      validate('testigos') ||
      validate('review');
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setBusy(true);
    try {
      const id = await ensure();
      await api.patch(`/denuncias/${id}`, {
        tipo,
        hora,
        departamento,
        provincia,
        distrito,
        referenciaUbicacion,
        narrativa: narrativa.trim(),
        observoSospechosos: observoSospechosos === 'si',
        huboTestigos: huboTestigos === 'si',
      });
      for (const objeto of objetos) {
        await api.post(`/denuncias/${id}/objetos`, {
          nombre: objeto.nombre.trim(),
          marcaModelo: objeto.marcaModelo.trim(),
          valorAproximado: Number(objeto.valorAproximado),
        });
      }
      if (observoSospechosos === 'si') {
        await api.post(`/denuncias/${id}/sospechosos`, {
          descripcionPersonal: sospPersonal.trim(),
          descripcionHuida: sospHuida.trim(),
        });
      }
      if (huboTestigos === 'si') {
        for (const testigo of testigos) {
          await api.post(`/denuncias/${id}/testigos`, {
            nombre: testigo.nombre.trim(),
            relacion: testigo.relacion,
            telefono: testigo.telefono,
          });
        }
      }
      const result = await api.post(`/denuncias/${id}/enviar`, {
        consentimientos: ['truthfulness', 'data_processing'],
      });
      setResultado(result);
      setStep('done');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (step === 'done' && resultado) {
    return (
      <Page>
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
      </Page>
    );
  }

  const assistant = ASSISTANT[step as Exclude<Step, 'done'>];

  return (
    <Page narrow={false}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">Nueva denuncia · paso {idx + 1} de {ORDER.length - 1}</p>
        <p className="text-xs font-semibold text-brand-700">Campos obligatorios</p>
      </div>
      <Stepper steps={ORDER.slice(0, -1)} current={idx} />
      {error && <div className="mb-4"><Alert kind="error">{error}</Alert></div>}

      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px] md:items-start">
        <div>
          {step === 'tipo' && (
            <Card>
              <h2 className="mb-1 text-lg font-bold text-slate-900">¿Qué ocurrió?</h2>
              <p className="mb-4 text-sm text-slate-500">Selecciona el tipo de hecho.</p>
              <div className="space-y-3">
                {(['robo', 'hurto'] as const).map((option) => (
                  <button key={option} onClick={() => setTipo(option)} className={`w-full rounded-xl border p-3 text-left ${tipo === option ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100' : 'border-slate-300'}`}>
                    <p className="font-semibold capitalize text-slate-900">{option}</p>
                    <p className="text-sm text-slate-500">{option === 'robo' ? 'Con violencia o amenaza' : 'Sin violencia'}</p>
                  </button>
                ))}
                <WizardActions first busy={busy} onContinue={continueStep} />
              </div>
            </Card>
          )}

          {step === 'lugar' && (
            <Card>
              <h2 className="mb-4 text-lg font-bold text-slate-900">¿Cuándo y dónde?</h2>
              <div className="space-y-4">
                <Field label="Fecha y hora del hecho" type="datetime-local" value={hora} onChange={setHora} />
                <Field label="Departamento" value={departamento} onChange={setDepartamento} placeholder="Ej. Lima" maxLength={80} />
                <Field label="Provincia" value={provincia} onChange={setProvincia} placeholder="Ej. Lima" maxLength={80} />
                <Field label="Distrito" value={distrito} onChange={setDistrito} placeholder="Ej. Miraflores" hint="Determina la comisaría asignada" maxLength={80} />
                <Field label="Referencia del lugar" value={referenciaUbicacion} onChange={setReferencia} placeholder="Av., cruce o punto de referencia" maxLength={200} />
                <WizardActions busy={busy} onBack={back} onContinue={continueStep} />
              </div>
            </Card>
          )}

          {step === 'narrativa' && (
            <Card>
              <h2 className="mb-4 text-lg font-bold text-slate-900">Describe lo que pasó</h2>
              <div className="space-y-4">
                <TextArea label="Relato de los hechos" value={narrativa} onChange={setNarrativa} rows={7} maxLength={2000} placeholder="Cuenta qué pasó, cómo ocurrió y qué sucedió después." />
                <p className="text-xs text-slate-400">Mínimo 30 caracteres.</p>
                <WizardActions busy={busy} onBack={back} onContinue={continueStep} />
              </div>
            </Card>
          )}

          {step === 'objetos' && (
            <Card>
              <h2 className="mb-1 text-lg font-bold text-slate-900">Objetos sustraídos</h2>
              <p className="mb-4 text-sm text-slate-500">Registra al menos un objeto y completa todos sus datos.</p>
              <div className="space-y-4">
                {objetos.map((objeto, index) => (
                  <div key={index} className="space-y-3 rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">Objeto {index + 1}</p>
                      {objetos.length > 1 && <button onClick={() => setObjetos(objetos.filter((_, i) => i !== index))} className="text-xs font-semibold text-red-600">Eliminar</button>}
                    </div>
                    <Field label="Nombre del objeto" value={objeto.nombre} onChange={(value) => setObjetos(objetos.map((item, i) => i === index ? { ...item, nombre: value } : item))} placeholder="Ej. Celular" maxLength={120} />
                    <Field label="Marca, modelo o característica" value={objeto.marcaModelo} onChange={(value) => setObjetos(objetos.map((item, i) => i === index ? { ...item, marcaModelo: value } : item))} placeholder="Ej. Samsung A54, color negro o No aplica" maxLength={120} />
                    <Field label="Valor aproximado (S/)" value={objeto.valorAproximado} onChange={(value) => setObjetos(objetos.map((item, i) => i === index ? { ...item, valorAproximado: value } : item))} digitsOnly maxLength={10} inputMode="numeric" placeholder="0" />
                  </div>
                ))}
                <button onClick={() => setObjetos([...objetos, { nombre: '', marcaModelo: '', valorAproximado: '' }])} className="text-sm font-semibold text-brand-700">+ Agregar otro objeto</button>
                <WizardActions busy={busy} onBack={back} onContinue={continueStep} />
              </div>
            </Card>
          )}

          {step === 'sospechosos' && (
            <Card>
              <h2 className="mb-1 text-lg font-bold text-slate-900">¿Observaste a los sospechosos?</h2>
              <p className="mb-4 text-sm text-slate-500">Selecciona una respuesta para continuar.</p>
              <div className="space-y-4">
                <YesNo value={observoSospechosos} onChange={setObservoSospechosos} />
                {observoSospechosos === 'si' && (
                  <>
                    <TextArea label="Descripción física y vestimenta" value={sospPersonal} onChange={setSospPersonal} rows={4} maxLength={1000} placeholder="Estatura, contextura, ropa, rasgos visibles..." />
                    <TextArea label="Cómo huyeron" value={sospHuida} onChange={setSospHuida} rows={3} maxLength={1000} placeholder="A pie, en moto, vehículo y dirección..." />
                  </>
                )}
                {observoSospechosos === 'no' && <Alert>No hay problema. Esta respuesta quedará registrada sin pedirte que inventes una descripción.</Alert>}
                <WizardActions busy={busy} onBack={back} onContinue={continueStep} />
              </div>
            </Card>
          )}

          {step === 'testigos' && (
            <Card>
              <h2 className="mb-1 text-lg font-bold text-slate-900">¿Hubo testigos?</h2>
              <p className="mb-4 text-sm text-slate-500">Selecciona una respuesta para continuar.</p>
              <div className="space-y-4">
                <YesNo value={huboTestigos} onChange={setHuboTestigos} />
                {huboTestigos === 'si' && testigos.map((testigo, index) => (
                  <div key={index} className="space-y-3 rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">Testigo {index + 1}</p>
                      {testigos.length > 1 && <button onClick={() => setTestigos(testigos.filter((_, i) => i !== index))} className="text-xs font-semibold text-red-600">Eliminar</button>}
                    </div>
                    <Field label="Nombre" value={testigo.nombre} onChange={(value) => setTestigos(testigos.map((item, i) => i === index ? { ...item, nombre: value } : item))} maxLength={120} />
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">Relación</span>
                      <select value={testigo.relacion} onChange={(event) => setTestigos(testigos.map((item, i) => i === index ? { ...item, relacion: event.target.value } : item))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                        {RELACIONES.map((relacion) => <option key={relacion} value={relacion}>{relacion}</option>)}
                      </select>
                    </label>
                    <Field label="Teléfono" value={testigo.telefono} onChange={(value) => setTestigos(testigos.map((item, i) => i === index ? { ...item, telefono: value } : item))} digitsOnly maxLength={9} inputMode="tel" placeholder="9 dígitos" />
                  </div>
                ))}
                {huboTestigos === 'si' && <button onClick={() => setTestigos([...testigos, { nombre: '', relacion: 'extraño', telefono: '' }])} className="text-sm font-semibold text-brand-700">+ Agregar otro testigo</button>}
                {huboTestigos === 'no' && <Alert>Continuaremos sin testigos. Aún puedes registrar tu denuncia.</Alert>}
                <WizardActions busy={busy} onBack={back} onContinue={continueStep} />
              </div>
            </Card>
          )}

          {step === 'review' && (
            <Card>
              <h2 className="mb-4 text-lg font-bold text-slate-900">Revisa tu denuncia</h2>
              <dl className="space-y-2 text-sm">
                <Row label="Tipo" value={tipo} />
                <Row label="Cuándo" value={hora} />
                <Row label="Ubicación" value={`${departamento}, ${provincia}, ${distrito}`} />
                <Row label="Referencia" value={referenciaUbicacion} />
                <Row label="Relato" value={narrativa} />
                <Row label="Objetos" value={objetos.map((objeto) => objeto.nombre).join(', ')} />
                <Row label="Sospechosos" value={observoSospechosos === 'si' ? sospPersonal : 'No observados'} />
                <Row label="Testigos" value={huboTestigos === 'si' ? testigos.map((testigo) => testigo.nombre).join(', ') : 'No hubo testigos'} />
              </dl>
              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-600">
                <input type="checkbox" checked={consentimiento} onChange={(event) => setConsentimiento(event.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-600" />
                <span>Declaro que la información es verdadera y autorizo su tratamiento conforme a la Ley 29733.</span>
              </label>
              <WizardActions busy={busy} onBack={back} onContinue={enviar} continueLabel="Enviar denuncia" />
            </Card>
          )}
        </div>

        <ComplaintAssistant title={assistant.title} message={assistant.message} />
      </div>
    </Page>
  );
}

function WizardActions({
  first = false,
  busy,
  onBack,
  onContinue,
  continueLabel = 'Continuar',
}: {
  first?: boolean;
  busy: boolean;
  onBack?: () => void;
  onContinue: () => void;
  continueLabel?: string;
}) {
  return (
    <div className={`mt-5 grid gap-3 border-t border-slate-100 pt-4 ${first ? '' : 'grid-cols-2'}`}>
      {!first && (
        <Button variant="outline" onClick={onBack} disabled={busy}>
          <span aria-hidden="true">←</span> Atrás
        </Button>
      )}
      <Button onClick={onContinue} disabled={busy}>
        {busy ? 'Guardando...' : continueLabel}
      </Button>
    </div>
  );
}

function YesNo({ value, onChange }: { value: Answer; onChange: (value: Answer) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {(['si', 'no'] as const).map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
            value === option ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-100' : 'border-slate-300 text-slate-700'
          }`}
        >
          {option === 'si' ? 'Sí' : 'No'}
        </button>
      ))}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-slate-100 pb-2 sm:grid-cols-[120px_1fr]">
      <dt className="text-slate-500">{label}</dt>
      <dd className="break-words font-medium text-slate-800">{value || '—'}</dd>
    </div>
  );
}
