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
  const style = variant === 'secondary' ? 'btn-secondary' : variant === 'danger' ? 'btn-danger' : 'btn';
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
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-line pb-4">
          <div>
            {title && <h2 className="text-2xl text-ink">{title}</h2>}
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
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
    slate: '',
    blue: 'badge-brand',
    green: 'badge-success',
    amber: 'badge-warning',
    red: 'badge-danger',
  };
  return <span className={`badge ${tones[tone]}`}>{children}</span>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
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
    blue: 'alert-info',
    amber: 'alert-warning',
    red: 'alert-danger',
    green: 'alert-success',
  };
  return (
    <div id={id} role={role} className={`alert ${tones[tone]}`}>
      {children}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {sub && <p className="stat-sub">{sub}</p>}
    </div>
  );
}

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <div className="empty-state">
      <p className="font-medium text-ink">{title}</p>
      {message && <p className="mt-1 text-sm text-muted">{message}</p>}
    </div>
  );
}
