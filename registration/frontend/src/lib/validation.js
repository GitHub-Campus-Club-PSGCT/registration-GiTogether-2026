export const MIN_TEAM_MEMBERS = 2;
export const MAX_TEAM_MEMBERS = 3;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const REQUIRED_EMAIL_DOMAIN = '@psgtech.ac.in';

export function isValidEmail(email) {
  return EMAIL_PATTERN.test(email.trim());
}

export function getPasswordChecks(password) {
  return {
    length: password.length >= 8,
    letter: /[A-Za-z]/.test(password),
    number: /\d/.test(password),
  };
}

export function validateEmail(email) {
  if (!email.trim()) return 'Enter your email address.';
  if (!isValidEmail(email)) return 'Enter a valid email address.';
  if (!email.trim().toLowerCase().endsWith(REQUIRED_EMAIL_DOMAIN)) {
    return `Email must end with ${REQUIRED_EMAIL_DOMAIN}.`;
  }
  return undefined;
}

export function validateLogin(values) {
  const errors = {};
  const emailError = validateEmail(values.email);
  if (emailError) errors.email = emailError;
  if (!values.password) errors.password = 'Enter your password.';
  return errors;
}

export function validateTeamRegistration({ teamName, members }) {
  const errors = { members: members.map(() => ({})) };
  if (!teamName.trim()) errors.teamName = 'Enter your team name.';
  if (members.length < MIN_TEAM_MEMBERS) {
    errors.form = `A team needs at least ${MIN_TEAM_MEMBERS} members.`;
  }

  const seenEmails = new Set();
  members.forEach((member, index) => {
    const memberErrors = errors.members[index];
    if (!member.fullName.trim()) memberErrors.fullName = 'Enter the full name.';

    const emailError = validateEmail(member.email);
    const emailKey = member.email.trim().toLowerCase();
    if (emailError) {
      memberErrors.email = emailError;
    } else if (seenEmails.has(emailKey)) {
      memberErrors.email = 'Each member needs a different email address.';
    } else {
      seenEmails.add(emailKey);
    }

    const checks = getPasswordChecks(member.password);
    if (!checks.length || !checks.letter || !checks.number) {
      memberErrors.password = 'Use at least 8 characters with a letter and a number.';
    }
  });

  return errors;
}

export function hasTeamErrors(errors) {
  return Boolean(errors.teamName || errors.form || errors.members.some((memberErrors) => Object.keys(memberErrors).length > 0));
}
