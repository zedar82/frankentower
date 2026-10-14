import { ITEM_MAP } from '../game/content';

const itemFiles = {
  dagger: 'dagger.png',
  club: 'club.png',
  knife: 'knife.png',
  shield: 'shield.png',
  wand: 'wand.png',
  bow: 'bow.png',
  helmet: 'helmet.png',
  hood: 'hood.png',
  armour: 'armour.png',
  shoe: 'running-shoe-front-v2.png',
  heart: 'heart.png',
  dice: 'dice.png',
} as const;

type ItemIconName = keyof typeof itemFiles;
type Point = { x: number; y: number };
type HeldAttachment = {
  frame: Point;
  grip: Point;
  axis: Point;
  size: number;
  handLayer: 'front' | 'behind';
};
// Source-normalized handle/shaft landmarks, independent of inventory icon centring.
// Shields mount behind their front face; handles sit beneath the host fingers.
const heldAttachments = {
  dagger: {
    frame: { x: 192, y: 256 },
    grip: { x: 0.5, y: 0.735 },
    axis: { x: 0.5, y: 0.57 },
    size: 60,
    handLayer: 'front',
  },
  club: {
    frame: { x: 171, y: 256 },
    grip: { x: 0.68, y: 0.7 },
    axis: { x: 0.63, y: 0.54 },
    size: 84,
    handLayer: 'front',
  },
  knife: {
    frame: { x: 30, y: 70 },
    grip: { x: 0.64765, y: 0.81333 },
    axis: { x: 0.64765, y: 0.5 },
    size: 70,
    handLayer: 'front',
  },
  wand: {
    frame: { x: 256, y: 256 },
    grip: { x: 0.59, y: 0.64 },
    axis: { x: 0.53, y: 0.53 },
    size: 76,
    handLayer: 'front',
  },
  bow: {
    frame: { x: 256, y: 256 },
    grip: { x: 0.7, y: 0.71 },
    axis: { x: 0.52, y: 0.53 },
    size: 72,
    handLayer: 'front',
  },
  shield: {
    frame: { x: 256, y: 256 },
    grip: { x: 0.5, y: 0.52 },
    axis: { x: 0.5, y: 0.25 },
    size: 52,
    handLayer: 'behind',
  },
  dice: {
    frame: { x: 256, y: 256 },
    grip: { x: 0.5, y: 0.78 },
    axis: { x: 0.5, y: 0.4 },
    size: 28,
    handLayer: 'front',
  },
} satisfies Partial<Record<ItemIconName, HeldAttachment>>;
type HeldIcon = keyof typeof heldAttachments;
const attachment = (name: string): HeldAttachment | undefined => heldAttachments[name as HeldIcon];
type HeldProfile = { icon: ItemIconName; attachment: HeldAttachment };
// Resolve held geometry from the content ID once. Bounds and drawing then use
// the same icon profile, including when a content item has its own image.
const heldByItemId = new Map<string, HeldProfile>();
for (const item of Object.values(ITEM_MAP)) {
  if (item.slot !== 'hand') continue;
  const profile = attachment(item.icon);
  if (!profile) throw new Error(`Missing held presentation profile for ${item.id} (${item.icon}).`);
  heldByItemId.set(item.id, {
    icon: item.icon as ItemIconName,
    attachment: profile,
  });
}
const base = `${import.meta.env.BASE_URL}grotesque/items/`;
// Inventory pictures use the same accepted silhouettes as the assembled creature.
const modularBase = `${import.meta.env.BASE_URL}grotesque/modular-v2/`;
const presentationFiles: Record<string, string> = {
  knife: 'weapon-cleaver.png',
  helmet: 'gear-crown.png',
  hood: 'gear-crown.png',
};
const itemImages = Object.fromEntries(
  Object.entries(itemFiles).map(([name, file]) => {
    const image = new Image();
    image.src = presentationFiles[name]
      ? `${modularBase}${presentationFiles[name]}`
      : `${base}${file}`;
    return [name, image];
  }),
) as Record<ItemIconName, HTMLImageElement>;

