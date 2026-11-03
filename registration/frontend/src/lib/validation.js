import {
  BATCH_NOT_ALLOWED,
  MIN_TEAM_MEMBERS,
  isAllowedBatch,
  isValidPhone,
  isValidRollNumber,
  normalizeRollNumber,
} from '@shared/teamRules.js';

export {
  MAX_MEMBER_NAME_LENGTH,
  MAX_TEAM_MEMBERS,
  MAX_TEAM_NAME_LENGTH,
  MIN_TEAM_MEMBERS,
  ROLL_NUMBER_LENGTH,
  emailFromRollNumber,
  getStudentYear,
  normalizePhone,
  normalizeRollNumber,
} from '@shared/teamRules.js';

export function validatePhone(phone) {
  if (!phone.trim()) return 'Enter the phone number.';
  if (!isValidPhone(phone)) return 'Enter a valid 10-digit phone number.';
  return undefined;
}

export function validateRollNumber(rollNumber) {
  if (!rollNumber.trim()) return 'Enter the roll number.';
  if (!isValidRollNumber(rollNumber)) return 'Enter a valid roll number, like 26N000.';
  if (!isAllowedBatch(rollNumber)) return BATCH_NOT_ALLOWED;
  return undefined;
}

export function validateTeamRegistration({ teamName, members }) {
  const errors = { members: members.map(() => ({})) };
  if (!teamName.trim()) errors.teamName = 'Enter your team name.';
  if (members.length < MIN_TEAM_MEMBERS) {
    errors.form = `A team needs at least ${MIN_TEAM_MEMBERS} members.`;
  }

  const seenRollNumbers = new Set();
  members.forEach((member, index) => {
    const memberErrors = errors.members[index];
    if (!member.fullName.trim()) memberErrors.fullName = 'Enter the full name.';

    const phoneError = validatePhone(member.phone);
    if (phoneError) memberErrors.phone = phoneError;

    const rollNumberError = validateRollNumber(member.rollNumber);
    const rollNumberKey = normalizeRollNumber(member.rollNumber);
    if (rollNumberError) {
      memberErrors.rollNumber = rollNumberError;
    } else if (seenRollNumbers.has(rollNumberKey)) {
      memberErrors.rollNumber = 'Each member needs a different roll number.';
    } else {
      seenRollNumbers.add(rollNumberKey);
    }
  });

  return errors;
}

export function hasTeamErrors(errors) {
  return Boolean(errors.teamName || errors.form || errors.members.some((memberErrors) => Object.keys(memberErrors).length > 0));
}
