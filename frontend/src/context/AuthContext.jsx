// Holds the logged-in user for the whole app and the actions that change it.
import { createContext, useContext, useEffect, useState } from 'react';
import { api, refreshSession, setAccessToken, setOnSessionExpired } from '../services/api.js';
import { can } from '../utils/permissions.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // True after clicking "Log out", so the login page doesn't send the next person
  // back to wherever the previous user was.
  const [loggedOutOnPurpose, setLoggedOutOnPurpose] = useState(false);

  useEffect(() => {
    setOnSessionExpired(() => setUser(null));
    // On page load the refresh cookie (if there is one) logs us straight back in.
    refreshSession()
      .then((session) => setUser(session.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // Login, register and accept-invite all answer with { accessToken, user }.
  function startSession(session) {
    setAccessToken(session.accessToken);
    setUser(session.user);
    setLoggedOutOnPurpose(false);
  }

  async function login(email, password) {
    startSession(await api('/auth/login', { method: 'POST', body: { email, password } }));
  }

  async function register(fields) {
    startSession(await api('/auth/register', { method: 'POST', body: fields }));
  }

  async function acceptInvite(token, fields) {
    startSession(await api(`/invitations/${token}/accept`, { method: 'POST', body: fields }));
  }

  async function logout() {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    setAccessToken(null);
    setLoggedOutOnPurpose(true);
    setUser(null);
  }

  // Shorthand for components: const { allowed } = useAuth(); allowed('task:write')
  const allowed = (action) => Boolean(user) && can(user.role, action);

  return (
    <AuthContext value={{ user, loading, loggedOutOnPurpose, login, register, acceptInvite, logout, allowed }}>
      {children}
    </AuthContext>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