const cleaverImage = itemImages.knife;
const heldImages = { ...itemImages, knife: cleaverImage };
type PresentationVariant = {
  file: string;
  crop?: [number, number, number, number];
  // Source-pixel point aligned to the skull's crown line; front material overlaps it.
  crownSeat?: Point;
  // Bottom-centre of the visible sole, in original source pixels.
  soleSeat?: Point;
};
const footwearFronts = {
  runner: {
    file: 'running-shoe-front-v2.png',
    crop: [55, 39, 913, 985],
    soleSeat: { x: 512, y: 1015 },
  },
  leather: {
    file: 'leather-boot-front-v2.png',
    crop: [107, 155, 809, 805],
    soleSeat: { x: 512, y: 960 },
  },
  iron: {
    file: 'iron-boot-front-v2.png',
    crop: [132, 123, 761, 821],
    soleSeat: { x: 512, y: 944 },
  },
} satisfies Record<string, PresentationVariant>;
const presentationVariants: Record<string, PresentationVariant> = {
  // Shared front archetypes until these items receive individual illustrations.
  // Future footwear with icon 'shoe' inherits the runner attachment by default.
  runners: footwearFronts.runner,
  bloodboots: footwearFronts.leather,
  venomboots: footwearFronts.leather,
  ironboots: footwearFronts.iron,
  spurs: footwearFronts.leather,
  bloodrunner: footwearFronts.leather,
  plague: footwearFronts.leather,
  rabbit: footwearFronts.runner,
  octoboot: footwearFronts.leather,
  dance: footwearFronts.runner,
  plate: { file: 'iron-breastplate-v2.png' },
  spikes: { file: 'spiked-cuirass-v2.png' },
  shield: { file: 'wooden-shield-v1.png', crop: [56, 60, 912, 904] },
  horns: {
    file: 'horned-crown-front-v2.png',
    crop: [29, 306, 965, 370],
    crownSeat: { x: 512, y: 512 },
  },
  bandage: {
    file: 'bandaged-headband-front-v2.png',
    crop: [23, 343, 978, 338],
    crownSeat: { x: 512, y: 512 },
  },
};
const variantImages = Object.fromEntries(
  Object.entries(presentationVariants).map(([id, profile]) => {
    const image = new Image();
    image.src = `${base}${profile.file}`;
    return [id, image];
  }),
) as Record<string, HTMLImageElement>;
// Optional item art resolves independently. Draw helpers already use the
// pixel fallback for a missing image, so one bad file must not block others.
export const itemArtReady = Promise.allSettled(
  [...Object.values(itemImages), ...Object.values(variantImages)].map((image) => image.decode()),
).then(() => undefined);

function sourceRect(image: HTMLImageElement, variant: string): [number, number, number, number] {
  return presentationVariants[variant]?.crop ?? [0, 0, image.naturalWidth, image.naturalHeight];
}
type ResolvedHeldPresentation = HeldProfile & {
  image: HTMLImageElement;
  source: [number, number, number, number];
};
function heldPresentation(name: string, itemId = ''): ResolvedHeldPresentation | undefined {
  const profile = heldByItemId.get(itemId) ?? (() => {
    const fallback = attachment(name);
    return fallback ? { icon: name as ItemIconName, attachment: fallback } : undefined;
  })();
  if (!profile) return undefined;
  const image = variantImages[itemId] ?? heldImages[profile.icon];
  return { ...profile, image, source: sourceRect(image, itemId) };
}

// A front-only shoe replaces the hidden bare foot, instead of centring an icon
// on top of its toes. Uniform scaling fits the 28px leg pitch without collisions.
function footwearArt(variant: string) {
  const profile = presentationVariants[variant]?.soleSeat
    ? presentationVariants[variant]
    : footwearFronts.runner;
  const image = profile === footwearFronts.runner ? variantImages.runners : variantImages[variant];
  return { profile, image };
}
export function footwearArtReady(variant: string) {
  const { image } = footwearArt(variant);
  return !!image?.complete && !!image.naturalWidth;
}
export function drawFootwearItem(
  c: CanvasRenderingContext2D,
  variant: string,
  soleX: number,
  soleY: number,
) {
  const { profile, image } = footwearArt(variant);
  if (!footwearArtReady(variant)) return false;
  const [sx, sy, sw, sh] = profile.crop!;
  const seat = profile.soleSeat!;
  const scale = Math.min(26 / sw, 30 / sh);
  c.save();
  c.imageSmoothingEnabled = false;
  c.filter = filterFor(variant);
  c.drawImage(
    image,
    sx,
    sy,
    sw,
    sh,
    soleX - (seat.x - sx) * scale,
    soleY - (seat.y - sy) * scale,
    sw * scale,
    sh * scale,
  );
  c.restore();
  return true;
}

