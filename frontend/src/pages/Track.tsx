import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Page, Card, Button, Field, Alert, EstadoPill } from '../components/ui';
import { api } from '../api/client';

export default function Track() {
  const [codigo, setCodigo] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function consultar() {
    setError(''); setResult(null); setBusy(true);
    try {
      setResult(await api.get(`/seguimiento?codigo=${encodeURIComponent(codigo)}`));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <h1 className="mb-1 text-xl font-bold text-slate-900">Consultar denuncia</h1>
      <p className="mb-5 text-sm text-slate-500">Con tu código de seguimiento ves en qué oficina se encuentra tu denuncia. No necesitas iniciar sesión.</p>

      <Card>
        <div className="space-y-4">
          {error && <Alert kind="error">{error}</Alert>}
          <Field label="Código de seguimiento" value={codigo} onChange={setCodigo} placeholder="DEN-2026-0000000" maxLength={20} />
          <Button onClick={consultar} disabled={busy || !codigo}>{busy ? 'Consultando…' : 'Consultar'}</Button>
        </div>
      </Card>

      {result && (
        <Card className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900">{result.codigoSeguimiento}</p>
              <p className="text-sm capitalize text-slate-500">{result.tipo}</p>
            </div>
            <EstadoPill estado={result.estado} />
          </div>
          <div className="rounded-xl bg-brand-50 p-4 text-center">
            <p className="text-xs uppercase tracking-wide text-brand-600">Oficina actual</p>
            <p className="text-lg font-bold text-brand-700">{result.oficinaActual ?? 'En registro'}</p>
            {result.comisaria && <p className="text-xs text-slate-500">{result.comisaria}</p>}
          </div>
          {result.movimientos?.length > 0 && (
            <ol className="mt-4 space-y-2 border-t border-slate-100 pt-3">
              {result.movimientos.map((m: any, i: number) => (
                <li key={i} className="flex justify-between text-sm">
                  <span className="text-slate-700">{m.oficina}</span>
                  <span className="text-xs text-slate-400">{new Date(m.ingreso).toLocaleDateString('es-PE')}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      )}

      <p className="mt-6 text-center text-sm text-slate-400">
        <Link to="/" className="font-medium text-brand-600">← Volver al inicio</Link>
      </p>
    </Page>
  );
}
