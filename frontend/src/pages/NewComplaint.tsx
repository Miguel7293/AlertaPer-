import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ComplaintAssistant } from '../components/ComplaintAssistant';
import { MapSelector } from '../components/MapSelector';
import { Alert, Button, Card, Field, Page, Stepper, TextArea } from '../components/ui';
import { API_URL, api, getAccessToken } from '../api/client';
import { useAuth } from '../auth/AuthContext';

type Step = 'tipo' | 'lugar' | 'narrativa' | 'objetos' | 'sospechosos' | 'testigos' | 'review' | 'done';
type Answer = '' | 'si' | 'no';

interface Objeto {
  nombre: string;
  marcaModelo: string;
  valorAproximado: string;
  valorRango?: string;
  cantidad?: number;
}

interface Testigo {
  nombre: string;
  relacion: string;
  telefono: string;
}

const ORDER: Step[] = ['tipo', 'lugar', 'narrativa', 'objetos', 'sospechosos', 'testigos', 'review', 'done'];
const STEP_LABELS = ['Tipo', 'Lugar', 'Relato', 'Objetos', 'Sospechosos', 'Testigos', 'Revisar'];
const RELACIONES = ['familia directa', 'familia indirecta', 'amigo y/o conocido', 'extraño'];

const OBJETOS_FRECUENTES = [
  {
    nombre: 'Celular',
    icon: 'phone',
    detalle: 'Marca, modelo, color, IMEI si lo tienes',
    ejemplo: 'Samsung A54, negro',
  },
  {
    nombre: 'Billetera o documentos',
    icon: 'wallet',
    detalle: 'DNI, tarjetas, brevete u otros documentos',
    ejemplo: 'Billetera negra con DNI',
  },
  {
    nombre: 'Laptop',
    icon: 'laptop',
    detalle: 'Marca, modelo, color, serie o stickers visibles',
    ejemplo: 'Lenovo ThinkPad, gris',
  },
  {
    nombre: 'Mochila',
    icon: 'bag',
    detalle: 'Color, marca y contenido principal',
    ejemplo: 'Mochila azul con cuadernos',
  },
  {
    nombre: 'Cartera',
    icon: 'purse',
    detalle: 'Color, marca, material y contenido',
    ejemplo: 'Cartera marron de cuero',
  },
  {
    nombre: 'Bicicleta o scooter',
    icon: 'bike',
    detalle: 'Marca, color, aro, serie o accesorios',
    ejemplo: 'Bicicleta montanera roja',
  },
  {
    nombre: 'Audifonos',
    icon: 'headphones',
    detalle: 'Marca, modelo, color y estuche',
    ejemplo: 'AirPods con estuche blanco',
  },
  {
    nombre: 'Reloj o joya',
    icon: 'watch',
    detalle: 'Material, color, marca o rasgo distintivo',
    ejemplo: 'Reloj plateado Casio',
  },
  {
    nombre: 'Tablet',
    icon: 'tablet',
    detalle: 'Marca, modelo, color y accesorios',
    ejemplo: 'iPad con funda negra',
  },
] as const;

const VALOR_RANGOS_BASE = [
  { label: 'Bajo', range: 'S/ 50 - 200', value: '125' },
  { label: 'Medio', range: 'S/ 200 - 800', value: '500' },
  { label: 'Alto', range: 'S/ 800 - 1,500', value: '1150' },
  { label: 'Premium', range: 'S/ 1,500+', value: '1500' },
];

