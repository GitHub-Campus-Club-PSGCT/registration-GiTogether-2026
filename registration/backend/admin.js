import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { connectToDatabase } from './db.js';
import { Team } from './models.js';
import { BASE_PATH } from '../shared/basePath.js';

const COOKIE_NAME = 'admin_session';
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const FAILED_LOGIN_DELAY_MS = 500;
const SERVER_ERROR = 'Something went wrong on our side. Please try again.';

const sameBytes = (a, b) => a.length === b.length && timingSafeEqual(a, b);
const hash = (text) => createHash('sha256').update(text).digest();

const isCorrectPassword = (password) =>
  Boolean(process.env.ADMIN_PASSWORD) && typeof password === 'string' && sameBytes(hash(password), hash(process.env.ADMIN_PASSWORD));

// Signed with the password, so changing the password logs everyone out.
const signature = (expires) => createHmac('sha256', process.env.ADMIN_PASSWORD).update(`admin:${expires}`).digest('base64url');

const readSessionCookie = (req) =>
  req.headers.cookie
    ?.split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1);

const hasValidSession = (req) => {
  const [expires, givenSignature] = readSessionCookie(req)?.split('.') ?? [];
  if (!process.env.ADMIN_PASSWORD || !expires || !givenSignature || Number(expires) < Date.now()) return false;
  return sameBytes(Buffer.from(givenSignature), Buffer.from(signature(expires)));
};

const cookieOptions = (req, maxAge) =>
  `Path=${BASE_PATH}/api/admin; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''}`;

const startSession = (req, res) => {
  const expires = Date.now() + SESSION_SECONDS * 1000;
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${expires}.${signature(expires)}; ${cookieOptions(req, SESSION_SECONDS)}`);
};

export async function handleAdminLogin(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  res.setHeader('Cache-Control', 'no-store');

  if (!isCorrectPassword(req.body?.password)) {
    await new Promise((resolve) => setTimeout(resolve, FAILED_LOGIN_DELAY_MS));
    return res.status(401).json({ error: 'Nope, try again :)' });
  }

  startSession(req, res);
  return res.status(200).json({ ok: true });
}

export function handleAdminLogout(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; ${cookieOptions(req, 0)}`);
  return res.status(200).json({ ok: true });
}

export async function handleAdminTeams(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  res.setHeader('Cache-Control', 'no-store');
  if (!hasValidSession(req)) return res.status(401).json({ error: 'Enter password :)' });

  // Each visit pushes the expiry back, so regular use never logs out.
  startSession(req, res);

  try {
    await connectToDatabase();
    const teams = await Team.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json({ teams });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: SERVER_ERROR });
  }
}
