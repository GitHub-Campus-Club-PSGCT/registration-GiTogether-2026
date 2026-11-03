import 'dotenv/config';
import express from 'express';
import { handleAdminLogin, handleAdminLogout, handleAdminTeams } from './admin.js';
import { connectToDatabase } from './db.js';
import { handleHealth, handleRegister, handleStatus } from './handlers.js';

const PORT = Number(process.env.PORT) || 4001;

const app = express();
app.use(express.json());

app.post('/api/register', handleRegister);
app.get('/api/status', handleStatus);
app.get('/api/health', handleHealth);
app.post('/api/admin/login', handleAdminLogin);
app.post('/api/admin/logout', handleAdminLogout);
app.get('/api/admin/teams', handleAdminTeams);

connectToDatabase()
  .then(() => {
    app.listen(PORT, () => console.log(`Registration API listening on port ${PORT}`));
  })
  .catch((error) => {
    console.error('Could not connect to the database:', error.message);
    process.exit(1);
  });
