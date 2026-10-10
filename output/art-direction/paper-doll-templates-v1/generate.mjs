import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Neutral design geometry. Assembly and guide exports use these same shapes
// and local anchor frames. No component is stretched during assembly.
const out = dirname(fileURLToPath(import.meta.url));
const colours = { ink: '#263a3b', body: '#c8d2c3', limb: '#dfc9ac', seam: '#8c9f92', port: '#248d91', gear: '#ba7151' };
const shape = (d, fill = colours.limb, stroke = colours.ink, w = 3) => `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
const circle = (x, y, r, fill, stroke = 'none', w = 2) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${w}"/>`;
const line = (x1, y1, x2, y2, stroke = colours.seam, w = 2, dash = '') => `<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="${stroke}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
const assets = {
  'torso-cell': {
    label: 'Trunk cell', bounds: [-32, 0, 64, 80], anchors: { top: [0, 0], bottom: [0, 80], left: [-32, 40], right: [32, 40], chest: [0, 44] },
    role: 'Repeat horizontally and vertically. Carries no shoulders, necks, or hips.',
    svg: `<rect x="-32" y="0" width="64" height="80" fill="${colours.body}"/>${line(-30, 78, 30, 78, colours.seam, 1.5, '3 5')}${line(31, 4, 31, 75, colours.seam, 1.5, '3 5')}`,
  },
  'side-edge': {
    label: 'Plain side edge', bounds: [-7, 0, 7, 80], anchors: { top: [0, 0], bottom: [0, 80] },
    role: 'Finishes a trunk edge. Replace locally with one shoulder adapter per arm.',
    svg: `<rect x="-7" y="0" width="7" height="80" fill="${colours.body}"/>${line(0, 0, 0, 80, colours.ink, 3)}`,
  },
  'top-deck': {
    label: 'Top deck tile', bounds: [-32, -12, 64, 12], anchors: { bottom: [0, 0] },
    role: 'Repeat across the top. Neck collars are separate and determine the number of heads.',
    svg: `<rect x="-32" y="-12" width="64" height="12" fill="${colours.body}"/>${line(-32, -12, 32, -12, colours.ink, 3)}`,
  },
  'lower-deck': {
    label: 'Lower deck tile', bounds: [-32, 0, 64, 40], anchors: { top: [0, 0], bottom: [0, 40] },
    role: 'Interior lower torso tile; hip adapters attach to its surface individually.',
    svg: `<rect x="-32" y="0" width="64" height="40" fill="${colours.body}"/>${line(-32, 40, 32, 40, colours.ink, 3)}`,
  },
  'lower-endcap': {
    label: 'Lower left endcap', bounds: [-32, 0, 64, 40], anchors: { top: [0, 0], bottom: [10, 40] },
    role: 'Finishes the lower outer edge; mirror for the right end. Fixed curvature, no resizing.',
    svg: shape('M-32 0H32V40H-12Q-32 26 -32 0Z', colours.body, 'none')
      + shape('M-32 0Q-32 26 -12 40H32', 'none'),
  },
  'shoulder-adapter': {
    label: 'One shoulder adapter', bounds: [-29, -19, 42, 39], anchors: { trunk: [-12, 0], arm: [0, 0] },
    role: 'One arm root with its surrounding shoulder tissue. Left side is mirrored.',
    svg: shape('M-28 -18 C-12 -21 7 -17 11 -6 C15 5 8 17 -6 18 L-28 16 Z', colours.body)
      + shape('M-21 -11 Q-11 -7 -11 8', 'none', colours.seam, 1.5)
      + circle(0, 0, 9, colours.limb, colours.ink, 2),
  },
  'neck-adapter': {
    label: 'One neck collar', bounds: [-22, -13, 44, 27], anchors: { head: [0, 0], trunk: [0, 12] },
    role: 'One neck socket on the top deck. No head is baked into the deck.',
    svg: shape('M-20 12 L-17 -5 Q0 -17 17 -5 L20 12 Q0 17 -20 12Z', colours.body)
      + shape('M-13 5Q0 -2 13 5', 'none', colours.seam, 2),
  },
  'hip-adapter': {
    label: 'One hip adapter', bounds: [-25, -16, 50, 34], anchors: { leg: [0, 0], trunk: [0, -10] },
    role: 'One leg socket in the lower torso. Leg count determines how many are placed.',
    svg: shape('M-23 -14 Q0 -18 23 -14 L22 7 Q0 24 -22 7Z', colours.body)
      + circle(0, 0, 9, colours.limb, colours.ink, 2),
  },
  head: {
    label: 'Head', bounds: [-34, -94, 68, 94], anchors: { neck: [0, 0], headgear: [0, -82] },
    role: 'Fixed frontal face; neck and headwear frames stay fixed across variants.',
    svg: shape('M-10 0 L-11 -13 C-25 -17 -32 -36 -31 -57 Q-31 -91 0 -92 Q31 -91 31 -57 C32 -36 25 -17 11 -13 L10 0Z')
      + shape('M-18 -55h9 M9 -55h9', 'none', colours.ink, 3)
      + shape('M-9 -32Q0 -26 9 -32', 'none', colours.ink, 2),
  },
  'arm-human': {
    label: 'Arm + closed hand', bounds: [-12, -13, 105, 133], anchors: { shoulder: [0, 0], elbow: [33, 52], grip: [77, 103] },
    role: 'Fixed relaxed pose. The whole limb rotates around shoulder; equipment follows grip.',
    svg: shape('M-7 -10 Q7 -17 16 -4 L38 35 Q45 45 42 55 L72 84 Q80 83 88 94 L91 107 Q88 118 77 119 L63 109 L56 96 L25 67 Q18 60 19 50 L-7 14 Q-15 2 -7 -10Z')
      + shape('M24 51Q32 45 41 51 M69 95L80 107', 'none', '#a69077', 2),
  },
  'arm-bone': {
    label: 'Bone arm / same frames', bounds: [-12, -13, 105, 133], anchors: { shoulder: [0, 0], elbow: [33, 52], grip: [77, 103] },
    role: 'Alternate material using exactly the same shoulder, elbow and grip coordinates.',
    svg: shape('M-4 -8 Q8 -12 13 -3 L38 40 Q42 49 35 53 L27 53 L-3 8Z', '#e9dfc7')
      + circle(33, 52, 10, '#e9dfc7', colours.ink, 3)
      + shape('M34 59L68 89 L64 95L27 65Z', '#e9dfc7')
      + shape('M41 56L74 85L72 92L36 64Z', '#e9dfc7')
      + shape('M68 87Q80 82 89 97 L91 107Q88 118 77 119L63 109L59 99Z', '#e9dfc7')
      + shape('M69 96L80 107', 'none', '#a69077', 2),
  },
  'leg-foot': {
    label: 'Leg + front-facing foot', bounds: [-21, -10, 46, 128], anchors: { hip: [0, 0], knee: [0, 57], footwear: [0, 99], sole: [0, 114] },
    role: 'Fixed hip, knee and ankle geometry. Both feet face the viewer.',
    svg: shape('M-12 -5Q0 -12 12 -5L14 38 Q11 49 10 57 L12 92 L17 101Q26 110 20 115H-19Q-25 111 -16 101L-11 92L-9 57Q-14 46 -14 38Z')
      + shape('M-10 53Q0 59 10 53 M-14 103Q0 99 14 103', 'none', '#a69077', 2),
  },
  mace: {
    label: 'Mace / fixed grip', bounds: [-22, -75, 44, 89], anchors: { grip: [0, 0] },
    role: 'Upright hand-held equipment. Hand must occlude the handle at grip.',
    svg: shape('M-5 -53H5V12H-5Z', '#b7a48d')
      + shape('M-21 -69L-8 -74H8L21 -69V-53L8 -48H-8L-21 -53Z', '#9babb0')
      + line(-15, -61, 15, -61, '#5e777c', 2),
  },
  boot: {
    label: 'Boot / front-facing sole', bounds: [-22, -15, 46, 33], anchors: { footwear: [0, 0], sole: [0, 15] },
    role: 'Uses the same ankle and sole frame as the leg. No sideways boot perspective.',
    svg: shape('M-15 -13H15L17 -2L22 7V15H-21V7L-17 -2Z', colours.gear)
      + line(-19, 12, 20, 12, colours.ink, 3) + line(-7, -5, 7, -5, '#e6b38c', 2),
  },
  helmet: {
    label: 'Helmet / headwear frame', bounds: [-36, -18, 72, 31], anchors: { headgear: [0, 0] },
    role: 'Fixed front-facing headwear envelope aligned to the crown frame.',
    svg: shape('M-33 9L-31 -2Q-29 -16 0 -16Q29 -16 31 -2L33 9Z', '#9babb0')
      + line(-31, 7, 31, 7, '#5e777c', 4),
  },
  breastplate: {
    label: 'Chest plate / local mount', bounds: [-39, -30, 78, 72], anchors: { chest: [0, 0] },
    role: 'Fixed patch covering the upper trunk. It does not resize with the whole torso.',
    svg: shape('M-36 -28L-20 -20H20L36 -28L31 23Q0 45 -31 23Z', '#9babb0')
      + shape('M0 -19V28 M-28 -9Q0 3 28 -9', 'none', '#5e777c', 2),
  },
};

const marker = (x, y, label = '') => `<g>${circle(x, y, 3, '#fff', colours.port, 1.3)}${line(x - 6, y, x + 6, y, colours.port, 1)}${line(x, y - 6, x, y + 6, colours.port, 1)}${label ? `<text x="${x + 8}" y="${y - 7}" font-size="7" fill="${colours.port}">${label}</text>` : ''}</g>`;
const defs = Object.entries(assets).map(([id, a]) => `<g id="${id}">${a.svg}</g>`).join('');
const place = (id, x, y, mirror = false) => `<g transform="translate(${x} ${y})${mirror ? ' scale(-1 1)' : ''}"><use href="#${id}"/></g>`;
const header = (w, h, content, background = '#f5f3ed', viewBox = `0 0 ${w} ${h}`) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${viewBox}"><style>text{font-family:Arial,sans-serif}</style><defs>${defs}</defs>${background ? `<rect x="${viewBox.split(' ')[0]}" y="${viewBox.split(' ')[1]}" width="${viewBox.split(' ')[2]}" height="${viewBox.split(' ')[3]}" fill="${background}"/>` : ''}${content}</svg>`;

