import 'dotenv/config';
import express from 'express';
import { connectToDatabase } from './db.js';
import { handleHealth, handleRegister, handleStatus } from './handlers.js';

const PORT = Number(process.env.PORT) || 4001;

const app = express();
app.use(express.json());

app.post('/api/register', handleRegister);
app.get('/api/status', handleStatus);
app.get('/api/health', handleHealth);

connectToDatabase()
  .then(() => {
    app.listen(PORT, () => console.log(`Registration API listening on port ${PORT}`));
  })
  .catch((error) => {
    console.error('Could not connect to the database:', error.message);
    process.exit(1);
  });
