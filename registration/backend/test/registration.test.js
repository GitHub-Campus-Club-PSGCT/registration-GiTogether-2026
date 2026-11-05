import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import jsQR from 'jsqr';
import { simpleParser } from 'mailparser';
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import mongoose from 'mongoose';
import { PNG } from 'pngjs';
import { SMTPServer } from 'smtp-server';

const SMTP_PORT = 2599;
const ADMIN_PASSWORD = 'test-admin-password';
const EMAIL_SETTINGS = { SEND_EMAILS: 'true', SMTP_HOST: '127.0.0.1', SMTP_PORT: String(SMTP_PORT), SMTP_USER: 'club@example.com', SMTP_PASS: 'test' };

// Every run gets its own throwaway MongoDB, so the tests can never touch real data.
const database = await MongoMemoryServer.create();
process.env.MONGODB_URI = database.getUri('gitogether_test');
process.env.EMAIL_RETRY_DELAYS_MS = '20,20';

const { connectToDatabase } = await import('../db.js');
const { handleAdminAttendance, handleAdminAttendanceCsv, handleAdminLogin, handleAdminLogout, handleAdminTeam, handleAdminTeams } = await import('../admin.js');
const { buildPlainMessage } = await import('../email.js');
const { handleRegister, handleStatus } = await import('../handlers.js');
const { renderPass } = await import('../pass/renderPass.js');
const { getStudentYear } = await import('../../shared/teamRules.js');
const { Team } = await import('../models.js');

const inbox = [];
let failNextEmails = 0;
let emailAttempts = 0;
const smtp = new SMTPServer({
  allowInsecureAuth: true,
  hideSTARTTLS: true,
  onAuth: (auth, session, callback) => callback(null, { user: auth.username }),
  onData: async (stream, session, callback) => {
    const parsed = await simpleParser(stream, { skipImageLinks: true });
    emailAttempts += 1;
    if (failNextEmails > 0) {
      failNextEmails -= 1;
      callback(new Error('Try again later'));
      return;
    }
    inbox.push(parsed);
    callback();
  },
});

const member = (name, rollNumber, phone = '9876543210') => ({ name, phone, rollNumber });
const teamOf = (...members) => ({ teamName: 'Team Alpha', members });

const call = async (handler, { method = 'POST', body, cookie, params } = {}) => {
  const result = { headers: {} };
  const res = {
    setHeader(name, value) {
      result.headers[name] = value;
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
    send(data) {
      result.body = data;
      return this;
    },
  };
  await handler({ method, body, params, headers: cookie ? { cookie } : {} }, res);
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
  failNextEmails = 0;
  emailAttempts = 0;
  Object.assign(process.env, EMAIL_SETTINGS);
  delete process.env.REGISTRATION_OPEN;
  process.env.ADMIN_PASSWORD = ADMIN_PASSWORD;
});