const VALOR_RANGOS_POR_OBJETO: Record<string, typeof VALOR_RANGOS_BASE> = {
  Celular: [
    { label: 'Basico', range: 'S/ 300 - 800', value: '550' },
    { label: 'Gama media', range: 'S/ 800 - 1,500', value: '1150' },
    { label: 'Gama alta', range: 'S/ 1,500 - 3,000', value: '2250' },
    { label: 'Premium', range: 'S/ 3,000+', value: '3000' },
  ],
  'Billetera o documentos': [
    { label: 'Documentos', range: 'S/ 20 - 80', value: '50' },
    { label: 'Billetera', range: 'S/ 80 - 200', value: '140' },
    { label: 'Con efectivo', range: 'S/ 200 - 600', value: '400' },
    { label: 'Mayor valor', range: 'S/ 600+', value: '600' },
  ],
  Laptop: [
    { label: 'Entrada', range: 'S/ 1,000 - 2,000', value: '1500' },
    { label: 'Trabajo/estudio', range: 'S/ 2,000 - 3,500', value: '2750' },
    { label: 'Avanzada', range: 'S/ 3,500 - 5,500', value: '4500' },
    { label: 'Premium', range: 'S/ 5,500+', value: '5500' },
  ],
  'Bicicleta o scooter': [
    { label: 'Basico', range: 'S/ 300 - 800', value: '550' },
    { label: 'Urbano', range: 'S/ 800 - 1,500', value: '1150' },
    { label: 'Avanzado', range: 'S/ 1,500 - 3,000', value: '2250' },
    { label: 'Premium', range: 'S/ 3,000+', value: '3000' },
  ],
  Tablet: [
    { label: 'Basica', range: 'S/ 400 - 1,000', value: '700' },
    { label: 'Media', range: 'S/ 1,000 - 2,500', value: '1750' },
    { label: 'Alta', range: 'S/ 2,500 - 4,000', value: '3250' },
    { label: 'Premium', range: 'S/ 4,000+', value: '4000' },
  ],
  Audifonos: [
    { label: 'Basico', range: 'S/ 50 - 200', value: '125' },
    { label: 'Bluetooth', range: 'S/ 200 - 600', value: '400' },
    { label: 'Gama alta', range: 'S/ 600 - 1,200', value: '900' },
    { label: 'Premium', range: 'S/ 1,200+', value: '1200' },
  ],
};

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
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('tipo');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [operationLabel, setOperationLabel] = useState('');
  const [reportId, setReportId] = useState<string | null>(null);
  const [tipo, setTipo] = useState<'robo' | 'hurto' | ''>('');
  const [hora, setHora] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [provincia, setProvincia] = useState('');
  const [distrito, setDistrito] = useState('');
  const [referenciaUbicacion, setReferencia] = useState('');
  const [geoLatitud, setGeoLatitud] = useState<number | null>(null);
  const [geoLongitud, setGeoLongitud] = useState<number | null>(null);
  const [narrativa, setNarrativa] = useState('');
  const [objetos, setObjetos] = useState<Objeto[]>([{ nombre: '', marcaModelo: '', valorAproximado: '', cantidad: 1 }]);
  const [observoSospechosos, setObservoSospechosos] = useState<Answer>('');
  const [sospPersonal, setSospPersonal] = useState('');
  const [sospHuida, setSospHuida] = useState('');
  const [huboTestigos, setHuboTestigos] = useState<Answer>('');
  const [testigos, setTestigos] = useState<Testigo[]>([{ nombre: '', relacion: 'extraño', telefono: '' }]);
  const [consentimiento, setConsentimiento] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [draftRestored, setDraftRestored] = useState(false);

  const idx = ORDER.indexOf(step);
  const draftKey = user?.id ? `seguro_denuncia_draft_${user.id}` : '';
  const objetosValidos = objetos.filter((objeto) => objeto.nombre.trim());
  const totalObjetos = objetosValidos.reduce((sum, objeto) => sum + (objeto.cantidad || 1), 0);
  const valorTotal = objetos.reduce((sum, objeto) => sum + ((Number(objeto.valorAproximado) || 0) * (objeto.cantidad || 1)), 0);

  const draft = useMemo(() => ({
    step,
    reportId,
    tipo,
    hora,
    departamento,
    provincia,
    distrito,
    referenciaUbicacion,
    geoLatitud,
    geoLongitud,
    narrativa,
    objetos,
    observoSospechosos,
    sospPersonal,
    sospHuida,
    huboTestigos,
    testigos,
    consentimiento,
  }), [step, reportId, tipo, hora, departamento, provincia, distrito, referenciaUbicacion, geoLatitud, geoLongitud, narrativa, objetos, observoSospechosos, sospPersonal, sospHuida, huboTestigos, testigos, consentimiento]);

  useEffect(() => {
    if (!draftKey || draftRestored) return;
    const raw = localStorage.getItem(draftKey);
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        if (saved.step) setStep(saved.step);
        if (saved.reportId) setReportId(saved.reportId);
        if (saved.tipo !== undefined) setTipo(saved.tipo);
        if (saved.hora !== undefined) setHora(saved.hora);
        if (saved.departamento !== undefined) setDepartamento(saved.departamento);
        if (saved.provincia !== undefined) setProvincia(saved.provincia);
        if (saved.distrito !== undefined) setDistrito(saved.distrito);
        if (saved.referenciaUbicacion !== undefined) setReferencia(saved.referenciaUbicacion);
        if (saved.geoLatitud !== undefined) setGeoLatitud(saved.geoLatitud);
        if (saved.geoLongitud !== undefined) setGeoLongitud(saved.geoLongitud);
        if (saved.narrativa !== undefined) setNarrativa(saved.narrativa);
        if (Array.isArray(saved.objetos) && saved.objetos.length) {
          setObjetos(saved.objetos.map((objeto: Objeto) => ({ ...objeto, cantidad: objeto.cantidad || 1 })));
        }
        if (saved.observoSospechosos !== undefined) setObservoSospechosos(saved.observoSospechosos);
        if (saved.sospPersonal !== undefined) setSospPersonal(saved.sospPersonal);
        if (saved.sospHuida !== undefined) setSospHuida(saved.sospHuida);
        if (saved.huboTestigos !== undefined) setHuboTestigos(saved.huboTestigos);
        if (Array.isArray(saved.testigos) && saved.testigos.length) setTestigos(saved.testigos);
        if (saved.consentimiento !== undefined) setConsentimiento(Boolean(saved.consentimiento));
      } catch {
        localStorage.removeItem(draftKey);
      }
    }
    setDraftRestored(true);
  }, [draftKey, draftRestored]);

  useEffect(() => {
    if (!draftKey || !draftRestored || step === 'done') return;
    localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [draftKey, draftRestored, draft, step]);

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
      if (geoLatitud === null || geoLongitud === null) return 'Selecciona la ubicación en el mapa.';
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
        Number(o.valorAproximado) <= 0 ||
        (o.cantidad || 1) < 1,
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
    setOperationLabel('Guardando cambios...');
    setBusy(true);
    try {
      if (step === 'tipo') await save({ tipo });
      if (step === 'lugar') await save({ hora, departamento, provincia, distrito, referenciaUbicacion, geoLatitud, geoLongitud });
      if (step === 'narrativa') await save({ narrativa: narrativa.trim() });
      if (step === 'sospechosos') await save({ observoSospechosos: observoSospechosos === 'si' });
      if (step === 'testigos') await save({ huboTestigos: huboTestigos === 'si' });
      setStep(ORDER[idx + 1]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
      setOperationLabel('');
    }
  }

  function back() {
    if (idx > 0) {
      setError('');
      setStep(ORDER[idx - 1]);
    }
  }

  function setObjeto(index: number, patch: Partial<Objeto>) {
    setObjetos(objetos.map((item, i) => i === index ? { ...item, ...patch } : item));
  }

  function agregarObjetoRapido(nombre: string, marcaModelo = '') {
    const nuevo = { nombre, marcaModelo, valorAproximado: '', cantidad: 1 };
    const emptyIndex = objetos.findIndex((objeto) =>
      !objeto.nombre.trim() && !objeto.marcaModelo.trim() && !objeto.valorAproximado.trim(),
    );

    if (emptyIndex >= 0) {
      setObjeto(emptyIndex, nuevo);
      return;
    }

    setObjetos([...objetos, nuevo]);
  }

  function alternarObjetoFrecuente(nombre: string) {
    const selected = objetos.some((objeto) => objeto.nombre === nombre);
    if (selected) {
      const remaining = objetos.filter((objeto) => objeto.nombre !== nombre);
      setObjetos(remaining.length ? remaining : [{ nombre: '', marcaModelo: '', valorAproximado: '', cantidad: 1 }]);
      return;
    }

    agregarObjetoRapido(nombre);
  }

  function seleccionarRango(index: number, range: { label: string; range: string; value: string }) {
    setObjeto(index, { valorAproximado: range.value, valorRango: `${range.label} (${range.range})` });
  }

  function limpiarRango(index: number) {
    setObjeto(index, { valorAproximado: '', valorRango: undefined });
  }

  function cambiarCantidad(index: number, delta: number) {
    const actual = objetos[index]?.cantidad || 1;
    setObjeto(index, { cantidad: Math.max(1, actual + delta) });
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
    setOperationLabel('Registrando denuncia...');
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
        geoLatitud,
        geoLongitud,
        narrativa: narrativa.trim(),
        observoSospechosos: observoSospechosos === 'si',
        huboTestigos: huboTestigos === 'si',
      });
      for (const objeto of objetos) {
        const cantidad = objeto.cantidad || 1;
        for (let unidad = 1; unidad <= cantidad; unidad += 1) {
          await api.post(`/denuncias/${id}/objetos`, {
            nombre: cantidad > 1 ? `${objeto.nombre.trim()} ${unidad}/${cantidad}` : objeto.nombre.trim(),
            marcaModelo: objeto.marcaModelo.trim(),
            valorAproximado: Number(objeto.valorAproximado),
          });
        }
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
      if (draftKey) localStorage.removeItem(draftKey);
      setStep('done');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
      setOperationLabel('');
    }
  }

  async function copiarCodigo() {
    if (!resultado?.codigo_seguimiento) return;
    await navigator.clipboard?.writeText(resultado.codigo_seguimiento);
  }

  async function descargarConstancia() {
    if (!reportId) return;
    setError('');
    setOperationLabel('Generando constancia...');
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/denuncias/${reportId}/constancia`, {
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        credentials: 'include',
      });
      if (!res.ok) {
        setError('No se pudo descargar la constancia.');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${resultado?.codigo_seguimiento ?? 'denuncia'}-constancia.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('No se pudo descargar la constancia.');
    } finally {
      setBusy(false);
      setOperationLabel('');
    }
  }

  if (step === 'done' && resultado) {
    return (
      <Page>
        <Card>
          {error && <div className="mb-4"><Alert kind="error">{error}</Alert></div>}
          {operationLabel && <OperationToast label={operationLabel} />}
          <div className="text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Denuncia registrada</h2>
          <p className="mt-1 text-sm text-slate-500">{resultado.siguiente_pasos}</p>
          <div className="mx-auto mt-5 max-w-xs rounded-2xl border border-brand-100 bg-brand-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Código</p>
            <p className="text-lg font-bold tracking-wide text-slate-900">{resultado.codigo_seguimiento}</p>
            <p className="mt-2 text-xs text-slate-500">{resultado.comisaria} · {resultado.oficina_actual}</p>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button onClick={copiarCodigo} variant="outline">Copiar codigo</Button>
            <Button onClick={descargarConstancia}>Descargar constancia PDF</Button>
            <Button onClick={() => nav(`/denuncia/${reportId}`)} variant="outline">Ver seguimiento</Button>
            <Button variant="outline" onClick={() => nav('/app')}>Ir al inicio</Button>
          </div>
          </div>
        </Card>
      </Page>
    );
  }

  const assistant = ASSISTANT[step as Exclude<Step, 'done'>];

  return (
    <Page narrow={false}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">Nueva denuncia · paso {idx + 1} de {ORDER.length - 1}</p>
        <div className="flex items-center gap-2">
          {draftRestored && step !== 'done' && <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500 sm:inline">Borrador guardado</span>}
          <p className="text-xs font-semibold text-brand-700">Campos obligatorios</p>
        </div>
      </div>
      <Stepper steps={STEP_LABELS} current={idx} showLabels />
      {error && <div className="mb-4"><Alert kind="error">{error}</Alert></div>}
      {operationLabel && <OperationToast label={operationLabel} />}

      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px] md:items-start">
        <div>
          {step === 'tipo' && (
            <Card>
              <h2 className="mb-1 text-lg font-bold text-slate-900">Cuéntanos cómo te quitaron el bien</h2>
              <p className="mb-4 text-sm text-slate-500">Elige la opción que más se parece a lo que pasó. Usa ejemplos simples, sin términos técnicos.</p>
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <TipoCard
                    selected={tipo === 'robo'}
                    title="Me amenazaron o usaron fuerza"
                    tag="Robo"
                    icon="alert"
                    examples={['Me golpearon y me quitaron el celular.', 'Me jalaron la mochila usando fuerza.', 'Me amenazaron con un arma o palabras.']}
                    onClick={() => setTipo('robo')}
                  />
                  <TipoCard
                    selected={tipo === 'hurto'}
                    title="Lo sustrajeron sin violencia"
                    tag="Hurto"
                    icon="hand"
                    examples={['Lo sacaron de mi bolsillo sin darme cuenta.', 'Deje mi laptop un momento y desaparecio.', 'Abrí mi bolso y ya no estaba mi billetera.']}
                    onClick={() => setTipo('hurto')}
                  />
                </div>
                {tipo && (
                  <div className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700">
                    Se registrará como {tipo}. Puedes cambiarlo antes de continuar si el ejemplo no coincide.
                  </div>
                )}
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
                <MapSelector onLocationSelect={(lat, lng) => { setGeoLatitud(lat); setGeoLongitud(lng); }} initialLat={geoLatitud || undefined} initialLng={geoLongitud || undefined} />
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
                <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Bienes frecuentes</p>
                      <p className="text-xs leading-relaxed text-slate-500">
                        Toca una tarjeta para seleccionarla. Vuelve a tocarla para quitarla.
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 shadow-sm">
                      Robos frecuentes
                    </span>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {OBJETOS_FRECUENTES.map((item) => {
                      const selected = objetos.some((objeto) => objeto.nombre === item.nombre);
                      return (
                        <button
                          key={item.nombre}
                          onClick={() => alternarObjetoFrecuente(item.nombre)}
                          aria-pressed={selected}
                          className={`group relative min-h-[138px] overflow-hidden rounded-2xl border p-3 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] ${
                            selected
                              ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100'
                              : 'border-slate-200 bg-slate-50 hover:border-brand-300 hover:bg-white'
                          }`}
                        >
                          <span className={`absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full text-xs font-bold transition ${
                            selected ? 'bg-brand-600 text-white' : 'bg-white text-slate-300 ring-1 ring-slate-200 group-hover:text-brand-600'
                          }`}>
                            {selected ? '✓' : '+'}
                          </span>
                          <span className={`mb-3 grid h-10 w-10 place-items-center rounded-xl transition ${
                            selected ? 'bg-white text-brand-700 shadow-sm' : 'bg-white text-brand-600 ring-1 ring-slate-200 group-hover:ring-brand-200'
                          }`}>
                            <ObjetoIcon name={item.icon} />
                          </span>
                          <span className="block pr-8 text-sm font-semibold text-slate-900">{item.nombre}</span>
                          <span className="mt-1 block text-xs leading-relaxed text-slate-500">{item.detalle}</span>
                          <span className="mt-3 inline-flex rounded-full bg-white/80 px-2 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200">Ej. {item.ejemplo}</span>
                          {selected && (
                            <span className="mt-2 inline-flex rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-brand-700 ring-1 ring-brand-100">
                              Seleccionado x{objetos.find((objeto) => objeto.nombre === item.nombre)?.cantidad || 1}
                            </span>
                          )}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => agregarObjetoRapido('')}
                      className="group min-h-[138px] rounded-2xl border border-dashed border-slate-300 bg-white p-3 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50 hover:shadow-md active:scale-[0.98]"
                    >
                      <span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 transition group-hover:bg-white">
                        <ObjetoIcon name="other" />
                      </span>
                      <span className="block text-sm font-semibold text-slate-900">Otro bien</span>
                      <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                        Si no aparece en la lista, usa el formulario para especificarlo.
                      </span>
                      <span className="mt-3 inline-flex rounded-full bg-white px-2 py-1 text-[11px] font-medium text-brand-700 ring-1 ring-brand-100">
                        Especificar manualmente
                      </span>
                    </button>
                  </div>
                </div>
                {totalObjetos > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{totalObjetos} objeto{totalObjetos === 1 ? '' : 's'} seleccionado{totalObjetos === 1 ? '' : 's'}</p>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">S/ {valorTotal}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {objetos.map((objeto, index) => objeto.nombre.trim() ? (
                        <button
                          key={`${objeto.nombre}-${index}`}
                          onClick={() => setObjetos(objetos.filter((_, i) => i !== index))}
                          className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-100 transition hover:bg-white"
                        >
                          {objeto.nombre} <span className="ml-1 text-brand-500">×</span>
                        </button>
                      ) : null)}
                    </div>
                  </div>
                )}
                {objetos.map((objeto, index) => (
                  <div key={index} className="space-y-3 rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">Objeto {index + 1}</p>
                      {objetos.length > 1 && <button onClick={() => setObjetos(objetos.filter((_, i) => i !== index))} className="text-xs font-semibold text-red-600">Eliminar</button>}
                    </div>
                    <Field label="Nombre del objeto" value={objeto.nombre} onChange={(value) => setObjetos(objetos.map((item, i) => i === index ? { ...item, nombre: value } : item))} placeholder="Ej. Celular" maxLength={120} />
                    <Field label="Marca, modelo o característica" value={objeto.marcaModelo} onChange={(value) => setObjetos(objetos.map((item, i) => i === index ? { ...item, marcaModelo: value } : item))} placeholder="Ej. Samsung A54, color negro o No aplica" maxLength={120} />
                    <div className="rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Unidades</p>
                          <p className="text-xs text-slate-500">Minimo 1. Si te quitaron mas de uno, agregalo aqui.</p>
                        </div>
                        <div className="flex items-center rounded-full border border-slate-200 bg-slate-50 p-1">
                          <button type="button" onClick={() => cambiarCantidad(index, -1)} className="grid h-8 w-8 place-items-center rounded-full text-lg font-bold text-slate-600 transition hover:bg-white">-</button>
                          <span className="grid h-8 min-w-10 place-items-center text-sm font-bold text-slate-900">{objeto.cantidad || 1}</span>
                          <button type="button" onClick={() => cambiarCantidad(index, 1)} className="grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-lg font-bold text-white shadow-sm transition hover:bg-brand-700">+</button>
                        </div>
                      </div>
                    </div>
                    <ValorSelector objeto={objeto} onSelect={(range) => seleccionarRango(index, range)} onCustom={() => limpiarRango(index)} />
                    {!objeto.valorRango && (
                      <Field label="Otro monto aproximado (S/)" value={objeto.valorAproximado} onChange={(value) => setObjetos(objetos.map((item, i) => i === index ? { ...item, valorAproximado: value } : item))} digitsOnly maxLength={10} inputMode="numeric" placeholder="0" />
                    )}
                  </div>
                ))}
                <button onClick={() => setObjetos([...objetos, { nombre: '', marcaModelo: '', valorAproximado: '', cantidad: 1 }])} className="text-sm font-semibold text-brand-700">+ Agregar otro objeto</button>
                <WizardActions busy={busy} onBack={back} onContinue={continueStep} />
              </div>
            </Card>
          )}

          {step === 'sospechosos' && (
            <Card>
              <h2 className="mb-1 text-lg font-bold text-slate-900">¿Observaste a los sospechosos?</h2>
              <p className="mb-4 text-sm text-slate-500">Selecciona una respuesta para continuar.</p>
              <div className="space-y-4">
                <DecisionCards
                  value={observoSospechosos}
                  onChange={setObservoSospechosos}
                  yes={{
                    title: 'Sí, pude observarlos',
                    description: 'Agregaré rasgos, ropa y cómo huyeron.',
                    icon: 'eye',
                  }}
                  no={{
                    title: 'No los vi',
                    description: 'Continuaré sin inventar datos.',
                    icon: 'shield',
                  }}
                />
                {observoSospechosos === 'si' && (
                  <>
                    <TextArea label="Descripción física y vestimenta" value={sospPersonal} onChange={setSospPersonal} rows={4} maxLength={1000} placeholder="Estatura, contextura, ropa, rasgos visibles..." />
                    <TextArea label="Cómo huyeron" value={sospHuida} onChange={setSospHuida} rows={3} maxLength={1000} placeholder="A pie, en moto, vehículo y dirección..." />
                  </>
                )}
                {observoSospechosos === 'no' && (
                  <div className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">
                    Esta respuesta quedará registrada. No necesitas inventar una descripción.
                  </div>
                )}
                <WizardActions busy={busy} onBack={back} onContinue={continueStep} continueLabel={observoSospechosos === 'si' ? 'Guardar descripción' : 'Continuar'} />
              </div>
            </Card>
          )}

          {step === 'testigos' && (
            <Card>
              <h2 className="mb-1 text-lg font-bold text-slate-900">¿Hubo testigos?</h2>
              <p className="mb-4 text-sm text-slate-500">Selecciona una respuesta para continuar.</p>
              <div className="space-y-4">
                <DecisionCards
                  value={huboTestigos}
                  onChange={setHuboTestigos}
                  yes={{
                    title: 'Sí, hubo testigos',
                    description: 'Registraré un contacto para apoyar el caso.',
                    icon: 'users',
                  }}
                  no={{
                    title: 'No hubo testigos',
                    description: 'La denuncia puede continuar igual.',
                    icon: 'check',
                  }}
                />
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
                {huboTestigos === 'no' && (
                  <div className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">
                    Continuaremos sin testigos. Aún puedes registrar tu denuncia.
                  </div>
                )}
                <WizardActions busy={busy} onBack={back} onContinue={continueStep} continueLabel={huboTestigos === 'si' ? 'Guardar testigos' : 'Continuar'} />
              </div>
            </Card>
          )}

          {step === 'review' && (
            <Card>
              <h2 className="mb-4 text-lg font-bold text-slate-900">Revisa tu denuncia</h2>
              <div className="mb-5 grid gap-3 sm:grid-cols-4">
                <ReviewMetric label="Tipo" value={tipo || '-'} />
                <ReviewMetric label="Objetos" value={String(totalObjetos)} />
                <ReviewMetric label="Valor total" value={`S/ ${valorTotal}`} />
                <ReviewMetric label="Apoyos" value={`${observoSospechosos === 'si' ? 'Sospechoso' : 'Sin sospechoso'} · ${huboTestigos === 'si' ? 'Testigo' : 'Sin testigo'}`} />
              </div>
              <div className="mb-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Revisa con cuidado. Al enviar, se generará un código de seguimiento y recién podrás descargar la constancia.
              </div>
              <dl className="space-y-2 text-sm">
                <Row label="Tipo" value={tipo} />
                <Row label="Cuándo" value={hora} />
                <Row label="Ubicación" value={`${departamento}, ${provincia}, ${distrito}`} />
                <Row label="Coordenadas GPS" value={geoLatitud !== null && geoLongitud !== null ? `${geoLatitud.toFixed(6)}, ${geoLongitud.toFixed(6)}` : '—'} />
                <Row label="Referencia" value={referenciaUbicacion} />
                <Row label="Relato" value={narrativa} />
                <Row label="Objetos" value={objetos.map((objeto) => objeto.nombre).join(', ')} />
                <Row label="Sospechosos" value={observoSospechosos === 'si' ? sospPersonal : 'No observados'} />
                <Row label="Testigos" value={huboTestigos === 'si' ? testigos.map((testigo) => testigo.nombre).join(', ') : 'No hubo testigos'} />
              </dl>
              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-600">
                <input type="checkbox" checked={consentimiento} onChange={(event) => setConsentimiento(event.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-600" />
                <span>Declaro que la información es verdadera y autorizo su tratamiento conforme a la <a href="https://diariooficial.elperuano.pe/Normas/obtenerDocumento?idNorma=23"><b>Ley 29733.</b></a></span>
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

function OperationToast({ label }: { label: string }) {
  return (
    <div className="mb-4 flex items-center gap-3 rounded-2xl border border-brand-100 bg-white px-4 py-3 text-sm font-semibold text-brand-700 shadow-sm">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
      <span>{label}</span>
    </div>
  );
}

function TipoCard({
  selected,
  title,
  tag,
  icon,
  examples,
  onClick,
}: {
  selected: boolean;
  title: string;
  tag: string;
  icon: string;
  examples: string[];
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={`group relative min-h-[210px] rounded-2xl border p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] ${
        selected ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100' : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50'
      }`}
    >
      <span className={`absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full text-xs font-bold transition ${
        selected ? 'bg-brand-600 text-white' : 'bg-slate-50 text-slate-300 ring-1 ring-slate-200 group-hover:text-brand-600'
      }`}>
        {selected ? '✓' : ''}
      </span>
      <span className={`mb-3 grid h-12 w-12 place-items-center rounded-xl transition ${
        selected ? 'bg-white text-brand-700 shadow-sm' : 'bg-brand-50 text-brand-700 ring-1 ring-brand-100 group-hover:bg-white'
      }`}>
        <TipoIcon name={icon} />
      </span>
      <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-bold uppercase text-brand-700 ring-1 ring-brand-100">{tag}</span>
      <span className="mt-3 block pr-8 text-base font-bold text-slate-900">{title}</span>
      <span className="mt-3 block space-y-2">
        {examples.map((example) => (
          <span key={example} className="block rounded-xl bg-white/80 px-3 py-2 text-xs leading-relaxed text-slate-600 ring-1 ring-slate-100">
            {example}
          </span>
        ))}
      </span>
    </button>
  );
}

function TipoIcon({ name }: { name: string }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  if (name === 'alert') {
    return <svg {...common}><path d="M12 3l9 16H3L12 3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>;
  }

  return <svg {...common}><path d="M7 11V6a2 2 0 0 1 4 0v5" /><path d="M11 10V5a2 2 0 0 1 4 0v7" /><path d="M15 11V8a2 2 0 0 1 4 0v5c0 5-3 8-7 8H9a5 5 0 0 1-5-5v-3a2 2 0 0 1 4 0v2" /></svg>;
}

function ValorSelector({
  objeto,
  onSelect,
  onCustom,
}: {
  objeto: Objeto;
  onSelect: (range: { label: string; range: string; value: string }) => void;
  onCustom: () => void;
}) {
  const ranges = VALOR_RANGOS_POR_OBJETO[objeto.nombre] ?? VALOR_RANGOS_BASE;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Valor aproximado</p>
          <p className="text-xs leading-relaxed text-slate-500">Elige un rango orientativo de mercado peruano o especifica otro monto.</p>
        </div>
        {objeto.valorRango && <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">S/ {objeto.valorAproximado}</span>}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {ranges.map((range) => {
          const selected = objeto.valorRango === `${range.label} (${range.range})`;
          return (
            <button
              key={`${range.label}-${range.range}`}
              type="button"
              onClick={() => onSelect(range)}
              className={`rounded-xl border px-3 py-2 text-left transition hover:-translate-y-0.5 ${
                selected ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100' : 'border-slate-200 bg-slate-50 hover:border-brand-300 hover:bg-white'
              }`}
            >
              <span className="block text-xs font-bold text-slate-900">{range.label}</span>
              <span className="block text-xs text-slate-500">{range.range}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={onCustom}
          className={`rounded-xl border border-dashed px-3 py-2 text-left transition hover:-translate-y-0.5 ${
            !objeto.valorRango ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-100' : 'border-slate-300 bg-white text-slate-600 hover:border-brand-300'
          }`}
        >
          <span className="block text-xs font-bold">Otro monto</span>
          <span className="block text-xs">Especificar manualmente</span>
        </button>
      </div>
    </div>
  );
}

function DecisionCards({
  value,
  onChange,
  yes,
  no,
}: {
  value: Answer;
  onChange: (value: Answer) => void;
  yes: { title: string; description: string; icon: string };
  no: { title: string; description: string; icon: string };
}) {
  const options = [
    { value: 'si' as const, ...yes },
    { value: 'no' as const, ...no },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            aria-pressed={selected}
            className={`group relative min-h-[132px] rounded-2xl border p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] ${
              selected
                ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-100'
                : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-slate-50'
            }`}
          >
            <span className={`absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full text-xs font-bold transition ${
              selected ? 'bg-brand-600 text-white' : 'bg-slate-50 text-slate-300 ring-1 ring-slate-200 group-hover:text-brand-600'
            }`}>
              {selected ? '✓' : ''}
            </span>
            <span className={`mb-3 grid h-11 w-11 place-items-center rounded-xl transition ${
              selected ? 'bg-white text-brand-700 shadow-sm' : 'bg-brand-50 text-brand-700 ring-1 ring-brand-100 group-hover:bg-white'
            }`}>
              <DecisionIcon name={option.icon} />
            </span>
            <span className="block pr-8 text-sm font-bold text-slate-900">{option.title}</span>
            <span className="mt-1 block text-xs leading-relaxed text-slate-500">{option.description}</span>
            <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              selected ? 'bg-white text-brand-700 ring-1 ring-brand-100' : 'bg-slate-50 text-slate-500 ring-1 ring-slate-200'
            }`}>
              {option.value === 'si' ? 'Agregar detalles' : 'Continuar sin datos'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function DecisionIcon({ name }: { name: string }) {
  const common = {
    width: 23,
    height: 23,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  if (name === 'eye') {
    return <svg {...common}><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></svg>;
  }

  if (name === 'shield') {
    return <svg {...common}><path d="M12 3l7 3v5c0 4.5-2.8 8-7 10-4.2-2-7-5.5-7-10V6l7-3Z" /><path d="M9 12l2 2 4-4" /></svg>;
  }
  if (name === 'users') {
    return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9.5" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
  }
  return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></svg>;
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

function ObjetoIcon({ name }: { name: string }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  if (name === 'phone') {
    return <svg {...common}><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M10 18h4" /></svg>;
  }
  if (name === 'wallet') {
    return <svg {...common}><path d="M4 7.5h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2h11" /><path d="M16 12h4v4h-4a2 2 0 0 1 0-4Z" /><path d="M6 5l9-2 1 4" /></svg>;
  }
  if (name === 'laptop') {
    return <svg {...common}><rect x="5" y="4" width="14" height="10" rx="1.5" /><path d="M3 18h18" /><path d="M8 18h8" /></svg>;
  }
  if (name === 'bag' || name === 'purse') {
    return <svg {...common}><path d="M7 8V6a5 5 0 0 1 10 0v2" /><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 12h6" /></svg>;
  }
  if (name === 'bike') {
    return <svg {...common}><circle cx="6" cy="17" r="3" /><circle cx="18" cy="17" r="3" /><path d="M8.5 17H12l2-6h2" /><path d="M12 17l-3-6h4" /><path d="M15 7h2" /></svg>;
  }
  if (name === 'headphones') {
    return <svg {...common}><path d="M4 14a8 8 0 0 1 16 0" /><path d="M4 14v4a2 2 0 0 0 2 2h1v-6H6a2 2 0 0 0-2 2" /><path d="M20 14v4a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2" /></svg>;
  }
  if (name === 'watch') {
    return <svg {...common}><circle cx="12" cy="12" r="4" /><path d="M9 2h6l1 5H8l1-5Z" /><path d="M8 17h8l-1 5H9l-1-5Z" /><path d="M12 10v2l1.5 1.5" /></svg>;
  }
  if (name === 'tablet') {
    return <svg {...common}><rect x="5" y="2.5" width="14" height="19" rx="2" /><path d="M11 18h2" /></svg>;
  }
  return <svg {...common}><path d="M12 5v14" /><path d="M5 12h14" /><rect x="4" y="4" width="16" height="16" rx="3" /></svg>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-slate-100 pb-2 sm:grid-cols-[120px_1fr]">
      <dt className="text-slate-500">{label}</dt>
      <dd className="break-words font-medium text-slate-800">{value || '—'}</dd>
    </div>
  );
}

function ReviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-bold capitalize text-slate-900">{value}</p>
    </div>
  );
}
