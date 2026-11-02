import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import { createTeam, parseTeamPayload } from './teamRegistration.js';

const PORT = Number(process.env.PORT) || 4001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gitogether26';
const SERVER_ERROR = 'Something went wrong on our side. Please try again.';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/register', async (req, res) => {
  try {
    const payload = parseTeamPayload(req.body);
    if (payload.error) return res.status(400).json({ error: payload.error });

    const result = await createTeam(payload);
    if (result.error) return res.status(409).json({ error: result.error });
    return res.status(201).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: SERVER_ERROR });
  }
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`Registration API listening on port ${PORT}`));
  })
  .catch((error) => {
    console.error('Could not connect to the database:', error.message);
    process.exit(1);
  });
