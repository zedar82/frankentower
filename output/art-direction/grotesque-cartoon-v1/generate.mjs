import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const assetDir = join(root, 'assets');
const componentDir = join(root, 'components');
const assemblyDir = join(root, 'assemblies');
await Promise.all([mkdir(componentDir, { recursive: true }), mkdir(assemblyDir, { recursive: true })]);

const style = {
  outline: '#251925',
  shadow: '#673b4d',
  mid: '#be715f',
  flesh: '#e99a79',
  light: '#ffd2a3',
  pale: '#f5d6a7',
  steel: '#53394b',
  ground: '#c6bdb0',
  paper: '#f4efe6',
};

const art = {
  'torso-core': { file: 'torso-core.png', role: 'Plain trunk cell; no permanent limbs' },
  'torso-rat': { file: 'torso-rat.png', role: 'Repeatable tawny fur trunk swatch' },
  'torso-bone': { file: 'torso-bone.png', role: 'Stitched tissue tile with small ivory fragments' },
  'head-sack': { file: 'head-sack.png', role: 'One-eyed stitched head' },
  'head-unicorn': { file: 'head-unicorn.png', role: 'Horned horse head' },
  'head-rat': { file: 'head-rat.png', role: 'Two-eyed furry rat head' },
  'head-bone': { file: 'head-bone.png', role: 'One-eyed stitched skull' },
  'head-serpent': { file: 'head-serpent.png', role: 'Two-eyed teal serpent head' },
  'arm-human': { file: 'arm-human.png', role: 'Human arm and hand' },
  'arm-talons': { file: 'arm-talons.png', role: 'Multi-clawed arm' },
  'arm-many-sucker': { file: 'arm-many-sucker.png', role: 'Coiled sucker limb' },
  'arm-rat': { file: 'arm-rat.png', role: 'Rat-flesh arm and gripping paw' },
  'arm-bone': { file: 'arm-bone.png', role: 'Skeletal arm and gripping claw' },
  'leg-flesh': { file: 'leg-flesh.png', role: 'Soft two-joint leg' },
  'leg-insect': { file: 'leg-insect.png', role: 'Chitin-plated, spined leg' },
  'leg-bone': { file: 'leg-bone.png', role: 'Skeletal claw-foot leg' },
  'leg-rat': { file: 'leg-rat.png', role: 'Rat-flesh bent leg and claw paw' },
  'weapon-bone-club': { file: 'weapon-bone-club-v2.png', role: 'Revised bone club, isolated art' },
};

// These are source-image landmarks. Each source image is uniformly scaled and
// rotated around the selected joint so the exported local mounts are shared.
const source = {
  'torso-core': { w: 1122, h: 1402 },
  'torso-rat': { w: 1058, h: 1487, cellBounds: [168, 65, 726, 1360] },
  'torso-bone': { w: 1060, h: 1484, cellBounds: [156, 49, 750, 1394] },
  'head-sack': { w: 1254, h: 1254, root: [640, 1130], crown: [640, 80] },
  'head-unicorn': { w: 1254, h: 1254, root: [650, 1150], crown: [640, 60] },
  'head-rat': { w: 1254, h: 1254, root: [627, 1190], crown: [627, 145] },
  'head-bone': { w: 1312, h: 1199, root: [656, 1168], crown: [656, 18] },
  'head-serpent': { w: 1312, h: 1199, root: [656, 1150], crown: [656, 56] },
  'arm-human': { w: 1254, h: 1254, root: [500, 330], grip: [1010, 1055], elbow: [665, 650] },
  'arm-talons': { w: 1254, h: 1254, root: [280, 280], grip: [1000, 1020], elbow: [640, 620] },
  'arm-many-sucker': { w: 1254, h: 1254, root: [620, 90], grip: [650, 1110], elbow: [625, 610] },
  'arm-rat': { w: 1312, h: 1199, root: [240, 225], grip: [1140, 1060], elbow: [700, 610] },
  'arm-bone': { w: 1230, h: 1278, root: [235, 175], grip: [1080, 1060], elbow: [650, 630] },
  'leg-flesh': { w: 1254, h: 1254, root: [640, 110], sole: [640, 1150], knee: [640, 650], footwear: [640, 1005] },
  'leg-insect': { w: 1254, h: 1254, root: [628, 170], sole: [628, 1120], knee: [628, 635], footwear: [628, 958] },
  'leg-bone': { w: 1254, h: 1254, root: [640, 80], sole: [640, 1150], knee: [640, 625], footwear: [640, 960] },
  'leg-rat': { w: 1024, h: 1536, root: [512, 140], sole: [512, 1445], knee: [600, 750], footwear: [520, 1290] },
  'weapon-bone-club': { w: 1024, h: 1536, root: [512, 980], grip: [512, 980], head: [512, 280] },
};