function assemble({ arms = 2, heads = 1, feet = 2, equipment = false, mixed = false, overlay = false, exploded = 0 } = {}) {
  const cols = Math.max(2, Math.ceil(heads * 80 / 64), feet);
  const rows = Math.max(1, Math.ceil(arms / 2));
  const width = cols * 64, bodyH = rows * 80;
  const pins = [], parts = [];
  // Torso cells contain no fixed limb anatomy. Width and height grow by adding
  // full cells; the edges, neck and hip adapters finish their exposed surfaces.
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    parts.push(place('torso-cell', -width / 2 + c * 64 + 32, r * (80 + exploded)));
  }
  const grownH = bodyH + (rows - 1) * exploded;
  // Every edge is also built from fixed templates. No variable-width torso
  // artwork or stretching is used to finish the assembled body.
  for (let c = 0; c < cols; c++) {
    const x = -width / 2 + c * 64 + 32;
    parts.push(place('top-deck', x, 0));
    parts.push(place(c === 0 || c === cols - 1 ? 'lower-endcap' : 'lower-deck', x, grownH, c === cols - 1));
  }
  for (let r = 0; r < rows; r++) {
    parts.push(place('side-edge', -width / 2, r * (80 + exploded), true));
    parts.push(place('side-edge', width / 2, r * (80 + exploded)));
  }
  parts.push(line(-width / 2, -12, -width / 2, 0, colours.ink, 3), line(width / 2, -12, width / 2, 0, colours.ink, 3));
  const headsX = Array.from({ length: heads }, (_, i) => (i - (heads - 1) / 2) * 80);
  for (const x of headsX) {
    parts.push(place('head', x, -12));
    parts.push(place('neck-adapter', x, -12));
    if (equipment) parts.push(place('helmet', x, -94));
    pins.push({ type: 'neck', x, y: -12 });
  }
  const legRootY = grownH + 36;
  for (let i = 0; i < feet; i++) {
    const x = (i - (feet - 1) / 2) * 64;
    parts.push(place('leg-foot', x, legRootY));
    parts.push(place('hip-adapter', x, legRootY));
    if (equipment) parts.push(place('boot', x, legRootY + 99));
    pins.push({ type: 'hip', x, y: legRootY });
  }
  for (let i = 0; i < arms; i++) {
    const side = i % 2 === 0 ? -1 : 1, row = Math.floor(i / 2);
    const x = side * (width / 2 + 12), y = row * (80 + exploded) + 28;
    // Equipment is below the hand in draw order, so the closed hand actually
    // surrounds its handle. Root and grip are both transformed with the arm.
    if (equipment) parts.push(place('mace', x + side * 77, y + 103, side < 0));
    parts.push(place(mixed && i % 2 ? 'arm-bone' : 'arm-human', x, y, side < 0));
    parts.push(place('shoulder-adapter', x, y, side < 0));
    pins.push({ type: `arm-${i}`, x, y });
  }
  if (equipment) parts.push(place('breastplate', 0, 44));
  if (overlay) {
    for (const p of pins) parts.push(marker(p.x, p.y));
    for (let i = 0; i < arms; i++) {
      const side = i % 2 === 0 ? -1 : 1, row = Math.floor(i / 2);
      parts.push(marker(side * (width / 2 + 89), row * (80 + exploded) + 131));
    }
    parts.push(marker(0, 44));
  }
  return { svg: parts.join(''), height: grownH + 150 + (heads ? 106 : 0), ground: legRootY + 114, width: width + 208, pins, rows, cols };
}

