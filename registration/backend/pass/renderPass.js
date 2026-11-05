import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { Resvg, initWasm } from '@resvg/resvg-wasm';
import QRCode from 'qrcode';
import satori from 'satori';
import { EVENT_DATE_LABEL } from '../../shared/teamRules.js';

const WIDTH = 800;
const CONTENT_WIDTH = 688;
const INK = '#0a0b0d';
const RACE_DAY = EVENT_DATE_LABEL.toUpperCase();
const LONG_EMAIL_LENGTH = 34;
const CHECK_SIZE = 22;
const CHECK_COLUMNS = Math.ceil(WIDTH / CHECK_SIZE);
const CHECK_ROWS = 3;
const GITHUB_MARK_SIZE = 52;
// A team code always makes a 21-square QR, so this draws each square exactly 10 wide and keeps its edges sharp.
const QR_SIZE = 210;

const readAsset = (path) => readFileSync(new URL(path, import.meta.url));

const font = (name, file, weight) => ({ name, data: readAsset(`./fonts/${file}-${weight}-normal.woff`), weight, style: 'normal' });

const fonts = [400, 700].flatMap((weight) => [
  font('Titillium', 'titillium-web-latin', weight),
  font('Titillium Extended', 'titillium-web-latin-ext', weight),
  font('Noto Sans Tamil', 'noto-sans-tamil-tamil', weight),
]);

const dataUri = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
const art = (name) => dataUri(readAsset(`./art/${name}.svg`));

const ART = {
  header: art('header'),
  team: art('label-team'),
  teamCode: art('label-team-code'),
  raceDay: art('label-race-day'),
  leader: art('tag-leader'),
  github: art('github-mark'),
};

const buildChecks = () => {
  const squares = [];
  for (let y = 0; y < CHECK_ROWS; y += 1) {
    for (let x = 0; x < CHECK_COLUMNS; x += 1) {
      if ((x + y) % 2 === 0) squares.push(`<rect x="${x * CHECK_SIZE}" y="${y * CHECK_SIZE}" width="${CHECK_SIZE}" height="${CHECK_SIZE}" fill="${INK}"/>`);
    }
  }
  const width = CHECK_COLUMNS * CHECK_SIZE;
  const height = CHECK_ROWS * CHECK_SIZE;
  return dataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="#fff"/>${squares.join('')}</svg>`);
};

const CHECKS = buildChecks();

// Only holds the team code, so the QR stays as simple as possible and survives a cracked or dim screen.
const buildQr = (teamCode) => {
  const { size, data } = QRCode.create(teamCode, { errorCorrectionLevel: 'H' }).modules;
  const squares = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (data[y * size + x]) squares.push(`M${x} ${y}h1v1h-1z`);
    }
  }
  return dataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><path d="${squares.join('')}" fill="${INK}"/></svg>`);
};

// The pass fonts only cover these scripts. Anything else, like emoji, is dropped so it can't draw as empty boxes.
const printable = (text) => text.replace(/[^\p{Script=Latin}\p{Script=Tamil}\p{M}\p{N}\p{P}\p{Sc}\p{Zs}]/gu, '').replace(/\s+/g, ' ').trim();

const box = (style, ...children) => ({ type: 'div', props: { style: { display: 'flex', ...style }, children: children.flat() } });
const image = (src, width, height, style = {}) => ({ type: 'img', props: { src, width, height, style } });

const bigText = (fontSize, text, style = {}) => box({ fontFamily: 'Titillium', fontWeight: 700, fontSize, color: INK, ...style }, text);
const detail = (text, style = {}) => box({ fontFamily: 'Titillium', fontWeight: 400, fontSize: 30, color: '#3d424a', marginTop: 4, ...style }, text);

const memberRow = (member) => {
  const details = (member.email?.length ?? 0) < LONG_EMAIL_LENGTH
    ? [detail([member.rollNumber, member.email].filter(Boolean).join('  ·  '))]
    : [detail(member.rollNumber), detail(member.email, { width: CONTENT_WIDTH, wordBreak: 'break-all', fontSize: 26 })];

  return box(
    { flexDirection: 'column', padding: '22px 0', borderTop: '2px solid #e4e6e9' },
    box(
      { alignItems: 'flex-start', justifyContent: 'space-between' },
      bigText(38, printable(member.name) || member.rollNumber, { lineHeight: 1.15, maxWidth: member.isLeader ? 540 : CONTENT_WIDTH, wordBreak: 'break-word' }),
      member.isLeader ? [image(ART.leader, 118, 38)] : [],
    ),
    details,
  );
};

const buildPass = ({ teamName, teamCode, members }) => {
  const shownName = printable(teamName) || teamCode;
  return box(
    { width: WIDTH, flexDirection: 'column', background: '#fff', borderRadius: 28, overflow: 'hidden' },
    image(ART.header, WIDTH, 340),
    box(
      { flexDirection: 'column', padding: '4px 56px 8px' },
      image(ART.team, 120, 26),
      bigText(shownName.length > 28 ? 44 : 66, shownName, { lineHeight: 1.08, marginTop: 6, wordBreak: 'break-word' }),
      box(
        { marginTop: 42, marginBottom: 24, justifyContent: 'space-between', alignItems: 'flex-start' },
        // Reaches past the QR by the blank space around the text, so the letters themselves line up with its top and bottom.
        box(
          { flexDirection: 'column', justifyContent: 'space-between', height: QR_SIZE + 21, marginTop: -5 },
          box({ flexDirection: 'column' }, image(ART.teamCode, 220, 26), bigText(42, teamCode, { marginTop: 2, letterSpacing: 1 })),
          box({ flexDirection: 'column' }, image(ART.raceDay, 200, 26), bigText(42, RACE_DAY, { marginTop: 2 })),
        ),
        image(buildQr(teamCode), QR_SIZE, QR_SIZE),
      ),
      members.map(memberRow),
    ),
    box({ justifyContent: 'flex-end', padding: '0 56px 22px' }, image(ART.github, GITHUB_MARK_SIZE, GITHUB_MARK_SIZE)),
    image(CHECKS, CHECK_COLUMNS * CHECK_SIZE, CHECK_ROWS * CHECK_SIZE),
  );
};

let wasmReady = null;

const loadWasm = () => {
  if (!wasmReady) {
    const require = createRequire(import.meta.url);
    wasmReady = initWasm(readFileSync(require.resolve('@resvg/resvg-wasm/index_bg.wasm')));
  }
  return wasmReady;
};

export async function renderPass(team) {
  await loadWasm();
  const svg = await satori(buildPass(team), { width: WIDTH, fonts });
  const renderer = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH * 2 } });
  const rendered = renderer.render();
  const png = rendered.asPng();
  // Wasm memory isn't cleaned up automatically.
  rendered.free();
  renderer.free();
  return Buffer.from(png);
}