function delta(a, b) { return [b[0] - a[0], b[1] - a[1]]; }
function length([x, y]) { return Math.hypot(x, y); }
function angle([x, y]) { return Math.atan2(y, x) * 180 / Math.PI; }
function fitPair(image, fromA, fromB, toA, toB, targetOrigin = [256, 256]) {
  const src = delta(fromA, fromB), dst = delta(toA, toB);
  const s = length(dst) / length(src);
  const r = angle(dst) - angle(src);
  const origin = `translate(${targetOrigin[0]} ${targetOrigin[1]}) rotate(${r}) scale(${s})`;
  const offset = `translate(${-fromA[0]} ${-fromA[1]})`;
  return { transform: `${origin} ${offset}`, scale: s, rotationDeg: r };
}
function applyFit(point, image, fit) {
  const srcAngle = angle(delta(image.root, point));
  const rootToPoint = length(delta(image.root, point)) * fit.scale;
  const radians = (srcAngle + fit.rotationDeg) * Math.PI / 180;
  return [256 + Math.cos(radians) * rootToPoint, 256 + Math.sin(radians) * rootToPoint];
}
function svg(w, h, contents) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${contents}</svg>\n`;
}
function symbolDefinitions(assetPrefix = '../assets/') {
  return [...componentSvgs.entries()].map(([id, markup]) => {
    const body = markup.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replaceAll('../assets/', assetPrefix);
    return `<symbol id="${id}" viewBox="0 0 512 512">${body}</symbol>`;
  }).join('');
}
function assemblySvg(w, h, contents, libraryRef = null) {
  const symbols = libraryRef
    ? [...componentSvgs.keys()].map(id => `<symbol id="${id}" viewBox="0 0 512 512"><use href="${libraryRef}#${id}" width="512" height="512"/></symbol>`).join('')
    : symbolDefinitions('assets/');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${symbols}</defs>${contents}</svg>\n`;
}
const put = (path, value) => writeFile(path, value);
const componentSvgs = new Map();

