import mongoose from 'mongoose';
import { connectToDatabase } from './db.js';
import { WHATSAPP_URL, deliverConfirmationEmail, isEmailConfigured } from './email.js';
import { createTeam, parseTeamPayload } from './teamRegistration.js';

const SERVER_ERROR = 'Something went wrong on our side. Please try again.';

const isRegistrationOpen = () => process.env.REGISTRATION_OPEN?.trim().toLowerCase() !== 'false';

const pendingEmails = new Set();

const sendInBackground = (team) => {
  const delivery = deliverConfirmationEmail(team).finally(() => pendingEmails.delete(delivery));
  pendingEmails.add(delivery);
};

export const waitForPendingEmails = () => Promise.all(pendingEmails);

export async function handleRegister(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  if (!isRegistrationOpen()) return res.status(403).json({ error: 'Registration is closed right now.' });

  try {
    const payload = parseTeamPayload(req.body);
    if (payload.error) return res.status(400).json({ error: payload.error });

    await connectToDatabase();

    const result = await createTeam(payload);
    if (result.error) return res.status(409).json({ error: result.error });

    // The team is saved, so reply now and let the email finish in the background.
    sendInBackground({ ...result, members: payload.members });
    return res.status(201).json({ ...result, whatsappUrl: WHATSAPP_URL, emailQueued: isEmailConfigured() });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: SERVER_ERROR });
  }
}

export function handleStatus(req, res) {
  return res.status(200).json({ registrationOpen: isRegistrationOpen() });
}

export async function handleHealth(req, res) {
  try {
    await connectToDatabase();
    await mongoose.connection.db.admin().ping();
    return res.status(200).json({ status: 'connected' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'database connection failed' });
  }
}
