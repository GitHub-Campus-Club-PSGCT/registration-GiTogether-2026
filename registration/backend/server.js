import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import { fileURLToPath } from 'node:url';
import { handleAdminAttendance, handleAdminAttendanceCsv, handleAdminLogin, handleAdminLogout, handleAdminTeam, handleAdminTeams } from './admin.js';
import { connectToDatabase } from './db.js';
import { handleHealth, handleRegister, handleStatus, waitForPendingEmails } from './handlers.js';
import { BASE_PATH } from '../shared/basePath.js';

const PORT = Number(process.env.PORT) || 4001;
const WEBSITE = fileURLToPath(new URL('../frontend/dist/', import.meta.url));

const app = express();
app.use(express.json());

const site = express.Router();
app.use(BASE_PATH, site);

site.post('/api/register', handleRegister);
site.get('/api/status', handleStatus);
site.get('/api/health', handleHealth);
site.post('/api/admin/login', handleAdminLogin);
site.post('/api/admin/logout', handleAdminLogout);
site.get('/api/admin/teams', handleAdminTeams);
site.get('/api/admin/teams/:teamCode', handleAdminTeam);
site.post('/api/admin/teams/:teamCode/attendance', handleAdminAttendance);
site.get('/api/admin/attendance.csv', handleAdminAttendanceCsv);

site.get('/', (req, res) => res.redirect(`${BASE_PATH}/registration`));

// The built website. Locally, Vite serves it instead, so this folder may not exist.
site.use('/assets', express.static(`${WEBSITE}assets`, { immutable: true, maxAge: '1y' }));
site.use(express.static(WEBSITE));
site.get('/registration', (req, res) => res.sendFile(`${WEBSITE}index.html`));
site.get(['/admin', '/admin/*'], (req, res) => {
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
