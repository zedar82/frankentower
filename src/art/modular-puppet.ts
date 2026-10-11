import type { Build, Part } from '../game/types';
import { ITEM_MAP } from '../game/content';
import type { Joint, Pose, PuppetLayout } from './puppet';

type Point = { x: number; y: number };
type Contract = { width: number; height: number; root: Point; end?: Point; crown?: Point };
type GearPainter = (
  c: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  size: number,
  variant?: string,
) => void;
const base = `${import.meta.env.BASE_URL}grotesque/modular-v2/`;
const images = new Map<string, HTMLImageElement>();
let geometry: Record<string, Contract> = {};
let ready = false;
const names = [
  'head-rat',
  'head-lizard',
  'arm-flesh',
  'arm-fur',
  'leg-bone',
  'leg-lizard',
  'leg-flesh',
  'weapon-cleaver',
  'gear-crown',
  'head-flesh',
  'head-bone',
  'head-clockwork',
  'head-ganglion',
  'arm-bone',
  'arm-clockwork',
  'arm-lizard',
  'arm-ganglion',
  'leg-fur',
  'leg-clockwork',
  'leg-ganglion',
];
for (const material of ['flesh', 'fur', 'bone', 'metal', 'scales']) {
  names.push(
    ...[
      'fill',
      'top',
      'bottom',
      'shoulder',
      'hip',
      'socket-neck',
      'socket-arm',
      'socket-leg',
      'side',
    ].map((role) => `${role}-${material}`),
  );
  for (const n of [0, 1, 2])
    for (const direction of ['in', 'out']) names.push(`taper-${n}-${direction}-${material}`);
}
export const modularReady = Promise.all([
  fetch(`${base}geometry.json`)
    .then((r) => {
      if (!r.ok) throw new Error('Missing modular geometry');
      return r.json();
    })
    .then((value) => {
      geometry = value;
    }),
  ...names.map((name) => {
    const image = new Image();
    images.set(name, image);
    image.src = `${base}${name}.png`;
    return image.decode();
  }),
]).then(() => {
  ready = true;
});

const select = (build: Build, slot: Part['slot']) => build.parts.filter((p) => p.slot === slot);
const partAssets: Record<'head' | 'hand' | 'foot', Record<Part['variant'], string>> = {
  head: {
    living: 'head-flesh',
    rat: 'head-rat',
    serpent: 'head-lizard',
    bone: 'head-bone',
    clockwork: 'head-clockwork',
    ganglion: 'head-ganglion',
    necrotic: 'head-flesh',
  },
  hand: {
    living: 'arm-flesh',
    rat: 'arm-fur',
    serpent: 'arm-lizard',
    bone: 'arm-bone',
    clockwork: 'arm-clockwork',
    ganglion: 'arm-ganglion',
    necrotic: 'arm-bone',
  },
  foot: {
    living: 'leg-flesh',
    rat: 'leg-fur',
    serpent: 'leg-lizard',
    bone: 'leg-bone',
    clockwork: 'leg-clockwork',
    ganglion: 'leg-ganglion',
    necrotic: 'leg-bone',
  },
};
const asset = (part: Part) => partAssets[part.slot as 'head' | 'hand' | 'foot'][part.variant];
const torsoMaterials: Record<Part['variant'], string> = {
  living: 'flesh',
  rat: 'fur',
  serpent: 'scales',
  bone: 'bone',
  clockwork: 'metal',
  ganglion: 'flesh',
  necrotic: 'flesh',
};
const chestVariant = (build: Build) => select(build, 'chest')[0]?.variant ?? 'living';
const materialFor = (build: Build) => torsoMaterials[chestVariant(build)];
const materialFilter = (variant: Part['variant'], torso = false) =>
  variant === 'necrotic'
    ? 'grayscale(.7) sepia(.6) hue-rotate(45deg) saturate(.7)'
    : torso && variant === 'ganglion'
      ? 'hue-rotate(275deg) saturate(.8)'
      : 'none';
