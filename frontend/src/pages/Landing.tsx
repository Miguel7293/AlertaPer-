import { Link } from 'react-router-dom';
import { Logo } from '../components/ui';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-700 to-brand-900 text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <Logo light />

        <div className="mt-16 flex-1">
          <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-white/15">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l7 4v5c0 4-3 7-7 9-4-2-7-5-7-9V7l7-4z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold leading-tight">Denuncia tu robo sin salir de casa</h1>
          <p className="mt-3 text-brand-100">Guiada, verificada y con seguimiento. Completa tu denuncia policial en línea, paso a paso.</p>

          <div className="mt-8 space-y-3">
            <Link to="/register" className="block rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-brand-700 hover:bg-brand-50">
              Iniciar denuncia
            </Link>
            <Link to="/track" className="block rounded-xl border border-white/30 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-white/10">
              Hacer seguimiento
            </Link>
            <p className="pt-2 text-center text-sm text-brand-100">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="font-semibold text-white underline">Inicia sesión</Link>
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-brand-100">
          <span>Cifrado</span><span>•</span>
          <span>Ley 29733</span><span>•</span>
          <span>Validación RENIEC</span>
        </div>
      </div>
    </div>
  );
}
