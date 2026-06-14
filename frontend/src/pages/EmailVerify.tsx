import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Page, Card, Button, Field, Alert } from '../components/ui';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export default function EmailVerify() {
  const nav = useNavigate();
  const { user, refreshUser } = useAuth();
  const autoSendKey = user?.id ? `seguro_email_auto_sent_${user.id}` : '';
  const [devCode, setDevCode] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<'smtp' | 'demo' | ''>('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function send(force = false) {
    if (!force && autoSendKey && sessionStorage.getItem(autoSendKey)) return;
    if (!force && autoSendKey) sessionStorage.setItem(autoSendKey, '1');

    setError(''); setBusy(true);
    try {
      const res = await api.post('/auth/email/send');
      if (res.alreadyVerified) { nav('/onboarding/rostro'); return; }
      setDeliveryMode(res.deliveryMode ?? (res.devCode ? 'demo' : 'smtp'));
      setDevCode(res.devCode ?? '');
    } catch (e: any) {
      if (!force && autoSendKey) sessionStorage.removeItem(autoSendKey);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { send(); /* eslint-disable-next-line */ }, [autoSendKey]);

  async function verify() {
    setError(''); setBusy(true);
    try {
      await api.post('/auth/email/verify', { codigo });
      const me = await refreshUser();
      nav(me.facialCompleto ? '/app' : '/onboarding/rostro');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-xs text-white">1</span>
        Verificación · paso 1 de 2
      </div>
      <Card>
        <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
        </div>
        <h1 className="text-lg font-bold text-slate-900">Verifica tu correo</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enviamos un código a <b>{user?.correoElectronico}</b>.
        </p>
        <div className="mt-4 space-y-4">
          {error && <Alert kind="error">{error}</Alert>}
          {deliveryMode === 'smtp' && <Alert kind="success">Te enviamos el código. Revisa tu bandeja de entrada.</Alert>}
          {devCode && <Alert kind="info">Código de demostración: <b>{devCode}</b> (configura SMTP para enviarlo por correo real).</Alert>}
          <Field label="Código de verificación" value={codigo} onChange={setCodigo} placeholder="6 dígitos" digitsOnly maxLength={6} inputMode="numeric" />
          <Button onClick={verify} disabled={busy || !codigo}>Verificar correo</Button>
          <button onClick={send} disabled={busy} className="block w-full text-center text-sm text-slate-400">Reenviar código</button>
        </div>
      </Card>
    </Page>
  );
}
