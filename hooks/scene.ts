// The night-stadium backdrop: one SVG string, no script, nothing loaded.
// All art here is original: a striped-kit pixel player, a pixel canary and a pennant.

export const YELLOW = '#ffd200'
export const NAVY = '#0a1838'
const KIT_NAVY = '#14307a'

type Palette = Record<string, string>

/** Turns a character grid into crisp rects, merging horizontal runs of one color. */
function sprite(rows: string[], palette: Palette, px: number): string {
  let out = ''
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const ch = row[x]
      const color = palette[ch]
      if (color === undefined) {
        x += 1
        continue
      }
      let end = x + 1
      while (end < row.length && row[end] === ch) end += 1
      out += `<rect x="${x * px}" y="${y * px}" width="${(end - x) * px}" height="${px}" fill="${color}"/>`
      x = end
    }
  })
  return out
}

const PLAYER = [
  '...HHHHH....',
  '..HHHHHHH...',
  '..HSSSSSH...',
  '..SSKSSKS...',
  '..SSSSSSS...',
  '...SSRSS....',
  '....SSS.....',
  '.YNYNYNYNY..',
  'SYNYNYNYNYS.',
  'SYNYNYNYNYS.',
  'SYNYNYNYNYS.',
  'S.NYNYNYN.S.',
  '..YNYNYNY...',
  '..NNNNNNN...',
  '..NNN.NNN...',
  '..SS...SS...',
  '..WW...WW...',
  '..YY...YY...',
  '..WW...WW...',
  '.KKK..KKK...',
]
const PLAYER_COLORS: Palette = {
  H: '#2b1a10',
  S: '#d9a273',
  K: '#111827',
  R: '#9c4a2a',
  Y: YELLOW,
  N: KIT_NAVY,
  W: '#f2f2f2',
}

const BALL = ['.GGG.', 'GWKWG', 'GKWKG', 'GWKWG', '.GGG.']
const BALL_COLORS: Palette = { G: '#3a3a3a', W: '#f5f5f5', K: '#1b1b1b' }

const CANARY = [
  '....YYYY......',
  '...YYYYYY.....',
  '..YYYYKYYO....',
  '..YYYYYYYOO...',
  '...YYYYYYO....',
  '..YYYYYYYY....',
  '.YYYDDDYYYY...',
  '.YYDDDDDYYYY..',
  'YYYDDDDDYYYY..',
  'YY.YDDDYYYYY..',
  'Y...YYYYYYY...',
  '.....YYYYY....',
  '.....O...O....',
  '....OO..OO....',
]
const CANARY_COLORS: Palette = { Y: YELLOW, D: '#d9a400', O: '#ff8c1a', K: '#111827' }

const PENNANT = [
  'P...........',
  'PYYYYYYYYY..',
  'PNNNNNNNN...',
  'PYYYYYYY....',
  'PNNNNNN.....',
  'PYYYYY......',
  'PNNNN.......',
  'PYYY........',
  'PNN.........',
  'PY..........',
  'P...........',
  'P...........',
  'P...........',
  'P...........',
  'P...........',
  'P...........',
]
const PENNANT_COLORS: Palette = { P: '#c9ced9', Y: YELLOW, N: KIT_NAVY }

const STARS = [
  [90, 60], [210, 140], [330, 40], [470, 110], [560, 30], [690, 150], [780, 70], [900, 40],
  [1010, 120], [1120, 50], [1230, 150], [1340, 80], [1460, 30], [1540, 140], [150, 230],
  [420, 250], [1180, 240], [1480, 260], [620, 220], [980, 230],
]

function stars(): string {
  return STARS.map(
    ([x, y], i) => `<circle class="tw tw${i % 3}" cx="${x}" cy="${y}" r="${i % 4 === 0 ? 2.2 : 1.4}" fill="#e8ecff"/>`,
  ).join('')
}