// Reframe each generated part into the common 512 px authoring frame.
const components = {};
function componentContract(id, anchors) {
  if (id.startsWith('torso-')) return {
    scaleClass: '64 x 80 unit trunk cell', camera: 'front orthographic', layer: 'torso tissue',
    attachmentPoint: { interface: 'torso.cell-repeat', anchor: 'center', position: [0, 0] },
    overlapSeamRegion: '10 unit overlap on adjoining cell edges; internal outlines are cropped away; no limb socket is baked in',
    compatibleInterfaces: ['torso.cell-repeat'], mirroring: 'may mirror on alternating cell positions',
  };
  if (id.startsWith('head-')) return {
    scaleClass: 'shared head frame', camera: 'front orthographic', layer: 'head, in front of torso',
    attachmentPoint: { interface: 'torso.neck-adapter', anchor: 'neck', position: anchors.neck },
    overlapSeamRegion: 'neck adapter overlays the neck root by 8 px',
    compatibleInterfaces: ['torso.neck-adapter', 'headgear.mount'], mirroring: 'not mirrored in this study',
  };
  if (id.startsWith('arm-')) return {
    scaleClass: 'shared arm frame', camera: 'front orthographic', layer: 'arm, behind torso',
    attachmentPoint: { interface: 'torso.shoulder-adapter', anchor: 'shoulder', position: anchors.shoulder },
    overlapSeamRegion: 'shoulder adapter covers the root; torso cell overlays 8 px of the proximal art',
    compatibleInterfaces: ['torso.shoulder-adapter', 'hand.grip'], mirroring: 'mirrored with its adapter for the left side',
  };
  if (id.startsWith('leg-')) return {
    scaleClass: 'shared leg frame', camera: 'front orthographic', layer: 'leg, behind torso',
    attachmentPoint: { interface: 'torso.hip-adapter', anchor: 'hip', position: anchors.hip },
    overlapSeamRegion: 'hip adapter covers the root; leg continues through shared footwear mount to sole',
    compatibleInterfaces: ['torso.hip-adapter', 'footwear.mount'], mirroring: 'not mirrored in this neutral frontal study',
  };
  return {
    scaleClass: 'shared equipment frame', camera: 'front orthographic', layer: 'held equipment, in front',
    attachmentPoint: { interface: 'hand.grip', anchor: 'grip', position: anchors.grip },
    overlapSeamRegion: 'grip anchor is centered at the hand mount',
    compatibleInterfaces: ['hand.grip'], mirroring: 'may mirror for opposite hand',
  };
}
for (const [id, spec] of Object.entries(art)) {
  const img = source[id];
  const imageHref = `../assets/${spec.file}`;
  let body, anchors, transforms;
  if (id === 'torso-core') {
    const box = { x: 196, y: 188, w: 728, h: 1020 };
    const fitW = 128, fitH = box.h * fitW / box.w;
    const s = fitW / box.w;
    const x = 256 - (box.x + box.w / 2) * s;
    const y = 256 - (box.y + box.h / 2) * s;
    body = `<image href="${imageHref}" x="${x}" y="${y}" width="${img.w * s}" height="${img.h * s}"/>`;
    anchors = { top: [0, 0], bottom: [0, 80], left: [-32, 40], right: [32, 40], cellOverlap: 10 };
    transforms = { sourceAlphaBounds: [box.x, box.y, box.w, box.h], uniformScale: s, fittedOpaqueFramePx: [128, Number(fitH.toFixed(2))] };
  } else if (id.startsWith('torso-')) {
    const box = img.cellBounds;
    const s = Math.max(128 / box[2], 180 / box[3]);
    const x = 256 - (box[0] + box[2] / 2) * s;
    const y = 256 - (box[1] + box[3] / 2) * s;
    body = `<image href="${imageHref}" x="${x}" y="${y}" width="${img.w * s}" height="${img.h * s}"/>`;
    anchors = { top: [0, 0], bottom: [0, 80], left: [-32, 40], right: [32, 40], cellOverlap: 10 };
    transforms = { sourceCellBounds: box, uniformScale: s, fittedOpaqueFramePx: [Number((box[2] * s).toFixed(2)), 180] };
  } else if (id.startsWith('head-')) {
    const crown = [256, 92];
    const fit = fitPair(img, img.root, img.crown, [256, 256], crown);
    body = `<image href="${imageHref}" x="0" y="0" width="${img.w}" height="${img.h}" transform="${fit.transform}"/>`;
    anchors = { neck: [0, 0], headwear: [0, -82] };
    transforms = { sourceRoot: img.root, sourceCrown: img.crown, observedCrownPx: applyFit(img.crown, img, fit), uniformScale: fit.scale, rotationDeg: fit.rotationDeg };
  } else if (id.startsWith('arm-')) {
    const grip = [410, 462];
    const fit = fitPair(img, img.root, img.grip, [256, 256], grip);
    body = `<image href="${imageHref}" x="0" y="0" width="${img.w}" height="${img.h}" transform="${fit.transform}"/>`;
    anchors = { shoulder: [0, 0], elbow: [33, 52], grip: [77, 103] };
    transforms = { sourceRoot: img.root, sourceElbow: img.elbow, sourceGrip: img.grip, observedElbowPx: applyFit(img.elbow, img, fit), uniformScale: fit.scale, rotationDeg: fit.rotationDeg };
  } else if (id.startsWith('leg-')) {
    const sole = [256, 484];
    const fit = fitPair(img, img.root, img.sole, [256, 256], sole);
    body = `<image href="${imageHref}" x="0" y="0" width="${img.w}" height="${img.h}" transform="${fit.transform}"/>`;
    anchors = { hip: [0, 0], knee: [0, 57], footwear: [0, 99], sole: [0, 114] };
    transforms = { sourceRoot: img.root, sourceKnee: img.knee, sourceFootwear: img.footwear, sourceSole: img.sole, observedKneePx: applyFit(img.knee, img, fit), observedFootwearPx: applyFit(img.footwear, img, fit), uniformScale: fit.scale, rotationDeg: fit.rotationDeg };
  } else {
    const grip = [256, 256];
    const head = [256, 128];
    const fit = fitPair(img, img.grip, img.head, grip, head);
    body = `<image href="${imageHref}" x="0" y="0" width="${img.w}" height="${img.h}" transform="${fit.transform}"/>`;
    anchors = { grip: [0, 0], head: [0, -64] };
    transforms = { sourceRoot: img.root, sourceGrip: img.grip, sourceHead: img.head, uniformScale: fit.scale, rotationDeg: fit.rotationDeg, registeredHeadPx: head };
  }
  components[id] = { boundsPx: [512, 512], anchors, ...componentContract(id, anchors), ...transforms, role: spec.role };
  const rendered = svg(512, 512, body);
  componentSvgs.set(id, rendered);
  await put(join(componentDir, `${id}.svg`), rendered);
}

