// Email + password login. GuestOnly (in App.jsx) redirects once the user is set.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AuthLayout from '../components/AuthLayout.jsx';
import { Button, ErrorMessage, Field, Input } from '../components/ui.jsx';

// Accounts created by `npm run db:seed`, one per role, for quick demos.
const DEMO_ACCOUNTS = ['admin@acme.test', 'member@acme.test', 'viewer@acme.test'];

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  function fillDemo(demoEmail) {
    setEmail(demoEmail);
    setPassword('password123');
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to your workspace"
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
            Create an organization
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </Field>
        <Field label="Password">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <ErrorMessage message={error} />
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </Button>
      </form>

      <div className="mt-6 border-t border-zinc-100 pt-4">
        <p className="mb-2 text-xs font-medium text-zinc-500">Demo accounts</p>
        <div className="flex flex-wrap gap-1.5">
          {DEMO_ACCOUNTS.map((demoEmail) => (
            <button
              key={demoEmail}
              type="button"
              onClick={() => fillDemo(demoEmail)}
              className="rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-200"
            >
              {demoEmail.split('@')[0]}
            </button>
          ))}
        </div>
      </div>
    </AuthLayout>
  );
}
