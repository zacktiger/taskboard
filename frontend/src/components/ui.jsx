// Small shared UI pieces. The styling lives here so pages can stay about behaviour.
// Colours come from the tokens in index.css: rack (page), stock (cards), ink (text),
// floor green (actions) and the three priority tab colours.
import { useEffect } from 'react';
import { PRIORITIES } from '../utils/board.js';

const BUTTON_STYLES = {
  primary: 'bg-floor text-white hover:bg-floor-dark',
  secondary: 'bg-stock text-ink border border-line hover:border-ink',
  danger: 'bg-stock text-tab-high border border-line hover:border-tab-high',
  ghost: 'text-ink-soft hover:bg-rack-deep hover:text-ink',
};

export function Button({ variant = 'primary', className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${BUTTON_STYLES[variant]} ${className}`}
      {...props}
    />
  );
}

const FIELD_STYLE =
  'w-full rounded-md border border-line bg-stock px-3 py-2 text-[15px] text-ink outline-none transition-colors placeholder:text-ink-soft/70 focus:border-floor focus-visible:outline-none focus:ring-2 focus:ring-floor/25 disabled:bg-rack disabled:text-ink-soft';

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
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

// Red here means "something went wrong", the one use of red besides High priority.
export function ErrorMessage({ message }) {
  if (!message) return null;
  return (
    <p role="alert" className="border-l-4 border-tab-high bg-stock px-3 py-2 text-sm text-ink">
      {message}
    </p>
  );
}

// Initials in a quiet circle. Colour is reserved for priority, so avatars stay neutral.
export function Avatar({ name = '?', size = 'md' }) {
  const initials = name.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase();
  const sizeClass = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs';
  return (
    <span
      title={name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-line bg-rack font-semibold text-ink ${sizeClass}`}
    >
      {initials}
    </span>
  );
}

const ROLE_LABELS = { ADMIN: 'Admin', MEMBER: 'Member', VIEWER: 'Viewer' };

export function RoleBadge({ role }) {
  const strong = role === 'ADMIN';
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-medium ${strong ? 'bg-ink text-stock' : 'border border-line text-ink-soft'}`}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

// The coloured tab along the top of a task card, like the tab on a T-card.
// It carries both the colour and the word, so priority never depends on colour alone.
export function PriorityTab({ priority }) {
  const { label, tab } = PRIORITIES.find((p) => p.value === priority) ?? PRIORITIES[1];
  return (
    <div className={`px-3 py-0.5 font-condensed text-[13px] font-semibold tracking-wide ${tab}`}>
      {label}
    </div>
  );
}

// The logo: a small T-card with a green tab (same drawing as the favicon).
export function CardMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <rect x="5" y="3" width="22" height="26" rx="2" fill="var(--color-stock)" stroke="var(--color-ink)" strokeWidth="2" />
      <rect x="6" y="4" width="20" height="6" fill="var(--color-floor)" />
      <path d="M10 16h12M10 21h8" stroke="var(--color-ink)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-condensed text-[40px] leading-none font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-2 max-w-prose text-ink-soft">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// A flat panel of card stock. No shadow: only a card being dragged lifts off the rack.
export function Card({ className = '', ...props }) {
  return <div className={`rounded border border-line bg-stock ${className}`} {...props} />;
}

export function EmptyState({ title, children }) {
  return (
    <div className="rounded border border-dashed border-ink-soft/50 px-6 py-12 text-center">
      <p className="font-condensed text-xl font-semibold">{title}</p>
      {children && <p className="mt-1 text-ink-soft">{children}</p>}
    </div>
  );
}

export function Spinner() {
  return <div className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-floor" />;
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

// A dialog. Closes on Escape or a click on the dimmed backdrop.
export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const closeOnEscape = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div role="dialog" aria-label={title} className="w-full max-w-lg rounded-[10px] border border-ink bg-stock p-6">
        <h2 className="mb-5 font-condensed text-2xl font-semibold">{title}</h2>
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
