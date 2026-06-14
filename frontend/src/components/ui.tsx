import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

// Header mark: cropped icon + wordmark. The full logo is used only on the landing.
export function Logo({ className = 'h-8' }: { light?: boolean; className?: string }) {
  return (
    <span className="flex items-center gap-2">
      <img src="/IconoDenunciaPE.png" alt="DenunciaPE" className={`${className} w-auto select-none`} draggable={false} />
      <span className="text-lg font-semibold tracking-tight text-brand-700">DenunciaPE</span>
    </span>
  );
}

export function TopBar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link to={user ? '/app' : '/'}><Logo /></Link>
        {user && (
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-500 sm:inline">DNI {user.dni}</span>
            <button
              onClick={async () => { await logout(); nav('/'); }}
              className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
            >
              Salir
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export function Page({ children, narrow = true }: { children: ReactNode; narrow?: boolean }) {
  return (
    <div className="min-h-screen">
      <TopBar />
      <main className={`mx-auto px-4 py-6 ${narrow ? 'max-w-md' : 'max-w-3xl'}`}>{children}</main>
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled,
  full = true,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'ghost' | 'outline';
  disabled?: boolean;
  full?: boolean;
}) {
  const base = `inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${full ? 'w-full' : ''}`;
  const styles = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700',
    outline: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}

export function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  hint,
  maxLength,
  inputMode,
  digitsOnly = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
  maxLength?: number;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email' | 'decimal';
  digitsOnly?: boolean;
}) {
  const handle = (raw: string) => {
    let v = digitsOnly ? raw.replace(/\D/g, '') : raw;
    if (maxLength != null) v = v.slice(0, maxLength);
    onChange(v);
  };
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        inputMode={inputMode}
        onChange={(e) => handle(e.target.value)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {maxLength != null && (
          <span className="text-xs text-slate-400">{value.length}/{maxLength}</span>
        )}
      </div>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(maxLength != null ? e.target.value.slice(0, maxLength) : e.target.value)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}

export function Alert({ kind = 'info', children }: { kind?: 'info' | 'error' | 'success' | 'warning'; children: ReactNode }) {
  const styles = {
    info: 'bg-brand-50 text-brand-700 border-brand-100',
    error: 'bg-red-50 text-red-700 border-red-100',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    warning: 'bg-amber-50 text-amber-700 border-amber-100',
  }[kind];
  return <div className={`rounded-xl border px-3 py-2.5 text-sm ${styles}`}>{children}</div>;
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="mb-5 flex items-center gap-1.5">
      {steps.map((_, i) => (
        <span
          key={i}
          className={`h-1.5 flex-1 rounded-full ${i <= current ? 'bg-brand-600' : 'bg-slate-200'}`}
        />
      ))}
    </div>
  );
}

// Colors an estado pill by matching its Spanish description.
export function EstadoPill({ estado }: { estado: string | null }) {
  if (!estado) return <span className="inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">Borrador</span>;
  const e = estado.toLowerCase();
  let cls = 'bg-brand-100 text-brand-700';
  if (e.includes('recibida') || e.includes('resuelta')) cls = 'bg-emerald-100 text-emerald-700';
  else if (e.includes('pendiente') || e.includes('observada') || e.includes('requerida')) cls = 'bg-amber-100 text-amber-700';
  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>{estado}</span>;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'Borrador', cls: 'bg-slate-100 text-slate-600' },
  RECEIVED: { label: 'Recibida', cls: 'bg-emerald-100 text-emerald-700' },
  IDENTITY_PENDING: { label: 'Pendiente de verificación', cls: 'bg-amber-100 text-amber-700' },
  UNDER_REVIEW: { label: 'En revisión', cls: 'bg-brand-100 text-brand-700' },
  ASSIGNED: { label: 'Asignada', cls: 'bg-brand-100 text-brand-700' },
  INFO_REQUESTED: { label: 'Información requerida', cls: 'bg-amber-100 text-amber-700' },
  IN_PROGRESS: { label: 'En investigación', cls: 'bg-brand-100 text-brand-700' },
  RESOLVED: { label: 'Resuelta', cls: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: 'Observada', cls: 'bg-red-100 text-red-700' },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, cls: 'bg-slate-100 text-slate-600' };
  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

export function statusLabel(status: string) {
  return STATUS_LABELS[status]?.label ?? status;
}
