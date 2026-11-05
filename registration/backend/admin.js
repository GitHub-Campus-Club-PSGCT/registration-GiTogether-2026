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

const adminRoute = (method, handler) => async (req, res) => {
  if (req.method !== method) return res.status(405).json({ error: 'Method not allowed.' });
  res.setHeader('Cache-Control', 'no-store');
  if (!hasValidSession(req)) return res.status(401).json({ error: 'Enter password :)' });

  // Each visit pushes the expiry back, so regular use never logs out.
  startSession(req, res);

  try {
    await connectToDatabase();
    return await handler(req, res);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: SERVER_ERROR });
  }
};

export const handleAdminTeams = adminRoute('GET', async (req, res) => {
  const teams = await Team.find().sort({ createdAt: -1 }).lean();
  return res.status(200).json({ teams });
});

const readTeamCode = (req) => req.params.teamCode.trim().toUpperCase();

export const handleAdminTeam = adminRoute('GET', async (req, res) => {
  const teamCode = readTeamCode(req);
  const team = await Team.findOne({ teamCode }).lean();
  if (!team) return res.status(404).json({ error: `No team has the code ${teamCode}.` });
  return res.status(200).json({ team });
});

const isRollNumberList = (value) => Array.isArray(value) && value.every((rollNumber) => typeof rollNumber === 'string');

export const handleAdminAttendance = adminRoute('POST', async (req, res) => {
  const { present = [], absent = [] } = req.body ?? {};
  const isValid = isRollNumberList(present) && isRollNumberList(absent) && present.length + absent.length > 0 && !present.some((rollNumber) => absent.includes(rollNumber));
  if (!isValid) return res.status(400).json({ error: 'Pick who to mark.' });

  const update = {};
  const arrayFilters = [];
  if (present.length) {
    update['members.$[arrived].checkedInAt'] = new Date();
    // Skips anyone already marked, which keeps the time they first arrived.
    arrayFilters.push({ 'arrived.rollNumber': { $in: present }, 'arrived.checkedInAt': null });
  }
  if (absent.length) {
    update['members.$[away].checkedInAt'] = null;
    arrayFilters.push({ 'away.rollNumber': { $in: absent } });
  }

  // One write, so a save can't half-finish. It only touches the members sent, so two people marking the same team can't undo each other.
  const team = await Team.findOneAndUpdate(
    { teamCode: readTeamCode(req), 'members.rollNumber': { $all: [...present, ...absent] } },
    { $set: update },
    { arrayFilters, returnDocument: 'after' },
  ).lean();

  if (!team) return res.status(404).json({ error: 'Couldn\'t find that team or member.' });
  return res.status(200).json({ team });
});

const CSV_COLUMNS = ['Team', 'Team code', 'Name', 'Roll number', 'Email', 'Phone', 'Leader', 'Present', 'Checked in at'];

// Spreadsheets run a cell starting with one of these as a formula, and names come from the public form.
const csvCell = (value) => {
  const text = String(value).replace(/^[=+\-@\t\r]/, "'$&");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const csvRow = (cells) => cells.map(csvCell).join(',');

const formatCheckInTime = (date) =>
  new Date(date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

const attendanceRow = ({ teamName, teamCode }, { name, rollNumber, email, phone, isLeader, checkedInAt }) =>
  csvRow([teamName, teamCode, name, rollNumber, email, phone, isLeader ? 'Yes' : 'No', checkedInAt ? 'Yes' : 'No', checkedInAt ? formatCheckInTime(checkedInAt) : '']);

export const handleAdminAttendanceCsv = adminRoute('GET', async (req, res) => {
  const teams = await Team.find().sort({ teamName: 1 }).lean();
  const rows = teams.flatMap((team) => team.members.map((member) => attendanceRow(team, member)));

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="GiTogether-2026-Attendance.csv"');
  // The mark at the start tells Excel this is UTF-8, so Tamil names show properly.
  return res.status(200).send(`﻿${[csvRow(CSV_COLUMNS), ...rows].join('\r\n')}\r\n`);
});
