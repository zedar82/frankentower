import {
  ITEM_ICON_ASSETS,
  ITEM_PRESENTATION,
  heldGeometryForIcon,
  iconAsset,
  itemPresentation,
  type AssetRef,
  type HeldGeometry,
  type ItemPresentation,
} from './presentation-catalog';
import { imageAssetReady, isImageAssetReady, requestImageAsset } from './asset-loader';

type Point = { x: number; y: number };
const base = `${import.meta.env.BASE_URL}grotesque/items/`;
const modularBase = `${import.meta.env.BASE_URL}grotesque/modular-v2/`;
function assetUrl(asset: AssetRef) {
  return `${asset.area === 'items' ? base : modularBase}${asset.file}`;
}
function imageFor(asset: AssetRef) {
  return requestImageAsset(assetUrl(asset), `${asset.area}/${asset.file}`);
}
function imageReady(asset: AssetRef) {
  return isImageAssetReady(assetUrl(asset));
}
function sourceRect(asset: AssetRef, image: HTMLImageElement): [number, number, number, number] {
  return asset.crop ? [...asset.crop] : [0, 0, image.naturalWidth, image.naturalHeight];
}
function resolvedProfile(id: string): ItemPresentation | undefined {
  return itemPresentation(id);
}
const itemAssets = new Map<string, AssetRef>();
for (const asset of Object.values(ITEM_ICON_ASSETS)) itemAssets.set(assetUrl(asset), asset);
for (const profile of Object.values(ITEM_PRESENTATION)) itemAssets.set(assetUrl(profile.asset), profile.asset);
for (const asset of itemAssets.values()) imageFor(asset);
// Images are shared by URL and settle independently; drawing uses local fallbacks.
export const itemArtReady = Promise.all([...itemAssets.keys()].map((url) => imageAssetReady(url))).then(() => undefined);

function footwearProfile(id: string) {
  const profile = resolvedProfile(id);
  if (profile?.kind === 'footwear') return profile;
  const fallback = resolvedProfile('runners');
  return fallback?.kind === 'footwear' ? fallback : undefined;
}
export function footwearArtReady(variant: string) {
  const profile = footwearProfile(variant);
  return !!profile && imageReady(profile.asset);
}
export function drawFootwearItem(
  c: CanvasRenderingContext2D,
  variant: string,
  soleX: number,
  soleY: number,
) {
  const profile = footwearProfile(variant);
  if (!profile) return false;
  const image = imageFor(profile.asset);
  if (!imageReady(profile.asset) || !image.complete || !image.naturalWidth) return false;
  const [sx, sy, sw, sh] = sourceRect(profile.asset, image);
  const scale = Math.min(profile.envelope.width / sw, profile.envelope.height / sh);
  c.save();
  c.imageSmoothingEnabled = false;
  c.filter = profile.filter;
  c.drawImage(
    image,
    sx,
    sy,
    sw,
    sh,
    soleX - (profile.soleSeat.x - sx) * scale,
    soleY - (profile.soleSeat.y - sy) * scale,
    sw * scale,
    sh * scale,
  );
  c.restore();
  return true;
}

// Headwear is a front-facing overlay seated at the head geometry crown landmark.
export function drawCrownItem(
  c: CanvasRenderingContext2D,
  variant: string,
  x: number,
  y: number,
  envelope: { width: number; height: number; root: Point },
) {
  const profile = resolvedProfile(variant);
  if (profile?.kind !== 'crown' || !profile.seat) return false;
  const image = imageFor(profile.asset);
  if (!imageReady(profile.asset) || !image.complete || !image.naturalWidth) return false;
  const [sx, sy, sw, sh] = sourceRect(profile.asset, image);
  const scale = Math.min(envelope.width / sw, envelope.height / sh);
  c.save();
  c.imageSmoothingEnabled = false;
  c.filter = profile.filter;
  c.drawImage(
    image,
    sx,
    sy,
    sw,
    sh,
    x + envelope.root.x - (profile.seat.x - sx) * scale,
    y + envelope.root.y - (profile.seat.y - sy) * scale,
    sw * scale,
    sh * scale,
  );
  c.restore();
  return true;
}

type ResolvedHeld = { geometry: HeldGeometry; image: HTMLImageElement; asset: AssetRef };
function heldProfile(name: string, itemId = ''): ResolvedHeld | undefined {
  const profile = resolvedProfile(itemId);
  if (profile?.kind === 'held')
    return { geometry: profile.geometry, asset: profile.asset, image: imageFor(profile.asset) };
  const geometry = heldGeometryForIcon(name),
    asset = iconAsset(name);
  return geometry && asset ? { geometry, asset, image: imageFor(asset) } : undefined;
}
function heldTransform(profile: HeldGeometry) {
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
  const presentation = heldProfile(name, itemId);
  if (!presentation) return [];
  const { geometry } = presentation;
  const { grip, angle, scale } = heldTransform(geometry);
  return [0, geometry.frame.x].flatMap((x) =>
    [0, geometry.frame.y].map((y) => ({
      x: scale * ((x - grip.x) * Math.cos(angle) - (y - grip.y) * Math.sin(angle)),
      y: scale * ((x - grip.x) * Math.sin(angle) + (y - grip.y) * Math.cos(angle)),
    })),
  );
}
export function heldHandLayer(name: string, itemId = '') {
  return heldProfile(name, itemId)?.geometry.handLayer ?? 'front';
}
export function drawHeldItem(
  c: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  variant = '',
) {
  const presentation = heldProfile(name, variant);
  if (!presentation) return false;
  const { geometry, image, asset } = presentation;
  if (!imageReady(asset) || !image.complete || !image.naturalWidth) return false;
  const { grip, angle, scale } = heldTransform(geometry);
  const profile = resolvedProfile(variant);
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.scale(scale, scale);
  c.imageSmoothingEnabled = false;
  c.filter = profile?.kind === 'held' ? profile.filter : 'none';
  c.drawImage(
    image,
    ...sourceRect(asset, image),
    -grip.x,
    -grip.y,
    geometry.frame.x,
    geometry.frame.y,
  );
  c.restore();
  return true;
}

export function drawGrotesqueItem(
  c: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  size: number,
  variant = '',
) {
  const profile = resolvedProfile(variant),
    asset = profile?.asset ?? iconAsset(name);
  if (!asset) return false;
  const image = imageFor(asset);
  if (!imageReady(asset) || !image.complete || !image.naturalWidth) return false;
  const source = sourceRect(asset, image),
    scale = size / Math.max(source[2], source[3]),
    width = source[2] * scale,
    height = source[3] * scale;
  c.save();
  c.imageSmoothingEnabled = false;
  c.filter = profile?.filter ?? 'none';
  c.drawImage(image, ...source, x + (size - width) / 2, y + (size - height) / 2, width, height);
  c.restore();
  return true;
}

export function isGrotesqueItemIcon(name: string): boolean {
  return name in ITEM_ICON_ASSETS;
}
