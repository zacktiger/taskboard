// Entry point: check config, then start listening.
import { app } from './app.js';

for (const name of ['DATABASE_URL', 'JWT_SECRET', 'CLIENT_URL']) {
  if (!process.env[name]) {
    console.error(`Missing ${name} in backend/.env (see .env.example)`);
    process.exit(1);
  }
}

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
