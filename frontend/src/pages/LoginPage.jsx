// Email + password login, plus one-click demo logins. GuestOnly (in App.jsx) redirects once the user is set.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AuthLayout from '../components/AuthLayout.jsx';
import { Button, ErrorMessage, Field, Input } from '../components/ui.jsx';

// Accounts created by the seed, one per role, so anyone can try each role in one click.
const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'admin@acme.test', can: 'Full access, including invites and roles' },
  { role: 'Member', email: 'member@acme.test', can: 'Create, edit and move tasks' },
  { role: 'Viewer', email: 'viewer@acme.test', can: 'Read-only' },
];
const DEMO_PASSWORD = 'password123';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function logIn(loginEmail, loginPassword) {
    setSubmitting(true);
    setError('');
    try {
      await login(loginEmail, loginPassword);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    logIn(email, password);
  }

  return (
    <AuthLayout
      title="Log in"
      subtitle="Use your account, or try a demo role below."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-medium text-floor underline underline-offset-4 hover:text-floor-dark">
            Create an organization
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email">
          <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </Field>
        <Field label="Password">
          <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <ErrorMessage message={error} />
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </Button>
      </form>

      <div className="mt-6 border-t border-line pt-5">
        <p className="mb-3 font-medium">Try a demo role</p>
        <div className="space-y-2">
          {DEMO_ACCOUNTS.map((demo) => (
            <button
              key={demo.email}
              type="button"
              disabled={submitting}
              onClick={() => logIn(demo.email, DEMO_PASSWORD)}
              className="flex w-full items-baseline gap-3 rounded-md border border-line px-3 py-2 text-left transition-colors hover:border-ink disabled:opacity-50"
            >
              <span className="w-16 shrink-0 font-condensed text-lg font-semibold">{demo.role}</span>
              <span className="text-sm text-ink-soft">{demo.can}</span>
            </button>
          ))}
        </div>
      </div>
    </AuthLayout>
  );
}
