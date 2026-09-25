// Talks to the backend.
// The access token lives only in memory (never localStorage), so a page reload loses it —
// the httpOnly refresh cookie gets us a new one. When a request gets 401 we refresh once and retry.

let accessToken = null;
let refreshInFlight = null;
let onSessionExpired = () => {};

export function setAccessToken(token) {
  accessToken = token;
}

// AuthContext registers a callback here so the app can drop back to the login page.
export function setOnSessionExpired(callback) {
  onSessionExpired = callback;
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// The one function every page uses: api('/projects'), api('/teams', { method: 'POST', body: {...} }).
export async function api(path, options = {}) {
  let res = await send(path, options);

  if (res.status === 401 && accessToken && !path.startsWith('/auth/')) {
    try {
      await refreshSession();
    } catch {
      accessToken = null;
      onSessionExpired();
      throw new ApiError(401, 'Your session expired. Please log in again.');
    }
    res = await send(path, options);
  }
  return readResponse(res);
}

// Refresh tokens are single-use, so two refreshes at once would look like a stolen token
// and log the user out everywhere. Everyone who needs a refresh shares the same request.
export function refreshSession() {
  refreshInFlight ??= send('/auth/refresh', { method: 'POST' })
    .then(readResponse)
    .then((session) => {
      accessToken = session.accessToken;
      return session;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

function send(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  return fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function readResponse(res) {
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Something went wrong');
  return data;
}
