// Sign up: creates your account and a new organization, with you as its admin.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AuthLayout from '../components/AuthLayout.jsx';
import { Button, ErrorMessage, Field, Input } from '../components/ui.jsx';

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', orgName: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // One change handler for every input, keyed by the input's name.
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await register(form);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create your organization"
      subtitle="You'll be its first admin"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Organization name">
          <Input name="orgName" value={form.orgName} onChange={update} placeholder="Acme Inc" required autoFocus />
        </Field>
        <Field label="Your name">
          <Input name="name" value={form.name} onChange={update} required />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" value={form.email} onChange={update} required />
        </Field>
        <Field label="Password">
          <Input name="password" type="password" value={form.password} onChange={update} minLength={8} required />
        </Field>
        <ErrorMessage message={error} />
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create organization'}
        </Button>
      </form>
    </AuthLayout>
  );
}
