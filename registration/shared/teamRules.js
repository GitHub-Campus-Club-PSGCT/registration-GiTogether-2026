// Registration rules used by both the website and the API.
export const MIN_TEAM_MEMBERS = 2;
export const MAX_TEAM_MEMBERS = 3;
export const MAX_TEAM_NAME_LENGTH = 60;
export const MAX_MEMBER_NAME_LENGTH = 100;
export const ROLL_NUMBER_LENGTH = 6;
export const EMAIL_DOMAIN = '@psgtech.ac.in';
export const OLDEST_ALLOWED_BATCH = 24;
export const BATCH_NOT_ALLOWED = 'This event isn\'t open to your batch.';

const PHONE_PATTERN = /^[6-9]\d{9}$/;
const ROLL_NUMBER_PATTERN = /^\d{2}[NZ]\d{3}$/;

export const normalizePhone = (phone) => phone.trim().replace(/[\s()-]/g, '').replace(/^(\+?91|0)(?=\d{10}$)/, '');

export const normalizeRollNumber = (rollNumber) => rollNumber.trim().toUpperCase();

export const isValidPhone = (phone) => PHONE_PATTERN.test(normalizePhone(phone));

// Every college email is the roll number at the college domain.
export const emailFromRollNumber = (rollNumber) => `${normalizeRollNumber(rollNumber).toLowerCase()}${EMAIL_DOMAIN}`;

// The numbers each branch uses for regular students. Above these, batch 26 numbers are second-year lateral entries.
const REGULAR_ROLL_RANGES = { N: [201, 300], Z: [200, 400] };

export function getStudentYear(rollNumber) {
  const [, batch, branch, digits] = normalizeRollNumber(rollNumber).match(/^(\d{2})([NZ])(\d{3})$/) ?? [];
  if (!batch) return { year: 'other', lateral: false };

  const number = Number(digits);
  const [first, last] = REGULAR_ROLL_RANGES[branch];
  const isRegular = number >= first && number <= last;

  if (batch === '25' && isRegular) return { year: 'second', lateral: false };
  if (batch === '26' && isRegular) return { year: 'first', lateral: false };
  if (batch === '26' && number > last) return { year: 'second', lateral: true };
  return { year: 'other', lateral: false };
}

export const isAllowedBatch = (rollNumber) => Number(normalizeRollNumber(rollNumber).slice(0, 2)) >= OLDEST_ALLOWED_BATCH;

export const isValidRollNumber = (rollNumber) => ROLL_NUMBER_PATTERN.test(normalizeRollNumber(rollNumber));
