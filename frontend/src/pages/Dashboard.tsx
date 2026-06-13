import { Link } from 'react-router-dom';
import { Page, Card } from '../components/ui';
import { useAuth } from '../auth/AuthContext';

function ActionCard({ to, title, desc, icon }: { to: string; title: string; desc: string; icon: ReactNode }) {
  return (
    <Link to={to}>
      <Card className="flex items-center gap-4 transition hover:border-brand-300 hover:shadow-md">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">{icon}</div>
        <div>
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="text-sm text-slate-500">{desc}</p>
        </div>
      </Card>
    </Link>
  );
}

import { ReactNode } from 'react';

export default function Dashboard() {
  const { user } = useAuth();
  return (
    <Page>
      <h1 className="mb-1 text-xl font-bold text-slate-900">Hola{user?.dni ? `, ${user.dni}` : ''}</h1>
      <p className="mb-5 text-sm text-slate-500">¿Qué deseas hacer hoy?</p>

      <div className="space-y-3">
        <ActionCard
          to="/denuncia/nueva"
          title="Nueva denuncia"
          desc="Inicia y completa una denuncia paso a paso"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>}
        />
        <ActionCard
          to="/mis-denuncias"
          title="Mis denuncias"
          desc="Revisa el estado y la línea de tiempo de tus casos"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h10" /></svg>}
        />
        <ActionCard
          to="/tutorial"
          title="Ver tutorial"
          desc="Aprende cómo funciona antes de empezar"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v4h1" /></svg>}
        />
      </div>
    </Page>
  );
}
