import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Page, Card, EstadoPill } from '../components/ui';
import { api } from '../api/client';

function Movimientos({ items }: { items: any[] }) {
  if (!items?.length) return <p className="text-sm text-slate-400">Sin movimientos aún.</p>;
  return (
    <ol className="relative space-y-5 pl-6">
      {items.map((m, i) => {
        const actual = !m.salida;
        return (
          <li key={i} className="relative">
            <span className={`absolute -left-6 top-1 h-3.5 w-3.5 rounded-full ${actual ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            {i < items.length - 1 && <span className="absolute -left-[18px] top-4 h-full w-px bg-slate-200" />}
            <p className="text-sm font-semibold text-slate-800">{m.oficina}</p>
            {m.comentario && <p className="text-xs text-slate-500">{m.comentario}</p>}
            <p className="text-xs text-slate-400">
              {new Date(m.ingreso).toLocaleString('es-PE')}{actual ? ' · oficina actual' : ''}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export default function ReportDetail() {
  const { id } = useParams();
  const [d, setD] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/denuncias/${id}`).then(setD).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <Page><Card><p className="text-sm text-red-600">{error}</p></Card></Page>;
  if (!d) return <Page><p className="text-sm text-slate-400">Cargando…</p></Page>;

  return (
    <Page>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{d.codigoSeguimiento ?? 'Borrador'}</h1>
          <p className="text-sm capitalize text-slate-500">{d.tipo ?? '—'} {d.distrito ? `· ${d.distrito}` : ''}</p>
        </div>
        <EstadoPill estado={d.estadoDescripcion} />
      </div>

      <Card className="mb-4">
        <h2 className="mb-1 font-semibold text-slate-900">Recorrido de la denuncia</h2>
        <p className="mb-4 text-xs text-slate-500">
          {d.comisaria ?? 'Comisaría por asignar'}{d.oficinaActual?.oficina ? ` · actualmente en ${d.oficinaActual.oficina}` : ''}
        </p>
        <Movimientos items={d.movimientos} />
        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Recibirás notificaciones por correo o SMS ante cada cambio.
        </p>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-slate-900">Detalle</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-slate-500">Cuándo</dt><dd className="font-medium">{d.hora ?? '—'}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Lugar</dt><dd className="font-medium">{d.referenciaUbicacion ?? '—'}</dd></div>
          <div className="flex justify-between"><dt className="text-slate-500">Identidad</dt><dd className="font-medium">{d.identityStatus ?? d.estadoIdentidad ?? '—'}</dd></div>
        </dl>
        {d.narrativa && (<><p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">Relato</p><p className="mt-1 text-sm text-slate-700">{d.narrativa}</p></>)}
        {d.objetos?.length > 0 && (
          <><p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">Objetos</p>
          <ul className="mt-1 text-sm text-slate-700">{d.objetos.map((o: any) => <li key={o.id}>• {o.nombre}{o.marcaModelo ? ` (${o.marcaModelo})` : ''}{o.valorAproximado ? ` — S/ ${o.valorAproximado}` : ''}</li>)}</ul></>
        )}
        {d.sospechosos?.length > 0 && (
          <><p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">Sospechosos</p>
          <ul className="mt-1 text-sm text-slate-700">{d.sospechosos.map((s: any) => <li key={s.id}>• {s.descripcionPersonal ?? ''}{s.descripcionHuida ? ` — huida: ${s.descripcionHuida}` : ''}</li>)}</ul></>
        )}
        {d.testigos?.length > 0 && (
          <><p className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">Testigos</p>
          <ul className="mt-1 text-sm text-slate-700">{d.testigos.map((t: any) => <li key={t.id}>• {t.nombre} ({t.relacion})</li>)}</ul></>
        )}
      </Card>
    </Page>
  );
}
