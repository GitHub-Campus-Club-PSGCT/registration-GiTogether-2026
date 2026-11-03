import { readFileSync } from 'node:fs';
import nodemailer from 'nodemailer';
import { EVENT_DAY_LABEL } from '../shared/teamRules.js';
import { Team } from './models.js';

export const WHATSAPP_URL = 'https://chat.whatsapp.com/H1ZTM3wvpVdCTJLqwfOfen?s=cl&p=a&mlu=4&ilr=4&iam=2';

const PASS_FILENAME = 'GiTogether-2026-Paddock-Pass.png';
const PASS_IMAGE_ID = 'paddock-pass';
const WHATSAPP_ICON_ID = 'whatsapp-icon';

export const isEmailConfigured = () =>
  process.env.SEND_EMAILS?.trim().toLowerCase() === 'true' && Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const createTransport = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
  });

const escapeHtml = (text) => text.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);

const buildPassMessage = ({ leader, teamName }) => ({
  subject: `Welcome to the paddock, ${teamName}! 🏁`,
  text: `Welcome to the paddock, ${leader.name}!

${teamName} is officially on the grid for GiTogether 2026, and we're so glad to have you with us.

Your team's paddock pass is attached :)

Before lights out, tune in to team radio. Join the WhatsApp group for all the updates, and bring your crew along:
${WHATSAPP_URL}

Lights out on ${EVENT_DAY_LABEL}. See you on the grid!
`,
  html: `<p>Welcome to the paddock, ${escapeHtml(leader.name)}!</p>
<p>${escapeHtml(teamName)} is officially on the grid for GiTogether 2026, and we're so glad to have you with us.</p>
<p>Your team's paddock pass is attached :)</p>
<p><img src="cid:${PASS_IMAGE_ID}" width="400" alt="Your GiTogether 2026 paddock pass" style="display:block;max-width:100%;height:auto"></p>
<p>Before lights out, tune in to team radio. Join the WhatsApp group for all the updates, and bring your crew along:</p>
<p><a href="${escapeHtml(WHATSAPP_URL)}" style="display:inline-block;padding:12px 22px;border-radius:8px;background-color:#16a34a;color:#ffffff;font-weight:600;line-height:20px;text-decoration:none"><img src="cid:${WHATSAPP_ICON_ID}" width="20" height="20" alt="" style="display:inline-block;margin-right:10px;border:0;vertical-align:middle"><span style="vertical-align:middle">Join the WhatsApp group</span></a></p>
<p>Lights out on ${EVENT_DAY_LABEL}. See you on the grid!</p>
`,
});

// Used when the pass couldn't be made, so the leader still gets the team's details.
const buildPlainMessage = ({ leader, members, teamName }) => ({
  subject: `Welcome to the paddock, ${teamName}! 🏁`,
  text: `Welcome to the paddock, ${leader.name}!

${teamName} is officially on the grid for GiTogether 2026, and we're so glad to have you with us.

Team: ${teamName}
Members: ${members.map(({ name }) => name).join(', ')}

Before lights out, tune in to team radio. Join the WhatsApp group for all the updates, and bring your crew along:
${WHATSAPP_URL}

Lights out on ${EVENT_DAY_LABEL}. See you on the grid!
`,
});

const passAttachments = (pass) => [
  { filename: PASS_FILENAME, content: pass, contentType: 'image/png', cid: PASS_IMAGE_ID, contentDisposition: 'inline' },
  { filename: PASS_FILENAME, content: pass, contentType: 'image/png' },
  { filename: 'whatsapp.png', content: readFileSync(new URL('./pass/art/whatsapp-icon.png', import.meta.url)), contentType: 'image/png', cid: WHATSAPP_ICON_ID, contentDisposition: 'inline' },
];

const renderPassSafely = async (team) => {
  try {
    // Loaded here so the other API routes don't have to load the image tools.
    const { renderPass } = await import('./pass/renderPass.js');
    return await renderPass(team);
  } catch (error) {
    console.error('Could not make the paddock pass:', error);
    return null;
  }
};

// Returns whether the email was sent.
async function sendConfirmationEmail({ members, teamName, teamCode }) {
  if (!isEmailConfigured()) {
    console.warn('Emails are off, so no confirmation email was sent.');
    return false;
  }

  const leader = members.find((member) => member.isLeader);
  const pass = await renderPassSafely({ teamName, teamCode, members });
  const message = pass ? buildPassMessage({ leader, teamName }) : buildPlainMessage({ leader, members, teamName });
  const transport = createTransport();
  try {
    await transport.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: leader.email,
      ...message,
      ...(pass ? { attachments: passAttachments(pass) } : {}),
    });
    return true;
  } catch (error) {
    console.error(error);
    return false;
  } finally {
    transport.close();
  }
}

// Sends the team leader's email and records how it went. A failed email never undoes a registration.
export async function deliverConfirmationEmail({ teamId, ...team }) {
  try {
    const sent = await sendConfirmationEmail(team);
    await Team.updateOne({ _id: teamId }, { emailStatus: sent ? 'sent' : 'failed' });
  } catch (error) {
    console.error(error);
  }
}