await mkdir(join(out, 'templates'), { recursive: true });
await mkdir(join(out, 'clean'), { recursive: true });
for (const [id, a] of Object.entries(assets)) {
  const content = `<use href="#${id}"/>`;
  await writeFile(join(out, 'clean', `${id}.svg`), header(512, 512, content, null, '-128 -128 256 256'));
  let grid = '';
  for (let t = -128; t <= 128; t += 16) grid += line(t, -128, t, 128, '#e0e6df', .4) + line(-128, t, 128, t, '#e0e6df', .4);
  grid += line(-128, 0, 128, 0, '#a7b6ad', .6) + line(0, -128, 0, 128, '#a7b6ad', .6);
  const [bx, by, bw, bh] = a.bounds;
  const bounds = `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="none" stroke="#b18b63" stroke-width=".8" stroke-dasharray="2 3"/>`;
  const guide = grid + content + bounds + Object.entries(a.anchors).map(([name, [x, y]]) => marker(x, y, name)).join('')
    + `<text x="-119" y="-112" font-size="10" font-weight="bold" fill="${colours.ink}">${a.label}</text><text x="-119" y="117" font-size="7" fill="#586963">${bw} × ${bh} units · registration origin (0,0) · fixed front view</text>`;
  await writeFile(join(out, 'templates', `${id}.svg`), header(512, 512, guide, '#f6f8f4', '-128 -128 256 256'));
}

