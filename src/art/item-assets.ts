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
const base = `${import.meta.env.BASE_URL}grotesque/items/`;
const itemImages = Object.fromEntries(
  Object.entries(itemFiles).map(([name, file]) => {
    const image = new Image();
    image.src = `${base}${file}`;
    return [name, image];
  }),
) as Record<ItemIconName, HTMLImageElement>;

export const itemArtReady = Promise.all(
  Object.values(itemImages).map((image) => image.decode()),
);

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
