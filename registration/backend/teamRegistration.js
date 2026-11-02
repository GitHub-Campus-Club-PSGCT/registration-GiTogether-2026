import bcrypt from 'bcryptjs';
import { Team, User } from './models.js';

const REQUIRED_EMAIL_DOMAIN = '@psgtech.ac.in';
const MIN_TEAM_MEMBERS = 2;
const MAX_TEAM_MEMBERS = 3;
const REGISTRATION_TYPES = ['online', 'onsite'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DUPLICATE_KEY_ERROR = 11000;
const DUPLICATE_EMAIL_MESSAGE = 'One of these email addresses is already registered.';

const readText = (value) => (typeof value === 'string' ? value.trim() : '');

const isStrongPassword = (password) => password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);

export function parseTeamPayload(body) {
  const teamName = readText(body?.teamName);
  const registrationType = body?.registrationType;
  const members = Array.isArray(body?.members) ? body.members : [];

  if (!teamName) return { error: 'Enter your team name.' };
  if (!REGISTRATION_TYPES.includes(registrationType)) return { error: 'Choose a valid registration type.' };
  if (members.length < MIN_TEAM_MEMBERS || members.length > MAX_TEAM_MEMBERS) {
    return { error: `A team needs ${MIN_TEAM_MEMBERS} to ${MAX_TEAM_MEMBERS} members.` };
  }

  const seenEmails = new Set();
  const cleanMembers = [];
  for (const member of members) {
    const name = readText(member?.name);
    const email = readText(member?.email).toLowerCase();
    const password = typeof member?.password === 'string' ? member.password : '';

    if (!name) return { error: 'Enter the full name for every member.' };
    if (!EMAIL_PATTERN.test(email) || !email.endsWith(REQUIRED_EMAIL_DOMAIN)) {
      return { error: `Every member needs an email ending in ${REQUIRED_EMAIL_DOMAIN}.` };
    }
    if (seenEmails.has(email)) return { error: 'Each member needs a different email address.' };
    if (!isStrongPassword(password)) {
      return { error: 'Passwords need at least 8 characters with a letter and a number.' };
    }

    seenEmails.add(email);
    cleanMembers.push({ name, email, password });
  }

  return { teamName, registrationType, members: cleanMembers };
}

export async function createTeam({ teamName, registrationType, members }) {
  const alreadyRegistered = await User.exists({ email: { $in: members.map((member) => member.email) } });
  if (alreadyRegistered) return { error: DUPLICATE_EMAIL_MESSAGE };

  const team = await Team.create({ teamName, registrationType });
  try {
    const users = await Promise.all(
      members.map(async (member) => ({
        teamId: team._id,
        name: member.name,
        email: member.email,
        passwordHash: await bcrypt.hash(member.password, 10),
        registrationType,
      })),
    );
    await User.insertMany(users);
  } catch (error) {
    await User.deleteMany({ teamId: team._id });
    await Team.deleteOne({ _id: team._id });
    if (error.code === DUPLICATE_KEY_ERROR) return { error: DUPLICATE_EMAIL_MESSAGE };
    throw error;
  }

  return { teamId: team._id.toString(), teamName };
}