// Fit to the common envelope, then register the band's seating point to the head mount.
export function drawCrownItem(
  c: CanvasRenderingContext2D,
  variant: string,
  x: number,
  y: number,
  envelope: { width: number; height: number; root: Point },
) {
  const image = variantImages[variant];
  const seat = presentationVariants[variant]?.crownSeat;
  if (!seat || !image?.complete || !image.naturalWidth) return false;
  const [sx, sy, sw, sh] = sourceRect(image, variant);
  const scale = Math.min(envelope.width / sw, envelope.height / sh);
  const width = sw * scale,
    height = sh * scale;
  c.save();
  c.imageSmoothingEnabled = false;
  c.drawImage(
    image,
    sx,
    sy,
    sw,
    sh,
    x + envelope.root.x - (seat.x - sx) * scale,
    y + envelope.root.y - (seat.y - sy) * scale,
    width,
    height,
  );
  c.restore();
  return true;
}

function heldTransform(profile: HeldAttachment) {
  const grip = { x: profile.grip.x * profile.frame.x, y: profile.grip.y * profile.frame.y };
  const angle =
    -Math.PI / 2 -
    Math.atan2(
      profile.axis.y * profile.frame.y - grip.y,
      profile.axis.x * profile.frame.x - grip.x,
    );
  return { grip, angle, scale: profile.size / Math.max(profile.frame.x, profile.frame.y) };
}
export function heldItemCorners(name: string, itemId = ''): Point[] {
  const presentation = heldPresentation(name, itemId);
  if (!presentation) return [];
  const profile = presentation.attachment;
  const { grip, angle, scale } = heldTransform(profile);
  return [0, profile.frame.x].flatMap((x) =>
    [0, profile.frame.y].map((y) => ({
      x: scale * ((x - grip.x) * Math.cos(angle) - (y - grip.y) * Math.sin(angle)),
      y: scale * ((x - grip.x) * Math.sin(angle) + (y - grip.y) * Math.cos(angle)),
    })),
  );
}
export function heldHandLayer(name: string, itemId = '') {
  return heldPresentation(name, itemId)?.attachment.handLayer ?? 'front';
}
export function drawHeldItem(
  c: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  variant = '',
) {
  const presentation = heldPresentation(name, variant);
  if (!presentation) return false;
  const { attachment: profile, image, source } = presentation;
  if (!image?.complete || !image.naturalWidth) return false;
  const { grip, angle, scale } = heldTransform(profile);
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.scale(scale, scale);
  c.imageSmoothingEnabled = false;
  c.filter = filterFor(variant);
  c.drawImage(
    image,
    ...source,
    -grip.x,
    -grip.y,
    profile.frame.x,
    profile.frame.y,
  );
  c.restore();
  return true;
}

const variantFilters: [string, string][] = [
  ['blood', 'hue-rotate(338deg) saturate(1.18)'],
  ['vamp', 'hue-rotate(338deg) saturate(1.18)'],
  ['warheart', 'hue-rotate(338deg) saturate(1.25)'],
  ['artery', 'hue-rotate(338deg) saturate(1.2)'],
  ['donor', 'hue-rotate(338deg) saturate(1.15)'],
  ['necro', 'grayscale(.35) sepia(.5) hue-rotate(275deg) saturate(1.1)'],
  ['plague', 'hue-rotate(65deg) saturate(1.15)'],
  ['venom', 'hue-rotate(65deg) saturate(1.15)'],
  ['storm', 'hue-rotate(205deg) saturate(1.2)'],
  ['wizard', 'hue-rotate(205deg) saturate(1.2)'],
  ['ouroboros', 'hue-rotate(145deg) saturate(1.15)'],
  ['pump', 'grayscale(.2) sepia(.5) saturate(1.4)'],
  ['saint', 'sepia(.5) saturate(1.3)'],
  ['apocalypse', 'sepia(.6) saturate(1.4)'],
  ['clockwork', 'grayscale(.2) sepia(.3) saturate(1.3)'],
];

function filterFor(variant: string) {
  const match = variantFilters.find(([key]) => variant.toLowerCase().includes(key));
  return match?.[1] ?? 'none';
}

export function drawGrotesqueItem(
  c: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  size: number,
  variant = '',
) {
  const image = variantImages[variant] ?? itemImages[name as ItemIconName];
  if (!image?.complete || !image.naturalWidth) return false;

  const source = sourceRect(image, variant);
  const scale = size / Math.max(source[2], source[3]);
  const width = source[2] * scale;
  const height = source[3] * scale;
  c.save();
  c.imageSmoothingEnabled = false;
  c.filter = filterFor(variant);
  c.drawImage(image, ...source, x + (size - width) / 2, y + (size - height) / 2, width, height);
  c.restore();
  return true;
}

export function isGrotesqueItemIcon(name: string): name is ItemIconName {
  return name in itemFiles;
}
