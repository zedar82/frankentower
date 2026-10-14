import { ITEM_MAP } from '../game/content';

export interface Point {
  x: number;
  y: number;
}
export type AssetRef = {
  area: 'items' | 'modular';
  file: string;
  crop?: readonly [number, number, number, number];
};
export interface HeldGeometry {
  frame: Point;
  grip: Point;
  axis: Point;
  size: number;
  handLayer: 'front' | 'behind';
}
export interface WornGeometry {
  anchor: 'torso' | 'heart';
  width: number;
  height: number;
  center: Point;
}
export type ItemPresentation =
  | ({
      kind: 'held';
      id: string;
      icon: string;
      asset: AssetRef;
      geometry: HeldGeometry;
      filter: string;
    } & {
      attachment: 'grip';
    })
  | ({
      kind: 'crown';
      id: string;
      icon: string;
      asset: AssetRef;
      seat?: Point;
      fallback: string;
      filter: string;
      frontOnly: true;
    } & { attachment: 'head-crown' })
  | ({
      kind: 'footwear';
      id: string;
      icon: string;
      asset: AssetRef;
      soleSeat: Point;
      envelope: { width: number; height: number };
      filter: string;
      frontOnly: true;
      replacesFootBelowAnkle: true;
    } & { attachment: 'leg-sole' })
  | ({
      kind: 'torso';
      id: string;
      icon: string;
      asset: AssetRef;
      worn: WornGeometry & { anchor: 'torso' };
      filter: string;
    } & { attachment: 'chest' })
  | ({
      kind: 'organ';
      id: string;
      icon: string;
      asset: AssetRef;
      worn: WornGeometry & { anchor: 'heart' };
      filter: string;
    } & { attachment: 'heart' });

export const ITEM_ICON_ASSETS: Record<string, AssetRef> = {
  dagger: { area: 'items', file: 'dagger.png' },
  club: { area: 'items', file: 'club.png' },
  knife: { area: 'modular', file: 'weapon-cleaver.png' },
  shield: { area: 'items', file: 'shield.png' },
  wand: { area: 'items', file: 'wand.png' },
  bow: { area: 'items', file: 'bow.png' },
  helmet: { area: 'modular', file: 'gear-crown.png' },
  hood: { area: 'modular', file: 'gear-crown.png' },
  armour: { area: 'items', file: 'armour.png' },
  shoe: { area: 'items', file: 'running-shoe-front-v2.png' },
  heart: { area: 'items', file: 'heart.png' },
  dice: { area: 'items', file: 'dice.png' },
};

const heldGeometry: Record<string, HeldGeometry> = {
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
};

const footwear: Record<string, { asset: AssetRef; soleSeat: Point }> = {
  runners: {
    asset: { area: 'items', file: 'running-shoe-front-v2.png', crop: [55, 39, 913, 985] },
    soleSeat: { x: 512, y: 1015 },
  },
  bloodboots: {
    asset: { area: 'items', file: 'leather-boot-front-v2.png', crop: [107, 155, 809, 805] },
    soleSeat: { x: 512, y: 960 },
  },
  venomboots: {
    asset: { area: 'items', file: 'leather-boot-front-v2.png', crop: [107, 155, 809, 805] },
    soleSeat: { x: 512, y: 960 },
  },
  ironboots: {
    asset: { area: 'items', file: 'iron-boot-front-v2.png', crop: [132, 123, 761, 821] },
    soleSeat: { x: 512, y: 944 },
  },
  spurs: {
    asset: { area: 'items', file: 'leather-boot-front-v2.png', crop: [107, 155, 809, 805] },
    soleSeat: { x: 512, y: 960 },
  },
  bloodrunner: {
    asset: { area: 'items', file: 'leather-boot-front-v2.png', crop: [107, 155, 809, 805] },
    soleSeat: { x: 512, y: 960 },
  },
  plague: {
    asset: { area: 'items', file: 'leather-boot-front-v2.png', crop: [107, 155, 809, 805] },
    soleSeat: { x: 512, y: 960 },
  },
  rabbit: {
    asset: { area: 'items', file: 'running-shoe-front-v2.png', crop: [55, 39, 913, 985] },
    soleSeat: { x: 512, y: 1015 },
  },
  octoboot: {
    asset: { area: 'items', file: 'leather-boot-front-v2.png', crop: [107, 155, 809, 805] },
    soleSeat: { x: 512, y: 960 },
  },
  dance: {
    asset: { area: 'items', file: 'running-shoe-front-v2.png', crop: [55, 39, 913, 985] },
    soleSeat: { x: 512, y: 1015 },
  },
};

const specialAssets: Record<string, AssetRef> = {
  plate: { area: 'items', file: 'iron-breastplate-v2.png' },
  spikes: { area: 'items', file: 'spiked-cuirass-v2.png' },
  shield: { area: 'items', file: 'wooden-shield-v1.png', crop: [56, 60, 912, 904] },
};
const crowns: Record<string, { asset: AssetRef; seat: Point }> = {
  horns: {
    asset: { area: 'items', file: 'horned-crown-front-v2.png', crop: [29, 306, 965, 370] },
    seat: { x: 512, y: 512 },
  },
  bandage: {
    asset: { area: 'items', file: 'bandaged-headband-front-v2.png', crop: [23, 343, 978, 338] },
    seat: { x: 512, y: 512 },
  },
};

