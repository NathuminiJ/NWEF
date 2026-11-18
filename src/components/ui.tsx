import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
};

export function Button({
  variant = 'primary',
  className = '',
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const style =
    variant === 'secondary'
      ? 'btn-secondary'
      : variant === 'danger'
        ? 'btn border-red-700 bg-red-700 hover:border-red-800 hover:bg-red-800'
        : 'btn';
  return (
    <button
      className={`${style} ${loading ? 'btn-loading' : ''} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function Card({
  title,
  description,
  actions,
  children,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card">
      {(title || actions) && (
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-[var(--line)] pb-4">
          <div>
            {title && <h2 className="font-serif text-2xl font-normal tracking-tight text-navy">{title}</h2>}
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Badge({
  tone = 'slate',
  children,
}: {
  tone?: 'slate' | 'blue' | 'green' | 'amber' | 'red';
  children: ReactNode;
}) {
  const tones = {
    slate: 'border border-[var(--line)] bg-slate-100 text-slate-700',
    blue: 'border border-brand-100 bg-brand-50 text-brand-700',
    green: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border border-amber-200 bg-amber-50 text-amber-800',
    red: 'border border-red-200 bg-red-50 text-red-700',
  };
  return (
    <span className={`badge inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function Alert({
  tone = 'blue',
  children,
  id,
  role = 'alert',
}: {
  tone?: 'blue' | 'amber' | 'red' | 'green';
  children: ReactNode;
  id?: string;
  role?: 'alert' | 'status';
}) {
  const tones = {
    blue: 'border-brand-100 bg-brand-50 text-brand-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    red: 'border-red-200 bg-red-50 text-red-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  };
  return (
    <div id={id} role={role} className={`alert border border-l-4 px-4 py-3 text-sm ${tones[tone]}`}>
      {children}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat border border-[var(--line)] bg-white p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 font-serif text-2xl text-navy">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <div className="border border-dashed border-[var(--line)] bg-white/60 p-8 text-center">
      <p className="font-medium">{title}</p>
      {message && <p className="mt-1 text-sm text-slate-500">{message}</p>}
    </div>
  );
}
