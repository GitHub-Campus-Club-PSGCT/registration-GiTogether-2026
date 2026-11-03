import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { simpleParser } from 'mailparser';
import mongoose from 'mongoose';
import { SMTPServer } from 'smtp-server';

const SMTP_PORT = 2599;
const ADMIN_PASSWORD = 'test-admin-password';
const EMAIL_SETTINGS = { SEND_EMAILS: 'true', SMTP_HOST: '127.0.0.1', SMTP_PORT: String(SMTP_PORT), SMTP_USER: 'club@example.com', SMTP_PASS: 'test' };

// These tests delete everything they touch, so they only ever run against a database named for testing.
process.env.MONGODB_URI ||= 'mongodb://127.0.0.1:27017/gitogether_test';
assert.match(new URL(process.env.MONGODB_URI).pathname, /_test$/, 'MONGODB_URI must point at a database ending in _test');

const { connectToDatabase } = await import('../db.js');
const { handleAdminLogin, handleAdminLogout, handleAdminTeams } = await import('../admin.js');
const { handleRegister, handleStatus } = await import('../handlers.js');
const { getStudentYear } = await import('../../shared/teamRules.js');
const { Team } = await import('../models.js');

const inbox = [];
const smtp = new SMTPServer({
  allowInsecureAuth: true,
  hideSTARTTLS: true,
  onAuth: (auth, session, callback) => callback(null, { user: auth.username }),
  onData: async (stream, session, callback) => {
    inbox.push(await simpleParser(stream, { skipImageLinks: true }));
    callback();
  },
});

const member = (name, rollNumber, phone = '9876543210') => ({ name, phone, rollNumber });
const teamOf = (...members) => ({ teamName: 'Team Alpha', members });

const call = async (handler, { method = 'POST', body, cookie } = {}) => {
  const result = {};
  const res = {
    setHeader(name, value) {
      if (name === 'Set-Cookie') result.cookie = value;
    },
    status(code) {
      result.status = code;
      return this;
    },
    json(data) {
      result.body = data;
      return this;
    },
  };
  await handler({ method, body, headers: cookie ? { cookie } : {} }, res);
  return result;
};

const register = (body) => call(handleRegister, { body });

const waitForEmailStatus = async (teamCode) => {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    const team = await Team.findOne({ teamCode }).lean();
    if (team.emailStatus !== 'pending') return team.emailStatus;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('The email status never changed.');
};

before(async () => {
  await new Promise((resolve) => smtp.listen(SMTP_PORT, '127.0.0.1', resolve));
  await connectToDatabase();
});

beforeEach(async () => {
  await Team.deleteMany({});
  inbox.length = 0;
  Object.assign(process.env, EMAIL_SETTINGS);
  delete process.env.REGISTRATION_OPEN;
  process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;
});