function adapterShape(scale = 1) {
  return `<g transform="scale(${scale})">
    <path d="M-31 -7C-30 -18 -20 -24 -9 -19C0 -27 12 -22 15 -16C27 -20 34 -9 29 0C34 11 24 21 12 17C4 25 -9 22 -14 16C-26 19 -34 9 -30 1C-35 -2 -35 -5 -31 -7Z" fill="${style.mid}" stroke="${style.outline}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M-24 -7C-22 -14 -15 -17 -7 -13C0 -20 9 -17 11 -11C21 -15 27 -7 23 0C28 8 20 14 11 11C4 18 -5 15 -9 11C-18 14 -24 7 -22 1C-26 -2 -26 -5 -24 -7Z" fill="${style.flesh}" stroke="${style.shadow}" stroke-width="2"/>
    <circle cx="0" cy="0" r="9" fill="${style.shadow}" stroke="${style.outline}" stroke-width="3"/>
    <circle cx="0" cy="0" r="4" fill="${style.light}"/>
    <path d="M-24 -15l6 4m35-4-6 4M-23 14l6-4m28 5-5-4" stroke="${style.pale}" stroke-width="3"/>
  </g>`;
}
await put(join(componentDir, 'shoulder-adapter.svg'), svg(512, 512, `<g transform="translate(256 256)">${adapterShape()}</g>`));
await put(join(componentDir, 'neck-adapter.svg'), svg(512, 512, `<g transform="translate(256 256)">${adapterShape(.72)}</g>`));
await put(join(componentDir, 'hip-adapter.svg'), svg(512, 512, `<g transform="translate(256 256)">${adapterShape(.9)}</g>`));
await put(join(componentDir, 'ankle-adapter.svg'), svg(512, 512, `<g transform="translate(256 256)">${adapterShape(.7)}</g>`));

// This reusable hand sits in front of a held item's grip so the fingers visibly
// close around its shaft. It remains a generic hand interface, not weapon art.
const gripHand = `<g transform="translate(256 256)">
  <path d="M-27 -19Q-23 -29 -12 -28L-2 -26L8 -30Q18 -31 21 -21L26 -15Q34 -10 30 0L25 12Q21 25 8 28L-15 26Q-28 22 -31 9L-34 -4Q-35 -14 -27 -19Z" fill="${style.mid}" stroke="${style.outline}" stroke-width="7" stroke-linejoin="round"/>
  <path d="M-25 -17Q-20 -23 -12 -21L-3 -19L7 -23Q15 -25 18 -16L24 -9Q29 -4 24 4L20 13Q15 21 5 21L-13 20Q-23 17 -26 7L-29 -4Q-30 -11 -25 -17Z" fill="${style.flesh}" stroke="${style.shadow}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M-25 -9Q-17 -13 -7 -9L5 -5M-28 1Q-16 -3 -5 2L8 6M-23 12Q-12 8 -1 13L9 16" fill="none" stroke="${style.outline}" stroke-width="5" stroke-linecap="square"/>
  <path d="M14 -13Q22 -8 21 0Q20 8 12 10L4 5Q7 -2 4 -8Z" fill="${style.light}" stroke="${style.outline}" stroke-width="4" stroke-linejoin="round"/>
  <path d="M-20 -21l5-3m27 3 4 5m-30 33 6 2" stroke="${style.pale}" stroke-width="3"/>
</g>`;
await put(join(componentDir, 'grip-hand-adapter.svg'), svg(512, 512, gripHand));

