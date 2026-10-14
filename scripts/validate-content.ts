import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  ITEM_ICON_ASSETS,
  ITEM_PRESENTATION,
  validatePresentationCatalog,
} from '../src/art/presentation-catalog';
import { validateContent } from '../src/game/content-validation';

validateContent();
validatePresentationCatalog();
const assets = new Map(
  [
    ...Object.values(ITEM_ICON_ASSETS),
    ...Object.values(ITEM_PRESENTATION).map((profile) => profile.asset),
  ].map((asset) => [`${asset.area}/${asset.file}`, asset] as const),
);
for (const asset of assets.values()) {
  const directory = asset.area === 'items' ? 'items' : 'modular-v2';
  const path = resolve('public', 'grotesque', directory, asset.file);
  const bytes = await readFile(path);
  if (
    bytes[0] !== 0x89 ||
    bytes.toString('ascii', 1, 4) !== 'PNG' ||
    bytes.toString('ascii', 12, 16) !== 'IHDR' ||
    bytes.length < 24
  )
    throw new Error(`Presentation asset is not a valid PNG: ${path}`);
  const width = bytes.readUInt32BE(16),
    height = bytes.readUInt32BE(20);
  if (asset.crop) {
    const [x, y, cropWidth, cropHeight] = asset.crop;
    if (cropWidth <= 0 || cropHeight <= 0 || x + cropWidth > width || y + cropHeight > height)
      throw new Error(`Presentation crop exceeds its image bounds: ${path}`);
  }
}
console.log('Game content is valid.');
