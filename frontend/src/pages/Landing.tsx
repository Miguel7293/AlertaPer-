import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10">
        <div className="flex-1">
          <div className="mt-8 flex justify-center">
            <img src="/LogoDenunciaPE.png" alt="DenunciaPE" className="h-44 w-auto" draggable={false} />
          </div>

          <h1 className="mt-8 text-center text-3xl font-bold leading-tight text-slate-900">
            Denuncia tu robo sin salir de casa
          </h1>
          <p className="mt-3 text-center text-slate-500">
            Guiada, verificada y con seguimiento. Completa tu denuncia policial en línea, paso a paso.
          </p>

          <div className="mt-10 space-y-3">
            <Link to="/register" className="block rounded-xl bg-brand-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-brand-700">
              Iniciar denuncia
            </Link>
            <Link to="/seguimiento" className="block rounded-xl border border-brand-200 px-4 py-3 text-center text-sm font-semibold text-brand-700 hover:bg-brand-50">
              Hacer seguimiento
            </Link>
            <p className="pt-2 text-center text-sm text-slate-500">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="font-semibold text-brand-600">Inicia sesión</Link>
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-400">
          <span>Cifrado</span><span>•</span>
          <span>Ley 29733</span><span>•</span>
          <span>Validación RENIEC</span>
        </div>
      </div>
    </div>
  );
}
