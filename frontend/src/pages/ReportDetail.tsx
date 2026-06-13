import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Page, Card, StatusBadge, statusLabel } from '../components/ui';
import { api } from '../api/client';

function Timeline({ events }: { events: any[] }) {
  return (
    <ol className="relative space-y-5 pl-6">
      {events.map((e, i) => {
        const done = i < events.length - 1;
        const current = i === events.length - 1;
        return (
          <li key={i} className="relative">
            <span
              className={`absolute -left-6 top-1 grid h-3.5 w-3.5 place-items-center rounded-full ${
                current ? 'bg-amber-500' : done ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            />
            {i < events.length - 1 && <span className="absolute -left-[18px] top-4 h-full w-px bg-slate-200" />}
            <p className="text-sm font-semibold text-slate-800">{statusLabel(e.status)}</p>
            {e.note && <p className="text-xs text-slate-500">{e.note}</p>}
            <p className="text-xs text-slate-400">{new Date(e.at).toLocaleString('es-PE')}</p>
          </li>
        );
      })}
    </ol>
  );
}

export default function ReportDetail() {
  const { id } = useParams();
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/reports/${id}`).then(setReport).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <Page><Card><p className="text-sm text-red-600">{error}</p></Card></Page>;
  if (!report) return <Page><p className="text-sm text-slate-400">Cargando…</p></Page>;

  return (
    <Page>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{report.trackingCode ?? 'Borrador'}</h1>
          <p className="text-sm capitalize text-slate-500">{report.type ?? '—'} {report.district ? `· ${report.district}` : ''}</p>
        </div>
        <StatusBadge status={report.status} />
      </div>

      <Card className="mb-4">
        <h2 className="mb-4 font-semibold text-slate-900">Línea de tiempo</h2>
        <Timeline events={report.timeline ?? []} />
        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Recibirás notificaciones por SMS o correo ante cada cambio de estado.
        </p>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Detalle</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">Fecha del hecho</dt><dd className="font-medium">{report.occurredAt ?? '—'}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Lugar</dt><dd className="font-medium">{report.locationRef ?? '—'}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Identidad</dt><dd className="font-medium">{report.identityStatus}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Fotos de rostro</dt><dd className="font-medium">{report.faceCaptures?.length ?? 0} (cifradas)</dd></div>
        </dl>
        {report.narrative && (
          <>
            <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">Relato</p>
            <p className="mt-1 text-sm text-slate-700">{report.narrative}</p>
          </>
        )}
        {report.items?.length > 0 && (
          <>
            <p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">Objetos</p>
            <ul className="mt-1 text-sm text-slate-700">
              {report.items.map((it: any) => (
                <li key={it.id}>• {it.name}{it.brandModel ? ` (${it.brandModel})` : ''}</li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </Page>
  );
}