const boot = `<g transform="translate(256 256)">
  <path d="M-20 -16H15L21 -8V7L28 12V18H-26V11L-22 5Z" fill="${style.mid}" stroke="${style.outline}" stroke-width="6" stroke-linejoin="miter"/>
  <path d="M-17 -12H14V-4H-14Z" fill="${style.light}"/>
  <path d="M-21 8Q-5 3 6 9L23 12V17H-23Z" fill="${style.shadow}"/>
  <path d="M-26 18H28V27H-26Z" fill="${style.steel}" stroke="${style.outline}" stroke-width="5"/>
  <path d="M-21 22H23" stroke="${style.pale}" stroke-width="3"/>
  <path d="M-10 -10v8m8-8v8m8-8v8m8-8v8" stroke="${style.outline}" stroke-width="2"/>
</g>`;
await put(join(componentDir, 'boot-universal.svg'), svg(512, 512, boot));
for (const id of ['shoulder-adapter', 'neck-adapter', 'hip-adapter', 'ankle-adapter', 'boot-universal', 'grip-hand-adapter'])
  componentSvgs.set(id, await readFile(join(componentDir, `${id}.svg`), 'utf8'));
await put(join(componentDir, 'component-library.svg'), svg(512, 512, `<defs>${symbolDefinitions('../assets/')}</defs>`));

// All previews draw attachments through these exact component-frame anchors.
const unitPx = 2;
function part(id, rootX, rootY, flip = false, rotationDeg = 0) {
  const transform = flip || rotationDeg
    ? `transform="translate(${rootX} ${rootY}) rotate(${rotationDeg}) scale(${flip ? -1 : 1} 1) translate(-${rootX} -${rootY})"`
    : '';
  return `<use href="#${id}" x="${rootX - 256}" y="${rootY - 256}" width="512" height="512" ${transform}/>`;
}
function cell(x, y, { leftEdge, rightEdge, topEdge, bottomEdge, flip, bodyHeight = 180, torso = 'torso-core' }) {
  const cropLeft = leftEdge ? 0 : 20;
  const cropRight = rightEdge ? 0 : 20;
  const cropTop = topEdge ? 0 : 40;
  const cropBottom = bottomEdge ? 0 : 40;
  const width = 128 - cropLeft - cropRight;
  const height = 180 - cropTop - cropBottom;
  const flipTransform = flip ? ` transform="translate(${2 * (64 - cropLeft)} 0) scale(-1 1)"` : '';
  return `<svg x="${x + cropLeft}" y="${y + cropTop}" width="${width}" height="${bodyHeight - cropTop - cropBottom}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" overflow="hidden"><use href="#${torso}" x="${-192 - cropLeft}" y="${-166 - cropTop}" width="512" height="512"${flipTransform}/></svg>`;
}
function connector(id, x, y, flip = false) { return part(id, x, y, flip); }
function armMount(index, bodyLeft, bodyRight, bodyTop) {
  const pair = Math.floor(index / 2);
  const isLeft = index % 2 === 0;
  const side = isLeft ? -1 : 1;
  return {
    side,
    rootX: isLeft ? bodyLeft + 8 : bodyRight - 8,
    rootY: bodyTop + 56 + pair * 104,
    rotationDeg: pair === 0 ? 0 : (isLeft ? -24 : 24),
  };
}
function assembled(config) {
  const { heads, arms, legs } = config;
  // Keep one continuous torso tier. Additional arm pairs mount lower on its
  // sides, so the torso grows vertically with them instead of stacking cells.
  const rows = 1;
  const armPairs = Math.ceil(arms.length / 2);
  const bodyHeight = 180 + Math.max(0, armPairs - 1) * 104;
  const columns = Math.max(2, Math.ceil(heads.length * 1.25), legs.length);
  const cellStepX = 88;
  const bodyWidth = 128 + (columns - 1) * cellStepX;
  const bodyLeft = 256 - bodyWidth / 2;
  const bodyTop = 260;
  const bodyRight = bodyLeft + bodyWidth;
  const bodyBottom = bodyTop + bodyHeight;
  let out = '';

  // Limbs sit behind tissue. Their PNGs have already been registered to the
  // shared hip/sole and shoulder/grip frames, so placement never compensates
  // for an anatomy variant.
  for (let i = 0; i < legs.length; i++) {
    const hipX = bodyLeft + (i + .5) * (bodyRight - bodyLeft) / legs.length;
    const hipY = bodyBottom + 6;
    out += part(legs[i], hipX, hipY);
    // Keep the hip seam above the leg art but let the torso overlap its top.
    out += connector('hip-adapter', hipX, hipY, i >= legs.length / 2);
  }
  for (let i = 0; i < arms.length; i++) {
    const { side, rootX, rootY, rotationDeg } = armMount(i, bodyLeft, bodyRight, bodyTop);
    out += part(arms[i], rootX, rootY, side < 0, rotationDeg);
  }

  for (let col = 0; col < columns; col++)
    out += cell(bodyLeft + col * cellStepX, bodyTop, { leftEdge: col === 0, rightEdge: col === columns - 1, topEdge: true, bottomEdge: true, flip: col % 2 === 1, bodyHeight, torso: config.torso ?? 'torso-core' });

  // One visible adapter for each actual attachment. Empty sides stay plain.
  for (let i = 0; i < arms.length; i++) {
    const { side, rootX, rootY } = armMount(i, bodyLeft, bodyRight, bodyTop);
    out += connector('shoulder-adapter', rootX, rootY, side < 0);
  }
  for (let i = 0; i < heads.length; i++) {
    const x = 256 + (i - (heads.length - 1) / 2) * 160;
    const neckY = bodyTop + 8;
    out += connector('neck-adapter', x, neckY);
    out += part(heads[i], x, neckY);
  }
  for (let i = 0; i < legs.length; i++) {
    const hipX = bodyLeft + (i + .5) * (bodyRight - bodyLeft) / legs.length;
    const hipY = bodyBottom + 6;
    const footwearY = hipY + 198;
    out += connector('ankle-adapter', hipX, footwearY);
    out += part('boot-universal', hipX, footwearY);
  }
  for (const handIndex of config.weaponHands ?? []) {
    const { side, rootX, rootY } = armMount(handIndex, bodyLeft, bodyRight, bodyTop);
    const gripX = rootX + (side < 0 ? -154 : 154);
    const gripY = rootY + 206;
    out += part('weapon-bone-club', gripX, gripY, side < 0);
    out += part('grip-hand-adapter', gripX, gripY, side < 0);
  }
  const groundY = bodyBottom + 6 + 228 + 8;
  out += `<path d="M${bodyLeft - 240} ${groundY}H${bodyRight + 240}" stroke="${style.ground}" stroke-width="3"/>`;
  return { contents: out, groundY, width: Math.max(bodyRight - bodyLeft, 616), rows, columns, bodyHeight };
}