const up = (n: number) => Math.ceil(n / 16) * 16;
export function modularSpans(build: Build) {
  const upperRequired = up(Math.max(80, select(build, 'head').length * 56 + 12));
  const lowerRequired = up(Math.max(80, select(build, 'foot').length * 28 + 20));
  // Surplus width at the narrower end is intentional: cap the total taper at 32.
  return {
    upper: Math.max(upperRequired, lowerRequired - 32),
    lower: Math.max(lowerRequired, upperRequired - 32),
  };
}
function widthAt(upper: number, lower: number, height: number, y: number) {
  const start = upper > lower ? height - 16 - 48 : 16;
  const t = Math.max(0, Math.min(1, (y - start) / 48));
  return upper + (lower - upper) * t * t * (3 - 2 * t);
}
export function modularLayout(build: Build): PuppetLayout {
  const hands = select(build, 'hand'),
    heads = select(build, 'head'),
    feet = select(build, 'foot');
  const { upper, lower } = modularSpans(build),
    height = 88 + Math.max(0, Math.ceil(hands.length / 2) - 1) * 68;
  const torso = {
    x: -Math.max(upper, lower) / 2,
    y: -(feet.length ? 55 : 0) - height,
    w: Math.max(upper, lower),
    h: height,
  };
  const joint = (part: Part, index: number, pin: Point, side: number): Joint => {
    const contract = geometry[asset(part)];
    return {
      index,
      side,
      pin,
      root: pin,
      angle: 0,
      w: contract?.width ?? (part.slot === 'head' ? 64 : part.slot === 'hand' ? 96 : 32),
      h: contract?.height ?? (part.slot === 'hand' ? 112 : part.slot === 'foot' ? 72 : 64),
    };
  };
  const arms = hands.map((p, i) => {
    const side = i % 2 ? 1 : -1,
      y = 18 + Math.floor(i / 2) * 68;
    return joint(
      p,
      i,
      { x: side * (widthAt(upper, lower, height, y) / 2 - 5), y: torso.y + y },
      side,
    );
  });
  const necks = heads.map((p, i) =>
    joint(p, i, { x: (i - (heads.length - 1) / 2) * 56, y: torso.y + 5 }, 0),
  );
  const legs = feet.map((p, i) =>
    joint(p, i, { x: (i - (feet.length - 1) / 2) * 28, y: torso.y + height }, 0),
  );
  // Include real sprite corners throughout the supported attack rotation and held gear.
  let left = torso.x,
    right = -torso.x,
    top = torso.y - (heads.length ? 78 : 8),
    bottom = 4;
  for (const j of arms)
    for (const angle of [-1.85, -1.2, -0.6, 0, 0.6, 1.2, 1.85]) {
      const g = geometry[asset(hands[j.index])] ?? {
        root: { x: 24, y: 20 },
        end: { x: 64, y: 78 },
      };
      for (const x of [-24, 72])
        for (const y of [-20, 94]) {
          const px = j.pin.x + j.side * (x * Math.cos(angle) - y * Math.sin(angle));
          const py = j.pin.y + j.side * x * Math.sin(angle) + y * Math.cos(angle);
          left = Math.min(left, px);
          right = Math.max(right, px);
          top = Math.min(top, py);
          bottom = Math.max(bottom, py);
        }
      if (hands[j.index].item) {
        const grip = g.end ?? { x: 64, y: 78 };
        for (const x of [grip.x - g.root.x - 25, grip.x - g.root.x + 25])
          for (const y of [grip.y - g.root.y - 68, grip.y - g.root.y + 14]) {
            const px = j.pin.x + j.side * (x * Math.cos(angle) - y * Math.sin(angle));
            const py = j.pin.y + j.side * x * Math.sin(angle) + y * Math.cos(angle);
            left = Math.min(left, px);
            right = Math.max(right, px);
            top = Math.min(top, py);
            bottom = Math.max(bottom, py);
          }
      }
    }
  const bounds = {
    left: left - 4,
    right: right + 4,
    top: top - 4,
    bottom: bottom + 4,
    width: right - left + 8,
    height: bottom - top + 8,
  };
  return { torso, arms, legs, heads: necks, bounds };
}
function sprite(
  c: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  flipX = false,
  flipY = false,
) {
  const image = images.get(name)!;
  c.save();
  c.translate(Math.round(x), Math.round(y));
  c.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  c.drawImage(image, 0, 0);
  c.restore();
}
function limb(c: CanvasRenderingContext2D, part: Part, j: Joint, angle: number, cropGrip = false) {
  const name = asset(part),
    image = images.get(name)!,
    g = geometry[name];
  c.save();
  c.translate(j.pin.x, j.pin.y);
  c.filter = materialFilter(part.variant);
  c.rotate(angle);
  if (j.side === -1) c.scale(-1, 1);
  if (cropGrip) {
    const end = g.end!;
    c.beginPath();
    c.rect(end.x - g.root.x - 10, end.y - g.root.y - 9, 20, 20);
    c.clip();
  }
  c.drawImage(image, -g.root.x, -g.root.y);
  c.restore();
}
function trunk(c: CanvasRenderingContext2D, build: Build, layout: PuppetLayout) {
  const material = materialFor(build),
    { upper, lower } = modularSpans(build),
    h = layout.torso.h,
    y = layout.torso.y;
  const start = upper > lower ? h - 64 : 16;
  // One continuous texture field, bounded by the same fixed transition geometry.
  const path = new Path2D();
  path.moveTo(-upper / 2 + 16, 2);
  path.lineTo(upper / 2 - 16, 2);
  path.quadraticCurveTo(upper / 2 - 2, 2, upper / 2 - 2, 16);
  path.lineTo(upper / 2 - 2, start);
  path.bezierCurveTo(
    upper / 2 - 2,
    start + 16,
    lower / 2 - 2,
    start + 32,
    lower / 2 - 2,
    start + 48,
  );
  path.lineTo(lower / 2 - 2, h - 16);
  path.quadraticCurveTo(lower / 2 - 2, h - 2, lower / 2 - 16, h - 2);
  path.lineTo(-lower / 2 + 16, h - 2);
  path.quadraticCurveTo(-lower / 2 + 2, h - 2, -lower / 2 + 2, h - 16);
  path.lineTo(-lower / 2 + 2, start + 48);
  path.bezierCurveTo(-lower / 2 + 2, start + 32, -upper / 2 + 2, start + 16, -upper / 2 + 2, start);
  path.lineTo(-upper / 2 + 2, 16);
  path.quadraticCurveTo(-upper / 2 + 2, 2, -upper / 2 + 16, 2);
  path.closePath();
  c.save();
  c.translate(0, y);
  c.filter = materialFilter(chestVariant(build), true);
  c.save();
  c.clip(path);
  c.fillStyle = c.createPattern(images.get(`fill-${material}`)!, 'repeat')!;
  c.fillRect(-layout.torso.w / 2, 0, layout.torso.w, h);
  c.restore();
  // Closed top/bottom sections, corners and fixed one/two-step side transitions.
  for (let x = -upper / 2 + 16; x < upper / 2 - 16; x += 24) {
    c.save();
    c.beginPath();
    c.rect(-upper / 2 + 16, 0, upper - 32, 12);
    c.clip();
    sprite(c, `top-${material}`, x, 0);
    c.restore();
  }
  for (let x = -lower / 2 + 16; x < lower / 2 - 16; x += 24) {
    c.save();
    c.beginPath();
    c.rect(-lower / 2 + 16, h - 12, lower - 32, 12);
    c.clip();
    sprite(c, `bottom-${material}`, x, h - 12);
    c.restore();
  }
  sprite(c, `shoulder-${material}`, -upper / 2, 0);
  sprite(c, `shoulder-${material}`, upper / 2, 0, true);
  sprite(c, `hip-${material}`, -lower / 2, h, false, true);
  sprite(c, `hip-${material}`, lower / 2, h, true, true);
  const steps = Math.min(2, Math.abs(upper - lower) / 16),
    direction = upper >= lower ? 'in' : 'out';
  const transition = `taper-${steps}-${direction}-${material}`,
    w = 20 + steps * 8;
  for (const side of [-1, 1]) {
    // Mirrored images start at the outer edge, so their origins differ by width.
    const segment = (name: string, width: number, sy: number, fw: number) =>
      sprite(c, name, side === 1 ? width / 2 - fw : -width / 2 + fw, sy, side === -1);
    for (let sy = 16; sy < start; sy += 24) {
      c.save();
      c.beginPath();
      c.rect(-layout.torso.w / 2, 16, layout.torso.w, start - 16);
      c.clip();
      segment(`side-${material}`, upper, sy, 20);
      c.restore();
    }
    const initial = direction === 'in' ? upper : upper + steps * 16;
    segment(transition, initial, start, w);
    for (let sy = start + 48; sy < h - 16; sy += 24) {
      c.save();
      c.beginPath();
      c.rect(-layout.torso.w / 2, start + 48, layout.torso.w, h - 16 - start - 48);
      c.clip();
      segment(`side-${material}`, lower, sy, 20);
      c.restore();
    }
  }
  c.restore();
}
export function drawModularPuppet(
  c: CanvasRenderingContext2D,
  build: Build,
  x: number,
  y: number,
  scale: number,
  pose: Pose,
  gear: GearPainter,
  angleFor: (j: Joint, p: Part, pose: Pose) => number,
) {
  if (!ready) return false;
  const layout = modularLayout(build),
    hands = select(build, 'hand'),
    feet = select(build, 'foot'),
    heads = select(build, 'head'),
    material = materialFor(build);
  c.save();
  c.translate(Math.round(x), Math.round(y));
  c.scale(scale, scale);
  c.imageSmoothingEnabled = false;
  c.fillStyle = '#0c0c11';
  c.beginPath();
  c.ellipse(0, 1, layout.torso.w * 0.4, 4, 0, 0, Math.PI * 2);
  c.fill();
  if (pose.dead !== undefined) {
    c.globalAlpha = 0.65;
    c.scale(1, Math.max(0.2, 1 - pose.dead / 0.38));
  }
  const bob = pose.moving ? Math.round(Math.sin((pose.walk ?? 0) * 0.22)) : 0;
  c.translate(pose.hurt ? -1 : 0, -bob);
  const legAngle = (j: Joint) =>
    pose.moving ? Math.sin((pose.walk ?? 0) * 0.22 + j.index * Math.PI) * 0.075 : 0;
  for (const j of layout.legs) limb(c, feet[j.index], j, legAngle(j));
  for (const j of layout.arms) limb(c, hands[j.index], j, angleFor(j, hands[j.index], pose));
  trunk(c, build, layout);
  c.save();
  c.filter = materialFilter(chestVariant(build), true);
  for (const j of layout.arms) sprite(c, `socket-arm-${material}`, j.pin.x - 11, j.pin.y - 12);
  for (const j of layout.legs) sprite(c, `socket-leg-${material}`, j.pin.x - 10, j.pin.y - 6);
  for (const j of layout.heads) sprite(c, `socket-neck-${material}`, j.pin.x - 10, j.pin.y - 6);
  c.restore();
  for (const j of layout.heads) limb(c, heads[j.index], j, 0);
  for (const j of layout.heads) {
    const p = heads[j.index];
    if (!p.item) continue;
    const g = geometry[asset(p)],
      crown = g.crown!,
      mount = geometry['gear-crown'].root;
    sprite(
      c,
      'gear-crown',
      j.pin.x + crown.x - g.root.x - mount.x,
      j.pin.y + crown.y - g.root.y - mount.y,
    );
  }
  for (const j of layout.legs) {
    const p = feet[j.index];
    if (!p.item) continue;
    const g = geometry[asset(p)],
      end = g.end!;
    c.save();
    c.translate(j.pin.x, j.pin.y);
    c.rotate(legAngle(j));
    gear(
      c,
      ITEM_MAP[p.item.defId].icon,
      end.x - g.root.x - 12,
      end.y - g.root.y - 20,
      24,
      p.item.defId,
    );
    c.restore();
  }
  for (const j of layout.arms) {
    const p = hands[j.index];
    if (!p.item) continue;
    const g = geometry[asset(p)],
      end = g.end!,
      def = ITEM_MAP[p.item.defId],
      angle = angleFor(j, p, pose);
    c.save();
    c.translate(j.pin.x, j.pin.y);
    c.rotate(angle);
    if (j.side === -1) c.scale(-1, 1);
    const gx = end.x - g.root.x,
      gy = end.y - g.root.y;
    if (def.icon === 'knife') {
      const mount = geometry['weapon-cleaver'].root;
      sprite(c, 'weapon-cleaver', gx - mount.x, gy - mount.y);
    } else {
      const size = def.icon === 'shield' ? 44 : 64;
      gear(
        c,
        def.icon,
        gx - size / 2,
        gy - size * (def.icon === 'shield' ? 0.5 : 0.88),
        size,
        p.item.defId,
      );
    }
    c.restore();
    limb(c, p, j, angle, true);
  }
  c.restore();
  return true;
}