after(async () => {
  await new Promise((resolve) => smtp.close(resolve));
  await mongoose.disconnect();
  await database.stop();
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
  assert.match(email.text, /Lights out on 23 Nov\. See you on the grid!/);
  assert.match(email.text, /Show the QR code on it at check-in/);
  assert.match(email.html, /Show the QR code on it at check-in/);
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

test('allows batch 25 and newer', async () => {
  const { status, body } = await register(teamOf(member('A', '25N201'), member('B', '26Z201')));
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
  'a member from batch 24': teamOf(member('A', '26N000'), member('B', '24Z201')),
  'a leader from batch 20': teamOf(member('A', '20N201'), member('B', '26Z001')),
  'the same roll number twice': teamOf(member('A', '26N000'), member('B', '26n000')),
};

for (const [name, body] of Object.entries(INVALID_TEAMS)) {
  test(`rejects ${name}`, async () => {
    assert.equal((await register(body)).status, 400);
    assert.equal(await Team.countDocuments(), 0);
  });
}

test('rejects other request types', async () => {
  assert.equal((await call(handleRegister, { method: 'PUT' })).status, 405);
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

test('retries a failed email and sends it once', async () => {
  failNextEmails = 2;
  const { body } = await register(teamOf(member('A', '26N000'), member('B', '26Z001')));
  assert.equal(await waitForEmailStatus(body.teamCode), 'sent');
  assert.equal(emailAttempts, 3);
  assert.equal(inbox.length, 1);
});

test('stops after two retries and marks the email as failed', async () => {
  failNextEmails = 5;
  const { body } = await register(teamOf(member('A', '26N000'), member('B', '26Z001')));
  assert.equal(await waitForEmailStatus(body.teamCode), 'failed');
  assert.equal(emailAttempts, 3);
  assert.equal(inbox.length, 0);
});

test('does not retry when emails are off', async () => {
  process.env.SEND_EMAILS = 'false';
  const { body } = await register(teamOf(member('A', '26N000'), member('B', '26Z001')));
  assert.equal(await waitForEmailStatus(body.teamCode), 'failed');
  assert.equal(emailAttempts, 0);
});

const readQr = (png) => {
  const { data, width, height } = PNG.sync.read(png);
  return jsQR(new Uint8ClampedArray(data), width, height)?.data;
};

test('the QR on the pass holds the team code, however long the names are', async () => {
  const members = [
    { name: 'A very long name '.repeat(5), rollNumber: '26N000', email: '26n000@psgtech.ac.in', isLeader: true },
    { name: 'Sam', rollNumber: '26Z001', email: '26z001@psgtech.ac.in', isLeader: false },
  ];
  assert.equal(readQr(await renderPass({ teamName: 'Team Alpha', teamCode: 'GT-7KQ2MX', members })), 'GT-7KQ2MX');
  assert.equal(readQr(await renderPass({ teamName: 'x y '.repeat(15), teamCode: 'GT-WWWMMM', members })), 'GT-WWWMMM');
});

test('the plain email has the team code for checking in', () => {
  const members = [{ name: 'Alex', isLeader: true }, { name: 'Sam', isLeader: false }];
  const { text } = buildPlainMessage({ leader: members[0], members, teamName: 'Team Alpha', teamCode: 'GT-7KQ2MX' });
  assert.match(text, /Team code: GT-7KQ2MX/);
});

const registerTeam = async (...members) => {
  process.env.SEND_EMAILS = 'false';
  const { body } = await register(teamOf(...members));
  await waitForEmailStatus(body.teamCode);
  return body.teamCode;
};

const saveAttendance = (cookie, teamCode, body) => call(handleAdminAttendance, { cookie, params: { teamCode }, body });

const markPresent = (cookie, teamCode, rollNumber, present = true) =>
  saveAttendance(cookie, teamCode, present ? { present: [rollNumber] } : { absent: [rollNumber] });

const checkedIn = (team) => team.members.filter((person) => person.checkedInAt).map((person) => person.rollNumber);

test('check-in needs a login', async () => {
  const teamCode = await registerTeam(member('A', '26N000'), member('B', '26Z001'));
  assert.equal((await call(handleAdminTeam, { method: 'GET', params: { teamCode } })).status, 401);
  assert.equal((await markPresent(undefined, teamCode, '26N000')).status, 401);
  assert.equal((await call(handleAdminAttendanceCsv, { method: 'GET' })).status, 401);
  assert.deepEqual(checkedIn(await Team.findOne({ teamCode }).lean()), []);
});

test('finds a team by its code, in any case, and says when there is none', async () => {
  const cookie = await logIn();
  const teamCode = await registerTeam(member('A', '26N000'), member('B', '26Z001'));

  const found = await call(handleAdminTeam, { method: 'GET', cookie, params: { teamCode: ` ${teamCode.toLowerCase()} ` } });
  assert.equal(found.status, 200);
  assert.equal(found.body.team.teamCode, teamCode);

  const missing = await call(handleAdminTeam, { method: 'GET', cookie, params: { teamCode: 'GT-NOPE00' } });
  assert.equal(missing.status, 404);
  assert.equal(missing.body.error, 'No team has the code GT-NOPE00.');
});

test('marks each member separately, and can undo a mark', async () => {
  const cookie = await logIn();
  const teamCode = await registerTeam(member('A', '26N000'), member('B', '26Z001'), member('C', '26N002'));

  const first = await markPresent(cookie, teamCode, '26Z001');
  assert.equal(first.status, 200);
  assert.deepEqual(checkedIn(first.body.team), ['26Z001']);

  const second = await markPresent(cookie, teamCode, '26N000');
  assert.deepEqual(checkedIn(second.body.team), ['26N000', '26Z001']);

  const undone = await markPresent(cookie, teamCode, '26Z001', false);
  assert.deepEqual(checkedIn(undone.body.team), ['26N000']);
  assert.deepEqual(checkedIn(await Team.findOne({ teamCode }).lean()), ['26N000']);
});

test('one save can mark some members and unmark others together', async () => {
  const cookie = await logIn();
  const teamCode = await registerTeam(member('A', '26N000'), member('B', '26Z001'), member('C', '26N002'));
  await markPresent(cookie, teamCode, '26N000');

  const { status, body } = await saveAttendance(cookie, teamCode, { present: ['26Z001', '26N002'], absent: ['26N000'] });
  assert.equal(status, 200);
  assert.deepEqual(checkedIn(body.team), ['26Z001', '26N002']);
});

test('a save with a member from outside the team changes nothing', async () => {
  const cookie = await logIn();
  const teamCode = await registerTeam(member('A', '26N000'), member('B', '26Z001'));

  const { status } = await saveAttendance(cookie, teamCode, { present: ['26N000', '26N999'] });
  assert.equal(status, 404);
  assert.deepEqual(checkedIn(await Team.findOne({ teamCode }).lean()), []);
});

test('marking someone twice keeps the time they first arrived', async () => {
  const cookie = await logIn();
  const teamCode = await registerTeam(member('A', '26N000'), member('B', '26Z001'));

  const first = await markPresent(cookie, teamCode, '26N000');
  await new Promise((resolve) => setTimeout(resolve, 20));
  const second = await markPresent(cookie, teamCode, '26N000');
  assert.equal(second.status, 200);
  assert.deepEqual(second.body.team.members[0].checkedInAt, first.body.team.members[0].checkedInAt);

  const undoAgain = await markPresent(cookie, teamCode, '26Z001', false);
  assert.equal(undoAgain.status, 200);
  assert.deepEqual(checkedIn(undoAgain.body.team), ['26N000']);
});

test('two people marking the same team at once both count', async () => {
  const cookie = await logIn();
  const teamCode = await registerTeam(member('A', '26N000'), member('B', '26Z001'), member('C', '26N002'));
  await Promise.all(['26N000', '26Z001', '26N002'].map((rollNumber) => markPresent(cookie, teamCode, rollNumber)));
  assert.deepEqual(checkedIn(await Team.findOne({ teamCode }).lean()), ['26N000', '26Z001', '26N002']);
});

test('can mark teams saved before check-in existed', async () => {
  const cookie = await logIn();
  const teamCode = await registerTeam(member('A', '26N000'), member('B', '26Z001'));
  await Team.collection.updateOne({ teamCode }, { $unset: { 'members.$[].checkedInAt': '' } });
  assert.equal('checkedInAt' in (await Team.findOne({ teamCode }).lean()).members[0], false);

  const { status, body } = await markPresent(cookie, teamCode, '26N000');
  assert.equal(status, 200);
  assert.deepEqual(checkedIn(body.team), ['26N000']);
});

test('refuses marks that do not make sense', async () => {
  const cookie = await logIn();
  const teamCode = await registerTeam(member('A', '26N000'), member('B', '26Z001'));

  assert.equal((await markPresent(cookie, teamCode, '26N999')).status, 404);
  assert.equal((await markPresent(cookie, 'GT-NOPE00', '26N000')).status, 404);
  assert.equal((await markPresent(cookie, teamCode, { $ne: '' })).status, 400);
  assert.equal((await saveAttendance(cookie, teamCode, { present: '26N000' })).status, 400);
  assert.equal((await saveAttendance(cookie, teamCode, { present: [], absent: [] })).status, 400);
  assert.equal((await saveAttendance(cookie, teamCode, { present: ['26N000'], absent: ['26N000'] })).status, 400);
  assert.equal((await call(handleAdminAttendance, { cookie, params: { teamCode } })).status, 400);
  assert.equal((await call(handleAdminAttendance, { method: 'GET', cookie, params: { teamCode } })).status, 405);
  assert.deepEqual(checkedIn(await Team.findOne({ teamCode }).lean()), []);
});

test('a sign-up cannot mark itself as present', async () => {
  const teamCode = await registerTeam({ ...member('A', '26N000'), checkedInAt: new Date().toISOString() }, member('B', '26Z001'));
  assert.deepEqual(checkedIn(await Team.findOne({ teamCode }).lean()), []);
});

test('the attendance download lists everyone and is safe to open in a spreadsheet', async () => {
  const cookie = await logIn();
  process.env.SEND_EMAILS = 'false';
  const { body } = await register({ teamName: '=HYPERLINK("http://bad.example")', members: [member('Alex, Jr', '26N000'), member('அருண்', '26Z001')] });
  await waitForEmailStatus(body.teamCode);
  await markPresent(cookie, body.teamCode, '26N000');

  const { status, body: csv, headers } = await call(handleAdminAttendanceCsv, { method: 'GET', cookie });
  assert.equal(status, 200);
  assert.match(headers['Content-Type'], /text\/csv/);
  assert.match(headers['Content-Disposition'], /attachment/);
  assert.equal(csv[0], '﻿');

  const [heading, leader, teammate] = csv.slice(1).trim().split('\r\n');
  assert.equal(heading, 'Team,Team code,Name,Roll number,Email,Phone,Leader,Present,Checked in at');
  assert.ok(leader.startsWith(`"'=HYPERLINK(""http://bad.example"")",${body.teamCode},"Alex, Jr",26N000,26n000@psgtech.ac.in,9876543210,Yes,Yes,"`), leader);
  assert.ok(teammate.endsWith(',26Z001,26z001@psgtech.ac.in,9876543210,No,No,'), teammate);
  assert.match(teammate, /அருண்/);
});
