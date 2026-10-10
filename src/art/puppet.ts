import type { Build, Part } from '../game/types';
import { ITEM_MAP } from '../game/content';
import type { ArmMotion } from '../game/attack-motion';

export interface Pose {
  time?: number;
  walk?: number;
  moving?: boolean;
  facing?: number;
  windup?: number;
  windupItem?: string;
  activeItems?: string[];
  attacking?: boolean;
  swing?: number;
  itemSwings?: Record<string, number>;
  hurt?: boolean;
  dead?: number;
  enemy?: boolean;
  arms?: Record<string, ArmMotion>;
}
interface Point {
  x: number;
  y: number;
}
interface Frame extends Point {
  w: number;
  h: number;
}
interface Sprite {
  image: HTMLImageElement;
  ready: Promise<void>;
  crop: Frame;
  pivot: Point;
}
export interface Joint {
  index: number;
  root: Point;
  pin: Point;
  angle: number;
  w: number;
  h: number;
  side: number;
}
export interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}
export interface PuppetLayout {
  torso: Frame;
  torsoColumns: number;
  torsoRows: number;
  arms: Joint[];
  legs: Joint[];
  heads: Joint[];
  bounds: Bounds;
}
type GearPainter = (
  c: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  size: number,
  variant?: string,
) => void;