function pitchLines(still: boolean): string {
  let out = ''
  for (let i = -10; i <= 10; i++) {
    out += `<line x1="${800 + i * 22}" y1="640" x2="${800 + i * 200}" y2="1000" stroke="${YELLOW}" stroke-opacity="0.35" stroke-width="2"/>`
  }
  if (still) {
    // Fixed rows, spaced as perspective spaces them.
    for (let k = 1; k <= 7; k++) {
      const y = 640 + 360 * Math.pow(k / 7, 2)
      out += `<line x1="0" y1="${y.toFixed(1)}" x2="1600" y2="${y.toFixed(1)}" stroke="${YELLOW}" stroke-opacity="0.4" stroke-width="2"/>`
    }
  } else {
    for (let k = 0; k < 8; k++) {
      out += `<line class="run" style="animation-delay:-${(k * 0.75).toFixed(2)}s" x1="0" y1="640" x2="1600" y2="640" stroke="${YELLOW}" stroke-width="2"/>`
    }
  }
  return out
}

function floodlight(x: number): string {
  const lamps = [0, 1, 2, 3]
    .map(i => `<rect x="${x - 34 + i * 18}" y="286" width="14" height="8"/><rect x="${x - 34 + i * 18}" y="298" width="14" height="8"/>`)
    .join('')
  const far = x < 800 ? 420 : -120
  const near = x < 800 ? 120 : -420
  return `<rect x="${x - 4}" y="300" width="8" height="250" fill="#1b2a52"/>
<rect x="${x - 40}" y="280" width="80" height="30" rx="4" fill="#24365f"/>
<g fill="#fff6c8">${lamps}</g>
<ellipse class="glow" cx="${x}" cy="295" rx="120" ry="60" fill="url(#lampGlow)"/>
<polygon class="beam" points="${x - 30},310 ${x + 30},310 ${x + far},1000 ${x + near},1000" fill="url(#beam)"/>`
}

// The scene is cropped to fill the window (slice). These rules move the side
// figures inward as the window narrows, and up as it gets very wide, so they
// stay in view. A media rule here reads the scene's own box.
const PIN_RULES = [
  [3 / 2, 70],
  [13 / 10, 170],
  [11 / 10, 270],
  [9 / 10, 370],
  [7 / 10, 470],
  [1 / 2, 570],
]
  .map(
    ([ratio, shift]) =>
      `@media (max-aspect-ratio:${Math.round(ratio * 100)}/100){.pinL{transform:translateX(${shift}px)}.pinR{transform:translateX(-${shift}px)}}`,
  )
  .join('\n')

export type Logo = { mime: string; base64: string }