const cases = [
  { key: 'baseline-human', label: 'BASELINE / ONE EYE, HUMAN ARMS, FLESH LEGS', heads: ['head-sack'], arms: ['arm-human', 'arm-human'], legs: ['leg-flesh', 'leg-flesh'], weaponHands: [], x: 450, y: 200 },
  { key: 'mixed-unicorn', label: 'MIXED / UNICORN, HUMAN + TALON, INSECT LEGS', heads: ['head-unicorn'], arms: ['arm-human', 'arm-talons'], legs: ['leg-insect', 'leg-insect'], weaponHands: [0], x: 1230, y: 200 },
  { key: 'expanded-count', label: 'EXPANDED / 2 HEADS, 3 ARMS, 4 LEG TYPES', heads: ['head-sack', 'head-unicorn'], arms: ['arm-human', 'arm-talons', 'arm-many-sucker'], legs: ['leg-flesh', 'leg-insect', 'leg-bone', 'leg-insect'], weaponHands: [], x: 450, y: 780 },
  { key: 'single-arm-odd-legs', label: 'ODD COUNT / ONE ARM, THREE LEG ROOTS', heads: ['head-sack'], arms: ['arm-human'], legs: ['leg-flesh', 'leg-insect', 'leg-bone'], weaponHands: [], x: 1230, y: 780 },
  { key: 'rat-bone-serpent', label: 'MIXED PALETTES / RAT, BONE, TEAL SERPENT', heads: ['head-rat', 'head-bone', 'head-serpent'], arms: ['arm-rat', 'arm-bone'], legs: ['leg-rat', 'leg-bone', 'leg-insect'], weaponHands: [], x: 840, y: 1400 },
];