// Coordinates refer to the painted joint buttons, not the centre of each PNG's transparent canvas.
const imageDataUrls = new Map<string, Promise<string>>();
async function imageDataUrl(url: string) {
  let pending = imageDataUrls.get(url);
  if (!pending) {
    pending = (async () => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Could not load puppet image ${url}: ${response.status}`);
      const type = response.headers.get('content-type')?.split(';')[0] || 'image/png';
      const bytes = new Uint8Array(await response.arrayBuffer());
      let binary = '';
      const chunkSize = 0x8000;
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
      }
      return `data:${type};base64,${btoa(binary)}`;
    })();
    imageDataUrls.set(url, pending);
  }
  return pending;
}
async function selfContainedSvg(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load puppet component ${url}: ${response.status}`);
  const markup = await response.text();
  if (!/<image\b/i.test(markup)) return markup;
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
  if (doc.querySelector('parsererror')) throw new Error(`Invalid puppet component SVG: ${url}`);
  for (const node of Array.from(doc.getElementsByTagName('image'))) {
    const href = node.getAttribute('href') || node.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
    if (!href || /^(?:data:|blob:|https?:)/i.test(href)) continue;
    node.setAttribute('href', await imageDataUrl(new URL(href, url).href));
    node.removeAttributeNS('http://www.w3.org/1999/xlink', 'href');
  }
  return new XMLSerializer().serializeToString(doc);
}
function sprite(src: string, crop: Frame, pin: Point): Sprite {
  const image = new Image();
  const url = new URL(src, document.baseURI).href;
  const ready = (async () => {
    const markup = await selfContainedSvg(url);
    const blobUrl = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
    try {
      image.src = blobUrl;
      await image.decode();
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  })();
  return { image, ready, crop, pivot: { x: (pin.x - crop.x) / crop.w, y: (pin.y - crop.y) / crop.h } };
}
const art = {
  torso: sprite(`${import.meta.env.BASE_URL}grotesque/components/torso-core.svg`, { x: 192, y: 166, w: 128, h: 180 }, { x: 256, y: 256 }),
  tab: sprite(`${import.meta.env.BASE_URL}grotesque/components/shoulder-adapter.svg`, { x: 0, y: 0, w: 512, h: 512 }, { x: 256, y: 256 }),
  head: sprite(`${import.meta.env.BASE_URL}grotesque/components/head-sack.svg`, { x: 0, y: 0, w: 512, h: 512 }, { x: 256, y: 256 }),
  arm: sprite(`${import.meta.env.BASE_URL}grotesque/components/arm-human.svg`, { x: 0, y: 0, w: 512, h: 512 }, { x: 256, y: 256 }),
  leg: sprite(`${import.meta.env.BASE_URL}grotesque/components/leg-flesh.svg`, { x: 0, y: 0, w: 512, h: 512 }, { x: 256, y: 256 }),
};
const variants = {
  headUnicorn: sprite(`${import.meta.env.BASE_URL}grotesque/components/head-unicorn.svg`, { x: 0, y: 0, w: 512, h: 512 }, { x: 256, y: 256 }),
  headRat: sprite(`${import.meta.env.BASE_URL}grotesque/components/head-rat.svg`, { x: 0, y: 0, w: 512, h: 512 }, { x: 256, y: 256 }),
  headBone: sprite(`${import.meta.env.BASE_URL}grotesque/components/head-bone.svg`, { x: 0, y: 0, w: 512, h: 512 }, { x: 256, y: 256 }),
  headSerpent: sprite(`${import.meta.env.BASE_URL}grotesque/components/head-serpent.svg`, { x: 0, y: 0, w: 512, h: 512 }, { x: 256, y: 256 }),
  armTalons: sprite(`${import.meta.env.BASE_URL}grotesque/components/arm-talons.svg`, { x: 0, y: 0, w: 512, h: 512 }, { x: 256, y: 256 }),
  armSucker: sprite(`${import.meta.env.BASE_URL}grotesque/components/arm-many-sucker.svg`, { x: 0, y: 0, w: 512, h: 512 }, { x: 256, y: 256 }),
  armRat: sprite(`${import.meta.env.BASE_URL}grotesque/components/arm-rat.svg`, { x: 0, y: 0, w: 512, h: 512 }, { x: 256, y: 256 }),
  armBone: sprite(`${import.meta.env.BASE_URL}grotesque/components/arm-bone.svg`, { x: 0, y: 0, w: 512, h: 512 }, { x: 256, y: 256 }),
  legRat: sprite(`${import.meta.env.BASE_URL}grotesque/components/leg-rat.svg`, { x: 0, y: 0, w: 512, h: 512 }, { x: 256, y: 256 }),
  legInsect: sprite(`${import.meta.env.BASE_URL}grotesque/components/leg-insect.svg`, { x: 0, y: 0, w: 512, h: 512 }, { x: 256, y: 256 }),
  legBone: sprite(`${import.meta.env.BASE_URL}grotesque/components/leg-bone.svg`, { x: 0, y: 0, w: 512, h: 512 }, { x: 256, y: 256 }),
};
const interfaces = {
  neck: sprite(`${import.meta.env.BASE_URL}grotesque/components/neck-adapter.svg`, { x: 0, y: 0, w: 512, h: 512 }, { x: 256, y: 256 }),
  hip: sprite(`${import.meta.env.BASE_URL}grotesque/components/hip-adapter.svg`, { x: 0, y: 0, w: 512, h: 512 }, { x: 256, y: 256 }),
  ankle: sprite(`${import.meta.env.BASE_URL}grotesque/components/ankle-adapter.svg`, { x: 0, y: 0, w: 512, h: 512 }, { x: 256, y: 256 }),
  boot: sprite(`${import.meta.env.BASE_URL}grotesque/components/boot-universal.svg`, { x: 0, y: 0, w: 512, h: 512 }, { x: 256, y: 256 }),
  grip: sprite(`${import.meta.env.BASE_URL}grotesque/components/grip-hand-adapter.svg`, { x: 0, y: 0, w: 512, h: 512 }, { x: 256, y: 256 }),
};
function partArt(slot: Part['slot'], variant: Part['variant']): Sprite {
  if (slot === 'chest') return art.torso;
  if (slot === 'head') return variant === 'rat' ? variants.headRat : variant === 'bone' ? variants.headBone : variant === 'serpent' ? variants.headSerpent : art.head;
  if (slot === 'hand') return variant === 'rat' ? variants.armRat : variant === 'bone' ? variants.armBone : variant === 'ganglion' ? variants.armSucker : variant === 'necrotic' ? variants.armTalons : art.arm;
  if (slot === 'foot') return variant === 'rat' ? variants.legRat : variant === 'bone' || variant === 'necrotic' ? variants.legBone : variant === 'serpent' || variant === 'ganglion' ? variants.legInsect : art.leg;
  return art.torso;
}
const silhouettes = new WeakMap<Sprite, Uint8ClampedArray>();
let silhouette: Uint8ClampedArray | undefined;
let revision = 0;
export const puppetReady = Promise.all(
  [
    ...Object.values(art),
    ...Object.values(variants),
    ...Object.values(interfaces),
  ].map((s) => s.ready),
)
  .then(() => {
    const detailParts = [art.head, art.arm, art.leg, variants.headUnicorn, variants.headRat, variants.headBone, variants.headSerpent, variants.armTalons, variants.armSucker, variants.armRat, variants.armBone, variants.legRat, variants.legInsect, variants.legBone];
    for (const s of [art.tab, ...detailParts, ...Object.values(interfaces)]) {
      const c = document.createElement('canvas');
      c.width = c.height = 512;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(s.image, 0, 0, 512, 512);
      const data = ctx.getImageData(0, 0, 512, 512).data;
      let left = 512, top = 512, right = -1, bottom = -1;
      for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
        if (data[(y * 512 + x) * 4 + 3] < 32) continue;
        left = Math.min(left, x); top = Math.min(top, y);
        right = Math.max(right, x); bottom = Math.max(bottom, y);
      }
      if (right >= left && bottom >= top) {
        const anchor = { x: s.crop.x + s.pivot.x * s.crop.w, y: s.crop.y + s.pivot.y * s.crop.h };
        s.crop = { x: left, y: top, w: right - left + 1, h: bottom - top + 1 };
        s.pivot = { x: (anchor.x - left) / s.crop.w, y: (anchor.y - top) / s.crop.h };
      }
    }
    for (const sprite of [art.torso]) {
      const f = sprite.crop,
        c = document.createElement('canvas');
      c.width = f.w;
      c.height = f.h;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(sprite.image, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
      const data = ctx.getImageData(0, 0, f.w, f.h).data;
      let hasVisiblePixel = false;
      for (let alpha = 3; alpha < data.length; alpha += 4) {
        if (data[alpha] >= 96) {
          hasVisiblePixel = true;
          break;
        }
      }
      if (!hasVisiblePixel) throw new Error('Torso component decoded without visible pixels');
      silhouettes.set(sprite, data);
    }
    silhouette = silhouettes.get(art.torso);
    revision++;
  })
  .catch((error) => {
    console.error('Could not load puppet art', error);
  });

// Follow the actual fabric silhouette when positioning a seam. Scaling the torso moves the seam and pin together.
function edge(sprite: Sprite, axis: 'x' | 'y', t: number, end: boolean): number {
  const f = sprite.crop,
    silhouette = silhouettes.get(sprite);
  if (!silhouette) return axis === 'x' ? (end ? 0.86 : 0.14) : end ? 0.98 : 0.08;
  const fixed = Math.round(Math.max(0, Math.min(1, t)) * (axis === 'x' ? f.h - 1 : f.w - 1));
  const length = axis === 'x' ? f.w : f.h;
  for (let n = 0; n < length; n++) {
    const p = end ? length - 1 - n : n,
      x = axis === 'x' ? p : fixed,
      y = axis === 'y' ? p : fixed;
    if (silhouette[(y * f.w + x) * 4 + 3] >= 96) return p / length;
  }
  return 0.5;
}
function parts(build: Build, slot: Part['slot']) {
  return build.parts.filter((p) => p.slot === slot);
}
const layouts = new WeakMap<Build, { key: string; layout: PuppetLayout }>();
export function puppetLayout(build: Build): PuppetLayout {
  const handParts = parts(build, 'hand'),
    headParts = parts(build, 'head'),
    footParts = parts(build, 'foot');
  const hands = handParts.length,
    heads = headParts.length,
    feet = footParts.length;
  const chest = parts(build, 'chest')[0];
  const bodyArt = partArt('chest', chest?.variant ?? 'living');
  const rat = parts(build, 'chest').some((p) => p.variant === 'rat');
  const key = `${revision}/${build.parts.map((p) => `${p.slot}:${p.variant}`).join(',')}`;
  const cached = layouts.get(build);
  if (cached?.key === key) return cached.layout;
  const rows = Math.max(1, Math.ceil(hands / 2));
  const columns = Math.max(2, Math.ceil(heads * 1.25), feet);
  const cellWidth = 128 / 3,
    cellHeight = 60,
    cellStepX = 88 / 3,
    cellStepY = 100 / 3;
  const headW = heads === 1 ? 42 : heads === 2 ? 38 : heads === 3 ? 36 : 34,
    headGap = headW * 0.78;
  const width = Math.max(cellWidth + (columns - 1) * cellStepX, rat ? 70 : 52, (Math.max(0, heads - 1) * headGap) / 0.66);
  const height = cellHeight + (rows - 1) * cellStepY;
  const torso: Frame = {
    x: -width / 2,
    y: (feet ? (rat ? -25 : -35) : -2) - height,
    w: width,
    h: height,
  };
  const arms: Joint[] = Array.from({ length: hands }, (_, i) => {
    const side = i % 2 === 0 ? -1 : 1,
      tier = Math.floor(i / 2);
    const v = Math.min(0.82, (19 + tier * cellStepY) / cellHeight);
    const root = {
      x: torso.x + edge(bodyArt, 'x', v, side === 1) * width,
      y: torso.y + 19 + tier * cellStepY,
    };
    const p = handParts[i],
      s = partArt('hand', p.variant),
      h = s.crop.h * 0.25;
    return {
      index: i,
      side,
      root,
      pin: { ...root },
      angle: 0,
      h,
      w: (h * s.crop.w) / s.crop.h,
    };
  });
  const legs: Joint[] = Array.from({ length: feet }, (_, i) => {
    const spread = Math.max(10, Math.min(28, (width * 0.68) / Math.max(1, feet - 1)));
    const x = rat
      ? (i < 2 ? -1 : 1) * (i % 2 === 0 ? width * 0.29 : width * 0.39)
      : (i - (feet - 1) / 2) * spread;
    const root = { x, y: torso.y + height - 1 };
    const pin = { ...root };
    const s = partArt('foot', footParts[i].variant),
      h = -pin.y / (1 - s.pivot.y);
    return { index: i, side: 0, root, pin, angle: 0, h, w: (h * s.crop.w) / s.crop.h };
  });
  const necks: Joint[] = Array.from({ length: heads }, (_, i) => {
    const s = partArt('head', headParts[i].variant);
    const x = (i - (heads - 1) / 2) * headGap;
    const root = { x, y: torso.y + 4 };
    const pin = { ...root };
    return { index: i, side: 0, root, pin, angle: 0, w: headW, h: (headW * s.crop.h) / s.crop.w };
  });
  let left = torso.x,
    right = torso.x + width,
    top = torso.y,
    bottom = feet ? 1 : torso.y + height;
  function include(s: Sprite, j: Joint, angle: number) {
    for (const u of [0, 1])
      for (const v of [0, 1]) {
        const dx = (u - s.pivot.x) * j.w,
          dy = (v - s.pivot.y) * j.h;
        const x = j.pin.x + dx * Math.cos(angle) - dy * Math.sin(angle),
          y = j.pin.y + dx * Math.sin(angle) + dy * Math.cos(angle);
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
  }
  for (const j of arms)
    for (const a of [j.angle, j.angle - 0.9, j.angle + 0.9, -1.85, 1.85, 0])
      include(partArt('hand', handParts[j.index].variant), j, a);
  for (const j of legs)
    for (const a of [-0.1, 0, 0.1]) include(partArt('foot', footParts[j.index].variant), j, a);
  for (const j of necks) include(partArt('head', headParts[j.index].variant), j, 0);
  const bounds = {
    left: left - 7,
    right: right + 7,
    top: top - 7,
    bottom: bottom + 7,
    width: right - left + 14,
    height: bottom - top + 14,
  };
  const layout = { torso, torsoColumns: columns, torsoRows: rows, arms, legs, heads: necks, bounds };
  layouts.set(build, { key, layout });
  return layout;
}
export function puppetBounds(build: Build) {
  return puppetLayout(build).bounds;
}
export function fitPuppet(build: Build, box: Frame, maxScale = Infinity) {
  const b = puppetBounds(build),
    scale = Math.min(maxScale, box.w / b.width, box.h / b.height);
  return {
    scale,
    x: box.x + box.w / 2 - ((b.left + b.right) * scale) / 2,
    y: box.y + box.h / 2 - ((b.top + b.bottom) * scale) / 2,
  };
}
function materialFilter(variant: Part['variant'], enemy = false) {
  if (variant === 'rat' || variant === 'bone') return 'none';
  if (variant === 'necrotic')
    return 'grayscale(1) sepia(.7) saturate(1.8) hue-rotate(345deg) brightness(1.24)';
  if (variant === 'clockwork') return 'grayscale(1) sepia(.28) brightness(1.42) contrast(1.08)';
  if (variant === 'serpent') return 'hue-rotate(27deg) saturate(1.25) brightness(.95)';
  if (variant === 'ganglion') return 'hue-rotate(275deg) saturate(1.35) brightness(1.04)';
  return enemy ? 'sepia(.52) saturate(.82) brightness(.91)' : 'none';
}
function trunkFilter(variant: Part['variant'], enemy = false) {
  if (variant === 'rat') return 'sepia(.78) saturate(1.35) hue-rotate(350deg) brightness(.88) contrast(1.04)';
  if (variant === 'bone') return 'grayscale(.2) sepia(.72) saturate(.65) brightness(1.16)';
  if (variant === 'serpent') return 'hue-rotate(155deg) saturate(1.1) brightness(.9)';
  return materialFilter(variant, enemy);
}
function drawAt(
  c: CanvasRenderingContext2D,
  s: Sprite,
  j: Joint,
  angle = 0,
  variant: Part['variant'] = 'living',
  enemy = false,
  flipX = false,
) {
  const f = s.crop;
  c.save();
  c.translate(j.pin.x, j.pin.y);
  c.rotate(angle);
  if (flipX) c.scale(-1, 1);
  c.filter = materialFilter(variant, enemy);
  c.drawImage(s.image, f.x, f.y, f.w, f.h, -s.pivot.x * j.w, -s.pivot.y * j.h, j.w, j.h);
  c.restore();
}
function componentAt(
  c: CanvasRenderingContext2D,
  s: Sprite,
  pin: Point,
  frameScale: number,
  angle = 0,
  flipX = false,
) {
  drawAt(c, s, { index: -1, root: pin, pin, angle, side: flipX ? -1 : 1, w: s.crop.w * frameScale, h: s.crop.h * frameScale }, angle, 'living', false, flipX);
}
function smooth(t: number) {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
}
export function armAngle(j: Joint, p: Part, pose: Pose) {
  const motion = p.item && pose.arms?.[p.item.uid];
  if (motion) {
    const ready = j.angle + motion.facing * 0.9;
    const prepared = j.angle + motion.facing * 0.9 * motion.drawback;
    const contact = -motion.facing * 1.6;
    if (motion.strike !== undefined) return ready + (contact - ready) * smooth(motion.strike);
    if (motion.recovery !== undefined)
      return contact + (prepared - contact) * smooth(motion.recovery);
    return prepared;
  }
  let angle = j.angle;
  if (p.item && pose.windupItem === p.item.uid) angle -= j.side * (pose.windup ?? 0) * 0.75;
  const activated =
    p.item && (pose.activeItems?.includes(p.item.uid) || (pose.attacking && !pose.activeItems));
  if (activated) {
    const t =
      p.item && pose.itemSwings?.[p.item.uid] !== undefined
        ? pose.itemSwings[p.item.uid]
        : 1 - (pose.swing ?? 0.55);
    const strike = -(pose.facing ?? 1) * 1.6,
      start = j.angle - j.side * 0.5;
    angle =
      t < 0.45
        ? start + (strike - start) * smooth(t / 0.45)
        : strike + (j.angle - strike) * smooth((t - 0.45) / 0.55);
  }
  return angle;
}
function sourcePoint(s: Sprite, j: Joint, point: Point): Point {
  return {
    x: ((point.x - s.crop.x) / s.crop.w - s.pivot.x) * j.w,
    y: ((point.y - s.crop.y) / s.crop.h - s.pivot.y) * j.h,
  };
}
function drawTrunk(c: CanvasRenderingContext2D, layout: PuppetLayout, variant: Part['variant'], enemy: boolean) {
  const s = partArt('chest', variant),
    scale = 1 / 3,
    cellX = 88 / 3,
    cellY = 100 / 3;
  c.save();
  c.filter = trunkFilter(variant, enemy);
  c.imageSmoothingEnabled = false;
  for (let row = 0; row < layout.torsoRows; row++) {
    const cropTop = row === 0 ? 0 : 40,
      cropBottom = row === layout.torsoRows - 1 ? 0 : 40,
      sourceHeight = 180 - cropTop - cropBottom;
    for (let col = 0; col < layout.torsoColumns; col++) {
      const cropLeft = col === 0 ? 0 : 20,
        cropRight = col === layout.torsoColumns - 1 ? 0 : 20,
        sourceWidth = 128 - cropLeft - cropRight,
        dx = layout.torso.x + col * cellX + cropLeft * scale,
        dy = layout.torso.y + row * cellY + cropTop * scale;
      c.drawImage(
        s.image,
        s.crop.x + cropLeft,
        s.crop.y + cropTop,
        sourceWidth,
        sourceHeight,
        dx,
        dy,
        sourceWidth * scale,
        sourceHeight * scale,
      );
    }
  }
  c.restore();
}
export function drawPuppet(
  c: CanvasRenderingContext2D,
  build: Build,
  x: number,
  y: number,
  scale: number,
  pose: Pose,
  gear: GearPainter,
) {
  if (
    !silhouette ||
    ![...Object.values(art), ...Object.values(variants), ...Object.values(interfaces)].every(
      (s) => s.image.complete && s.image.naturalWidth,
    )
  )
    return false;
  const layout = puppetLayout(build),
    hands = parts(build, 'hand'),
    feet = parts(build, 'foot'),
    heads = parts(build, 'head');
  const chest = build.parts.find((p) => p.slot === 'chest'),
    heartParts = parts(build, 'heart');
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  c.imageSmoothingEnabled = false;
  c.fillStyle = '#0c0c11';
  c.beginPath();
  c.ellipse(0, 1, Math.max(20, layout.torso.w * 0.4), 4, 0, 0, Math.PI * 2);
  c.fill();
  if (pose.dead !== undefined) {
    c.globalAlpha *= 0.65;
    c.scale(1, Math.max(0.2, 1 - Math.min(1, pose.dead / 0.38)));
  }
  const bob = pose.moving
    ? Math.sin((pose.walk ?? 0) * 0.22) * 1.1
    : Math.sin((pose.time ?? 0) * 2) * 0.4;
  c.translate(pose.hurt ? -1 : 0, -bob);

  // Limbs sit behind the fixed-scale trunk modules. Hip adapters overlap their roots;
  // the trunk cells cover the upper half of each seam.
  for (const j of layout.legs) {
    const p = feet[j.index],
      s = partArt('foot', p.variant);
    const angle = pose.moving ? Math.sin((pose.walk ?? 0) * 0.22 + j.index * Math.PI) * 0.075 : 0;
    drawAt(c, s, j, angle, p.variant, !!pose.enemy);
    componentAt(c, interfaces.hip, j.root, 0.25);
  }
  for (const j of layout.arms) {
    const p = hands[j.index],
      s = partArt('hand', p.variant),
      angle = armAngle(j, p, pose);
    drawAt(c, s, j, angle, p.variant, !!pose.enemy, j.side === -1);
  }
  drawTrunk(c, layout, chest?.variant ?? 'living', !!pose.enemy);

  // Each actual socket receives its own adapter. Empty edges remain plain tissue.
  for (const j of layout.arms) {
    const p = hands[j.index];
    const angle = armAngle(j, p, pose);
    componentAt(c, art.tab, j.root, 0.25, angle, j.side === -1);
  }

  for (const j of layout.legs) {
    const p = feet[j.index],
      s = partArt('foot', p.variant),
      angle = pose.moving ? Math.sin((pose.walk ?? 0) * 0.22 + j.index * Math.PI) * 0.075 : 0,
      mount = sourcePoint(s, j, { x: 256, y: 446 });
    componentAt(c, interfaces.ankle, { x: j.pin.x + mount.x, y: j.pin.y + mount.y }, 0.2, angle);
    if (p.item) {
      c.save();
      c.translate(j.pin.x, j.pin.y);
      c.rotate(angle);
      const size = 18;
      gear(c, ITEM_MAP[p.item.defId].icon, mount.x - size / 2, mount.y - size / 2, size, p.item.defId);
      c.restore();
    }
  }

  for (const j of layout.heads) componentAt(c, interfaces.neck, j.root, 0.25);
  const chestItem = build.parts.find((p) => p.slot === 'chest' && p.item);
  if (chestItem?.item)
    gear(c, ITEM_MAP[chestItem.item.defId].icon, -15, layout.torso.y + 14, 30, chestItem.item.defId);
  for (let i = 0; i < Math.min(heartParts.length, 6); i++) {
    const heart = heartParts[i],
      size = 12,
      xPos = (i - (Math.min(heartParts.length, 6) - 1) / 2) * 10 - size / 2,
      yPos = layout.torso.y + layout.torso.h * 0.65 - size / 2;
    gear(c, 'heart', xPos, yPos, size, heart.variant);
  }
  for (const j of layout.heads) {
    const p = heads[j.index],
      s = partArt('head', p.variant);
    drawAt(c, s, j, 0, p.variant, !!pose.enemy);
    if (p.item) {
      const crown = sourcePoint(
          s,
          j,
          { x: 256, y: 174 },
        ),
        size = j.w * 0.53;
      gear(
        c,
        ITEM_MAP[p.item.defId].icon,
        j.pin.x + crown.x - size * 0.5,
        j.pin.y + crown.y - size * 0.5,
        size,
        p.item.defId,
      );
    }
  }

  // Equipment is in front of the paper doll. The hand overlay crosses each handle
  // after the item is drawn so the creature visibly holds what it is carrying.
  for (const j of layout.arms) {
    const p = hands[j.index];
    if (!p.item) continue;
    const s = partArt('hand', p.variant),
      angle = armAngle(j, p, pose),
      sourceGrip = { x: 410, y: 462 },
      localGrip = sourcePoint(s, j, sourceGrip),
      grip = localGrip,
      def = ITEM_MAP[p.item.defId],
      size = def.id === 'enormous' ? 36 : def.icon === 'club' ? 28 : 24,
      flipX = j.side === -1;
    c.save();
    c.translate(j.pin.x, j.pin.y);
    c.rotate(angle);
    if (flipX) c.scale(-1, 1);
    gear(c, def.icon, grip.x - size / 2, grip.y - size * (def.icon === 'shield' ? 0.5 : 0.94), size, def.id);
    componentAt(c, interfaces.grip, grip, 0.25);
    c.restore();
  }

  if (pose.hurt) {
    c.globalAlpha *= 0.18;
    c.fillStyle = '#fff0c4';
    c.fillRect(layout.bounds.left, layout.bounds.top, layout.bounds.width, layout.bounds.height);
  }
  c.restore();
  return true;
}

