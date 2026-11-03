import { randomInt } from 'node:crypto';
import {
  MAX_MEMBER_NAME_LENGTH,
  MAX_TEAM_MEMBERS,
  MAX_TEAM_NAME_LENGTH,
  MIN_TEAM_MEMBERS,
  BATCH_NOT_ALLOWED,
  emailFromRollNumber,
  isAllowedBatch,
  isValidPhone,
  isValidRollNumber,
  normalizePhone,
  normalizeRollNumber,
} from '../shared/teamRules.js';
import { Team } from './models.js';

const DUPLICATE_KEY_ERROR = 11000;
const TEAM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const TEAM_CODE_LENGTH = 6;
const MAX_TEAM_CODE_ATTEMPTS = 3;

const readText = (value) => (typeof value === 'string' ? value.trim() : '');

const createTeamCode = () => {
  const characters = Array.from({ length: TEAM_CODE_LENGTH }, () => TEAM_CODE_ALPHABET[randomInt(TEAM_CODE_ALPHABET.length)]);
  return `GT-${characters.join('')}`;
};

export function parseTeamPayload(body) {
  const teamName = readText(body?.teamName);
  const members = Array.isArray(body?.members) ? body.members : [];

  if (!teamName) return { error: 'Enter your team name.' };
  if (teamName.length > MAX_TEAM_NAME_LENGTH) return { error: `Team names can be up to ${MAX_TEAM_NAME_LENGTH} characters.` };
  if (members.length < MIN_TEAM_MEMBERS || members.length > MAX_TEAM_MEMBERS) {
    return { error: `A team needs ${MIN_TEAM_MEMBERS} to ${MAX_TEAM_MEMBERS} members.` };
  }

  const seenRollNumbers = new Set();
  const cleanMembers = [];
  for (const member of members) {
    const isLeader = cleanMembers.length === 0;
    const name = readText(member?.name);
    const phone = normalizePhone(readText(member?.phone));
    const rollNumber = normalizeRollNumber(readText(member?.rollNumber));

    if (!name) return { error: 'Enter the full name for every member.' };
    if (name.length > MAX_MEMBER_NAME_LENGTH) return { error: `Names can be up to ${MAX_MEMBER_NAME_LENGTH} characters.` };
    if (!isValidPhone(phone)) return { error: 'Every member needs a valid 10-digit phone number.' };
    if (!isValidRollNumber(rollNumber)) return { error: 'Every member needs a valid roll number, like 26N000.' };
    if (!isAllowedBatch(rollNumber)) return { error: BATCH_NOT_ALLOWED };
    if (seenRollNumbers.has(rollNumber)) return { error: 'Each member needs a different roll number.' };

    seenRollNumbers.add(rollNumber);
    cleanMembers.push({ name, email: emailFromRollNumber(rollNumber), phone, rollNumber, isLeader });
  }

  return { teamName, members: cleanMembers };
}

async function findRegistrationConflict(members) {
  const rollNumbers = members.map((member) => member.rollNumber);
  const existing = await Team.findOne({ 'members.rollNumber': { $in: rollNumbers } }).lean();
  if (!existing) return null;

  const taken = existing.members.find((member) => rollNumbers.includes(member.rollNumber));
  return `Roll number ${taken.rollNumber} is already registered.`;
}

export async function createTeam({ teamName, members }) {
  // Wait for the collection and unique indexes before writing.
  await Team.init();

  const conflict = await findRegistrationConflict(members);
  if (conflict) return { error: conflict };

  for (let attempt = 0; attempt < MAX_TEAM_CODE_ATTEMPTS; attempt += 1) {
    const teamCode = createTeamCode();
    try {
      const team = await Team.create({ teamName, teamCode, members });
      return { teamId: team._id.toString(), teamCode, teamName };
    } catch (error) {
      if (error.code !== DUPLICATE_KEY_ERROR) throw error;

      // Another team took a roll number first. If not, the team code clashed, so try a new one.
      const raceConflict = await findRegistrationConflict(members);
      if (raceConflict) return { error: raceConflict };
    }
  }
  throw new Error('Could not create a unique team code.');
}