const boardBg = `<rect width="1680" height="1980" fill="${style.paper}"/>`;
let board = boardBg + `<g font-family="Arial,sans-serif" fill="${style.outline}"><text x="42" y="48" font-size="28" font-weight="bold">GROTESQUE CARTOON / ANATOMY FIT STUDY</text><text x="42" y="78" font-size="16" fill="#62585b">One pixel-art treatment; body-part types vary. Every limb root, grip, neck, ankle, and shoe keeps the shared paper-doll frame.</text>`;
for (const c of cases) {
  board += `<rect x="${c.x - 350}" y="${c.y - 75}" width="700" height="550" rx="12" fill="#fffaf1" stroke="#d0c7bc" stroke-width="2"/>`;
  board += `<text x="${c.x}" y="${c.y - 45}" text-anchor="middle" font-size="16" font-weight="bold">${c.label}</text>`;
  const figure = assembled(c);
  board += `<g transform="translate(${c.x - 256 * .52} ${c.y - 256 * .52 + 90}) scale(.52)">${figure.contents}</g>`;
  board += `<text x="${c.x}" y="${c.y + 447}" text-anchor="middle" font-size="13" fill="#62585b">${figure.columns} trunk columns / one continuous torso tier / ${c.arms.length} shoulder adapter${c.arms.length === 1 ? '' : 's'} / one shared shoe shape</text>`;
}
board += `<text x="42" y="1940" font-size="13" fill="#62585b">Review shoulder roots, leg sockets, equipment placement, sole alignment, and overall silhouette. Source landmarks and proportions remain provisional.</text></g>`;
await put(join(root, 'assembly-board.svg'), assemblySvg(1680, 1980, board));

for (const c of cases) {
  const figure = assembled(c);
  const scene = `<rect width="1000" height="1000" fill="${style.paper}"/><text x="500" y="44" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="22" fill="${style.outline}">${c.label}</text><g transform="translate(${500 - 256 * .76} 100) scale(.76)">${figure.contents}</g>`;
  await put(join(assemblyDir, `${c.key}.svg`), assemblySvg(1000, 1000, scene, '../components/component-library.svg'));
}