// The board uses a common pixel scale and ground line for every body. Tall
// builds really grow; there is no per-figure fitting that hides proportion drift.
const text = (x, y, size, str, weight = 'normal', fill = colours.ink) => `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}">${str}</text>`;
let board = text(48, 52, 27, 'PAPER DOLL / CONSTRUCTION STUDY 01', 'bold')
  + text(48, 82, 15, 'One camera. One scale. Each attachment gets a component that visibly supports it.', 'normal', '#586963');
const shelf = [
  ['torso-cell', 98, 159, 1.3], ['shoulder-adapter', 270, 196, 1.8], ['head', 438, 246, 1.2],
  ['arm-human', 572, 158, 1], ['arm-bone', 742, 158, 1], ['leg-foot', 957, 158, 1],
  ['mace', 1125, 240, 1], ['boot', 1265, 218, 1.7],
];
for (const [id, x, y, scale] of shelf) {
  board += `<g transform="translate(${x} ${y}) scale(${scale})"><use href="#${id}"/>${Object.entries(assets[id].anchors).filter(([n]) => ['arm', 'neck', 'shoulder', 'grip', 'hip', 'footwear'].includes(n)).map(([n, p]) => marker(...p)).join('')}</g>`;
}
const labels = [['Trunk tile', 48], ['Single shoulder', 208], ['Head / collar', 370], ['Arm A', 556], ['Arm B', 726], ['Leg / hip', 901], ['Fixed grip', 1080], ['Fixed sole', 1220]];
for (const [label, x] of labels) board += text(x, 320, 14, label, 'bold');
board += line(48, 350, 1342, 350, '#c6cec5', 1)
  + text(48, 385, 19, 'THE TORSO GROWS BY ADDING CELLS; SHOULDER ADAPTERS ARE PLACED ONLY WHERE ARMS EXIST.', 'bold')
  + text(48, 412, 14, 'The three-arm build has three shoulders. Both arm variants keep the same shoulder and hand frames.', 'normal', '#586963');
