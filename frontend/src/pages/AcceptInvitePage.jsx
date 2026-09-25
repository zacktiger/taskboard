// Opened from an invite link (/invite/:token). New people choose a name and password;
// someone who already has an account just enters their existing password.
import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import AuthLayout from '../components/AuthLayout.jsx';
import { Button, ErrorMessage, Field, Input } from '../components/ui.jsx';

export default function AcceptInvitePage() {
  const { token } = useParams();
  const { user, acceptInvite } = useAuth();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Once accepting succeeds the user is logged in, so send them into the app.
  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await acceptInvite(token, { name, password });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="You're invited" subtitle="Set up your account to join the team">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Your name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Leave blank if you have an account" autoFocus />
        </Field>
        <Field label="Password">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
        </Field>
        <ErrorMessage message={error} />
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Joining…' : 'Join organization'}
        </Button>
      </form>
    </AuthLayout>
  );
}
