// Small shared UI pieces. The styling lives here so pages can stay about behaviour.
import { useEffect } from 'react';
import { PRIORITIES } from '../utils/board.js';

const BUTTON_STYLES = {
  primary: 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-500',
  secondary: 'bg-white text-zinc-700 border border-zinc-200 shadow-sm hover:bg-zinc-50',
  danger: 'bg-white text-red-600 border border-red-200 hover:bg-red-50',
  ghost: 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
};

export function Button({ variant = 'primary', className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50 ${BUTTON_STYLES[variant]} ${className}`}
      {...props}
    />
  );
}

const FIELD_STYLE =
  'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100';

export function Input(props) {
  return <input className={FIELD_STYLE} {...props} />;
}

export function Textarea(props) {
  return <textarea rows={4} className={`${FIELD_STYLE} resize-none`} {...props} />;
}

export function Select(props) {
  return <select className={FIELD_STYLE} {...props} />;
}

// A label above a form control.
export function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-zinc-700">{label}</span>
      {children}
    </label>
  );
}

export function ErrorMessage({ message }) {
  if (!message) return null;
  return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>;
}

const AVATAR_COLORS = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500', 'bg-violet-500'];

// Initials in a coloured circle. The same name always gets the same colour.
export function Avatar({ name = '?', size = 'md' }) {
  const initials = name.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase();
  const colorIndex = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATAR_COLORS.length;
  const sizeClass = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs';
  return (
    <span
      title={name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-white ${AVATAR_COLORS[colorIndex]} ${sizeClass}`}
    >
      {initials}
    </span>
  );
}

const ROLE_STYLES = {
  ADMIN: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  MEMBER: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  VIEWER: 'bg-zinc-100 text-zinc-600 ring-zinc-200',
};

export function RoleBadge({ role }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide ring-1 ring-inset ${ROLE_STYLES[role]}`}>
      {role}
    </span>
  );
}

// A small coloured pill showing a task's priority.
export function PriorityBadge({ priority }) {
  const { label, badge } = PRIORITIES.find((p) => p.value === priority) ?? PRIORITIES[1];
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${badge}`}>{label}</span>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ className = '', ...props }) {
  return <div className={`rounded-xl border border-zinc-200 bg-white shadow-sm ${className}`} {...props} />;
}

export function EmptyState({ title, children }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center">
      <p className="font-medium text-zinc-700">{title}</p>
      {children && <p className="mt-1 text-sm text-zinc-500">{children}</p>}
    </div>
  );
}

export function Spinner() {
  return <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-600" />;
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner />
    </div>
  );
}

// Shows a spinner until `data` arrives, or the error if loading failed.
// Children is a function so it only runs once data exists:
//   <Loading data={data} error={error}>{(data) => ...}</Loading>
export function Loading({ data, error, children }) {
  if (error) return <ErrorMessage message={error} />;
  if (!data) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }
  return children(data);
}

// A centred dialog. Closes on Escape or a click on the dark backdrop.
export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const closeOnEscape = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 p-4 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-5 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

// "3 minutes ago", "yesterday", ... using the browser's built-in formatter.
export function timeAgo(date) {
  const seconds = Math.round((new Date(date) - Date.now()) / 1000);
  const units = [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  const format = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  }
  return 'just now';
}