const cases = [
  { label: '2 arms', desc: 'ordinary baseline', x: 189, arms: 2 },
  { label: '3 arms', desc: 'one added row / one added socket', x: 512, arms: 3 },
  { label: '4 arms', desc: 'two sockets on each row', x: 835, arms: 4 },
  { label: '6 arms', desc: 'three rows / unchanged limbs', x: 1158, arms: 6 },
];
const scale = .87, ground = 936;
for (const c of cases) {
  const a = assemble({ arms: c.arms, mixed: true, overlay: true });
  const y = ground - a.ground * scale;
  board += text(c.x - 94, 466, 21, c.label, 'bold') + text(c.x - 94, 490, 12, c.desc, 'normal', '#586963')
    + `<g transform="translate(${c.x} ${y}) scale(${scale})">${a.svg}</g>`;
}
board += line(48, ground + 1, 1342, ground + 1, '#aab7ad', 1)
  + text(48, 976, 14, 'Cyan marks = fixed attachment frames. Torso panels have no built-in shoulders. An unused side stays a plain edge.', 'normal', '#586963')
  + text(48, 1005, 14, 'Review: body proportions, row spacing, shoulder continuity, and silhouette. These are starting templates, not approved anatomy.', 'normal', '#586963');
await writeFile(join(out, 'construction-board.svg'), header(1390, 1040, board));

let fitBoard = text(48, 53, 26, 'PAPER DOLL / INTERCHANGE + EQUIPMENT', 'bold')
  + text(48, 84, 15, 'The same local mounts are used on both arm variants. Equipment follows those mounts without per-part correction.', 'normal', '#586963');
