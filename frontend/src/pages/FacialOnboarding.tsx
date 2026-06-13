import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page, Card, Button, Alert } from '../components/ui';
import CameraCapture from '../components/CameraCapture';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';

const CAPTURAS = [
  { tipo: 'front' as const, shape: 'oval' as const, titulo: 'Foto frontal', desc: 'Mira de frente a la cámara.' },
  { tipo: 'profile' as const, shape: 'side' as const, titulo: 'Lateral izquierdo', desc: 'Gira tu rostro hacia la izquierda.' },
  { tipo: 'profile' as const, shape: 'side' as const, titulo: 'Lateral derecho', desc: 'Ahora gira hacia la derecha.' },
];

export default function FacialOnboarding() {
  const nav = useNavigate();
  const { refreshUser } = useAuth();
  const [consentId, setConsentId] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function consentir() {
    setError(''); setBusy(true);
    try {
      const res = await api.post('/verificacion/consentimiento', { tipo: 'face_biometric', versionTexto: 'v1' });
      setConsentId(res.consentimientoId);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function capturar(dataUrl: string) {
    setError(''); setBusy(true);
    try {
      await api.post('/verificacion/captura-facial', {
        tipoCaptura: CAPTURAS[idx].tipo,
        imagenBase64: dataUrl,
        consentimientoId: consentId,
      });
      if (idx < CAPTURAS.length - 1) {
        setIdx(idx + 1);
      } else {
        await refreshUser();
        nav('/app');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-xs text-white">2</span>
        Verificación · paso 2 de 2
      </div>

      {error && <div className="mb-4"><Alert kind="error">{error}</Alert></div>}

      {!consentId ? (
        <Card>
          <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
          </div>
          <h1 className="text-lg font-bold text-slate-900">Verificación facial</h1>
          <p className="mt-2 text-sm text-slate-600">Tomaremos 3 fotos de tu rostro (frontal y laterales) solo para verificar tu identidad. Se cifran y no se usan para nada más.</p>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
            <li>• Cifrado en reposo</li>
            <li>• Uso limitado a la verificación</li>
            <li>• Conforme a la Ley 29733</li>
          </ul>
          <div className="mt-5"><Button onClick={consentir} disabled={busy}>Acepto y doy mi consentimiento</Button></div>
        </Card>
      ) : (
        <Card>
          <div className="mb-3 flex gap-1.5">
            {CAPTURAS.map((_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= idx ? 'bg-brand-600' : 'bg-slate-200'}`} />
            ))}
          </div>
          <h2 className="text-lg font-bold text-slate-900">{CAPTURAS[idx].titulo}</h2>
          <p className="mb-4 text-sm text-slate-500">{CAPTURAS[idx].desc} ({idx + 1} de {CAPTURAS.length})</p>
          <CameraCapture key={idx} shape={CAPTURAS[idx].shape} onCapture={capturar} />
        </Card>
      )}
    </Page>
  );
}
