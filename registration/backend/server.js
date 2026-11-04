import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { handleAdminLogin, handleAdminLogout, handleAdminTeams } from './admin.js';
import { connectToDatabase } from './db.js';
import { handleHealth, handleRegister, handleStatus, waitForPendingEmails } from './handlers.js';

const PORT = Number(process.env.PORT) || 4001;
const WEBSITE = fileURLToPath(new URL('../frontend/dist/', import.meta.url));

const app = express();
app.use(express.json());

app.post('/api/register', handleRegister);
app.get('/api/status', handleStatus);
app.get('/api/health', handleHealth);
app.post('/api/admin/login', handleAdminLogin);
app.post('/api/admin/logout', handleAdminLogout);
app.get('/api/admin/teams', handleAdminTeams);

// The built website. Locally, Vite serves it instead, so this folder may not exist.
app.use('/assets', express.static(`${WEBSITE}assets`, { immutable: true, maxAge: '1y' }));
app.use(express.static(WEBSITE));
app.get(['/admin', '/admin/*'], (req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex');
  res.sendFile(`${WEBSITE}index.html`);
});

connectToDatabase()
  .then(() => {
    const server = app.listen(PORT, () => console.log(`Registration API listening on port ${PORT}`));

    // Stops taking requests, but lets emails that are still being sent or retried finish.
    const shutDown = async () => {
      server.close();
      await waitForPendingEmails();
      await mongoose.disconnect();
      process.exit(0);
    };
    process.once('SIGTERM', shutDown);
    process.once('SIGINT', shutDown);
  })
  .catch((error) => {
    console.error('Could not connect to the database:', error.message);
    process.exit(1);
  });