const boardCards = [];
const ids = Object.keys(art);
const cardW = 360, cardH = 255, cols = 4;
for (let i = 0; i < ids.length; i++) {
  const id = ids[i], col = i % cols, row = Math.floor(i / cols), x = col * cardW, y = 110 + row * cardH;
  const href = `assets/${art[id].file}`;
  boardCards.push(`<rect x="${x + 9}" y="${y + 8}" width="342" height="238" rx="8" fill="#fffaf1" stroke="#d0c7bc"/>`);
  boardCards.push(`<image href="${href}" x="${x + 42}" y="${y + 15}" width="276" height="188" preserveAspectRatio="xMidYMid meet"/>`);
  boardCards.push(`<text x="${x + 24}" y="${y + 220}" font-family="Arial,sans-serif" font-size="17" font-weight="bold" fill="${style.outline}">${id}</text>`);
  boardCards.push(`<text x="${x + 24}" y="${y + 240}" font-family="Arial,sans-serif" font-size="12" fill="#62585b">${art[id].role}</text>`);
}
const catH = 110 + Math.ceil(ids.length / cols) * cardH;
const catalog = `<rect width="${cols * cardW}" height="${catH}" fill="${style.paper}"/><text x="30" y="48" font-family="Arial,sans-serif" font-size="28" font-weight="bold" fill="${style.outline}">GROTESQUE CARTOON / ${ids.length} SEPARATE ART STUDIES</text><text x="30" y="78" font-family="Arial,sans-serif" font-size="15" fill="#62585b">These shapes are normalized and mounted in the assembled sheet; the collar, hip, ankle, and shoe adapters are reused.</text>${boardCards.join('')}`;
await put(join(root, 'component-board.svg'), svg(cols * cardW, catH, catalog));
await put(join(root, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Grotesque cartoon paper-doll study</title><style>body{font:16px system-ui;background:#f4efe6;color:#251925;margin:32px}a{display:block;margin:12px 0;color:#673b4d}img{max-width:min(100%,1200px);height:auto;border:1px solid #d0c7bc;background:#fffaf1}figure{display:inline-block;vertical-align:top;margin:12px;width:min(45%,480px)}figure img{width:100%}section{margin:30px 0}</style><h1>Grotesque cartoon paper-doll study</h1><p>Style and mix-match review. The components are provisional shape studies registered to shared interfaces.</p><section><h2>All ${ids.length} source studies</h2><a href="component-board.svg">Open component board</a><img src="component-board.svg"></section><section><h2>${cases.length} assembled previews</h2><a href="assembly-board.png">Open assembly board PNG</a><a href="assembly-board.svg">Open vector board</a>${cases.map(c => `<figure><a href="assemblies/${c.key}.png"><img src="assemblies/${c.key}.png" alt="${c.label}"></a><figcaption>${c.label} | <a href="assemblies/${c.key}.svg">SVG</a></figcaption></figure>`).join('')}</section><section><a href="README.md">README</a><a href="geometry.json">Geometry metadata</a></section>`);

const geometry = {
  version: 'grotesque-cartoon-interface-study-01',
  status: 'style-and-mix-match-review; runtime-integrated',
  style: 'original chunky grotesque pixel-art cartoon, inspired by classic indie dungeon body-horror comedy',
  authoringFrame: { sizePx: [512, 512], viewBox: [-128, -128, 256, 256], originPx: [256, 256], pixelsPerUnit: 2, camera: 'front orthographic' },
  sharedAnchors: { arm: { shoulder: [0, 0], elbow: [33, 52], grip: [77, 103] }, head: { neck: [0, 0], headwear: [0, -82] }, leg: { hip: [0, 0], knee: [0, 57], footwear: [0, 99], sole: [0, 114] }, boot: { footwear: [0, 0], sole: [0, 15] } },
  torso: { cellUnits: [64, 80], imageOpaqueFramePx: [128, 180], rows: 1, columns: 'max(2,ceil(headCount*80/64),legCount)', cellStepPx: [88, 180], cellHorizontalOverlapUnits: 20, cellVerticalOverlapUnits: 0, bodyHeightPx: '180 + max(0,ceil(armCount/2)-1)*104', containsLimbSockets: false, extraArmRoots: 'each additional arm pair adds 52 units of continuous torso height; roots remain 62 units above the hem' },
  interfaceArt: {
    'shoulder-adapter': { anchor: 'arm.shoulder', scale: 1, layer: 'over torso and arm root', overlap: 'root-centered flesh cuff; used once per actual arm', mirror: 'mirrors with left arm' },
    'neck-adapter': { anchor: 'head.neck', scale: 0.72, layer: 'between head and torso', overlap: 'collar covers neck root; used once per head' },
    'hip-adapter': { anchor: 'leg.hip', scale: 0.9, layer: 'behind torso hem and in front of leg root', overlap: 'torso tissue covers the upper half of the hip seam; used once per actual leg' },
    'ankle-adapter': { anchor: 'leg.footwear', scale: 0.7, layer: 'between leg and shoe', overlap: 'ankle cuff under common shoe' },
    'boot-universal': { anchor: 'leg.footwear', scale: 1, layer: 'footwear, in front of leg', sole: '15 units below footwear', reuse: 'exact same SVG on every leg variant' },
    'grip-hand-adapter': { anchor: 'arm.grip', scale: 1, layer: 'in front of held equipment', overlap: 'finger ridges cross over the item shaft', reuse: 'shown only for an equipped hand' },
    unusedSockets: 'no adapter without a corresponding part',
  },
  assets: components,
  equipment: { 'weapon-bone-club': { host: 'arm.grip', orientation: 'broad blunt bone head above the wrapped hand grip', silhouette: 'revised pixel-art cutout replaces the source limb-like shape', headAnchor: [0, -64], gripAnchor: [0, 0], gripAnchorPx: [256, 256] }, 'boot-universal': { host: 'leg.footwear', soleOffsetPx: [0, 30], mirror: 'shared exact component, no per-leg resizing' } },
  combinations: cases.map(c => ({ id: c.key, heads: c.heads, arms: c.arms, legs: c.legs, weaponHands: c.weaponHands })),
  limits: ['Generated source landmarks are registered by a uniform rotation/scale and translation. Shared interface coordinates are declared for the study; visible elbow and knee landmarks are recorded from the transformed source and still need visual review.', 'Footwear fit uses one shared shape at every leg footwear anchor; its silhouette remains for review.', 'No animation or arena-size tests are included.'],
};
await put(join(root, 'geometry.json'), JSON.stringify(geometry, null, 2) + '\n');
console.log(`Wrote ${Object.keys(art).length} style studies, ${Object.keys(components).length} registered components, a catalog, and ${cases.length} assemblies.`);
