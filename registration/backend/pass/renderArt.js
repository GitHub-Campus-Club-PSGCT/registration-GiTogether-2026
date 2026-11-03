// Redraws the pass header and labels in art/, and the website's logo, as plain SVG shapes, so the F1 font files stay out of the repo.
// Only needed to change that artwork. Run with `npm run pass-art` on a machine with the font installed.
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import satori from 'satori';

const WIDTH = 800;
const WORDMARK_SLANT = -16;
const WORDMARK_LEFT = 38;
const WORDMARK_TOP = 7;
const WORDMARK_TEXT_WIDTH = 1413;
const WORDMARK_TEXT_HEIGHT = 81;
const RED = '#e10600';
const INK = '#0a0b0d';
const GREY = '#6b7280';
const FONT_DIR = process.env.F1_FONT_DIR || `${homedir()}/Library/Fonts`;

const font = (file, weight) => ({ name: 'F1', data: readFileSync(`${FONT_DIR}/Formula1-${file}_web_0.ttf`), weight, style: 'normal' });
const fonts = [font('Wide', 800), font('Bold', 700)];

const box = (style, ...children) => ({ type: 'div', props: { style: { display: 'flex', ...style }, children } });

const header = box(
  { position: 'relative', width: WIDTH, height: 340, background: INK, flexDirection: 'column', alignItems: 'center' },
  box({ width: 120, height: 22, borderRadius: 11, background: '#fff', marginTop: 30 }),
  box({ fontFamily: 'F1', fontWeight: 800, fontSize: 58, color: '#fff', marginTop: 36, letterSpacing: -1 }, 'GiTogether'),
  box({ fontFamily: 'F1', fontWeight: 700, fontSize: 30, color: RED, letterSpacing: 10, marginTop: 14 }, 'PADDOCK PASS'),
);

// Added straight into the SVG because an image inside this artwork wouldn't be drawn on the final pass.
const DIAGONAL = `<polygon points="0,340 ${WIDTH},258 ${WIDTH},340" fill="#fff"/><polygon points="0,328 ${WIDTH},246 ${WIDTH},258 0,340" fill="${RED}"/>`;

const label = (text, width, justifyContent = 'flex-start') =>
  box({ width, height: 26, alignItems: 'center', justifyContent, fontFamily: 'F1', fontWeight: 700, fontSize: 19, letterSpacing: 3, color: GREY }, text);

const leaderTag = box(
  { width: 118, height: 38, alignItems: 'center', justifyContent: 'center', background: RED, fontFamily: 'F1', fontWeight: 700, fontSize: 17, letterSpacing: 2, color: '#fff' },
  'LEADER',
);

const ART = {
  header: [header, WIDTH, 340],
  'label-team': [label('TEAM', 120), 120, 26],
  'label-team-code': [label('TEAM CODE', 220), 220, 26],
  'label-race-day': [label('RACE DAY', 200, 'flex-end'), 200, 26],
  'tag-leader': [leaderTag, 118, 38],
};

for (const [name, [element, width, height]] of Object.entries(ART)) {
  const svg = await satori(element, { width, height, fonts });
  writeFileSync(new URL(`./art/${name}.svg`, import.meta.url), name === 'header' ? svg.replace('</svg>', `${DIAGONAL}</svg>`) : svg);
}

const wordmarkText = await satori(
  box({ fontFamily: 'F1', fontWeight: 800, fontSize: 100, color: RED, letterSpacing: -1 }, 'GITOGETHER'),
  { width: 1900, height: 160, fonts },
);
writeFileSync(
  new URL('../../frontend/src/assets/wordmark.svg', import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${WORDMARK_LEFT} ${WORDMARK_TOP} ${WORDMARK_TEXT_WIDTH} ${WORDMARK_TEXT_HEIGHT}"><g transform="translate(60 0) skewX(${WORDMARK_SLANT})">${wordmarkText.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</g></svg>`,
);

// GitHub's rules keep its mark white, black, grey or green, so it's white on the dark footer.
writeFileSync(
  new URL('../../frontend/src/assets/github-mark.svg', import.meta.url),
  readFileSync(new URL('./art/github-mark.svg', import.meta.url), 'utf8').replace('fill="black"', 'fill="#fff"'),
);
