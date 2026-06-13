import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Page, Card, Button, Field, Alert, StatusBadge, statusLabel } from '../components/ui';
import { api } from '../api/client';

export default function Track() {
  const [code, setCode] = useState('');
  const [dni, setDni] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function lookup() {
    setError(''); setResult(null); setBusy(true);
    try {
      const res = await api.get(`/track?code=${encodeURIComponent(code)}&dni=${encodeURIComponent(dni)}`);
      setResult(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <h1 className="mb-1 text-xl font-bold text-slate-900">Seguimiento de denuncia</h1>
      <p className="mb-5 text-sm text-slate-500">Consulta el estado con tu código y tu DNI.</p>

      <Card>
        <div className="space-y-4">
          {error && <Alert kind="error">{error}</Alert>}
          <Field label="Código de seguimiento" value={code} onChange={setCode} placeholder="DEN-2026-0000000" />
          <Field label="DNI" value={dni} onChange={setDni} placeholder="8 dígitos" />
          <Button onClick={lookup} disabled={busy}>{busy ? 'Consultando…' : 'Consultar'}</Button>
        </div>
      </Card>

      {result && (
        <Card className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900">{result.trackingCode}</p>
              <p className="text-sm capitalize text-slate-500">{result.type} {result.district ? `· ${result.district}` : ''}</p>
            </div>
            <StatusBadge status={result.status} />
          </div>
          <ol className="space-y-2 border-t border-slate-100 pt-3">
            {result.timeline?.map((e: any, i: number) => (
              <li key={i} className="flex justify-between text-sm">
                <span className="text-slate-700">{statusLabel(e.status)}</span>
                <span className="text-xs text-slate-400">{new Date(e.at).toLocaleDateString('es-PE')}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <p className="mt-6 text-center text-sm text-slate-400">
        <Link to="/" className="font-medium text-brand-600">← Volver al inicio</Link>
      </p>
    </Page>
  );
}