const tint = (ids: string[], value: string) => Object.fromEntries(ids.map((id) => [id, value]));
const filters: Record<string, string> = {
  ...tint(
    [
      'bloodboots',
      'bloodletter',
      'bloodrunner',
      'bloodengine',
      'vampire',
      'warheart',
      'artery',
      'donor',
    ],
    'hue-rotate(338deg) saturate(1.18)',
  ),
  necrowand: 'grayscale(.35) sepia(.5) hue-rotate(275deg) saturate(1.1)',
  plague: 'hue-rotate(65deg) saturate(1.15)',
  venomboots: 'hue-rotate(65deg) saturate(1.15)',
  stormwand: 'hue-rotate(205deg) saturate(1.2)',
  wizardheart: 'hue-rotate(205deg) saturate(1.2)',
  ouroboros: 'hue-rotate(145deg) saturate(1.15)',
  pump: 'grayscale(.2) sepia(.5) saturate(1.4)',
  saint: 'sepia(.5) saturate(1.3)',
  apocalypse: 'sepia(.6) saturate(1.4)',
};

function profileFor(id: string): ItemPresentation | undefined {
  const item = ITEM_MAP[id];
  if (!item) return undefined;
  const iconAsset = ITEM_ICON_ASSETS[item.icon];
  if (!iconAsset) throw new Error(`No icon art profile for ${id} (${item.icon}).`);
  const filter = filters[id] ?? 'none';
  if (item.slot === 'hand') {
    const geometry = heldGeometry[item.icon];
    if (!geometry) throw new Error(`No held art geometry for ${id} (${item.icon}).`);
    return {
      kind: 'held',
      id,
      icon: item.icon,
      asset: specialAssets[id] ?? iconAsset,
      geometry,
      filter,
      attachment: 'grip',
    };
  }
  if (item.slot === 'head') {
    const crown = crowns[id];
    return {
      kind: 'crown',
      id,
      icon: item.icon,
      asset: crown?.asset ?? iconAsset,
      ...(crown ? { seat: crown.seat } : {}),
      fallback: 'gear-crown',
      filter,
      frontOnly: true,
      attachment: 'head-crown',
    };
  }
  if (item.slot === 'foot') {
    const shoe = footwear[id] ?? footwear.runners;
    return {
      kind: 'footwear',
      id,
      icon: item.icon,
      asset: shoe.asset,
      soleSeat: shoe.soleSeat,
      envelope: { width: 26, height: 30 },
      filter,
      frontOnly: true,
      replacesFootBelowAnkle: true,
      attachment: 'leg-sole',
    };
  }
  if (item.slot === 'chest')
    return {
      kind: 'torso',
      id,
      icon: item.icon,
      asset: specialAssets[id] ?? iconAsset,
      worn: { anchor: 'torso', width: 0.98, height: 0.96, center: { x: 0.5, y: 0.5 } },
      filter,
      attachment: 'chest',
    };
  return {
    kind: 'organ',
    id,
    icon: item.icon,
    asset: iconAsset,
    worn: { anchor: 'heart', width: 0.38, height: 0.4, center: { x: 0.5, y: 0.44 } },
    filter,
    attachment: 'heart',
  };
}

export const ITEM_PRESENTATION: Record<string, ItemPresentation> = Object.fromEntries(
  Object.keys(ITEM_MAP).map((id) => [id, profileFor(id)!]),
);

export function itemPresentation(id: string): ItemPresentation | undefined {
  return ITEM_PRESENTATION[id] ?? profileFor(id);
}

export function iconAsset(icon: string): AssetRef | undefined {
  return ITEM_ICON_ASSETS[icon];
}

export function heldGeometryForIcon(icon: string): HeldGeometry | undefined {
  return heldGeometry[icon];
}

export function validatePresentationCatalog() {
  for (const [id, item] of Object.entries(ITEM_MAP)) {
    const profile = itemPresentation(id);
    if (!profile || profile.icon !== item.icon)
      throw new Error(`Invalid presentation profile for ${id}.`);
    if (
      (item.slot === 'hand' && profile.kind !== 'held') ||
      (item.slot === 'head' && profile.kind !== 'crown') ||
      (item.slot === 'foot' && profile.kind !== 'footwear') ||
      (item.slot === 'chest' && profile.kind !== 'torso') ||
      (item.slot === 'heart' && profile.kind !== 'organ')
    )
      throw new Error(`Presentation role does not match the equipment slot for ${id}.`);
    const crop = profile.asset.crop;
    if (crop && crop.some((n) => !Number.isFinite(n) || n < 0))
      throw new Error(`Invalid source crop for ${id}.`);
    if (profile.kind === 'held') {
      const { frame, grip, axis, size } = profile.geometry;
      if (
        ![frame.x, frame.y, grip.x, grip.y, axis.x, axis.y, size].every(Number.isFinite) ||
        frame.x <= 0 ||
        frame.y <= 0 ||
        size <= 0 ||
        [grip.x, grip.y, axis.x, axis.y].some((n) => n < 0 || n > 1)
      )
        throw new Error(`Invalid held geometry for ${id}.`);
    }
    if (
      profile.kind === 'footwear' &&
      ![
        profile.soleSeat.x,
        profile.soleSeat.y,
        profile.envelope.width,
        profile.envelope.height,
      ].every(Number.isFinite)
    )
      throw new Error(`Invalid footwear mount for ${id}.`);
    if (profile.kind === 'torso' || profile.kind === 'organ') {
      const { width, height, center } = profile.worn;
      if (
        ![width, height, center.x, center.y].every(Number.isFinite) ||
        width <= 0 ||
        height <= 0 ||
        center.x < 0 ||
        center.x > 1 ||
        center.y < 0 ||
        center.y > 1
      )
        throw new Error(`Invalid worn-item geometry for ${id}.`);
    }
  }
}
