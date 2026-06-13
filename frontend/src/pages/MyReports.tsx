import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Page, Card, EstadoPill, Button } from '../components/ui';
import { api } from '../api/client';

export default function MyReports() {
  const [denuncias, setDenuncias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/denuncias').then(setDenuncias).catch(() => setDenuncias([])).finally(() => setLoading(false));
  }, []);

  return (
    <Page>
      <h1 className="mb-4 text-xl font-bold text-slate-900">Mis denuncias</h1>
      {loading ? (
        <p className="text-sm text-slate-400">Cargando…</p>
      ) : denuncias.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">Aún no tienes denuncias registradas.</p>
          <div className="mt-4"><Link to="/denuncia/nueva"><Button>Nueva denuncia</Button></Link></div>
        </Card>
      ) : (
        <div className="space-y-3">
          {denuncias.map((d) => (
            <Link key={d.id} to={`/denuncia/${d.id}`}>
              <Card className="transition hover:border-brand-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{d.codigoSeguimiento ?? 'Borrador'}</p>
                    <p className="text-sm capitalize text-slate-500">{d.tipo ?? '—'} {d.distrito ? `· ${d.distrito}` : ''}</p>
                    {d.oficinaActual && <p className="mt-0.5 text-xs text-slate-400">Oficina: {d.oficinaActual}</p>}
                  </div>
                  <EstadoPill estado={d.estado} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Page>
  );
}
