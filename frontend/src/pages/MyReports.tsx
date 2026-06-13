import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Page, Card, StatusBadge, Button } from '../components/ui';
import { api } from '../api/client';

export default function MyReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reports').then(setReports).catch(() => setReports([])).finally(() => setLoading(false));
  }, []);

  return (
    <Page>
      <h1 className="mb-4 text-xl font-bold text-slate-900">Mis denuncias</h1>
      {loading ? (
        <p className="text-sm text-slate-400">Cargando…</p>
      ) : reports.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">Aún no tienes denuncias registradas.</p>
          <div className="mt-4"><Link to="/denuncia/nueva"><Button>Nueva denuncia</Button></Link></div>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Link key={r.id} to={`/denuncia/${r.id}`}>
              <Card className="transition hover:border-brand-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{r.trackingCode ?? 'Borrador'}</p>
                    <p className="text-sm capitalize text-slate-500">{r.type ?? '—'} {r.district ? `· ${r.district}` : ''}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Page>
  );
}