after(async () => {
  await new Promise((resolve) => smtp.close(resolve));
  if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test('saves the members inside the team, with emails worked out from roll numbers', async () => {
  const { status, body } = await register(teamOf(member('Alex', '26n000'), member('Sam', '26Z001', '+91 98765 43211')));
  assert.equal(status, 201);
  assert.match(body.teamCode, /^GT-[A-Z0-9]{6}$/);

  const team = await Team.findOne({ teamCode: body.teamCode }).lean();
  assert.deepEqual(
    team.members.map(({ email, rollNumber, phone, isLeader }) => ({ email, rollNumber, phone, isLeader })),
    [
      { email: '26n000@psgtech.ac.in', rollNumber: '26N000', phone: '9876543210', isLeader: true },
      { email: '26z001@psgtech.ac.in', rollNumber: '26Z001', phone: '9876543211', isLeader: false },
    ],
  );
  assert.equal('__v' in team, false);
  await waitForEmailStatus(body.teamCode);
});

test('ignores fields sent by the client', async () => {
  const { body } = await register({
    ...teamOf({ ...member('Alex', '26N000'), email: 'someone@gmail.com', isLeader: false }, member('Sam', '26Z001')),
    teamCode: 'GT-HACKED',
    registrationType: 'vip',
  });
  assert.notEqual(body.teamCode, 'GT-HACKED');

  const team = await Team.findOne({ teamCode: body.teamCode }).lean();
  assert.equal(team.members[0].email, '26n000@psgtech.ac.in');
  assert.equal(team.members[0].isLeader, true);
  assert.equal('registrationType' in team, false);
  await waitForEmailStatus(body.teamCode);
});

test('emails only the team leader, with the pass and the WhatsApp button', async () => {
  const { body } = await register(teamOf(member('Alex <b>', '26N000'), member('Sam', '26Z001')));
  assert.equal(body.emailQueued, true);
  assert.equal(await waitForEmailStatus(body.teamCode), 'sent');
  assert.equal(inbox.length, 1);

  const [email] = inbox;
  assert.equal(email.to.text, '26n000@psgtech.ac.in');
  assert.equal(email.subject, 'Welcome to the paddock, Team Alpha! 🏁');
  assert.match(email.text, /chat\.whatsapp\.com/);
  assert.doesNotMatch(email.text, new RegExp(body.teamCode));
  assert.match(email.html, />Join the WhatsApp group<\/span><\/a>/);
  assert.match(email.html, /Alex &#60;b&#62;/);

  const pass = email.attachments.find((attachment) => attachment.cid === 'paddock-pass');
  assert.equal(pass.content.subarray(0, 4).toString('hex'), '89504e47');
  assert.ok(email.attachments.some((attachment) => attachment.filename === 'GiTogether-2026-Paddock-Pass.png' && !attachment.cid));
  assert.ok(email.attachments.some((attachment) => attachment.cid === 'whatsapp-icon'));
});

test('refuses a roll number that is already on a team', async () => {
  const first = await register(teamOf(member('Alex', '26N000'), member('Sam', '26Z001')));
  await waitForEmailStatus(first.body.teamCode);

  const second = await register(teamOf(member('Priya', '26N002'), member('Sam Again', '26z001')));
  assert.equal(second.status, 409);
  assert.equal(second.body.error, 'Roll number 26Z001 is already registered.');
  assert.equal(await Team.countDocuments(), 1);
});

test('saves only one team when several claim a roll number at once', async () => {
  const results = await Promise.all(
    ['26N001', '26N002', '26N003', '26N004'].map((rollNumber) => register(teamOf(member('A', rollNumber), member('Shared', '26Z000')))),
  );
  assert.deepEqual(results.map(({ status }) => status).sort(), [201, 409, 409, 409]);
  assert.equal(await Team.countDocuments(), 1);
  await waitForEmailStatus(results.find(({ status }) => status === 201).body.teamCode);
});

test('allows batch 24 and newer', async () => {
  const { status, body } = await register(teamOf(member('A', '24N201'), member('B', '25Z201')));
  assert.equal(status, 201);
  await waitForEmailStatus(body.teamCode);
});

test('allows two teams to share a name', async () => {
  const first = await register(teamOf(member('A', '26N000'), member('B', '26Z001')));
  const second = await register(teamOf(member('C', '26N002'), member('D', '26Z003')));
  assert.equal(second.status, 201);
  assert.notEqual(first.body.teamCode, second.body.teamCode);
  await Promise.all([waitForEmailStatus(first.body.teamCode), waitForEmailStatus(second.body.teamCode)]);
});

const INVALID_TEAMS = {
  'no team name': { ...teamOf(member('A', '26N000'), member('B', '26Z001')), teamName: ' ' },
  'a very long team name': { ...teamOf(member('A', '26N000'), member('B', '26Z001')), teamName: 'x'.repeat(61) },
  'one member': teamOf(member('A', '26N000')),
  'four members': teamOf(member('A', '26N000'), member('B', '26Z001'), member('C', '26N002'), member('D', '26Z003')),
  'a missing name': teamOf(member('', '26N000'), member('B', '26Z001')),
  'a bad phone number': teamOf(member('A', '26N000', '12345'), member('B', '26Z001')),
  'a bad roll number letter': teamOf(member('A', '26A000'), member('B', '26Z001')),
  'a roll number sent as a database query': teamOf(member('A', { $gt: '' }), member('B', '26Z001')),
  'a member from batch 23': teamOf(member('A', '26N000'), member('B', '23Z201')),
  'a leader from batch 20': teamOf(member('A', '20N201'), member('B', '26Z001')),
  'the same roll number twice': teamOf(member('A', '26N000'), member('B', '26n000')),
};

for (const [name, body] of Object.entries(INVALID_TEAMS)) {
  test(`rejects ${name}`, async () => {
    assert.equal((await register(body)).status, 400);
    assert.equal(await Team.countDocuments(), 0);
  });
}

test('rejects everything except POST', async () => {
  assert.equal((await call(handleRegister, { method: 'GET' })).status, 405);
});

test('refuses sign-ups while registration is closed', async () => {
  process.env.REGISTRATION_OPEN = 'false';
  assert.equal((await register(teamOf(member('A', '26N000'), member('B', '26Z001')))).status, 403);
  assert.equal((await call(handleStatus, { method: 'GET' })).body.registrationOpen, false);
  assert.equal(await Team.countDocuments(), 0);
});

test('sends nothing when SEND_EMAILS is off, but still registers the team', async () => {
  process.env.SEND_EMAILS = 'false';
  const { status, body } = await register(teamOf(member('A', '26N000'), member('B', '26Z001')));
  assert.equal(status, 201);
  assert.equal(body.emailQueued, false);
  assert.equal(await waitForEmailStatus(body.teamCode), 'failed');
  assert.equal(inbox.length, 0);
});

test('keeps the team and records the failure when the mail server is down', async () => {
  process.env.SMTP_PORT = '1';
  const { status, body } = await register(teamOf(member('A', '26N000'), member('B', '26Z001')));
  assert.equal(status, 201);
  assert.equal(await waitForEmailStatus(body.teamCode), 'failed');
  assert.equal(await Team.countDocuments(), 1);
});

test('works out the year from the roll number', () => {
  const cases = {
    '25N201': { year: 'second', lateral: false },
    '25N300': { year: 'second', lateral: false },
    '25Z200': { year: 'second', lateral: false },
    '25Z400': { year: 'second', lateral: false },
    '26N201': { year: 'first', lateral: false },
    '26n300': { year: 'first', lateral: false },
    '26Z200': { year: 'first', lateral: false },
    '26Z400': { year: 'first', lateral: false },
    '26N301': { year: 'second', lateral: true },
    '26Z401': { year: 'second', lateral: true },
    '25N301': { year: 'other', lateral: false },
    '25Z100': { year: 'other', lateral: false },
    '26N100': { year: 'other', lateral: false },
    '24N250': { year: 'other', lateral: false },
    nonsense: { year: 'other', lateral: false },
  };
  for (const [rollNumber, expected] of Object.entries(cases)) assert.deepEqual(getStudentYear(rollNumber), expected, rollNumber);
});

const logIn = async () => (await call(handleAdminLogin, { body: { password: ADMIN_PASSWORD } })).cookie.split(';')[0];

test('the dashboard data needs the right password', async () => {
  assert.equal((await call(handleAdminTeams, { method: 'GET' })).status, 401);
  const wrong = await call(handleAdminLogin, { body: { password: 'nope' } });
  assert.equal(wrong.status, 401);
  assert.equal(wrong.cookie, undefined);
  assert.equal((await call(handleAdminLogin, { body: { password: { $ne: '' } } })).status, 401);
});

test('logging in shows every team and keeps renewing the session', async () => {
  const { body: registered } = await register(teamOf(member('Alex', '26N250'), member('Sam', '25Z300')));
  await waitForEmailStatus(registered.teamCode);

  const login = await call(handleAdminLogin, { body: { password: ADMIN_PASSWORD } });
  assert.match(login.cookie, /HttpOnly/);
  assert.match(login.cookie, /Max-Age=2592000/);

  const { status, body, cookie } = await call(handleAdminTeams, { method: 'GET', cookie: login.cookie.split(';')[0] });
  assert.equal(status, 200);
  assert.equal(body.teams[0].members[0].phone, '9876543210');
  assert.match(cookie, /Max-Age=2592000/);
});

test('refuses a tampered, expired or old-password session', async () => {
  const cookie = await logIn();
  const [name, value] = cookie.split('=');
  const [expires, signature] = value.split('.');

  const farFuture = `${name}=${Number(expires) + 1000000}.${signature}`;
  assert.equal((await call(handleAdminTeams, { method: 'GET', cookie: farFuture })).status, 401);
  assert.equal((await call(handleAdminTeams, { method: 'GET', cookie: `${name}=1.${signature}` })).status, 401);

  process.env.ADMIN_PASSWORD = 'a-new-password';
  assert.equal((await call(handleAdminTeams, { method: 'GET', cookie })).status, 401);
});

test('nobody can log in when no admin password is set', async () => {
  const cookie = await logIn();
  delete process.env.ADMIN_PASSWORD;
  assert.equal((await call(handleAdminLogin, { body: { password: '' } })).status, 401);
  assert.equal((await call(handleAdminLogin, { body: { password: 'undefined' } })).status, 401);
  assert.equal((await call(handleAdminTeams, { method: 'GET', cookie })).status, 401);
});

test('logging out clears the cookie', async () => {
  assert.match((await call(handleAdminLogout)).cookie, /Max-Age=0/);
});
