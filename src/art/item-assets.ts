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
  shoe: 'shoe.png',
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
const base = `${import.meta.env.BASE_URL}grotesque/items/`;
const itemImages = Object.fromEntries(
  Object.entries(itemFiles).map(([name, file]) => {
    const image = new Image();
    image.src = `${base}${file}`;
    return [name, image];
  }),
) as Record<ItemIconName, HTMLImageElement>;

const cleaverImage = new Image();
cleaverImage.src = `${import.meta.env.BASE_URL}grotesque/modular-v2/weapon-cleaver.png`;
const heldImages = { ...itemImages, knife: cleaverImage };
export const itemArtReady = Promise.all(
  [...Object.values(itemImages), cleaverImage].map((image) => image.decode()),
);

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
export function heldItemCorners(name: string): Point[] {
  const profile = attachment(name);
  if (!profile) return [];
  const { grip, angle, scale } = heldTransform(profile);
  return [0, profile.frame.x].flatMap((x) =>
    [0, profile.frame.y].map((y) => ({
      x: scale * ((x - grip.x) * Math.cos(angle) - (y - grip.y) * Math.sin(angle)),
      y: scale * ((x - grip.x) * Math.sin(angle) + (y - grip.y) * Math.cos(angle)),
    })),
  );
}
export function heldHandLayer(name: string) {
  return attachment(name)?.handLayer ?? 'front';
}
export function drawHeldItem(
  c: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  variant = '',
) {
  const profile = attachment(name);
  if (!profile) return false;
  const image = heldImages[name as ItemIconName];
  if (!image?.complete || !image.naturalWidth) return false;
  const { grip, angle, scale } = heldTransform(profile);
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.scale(scale, scale);
  c.imageSmoothingEnabled = false;
  c.filter = filterFor(variant);
  c.drawImage(image, -grip.x, -grip.y, profile.frame.x, profile.frame.y);
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
  const image = itemImages[name as ItemIconName];
  if (!image?.complete || !image.naturalWidth) return false;

  const scale = size / Math.max(image.naturalWidth, image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  c.save();
  c.imageSmoothingEnabled = false;
  c.filter = filterFor(variant);
  c.drawImage(image, x + (size - width) / 2, y + (size - height) / 2, width, height);
  c.restore();
  return true;
}

export function isGrotesqueItemIcon(name: string): name is ItemIconName {
  return name in itemFiles;
}
