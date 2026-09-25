// React Router guards. They decide what the user sees; the API still checks every request.
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { FullPageSpinner } from './ui.jsx';

// Logged-out users go to /login. If their session just expired, they come back to this page
// after logging in; if they clicked "Log out", the next login starts fresh on the home page.
export function RequireAuth({ children }) {
  const { user, loading, loggedOutOnPurpose } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  if (!user) {
    const state = loggedOutOnPurpose ? null : { from: location.pathname };
    return <Navigate to="/login" replace state={state} />;
  }
  return children;
}

// e.g. <RequirePermission action="member:manage"> — anyone else is sent home.
export function RequirePermission({ action, children }) {
  const { allowed } = useAuth();
  if (!allowed(action)) return <Navigate to="/" replace />;
  return children;
}

// Login and register pages make no sense when you're already logged in.
// This is also what moves you on after logging in: back to where RequireAuth sent you from.
export function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  if (user) return <Navigate to={location.state?.from ?? '/'} replace />;
  return children;
}
