import type { Build, Part } from '../game/types';
import { ITEM_MAP } from '../game/content';
import type { Joint, Pose, PuppetLayout } from './puppet';
import {
  drawCrownItem,
  drawWornItem,
  drawFootwearItem,
  footwearArtReady,
  drawHeldItem,
  heldHandLayer,
  heldItemCorners,
} from './item-assets';
import { imageAssetReady, loadJsonAsset, requestImageAsset } from './asset-loader';

type Point = { x: number; y: number };
type Contract = {
  width: number;
  height: number;
  rasterScale: number;
  root: Point;
  end?: Point;
  crown?: Point;
  ankle?: Point;
};
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
let geometryRevision = 0;
const layoutCache = new WeakMap<Build, { key: string; layout: PuppetLayout }>();
const trunkPathCache = new Map<string, Path2D>();
const trunkPatternCache = new WeakMap<
  CanvasRenderingContext2D,
  Map<string, { image: HTMLImageElement; rasterScale: number; pattern: CanvasPattern }>
>();
const names = [
  'head-rat',
  'head-lizard',
  'arm-flesh',
  'arm-fur',
  'leg-bone',
  'leg-lizard',
  'leg-flesh',
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
    ...['fill', 'top', 'bottom', 'shoulder', 'hip', 'side'].map((role) => `${role}-${material}`),
  );
  for (const n of [0, 1, 2])
    for (const direction of ['in', 'out']) names.push(`taper-${n}-${direction}-${material}`);
}
function validateGeometry(value: unknown): asserts value is Record<string, Contract> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid modular geometry: expected an asset catalogue.');
  const entries = value as Record<string, unknown>;
  for (const name of names) {
    const entry = entries[name] as Contract | undefined;
    if (!entry) throw new Error(`Invalid modular geometry: missing ${name}.`);
    for (const key of ['width', 'height', 'rasterScale'] as const)
      if (!Number.isFinite(entry[key]) || entry[key] <= 0)
        throw new Error(`Invalid modular geometry: ${name}.${key} must be positive and finite.`);
    const point = (value: Point | undefined, role: string) => {
      if (
        !value ||
        !Number.isFinite(value.x) ||
        !Number.isFinite(value.y) ||
        value.x < 0 ||
        value.y < 0 ||
        value.x > entry.width ||
        value.y > entry.height
      )
        throw new Error(`Invalid modular geometry: ${name} has an invalid ${role} landmark.`);
    };
    point(entry.root, 'root');
    if (name.startsWith('head-')) point(entry.crown, 'crown');
    if (name.startsWith('arm-')) point(entry.end, 'grip');
    if (name.startsWith('leg-')) {
      point(entry.end, 'sole');
      point(entry.ankle, 'ankle');
    }
  }
}
const geometryReady = loadJsonAsset(
  `${base}geometry.json`,
  'modular geometry',
  validateGeometry,
).then((value) => {
  geometry = value;
  geometryRevision++;
});
function imageFor(name: string) {
  let image = images.get(name);
  if (!image) {
    const url = `${base}${name}.png`;
    image = requestImageAsset(url, `modular/${name}`);
    images.set(name, image);
  }
  return image;
}
export function prepareAllModularArt() {
  return Promise.all(
    names.map((name) => {
      imageFor(name);
      return imageAssetReady(`${base}${name}.png`);
    }),
  ).then(() => undefined);
}
export const modularReady = geometryReady.then(() => {
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
function trunkPath(upper: number, lower: number, height: number) {
  const key = `${upper}:${lower}:${height}`;
  const cached = trunkPathCache.get(key);
  if (cached) {
    trunkPathCache.delete(key);
    trunkPathCache.set(key, cached);
    return cached;
  }
  const start = upper > lower ? height - 64 : 16;
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
  path.lineTo(lower / 2 - 2, height - 16);
  path.quadraticCurveTo(lower / 2 - 2, height - 2, lower / 2 - 16, height - 2);
  path.lineTo(-lower / 2 + 16, height - 2);
  path.quadraticCurveTo(-lower / 2 + 2, height - 2, -lower / 2 + 2, height - 16);
  path.lineTo(-lower / 2 + 2, start + 48);
  path.bezierCurveTo(-lower / 2 + 2, start + 32, -upper / 2 + 2, start + 16, -upper / 2 + 2, start);
  path.lineTo(-upper / 2 + 2, 16);
  path.quadraticCurveTo(-upper / 2 + 2, 2, -upper / 2 + 16, 2);
  path.closePath();
  trunkPathCache.set(key, path);
  if (trunkPathCache.size > 64) trunkPathCache.delete(trunkPathCache.keys().next().value!);
  return path;
}
function trunkPattern(
  context: CanvasRenderingContext2D,
  name: string,
  image: HTMLImageElement,
  rasterScale: number,
) {
  let cache = trunkPatternCache.get(context);
  if (!cache) {
    cache = new Map();
    trunkPatternCache.set(context, cache);
  }
  const existing = cache.get(name);
  if (existing?.image === image && existing.rasterScale === rasterScale) return existing.pattern;
  const pattern = context.createPattern(image, 'repeat');
  if (!pattern) return null;
  pattern.setTransform(new DOMMatrix().scale(1 / rasterScale));
  cache.set(name, { image, rasterScale, pattern });
  return pattern;
}
export function modularLayout(build: Build, resting = false): PuppetLayout {
  // Builds are edited in place, so identity alone is not a safe cache key.
  // The signature contains every field used by the layout and attachment bounds.
  const key = `${geometryRevision}|${resting ? 1 : 0}|${build.parts
    .map((part) => {
      const icon = part.item ? (ITEM_MAP[part.item.defId]?.icon ?? '') : '';
      return `${part.slot}:${part.variant}:${icon}`;
    })
    .join('|')}`;
  const cached = layoutCache.get(build);
  if (cached?.key === key) return cached.layout;
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
  const heartCount = select(build, 'heart').length;
  const heartSpacing = heartCount > 1 ? Math.min(32, torso.w / (heartCount - 1)) : 0;
  const organs = Array.from({ length: heartCount }, (_, index) => ({
    x: (index - (heartCount - 1) / 2) * heartSpacing,
    y: height * 0.44,
  }));
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
  // Combat reserves the full swing; a stationary display only needs its resting pose.
  let left = torso.x,
    right = -torso.x,
    top = torso.y - (heads.length ? 78 : 8),
    bottom = 4;
  for (const j of arms)
    for (const angle of resting ? [0] : [-1.85, -1.2, -0.6, 0, 0.6, 1.2, 1.85]) {
      const g = geometry[asset(hands[j.index])] ?? {
        root: { x: 24, y: 20 },
        end: { x: 64, y: 78 },
      };
      for (const x of [-24, 72])
        for (const y of [-20, 94]) {
          const px = j.pin.x + j.side * x * Math.cos(angle) - y * Math.sin(angle);
          const py = j.pin.y + j.side * x * Math.sin(angle) + y * Math.cos(angle);
          left = Math.min(left, px);
          right = Math.max(right, px);
          top = Math.min(top, py);
          bottom = Math.max(bottom, py);
        }
      if (hands[j.index].item) {
        const grip = g.end ?? { x: 64, y: 78 };
        const heldItem = hands[j.index].item!;
        const corners = heldItemCorners(ITEM_MAP[heldItem.defId].icon, heldItem.defId);
        for (const point of corners) {
          const x = grip.x - g.root.x + point.x,
            y = grip.y - g.root.y + point.y;
          const px = j.pin.x + j.side * x * Math.cos(angle) - y * Math.sin(angle);
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
  const layout = { torso, organs, arms, legs, heads: necks, bounds };
  layoutCache.set(build, { key, layout });
  return layout;
}
function sprite(
  c: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  flipX = false,
  flipY = false,
) {
  const image = imageFor(name),
    frame = geometry[name];
  if (!frame) return false;
  c.save();
  c.translate(Math.round(x), Math.round(y));
  c.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  if (image?.complete && image.naturalWidth) c.drawImage(image, 0, 0, frame.width, frame.height);
  else {
    c.fillStyle = '#51434a';
    c.fillRect(0, 0, frame.width, frame.height);
    c.fillStyle = '#79656a';
    c.fillRect(3, 3, Math.max(1, frame.width - 6), Math.max(1, frame.height - 6));
  }
  c.restore();
  return true;
}
function limb(
  c: CanvasRenderingContext2D,
  part: Part,
  j: Joint,
  angle: number,
  cropGrip = false,
  coverFoot = false,
) {
  const name = asset(part),
    image = imageFor(name),
    g = geometry[name];
  if (!g) return;
  c.save();
  c.translate(j.pin.x, j.pin.y);
  c.filter = materialFilter(part.variant);
  c.rotate(angle);
  if (j.side === -1) c.scale(-1, 1);
  if (coverFoot && g.ankle) {
    // Equipped footwear replaces the hidden foot below the authored ankle plane.
    // The visible leg and shoe retain the same root, sole and walking rotation.
    c.beginPath();
    c.rect(-g.root.x, -g.root.y, g.width, g.ankle.y);
    c.clip();
  }
  if (cropGrip) {
    const end = g.end!;
    c.beginPath();
    c.rect(end.x - g.root.x - 10, end.y - g.root.y - 9, 20, 20);
    c.clip();
  }
  if (image?.complete && image.naturalWidth)
    c.drawImage(image, -g.root.x, -g.root.y, g.width, g.height);
  else {
    const material =
      part.variant === 'bone' || part.variant === 'necrotic'
        ? '#a89978'
        : part.variant === 'clockwork'
          ? '#9a8a68'
          : part.variant === 'serpent'
            ? '#78916d'
            : part.variant === 'rat'
              ? '#8a634a'
              : '#c97f75';
    c.fillStyle = '#493940';
    c.fillRect(-g.root.x, -g.root.y, g.width, g.height);
    c.fillStyle = material;
    c.fillRect(-g.root.x + 3, -g.root.y + 3, Math.max(1, g.width - 6), Math.max(1, g.height - 6));
  }
  c.restore();
}
function trunk(c: CanvasRenderingContext2D, build: Build, layout: PuppetLayout) {
  const material = materialFor(build),
    { upper, lower } = modularSpans(build),
    h = layout.torso.h,
    y = layout.torso.y;
  const start = upper > lower ? h - 64 : 16;
  // Reuse the continuous outline until one of its layout dimensions changes.
  const path = trunkPath(upper, lower, h);
  c.save();
  c.translate(0, y);
  c.filter = materialFilter(chestVariant(build), true);
  c.save();
  c.clip(path);
  const fill = `fill-${material}`;
  const patternImage = imageFor(fill);
  if (!patternImage.complete || !patternImage.naturalWidth) {
    c.fillStyle = material === 'fur' ? '#694b3c' : material === 'bone' ? '#8d826b' : '#7b4e4c';
    c.fillRect(-layout.torso.w / 2, 0, layout.torso.w, h);
  } else {
    const pattern = trunkPattern(c, fill, patternImage, geometry[fill].rasterScale);
    if (pattern) {
      c.fillStyle = pattern;
      c.fillRect(-layout.torso.w / 2, 0, layout.torso.w, h);
    } else {
      c.fillStyle = material === 'fur' ? '#694b3c' : material === 'bone' ? '#8d826b' : '#7b4e4c';
      c.fillRect(-layout.torso.w / 2, 0, layout.torso.w, h);
    }
  }
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
function wornItems(c: CanvasRenderingContext2D, build: Build, layout: PuppetLayout) {
  const torso = layout.torso;
  const body = { x: -torso.w / 2, y: 0, w: torso.w, h: torso.h };
  const { upper, lower } = modularSpans(build);
  c.save();
  c.translate(0, torso.y);
  c.clip(trunkPath(upper, lower, torso.h));
  for (const [index, part] of select(build, 'heart').entries())
    if (part.item && layout.organs[index])
      drawWornItem(c, part.item.defId, body, layout.organs[index]);
  const chest = select(build, 'chest')[0];
  if (chest?.item) drawWornItem(c, chest.item.defId, body);
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
    heads = select(build, 'head');
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
  for (const j of layout.legs) {
    const p = feet[j.index];
    const covered = !!p.item && footwearArtReady(p.item.defId);
    limb(c, p, j, legAngle(j), false, covered);
  }
  trunk(c, build, layout);
  wornItems(c, build, layout);
  for (const j of layout.heads) limb(c, heads[j.index], j, 0);
  for (const j of layout.heads) {
    const p = heads[j.index];
    if (!p.item) continue;
    const g = geometry[asset(p)],
      crown = g.crown!,
      envelope = geometry['gear-crown'],
      mount = envelope.root,
      x = j.pin.x + crown.x - g.root.x - mount.x,
      y = j.pin.y + crown.y - g.root.y - mount.y;
    if (!drawCrownItem(c, p.item.defId, x, y, envelope)) sprite(c, 'gear-crown', x, y);
  }
  for (const j of layout.legs) {
    const p = feet[j.index];
    if (!p.item) continue;
    const g = geometry[asset(p)],
      end = g.end!;
    c.save();
    c.translate(j.pin.x, j.pin.y);
    c.rotate(legAngle(j));
    if (!drawFootwearItem(c, p.item.defId, end.x - g.root.x, end.y - g.root.y))
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
    const angle = angleFor(j, p, pose);
    // Arm and equipment share the foreground pass, so a strike across the torso
    // keeps the actual limb visible instead of leaving a floating weapon.
    limb(c, p, j, angle);
    if (!p.item) continue;
    const g = geometry[asset(p)],
      end = g.end!,
      def = ITEM_MAP[p.item.defId];
    c.save();
    c.translate(j.pin.x, j.pin.y);
    c.rotate(angle);
    if (j.side === -1) c.scale(-1, 1);
    const gx = end.x - g.root.x,
      gy = end.y - g.root.y;
    drawHeldItem(c, def.icon, gx, gy, p.item.defId);
    c.restore();
    if (heldHandLayer(def.icon, p.item.defId) === 'front') limb(c, p, j, angle, true);
  }
  c.restore();
  return true;
}