const fitCases = [
  { x: 218, label: 'All standard parts', opts: { equipment: true } },
  { x: 613, label: 'Mixed arms / same equipment', opts: { equipment: true, mixed: true } },
  { x: 1008, label: 'Expanded top + bottom', opts: { arms: 4, heads: 2, feet: 4, mixed: true, equipment: true } },
];
for (const c of fitCases) {
  const a = assemble(c.opts), y = 680 - a.ground;
  fitBoard += text(c.x - 144, 141, 18, c.label, 'bold') + `<g transform="translate(${c.x} ${y})">${a.svg}</g>`;
}
fitBoard += line(48, 682, 1272, 682, '#aab7ad', 1)
  + text(48, 729, 15, 'Headwear remains frontal. Boots match the feet. The closed hand covers the mace handle at the grip.', 'normal', '#586963')
  + text(48, 759, 15, 'Chest gear stays at a fixed upper-trunk mount; torso growth adds cells around it.', 'normal', '#586963');
await writeFile(join(out, 'equipment-board.svg'), header(1320, 800, fitBoard));

let socketsBoard = text(48, 53, 26, 'PAPER DOLL / SOCKETS FOLLOW THE ANATOMY', 'bold')
  + text(48, 84, 15, 'A trunk section does not imply a pair of shoulders. One shoulder adapter is added for each actual arm.', 'normal', '#586963');
for (const [arms, x] of [[0, 211], [1, 605], [3, 999]]) {
  const a = assemble({ arms, overlay: true });
  socketsBoard += text(x - 135, 139, 20, `${arms} arm${arms === 1 ? '' : 's'} / ${arms} shoulder adapter${arms === 1 ? '' : 's'}`, 'bold')
    + `<g transform="translate(${x} ${660 - a.ground})">${a.svg}</g>`;
}
socketsBoard += line(48, 662, 1162, 662, '#aab7ad', 1)
  + text(48, 710, 15, 'No phantom socket or sculpted shoulder remains on an empty side. Extra rows contribute complete trunk cells.', 'normal', '#586963');
await writeFile(join(out, 'socket-count-board.svg'), header(1210, 750, socketsBoard));

const isolatedCases = [['no-arms', { arms: 0 }], ['one-arm', { arms: 1 }], ['baseline', { arms: 2 }], ['three-arms', { arms: 3 }], ['four-arms', { arms: 4 }], ['six-arms', { arms: 6 }], ['equipped-mixed', { arms: 2, mixed: true, equipment: true }]];
await mkdir(join(out, 'assemblies'), { recursive: true });
for (const [name, opts] of isolatedCases) {
  const a = assemble(opts), w = Math.ceil(a.width + 32), h = Math.ceil(a.height + 48);
  await writeFile(join(out, 'assemblies', `${name}.svg`), header(w, h, `<g transform="translate(${w / 2} 126)">${a.svg}</g>`, null));
}
await writeFile(join(out, 'geometry.json'), JSON.stringify({
  version: 'paper-doll-construction-01', status: 'proposal-for-visual-review',
  camera: 'strict front-facing orthographic; no foreshortening', lighting: 'flat drafting shapes',
  authoringFrame: { pixels: [512, 512], viewBox: [-128, -128, 256, 256], registrationPixel: [256, 256], unitPixels: 2 },
  rules: { cellSize: [64, 80], minColumns: 2, rows: 'max(1, ceil(armCount / 2))', columns: 'max(2, ceil(headCount * 80 / 64), legCount)', armSocket: 'one separate shoulder adapter per arm; no socket on unused side', armRows: 'alternate sides, then advance one cell row', transforms: 'translation and reflection only during construction; uniform scale for whole-creature display', equipment: 'host-local anchor frames; draw handle behind closed hand', expansion: 'add complete cells; never stretch a cell or limb' },
  components: Object.fromEntries(Object.entries(assets).map(([id, { svg, ...meta }]) => [id, meta])),
  reviewPending: ['body silhouette', 'shoulder continuity', 'extra row spacing', 'equipment sweep during rotation', 'small arena sizes', 'extreme counts'],
}, null, 2) + '\n');
console.log(`Wrote ${Object.keys(assets).length} template pairs, three boards, ${isolatedCases.length} assemblies, and geometry.json.`);
