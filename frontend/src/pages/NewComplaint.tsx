import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page, Card, Button, Field, TextArea, Alert, Stepper } from '../components/ui';
import CameraCapture from '../components/CameraCapture';
import { api } from '../api/client';

type Step =
  | 'basic' | 'reniec' | 'contact' | 'consent'
  | 'face_front' | 'face_profile'
  | 'type' | 'place' | 'narrative' | 'items' | 'review' | 'done';

const ORDER: Step[] = [
  'basic', 'reniec', 'contact', 'consent',
  'face_front', 'face_profile',
  'type', 'place', 'narrative', 'items', 'review', 'done',
];

interface Item { name: string; brandModel: string; approxValue: string }

export default function NewComplaint() {
  const nav = useNavigate();
  const [step, setStep] = useState<Step>('basic');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // identity
  const [dni, setDni] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [checkDigit, setCheckDigit] = useState('');
  const [reniec, setReniec] = useState<any>(null);
  const [otpChannel, setOtpChannel] = useState<'sms' | 'email'>('sms');
  const [devCode, setDevCode] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [consentId, setConsentId] = useState<string | null>(null);

  // report
  const [reportId, setReportId] = useState<string | null>(null);
  const [type, setType] = useState<'robo' | 'hurto' | ''>('');
  const [occurredAt, setOccurredAt] = useState('');
  const [district, setDistrict] = useState('');
  const [locationRef, setLocationRef] = useState('');
  const [narrative, setNarrative] = useState('');
  const [items, setItems] = useState<Item[]>([{ name: '', brandModel: '', approxValue: '' }]);
  const [submitResult, setSubmitResult] = useState<any>(null);

  const idx = ORDER.indexOf(step);
  const go = (s: Step) => { setError(''); setStep(s); };
  const next = () => go(ORDER[idx + 1]);

  // auto-run mock RENIEC when reaching that step
  useEffect(() => {
    if (step === 'reniec' && !reniec) {
      api.post('/identity/reniec-check').then(setReniec).catch((e) => setError(e.message));
    }
  }, [step, reniec]);

  async function submitBasic() {
    setBusy(true); setError('');
    try {
      const res = await api.post('/identity/basic', {
        dni, birthDate,
        checkDigit: checkDigit || undefined,
      });
      if (!res.passed && !checkDigit) {
        setError('Ingresa el dígito de verificación o revisa tus datos.');
        return;
      }
      next();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }

  async function sendOtp() {
    setBusy(true); setError('');
    try {
      const res = await api.post('/identity/otp/send', { channel: otpChannel });
      setDevCode(res.devCode);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }

  async function verifyOtp() {
    setBusy(true); setError('');
    try {
      await api.post('/identity/otp/verify', { code: otpInput });
      setOtpVerified(true);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }

  async function grantConsent() {
    setBusy(true); setError('');
    try {
      const res = await api.post('/consents', { type: 'face_biometric', textVersion: 'v1' });
      setConsentId(res.consentId);
      next();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }

  async function uploadFace(captureType: 'front' | 'profile', dataUrl: string) {
    setBusy(true); setError('');
    try {
      await api.post('/face-captures', { captureType, imageBase64: dataUrl, consentId });
      next();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }

  async function ensureReport(): Promise<string> {
    if (reportId) return reportId;
    const r = await api.post('/reports');
    setReportId(r.id);
    return r.id;
  }

  async function saveReport(patch: any) {
    const id = await ensureReport();
    await api.patch(`/reports/${id}`, patch);
  }

  async function submitReport() {
    setBusy(true); setError('');
    try {
      const id = await ensureReport();
      for (const it of items) {
        if (it.name.trim()) {
          await api.post(`/reports/${id}/items`, {
            name: it.name,
            brandModel: it.brandModel || undefined,
            approxValue: it.approxValue ? Number(it.approxValue) : undefined,
          });
        }
      }
      const res = await api.post(`/reports/${id}/submit`, {
        consents: ['truthfulness', 'data_processing'],
      });
      setSubmitResult(res);
      go('done');
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
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

      {step === 'basic' && (
        <Card>
          <h2 className="text-lg font-bold text-slate-900">Validación de identidad</h2>
          <p className="mb-4 text-sm text-slate-500">Paso 1 de 4 · sin DNI electrónico</p>
          <div className="space-y-4">
            <Field label="Número de DNI" value={dni} onChange={setDni} placeholder="8 dígitos" />
            <Field label="Fecha de nacimiento" type="date" value={birthDate} onChange={setBirthDate} />
            <Field label="Dígito de verificación" value={checkDigit} onChange={setCheckDigit} hint="El dígito al final de tu DNI" />
            <Button onClick={submitBasic} disabled={busy}>Continuar</Button>
          </div>
        </Card>
      )}

      {step === 'reniec' && (
        <Card>
          <h2 className="text-lg font-bold text-slate-900">Validación con RENIEC</h2>
          {!reniec ? (
            <p className="mt-4 text-sm text-slate-500">Verificando tus datos…</p>
          ) : (
            <div className="mt-4 space-y-4">
              <Alert kind={reniec.match ? 'success' : 'warning'}>{reniec.message}</Alert>
              <p className="text-xs text-slate-400">Paso simulado en el MVP. En producción se integra con RENIEC vía PIDE.</p>
              <Button onClick={next}>Continuar</Button>
            </div>
          )}
        </Card>
      )}

      {step === 'contact' && (
        <Card>
          <h2 className="text-lg font-bold text-slate-900">Verifica tu contacto</h2>
          <p className="mb-4 text-sm text-slate-500">Te enviaremos un código para notificaciones.</p>
          <div className="space-y-4">
            {!devCode ? (
              <>
                <div className="flex gap-2">
                  <button onClick={() => setOtpChannel('sms')} className={`flex-1 rounded-xl border px-3 py-2 text-sm ${otpChannel === 'sms' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-300'}`}>SMS</button>
                  <button onClick={() => setOtpChannel('email')} className={`flex-1 rounded-xl border px-3 py-2 text-sm ${otpChannel === 'email' ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-slate-300'}`}>Correo</button>
                </div>
                <Button onClick={sendOtp} disabled={busy}>Enviar código</Button>
                <button onClick={next} className="block w-full text-center text-sm text-slate-400">Verificar luego</button>
              </>
            ) : otpVerified ? (
              <>
                <Alert kind="success">Contacto verificado.</Alert>
                <Button onClick={next}>Continuar</Button>
              </>
            ) : (
              <>
                <Alert kind="info">Código de demostración: <b>{devCode}</b> (en producción llega por {otpChannel}).</Alert>
                <Field label="Ingresa el código" value={otpInput} onChange={setOtpInput} />
                <Button onClick={verifyOtp} disabled={busy}>Verificar</Button>
              </>
            )}
          </div>
        </Card>
      )}

      {step === 'consent' && (
        <Card>
          <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
          </div>
          <h2 className="text-lg font-bold text-slate-900">Necesitamos 2 fotos de tu rostro</h2>
          <p className="mt-2 text-sm text-slate-600">Solo para verificar tu identidad en esta denuncia. Las imágenes se cifran, se adjuntan a tu caso y no se usan para nada más.</p>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
            <li>• Cifrado en reposo</li>
            <li>• Uso limitado a esta denuncia</li>
            <li>• Conforme a la Ley 29733</li>
          </ul>
          <div className="mt-5">
            <Button onClick={grantConsent} disabled={busy}>Acepto y doy mi consentimiento</Button>
          </div>
        </Card>
      )}

      {step === 'face_front' && (
        <Card>
          <h2 className="mb-1 text-lg font-bold text-slate-900">Foto frontal</h2>
          <p className="mb-4 text-sm text-slate-500">Captura tu rostro de frente.</p>
          <CameraCapture shape="oval" onCapture={(d) => uploadFace('front', d)} />
        </Card>
      )}

      {step === 'face_profile' && (
        <Card>
          <h2 className="mb-1 text-lg font-bold text-slate-900">Foto de perfil</h2>
          <p className="mb-4 text-sm text-slate-500">Ahora gira tu rostro de lado.</p>
          <CameraCapture shape="side" onCapture={(d) => uploadFace('profile', d)} />
        </Card>
      )}

      {step === 'type' && (
        <Card>
          <h2 className="mb-1 text-lg font-bold text-slate-900">¿Qué ocurrió?</h2>
          <p className="mb-4 text-sm text-slate-500">Selecciona el tipo de hecho.</p>
          <div className="space-y-3">
            {(['robo', 'hurto'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`w-full rounded-xl border p-3 text-left ${type === t ? 'border-brand-500 ring-2 ring-brand-100' : 'border-slate-300'}`}
              >
                <p className="font-semibold capitalize text-slate-900">{t}</p>
                <p className="text-sm text-slate-500">{t === 'robo' ? 'Con violencia o amenaza' : 'Sin violencia'}</p>
              </button>
            ))}
            <Button
              disabled={!type || busy}
              onClick={async () => { await saveReport({ type }); next(); }}
            >
              Continuar
            </Button>
          </div>
        </Card>
      )}

      {step === 'place' && (
        <Card>
          <h2 className="mb-4 text-lg font-bold text-slate-900">¿Cuándo y dónde?</h2>
          <div className="space-y-4">
            <Field label="Fecha del hecho" type="date" value={occurredAt} onChange={setOccurredAt} />
            <Field label="Distrito" value={district} onChange={setDistrict} placeholder="Ej. Miraflores" />
            <Field label="Referencia del lugar" value={locationRef} onChange={setLocationRef} placeholder="Av. / cruce / referencia" />
            <Button disabled={busy} onClick={async () => { await saveReport({ occurredAt, district, locationRef }); next(); }}>Continuar</Button>
          </div>
        </Card>
      )}

      {step === 'narrative' && (
        <Card>
          <h2 className="mb-4 text-lg font-bold text-slate-900">Describe lo que pasó</h2>
          <div className="space-y-4">
            <TextArea label="Relato de los hechos" value={narrative} onChange={setNarrative} rows={6} placeholder="Cuenta qué pasó, cómo y qué te sustrajeron." />
            <Button disabled={!narrative.trim() || busy} onClick={async () => { await saveReport({ narrative }); next(); }}>Continuar</Button>
          </div>
        </Card>
      )}

      {step === 'items' && (
        <Card>
          <h2 className="mb-1 text-lg font-bold text-slate-900">Objetos afectados</h2>
          <p className="mb-4 text-sm text-slate-500">Opcional, pero ayuda a tu caso.</p>
          <div className="space-y-4">
            {items.map((it, i) => (
              <div key={i} className="space-y-2 rounded-xl bg-slate-50 p-3">
                <Field label={`Objeto ${i + 1}`} value={it.name} onChange={(v) => setItems(items.map((x, j) => j === i ? { ...x, name: v } : x))} placeholder="Ej. Celular" />
                <Field label="Marca / modelo" value={it.brandModel} onChange={(v) => setItems(items.map((x, j) => j === i ? { ...x, brandModel: v } : x))} />
                <Field label="Valor aprox. (S/)" type="number" value={it.approxValue} onChange={(v) => setItems(items.map((x, j) => j === i ? { ...x, approxValue: v } : x))} />
              </div>
            ))}
            <button onClick={() => setItems([...items, { name: '', brandModel: '', approxValue: '' }])} className="text-sm font-semibold text-brand-600">+ Agregar otro objeto</button>
            <Button onClick={next}>Continuar</Button>
          </div>
        </Card>
      )}

      {step === 'review' && (
        <Card>
          <h2 className="mb-4 text-lg font-bold text-slate-900">Revisa tu denuncia</h2>
          <dl className="space-y-2 text-sm">
            <Row k="Tipo" v={type} />
            <Row k="Fecha" v={occurredAt} />
            <Row k="Distrito" v={district} />
            <Row k="Lugar" v={locationRef} />
            <Row k="Relato" v={narrative} />
            <Row k="Objetos" v={items.filter((i) => i.name.trim()).map((i) => i.name).join(', ') || '—'} />
          </dl>
          <label className="mt-4 flex items-start gap-2 text-sm text-slate-600">
            <input type="checkbox" defaultChecked className="mt-0.5" />
            Declaro que la información es verdadera y autorizo su tratamiento (Ley 29733).
          </label>
          <div className="mt-5">
            <Button onClick={submitReport} disabled={busy}>{busy ? 'Enviando…' : 'Enviar denuncia'}</Button>
          </div>
        </Card>
      )}

      {step === 'done' && submitResult && (
        <div className="text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Denuncia registrada</h2>
          <p className="mt-1 text-sm text-slate-500">{submitResult.next_steps}</p>
          <div className="mx-auto mt-5 max-w-xs rounded-2xl bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Código</p>
            <p className="text-lg font-bold tracking-wide text-slate-900">{submitResult.tracking_code}</p>
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
