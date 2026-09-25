// The Express app: parsers, routes, and the one error handler.
// Express 5 passes errors thrown in async handlers to the error handler automatically.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import { HttpError } from './utils/errors.js';
import { requireAuth } from './middleware/authMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import invitationRoutes from './routes/invitationRoutes.js';
import memberRoutes from './routes/memberRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import activityRoutes from './routes/activityRoutes.js';

export const app = express();

app.use(express.json());
app.use(cookieParser());

// Public (or partly public) routes first.
app.use('/api/auth', authRoutes);
app.use('/api/invitations', invitationRoutes); // accepting a link is public; the rest check auth per route

// Everything below needs a logged-in org member.
app.use('/api', requireAuth);
app.use('/api/members', memberRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', taskRoutes); // task paths live under both /projects/:id/tasks and /tasks/:id
app.use('/api/activity', activityRoutes);

// In production Express also serves the built React app, so the whole site is one URL:
// no CORS, and the refresh-token cookie is first-party.
if (process.env.NODE_ENV === 'production') {
  const distDir = fileURLToPath(new URL('../../frontend/dist', import.meta.url));
  app.use(express.static(distDir));
  // Any non-API URL (e.g. reloading /projects/123) gets index.html; React Router takes it from there.
  app.get(/^(?!\/api\/).*/, (req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line no-unused-vars -- Express spots error handlers by their 4 arguments
app.use((err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });

  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});