export function buildScene(options: { still: boolean; logo: Logo | null }): string {
  const { still, logo } = options
  const motion = still
    ? '*{animation:none!important}'
    : '@media (prefers-reduced-motion:reduce){*{animation:none!important}.run{opacity:0}}'
  const logoMarkup =
    logo === null
      ? ''
      : `<ellipse cx="1350" cy="430" rx="110" ry="100" fill="url(#logoGlow)"/>
<image href="data:${logo.mime};base64,${logo.base64}" x="1280" y="360" width="140" height="140" preserveAspectRatio="xMidYMid meet" style="image-rendering:pixelated"/>`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
<style>
.tw{animation:tw 4s ease-in-out infinite}
.tw1{animation-delay:-1.3s}.tw2{animation-delay:-2.6s}
@keyframes tw{0%,100%{opacity:.3}50%{opacity:1}}
.glow{animation:glow 3s ease-in-out infinite alternate}
@keyframes glow{from{opacity:.55}to{opacity:.95}}
.beam{opacity:.09;animation:beam 6s ease-in-out infinite alternate}
@keyframes beam{from{opacity:.05}to{opacity:.14}}
.run{animation:run 6s cubic-bezier(.55,0,1,1) infinite;opacity:0}
@keyframes run{0%{transform:translateY(0);opacity:0}10%{opacity:.45}100%{transform:translateY(360px);opacity:.75}}
.bob{animation:bob 1.6s steps(2) infinite}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.hop{animation:hop 2.4s steps(2) infinite}
@keyframes hop{0%,70%,100%{transform:translateY(0)}80%{transform:translateY(-10px)}}
.flap{animation:flap 1.2s steps(2) infinite;transform-origin:left top}
@keyframes flap{0%,100%{transform:skewY(0)}50%{transform:skewY(4deg)}}
${PIN_RULES}
@media (min-aspect-ratio:22/10){.pinL,.pinR{transform:translateY(-60px)}}
@media (min-aspect-ratio:28/10){.pinL,.pinR{transform:translateY(-130px)}}
${motion}
</style>
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#040b1f"/><stop offset="0.6" stop-color="#0b1d4a"/><stop offset="1" stop-color="#16306e"/>
</linearGradient>
<linearGradient id="pitch" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#0c2a3a"/><stop offset="1" stop-color="#06131f"/>
</linearGradient>
<radialGradient id="lampGlow"><stop offset="0" stop-color="#fff3b0" stop-opacity="0.7"/><stop offset="1" stop-color="#fff3b0" stop-opacity="0"/></radialGradient>
<radialGradient id="logoGlow"><stop offset="0" stop-color="${YELLOW}" stop-opacity="0.35"/><stop offset="1" stop-color="${YELLOW}" stop-opacity="0"/></radialGradient>
<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c8" stop-opacity="1"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/></linearGradient>
<linearGradient id="horizon" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${YELLOW}" stop-opacity="0.9"/><stop offset="1" stop-color="${YELLOW}" stop-opacity="0"/></linearGradient>
<linearGradient id="calm" x1="0" y1="0" x2="1" y2="0">
<stop offset="0" stop-color="${NAVY}" stop-opacity="0"/>
<stop offset="0.24" stop-color="${NAVY}" stop-opacity="0.82"/>
<stop offset="0.76" stop-color="${NAVY}" stop-opacity="0.82"/>
<stop offset="1" stop-color="${NAVY}" stop-opacity="0"/>
</linearGradient>
<pattern id="stripes" width="120" height="200" patternUnits="userSpaceOnUse"><rect width="60" height="200" fill="${YELLOW}"/></pattern>
<pattern id="crowd" width="60" height="32" patternUnits="userSpaceOnUse">
<rect x="0" y="0" width="6" height="6" fill="${YELLOW}"/><rect x="20" y="0" width="6" height="6" fill="#2a4fa8"/><rect x="40" y="0" width="6" height="6" fill="#f2e8c8"/>
<rect x="10" y="16" width="6" height="6" fill="#2a4fa8"/><rect x="30" y="16" width="6" height="6" fill="#f2e8c8"/><rect x="50" y="16" width="6" height="6" fill="${YELLOW}"/>
</pattern>
</defs>
<rect width="1600" height="1000" fill="url(#sky)"/>
${stars()}
<path d="M0 520 L0 640 L1600 640 L1600 520 Q800 470 0 520 Z" fill="#0a1636"/>
<path d="M0 520 Q800 470 1600 520 L1600 532 Q800 484 0 532 Z" fill="${YELLOW}" opacity="0.5"/>
<rect x="0" y="540" width="1600" height="100" fill="url(#stripes)" opacity="0.06"/>
<rect x="0" y="546" width="1600" height="84" fill="url(#crowd)" opacity="0.55"/>
${floodlight(260)}
${floodlight(1340)}
<rect x="0" y="640" width="1600" height="360" fill="url(#pitch)"/>
<rect x="0" y="638" width="1600" height="4" fill="${YELLOW}" opacity="0.85"/>
<rect x="0" y="642" width="1600" height="40" fill="url(#horizon)" opacity="0.25"/>
${pitchLines(still)}
<!-- a calm band down the middle, where the conversation sits -->
<rect class="calm" x="0" y="0" width="1600" height="1000" fill="url(#calm)"/>
<g class="pinL">
<g transform="translate(110 560)"><g class="bob">${sprite(PLAYER, PLAYER_COLORS, 12)}</g></g>
<g transform="translate(260 776)">${sprite(BALL, BALL_COLORS, 10)}</g>
<ellipse cx="190" cy="810" rx="90" ry="10" fill="#000" opacity="0.35"/>
</g>
<g class="pinR">
${logoMarkup}
<g transform="translate(1440 ${logo === null ? 540 : 560})"><g class="flap">${sprite(PENNANT, PENNANT_COLORS, 10)}</g></g>
<g transform="translate(1420 650) scale(-1 1)"><g class="hop">${sprite(CANARY, CANARY_COLORS, 11)}</g></g>
<rect x="1240" y="805" width="230" height="10" fill="#3b2a1a"/>
<ellipse cx="1340" cy="830" rx="110" ry="10" fill="#000" opacity="0.35"/>
</g>
</svg>`
}
