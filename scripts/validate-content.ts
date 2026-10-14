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
type ModularPartSpec = {
  name: string;
  source?: string;
  width: number;
  height: number;
  root: number[];
  pin: number[];
  end?: number[];
  target?: number[];
  crown?: number[];
};
const modularSpec = JSON.parse(
  await readFile(resolve('scripts', 'modular-v2-source-spec.json'), 'utf8'),
) as { rasterScale: number; parts: ModularPartSpec[] };
if (!Number.isFinite(modularSpec.rasterScale) || modularSpec.rasterScale <= 0)
  throw new Error('Modular generator raster scale must be positive and finite.');
const modularNames = new Set<string>();
const generatedGeometry = JSON.parse(
  await readFile(resolve('public', 'grotesque', 'modular-v2', 'geometry.json'), 'utf8'),
) as Record<string, Record<string, unknown>>;
for (const part of modularSpec.parts) {
  if (typeof part.name !== 'string' || !part.name)
    throw new Error('Every modular source spec needs a name.');
  const role = part.name.split('-')[0];
  const point = (value: unknown, label: string, normalized = false) => {
    if (
      !Array.isArray(value) ||
      value.length !== 2 ||
      !value.every((coordinate) => Number.isFinite(coordinate)) ||
      value.some((coordinate) => coordinate < 0 || (normalized && coordinate > 1))
    )
      throw new Error(`${part.name} has invalid ${label} coordinates in the modular source spec.`);
  };
  if (modularNames.has(part.name)) throw new Error(`Duplicate modular source spec: ${part.name}.`);
  modularNames.add(part.name);
  if (!['head', 'arm', 'leg'].includes(role))
    throw new Error(`Unknown modular part role: ${part.name}.`);
  if (
    !Number.isFinite(part.width) ||
    part.width <= 0 ||
    !Number.isFinite(part.height) ||
    part.height <= 0
  )
    throw new Error(`${part.name} needs a positive output frame.`);
  point(part.root, 'root', true);
  point(part.pin, 'pin');
  if (part.pin[0] > part.width || part.pin[1] > part.height)
    throw new Error(`${part.name} pin lies outside its output frame.`);
  if ((role === 'head') !== Array.isArray(part.crown))
    throw new Error(`${part.name} must declare a crown landmark only for head art.`);
  if ((role !== 'head') !== (Array.isArray(part.end) && Array.isArray(part.target)))
    throw new Error(`${part.name} must declare source and output end landmarks for limbs.`);
  if (part.end) point(part.end, 'source end', true);
  if (part.target) {
    point(part.target, 'output end');
    if (part.target[0] > part.width || part.target[1] > part.height)
      throw new Error(`${part.name} output end lies outside its frame.`);
  }
  if (part.crown) point(part.crown, 'crown', true);
  const contract = generatedGeometry[part.name];
  const generatedRoot = contract?.root as { x?: unknown; y?: unknown } | undefined;
  const generatedEnd = contract?.end as { x?: unknown; y?: unknown } | undefined;
  if (
    !contract ||
    contract.width !== part.width ||
    contract.height !== part.height ||
    contract.rasterScale !== modularSpec.rasterScale ||
    (contract.source ?? part.name) !== (part.source ?? part.name) ||
    generatedRoot?.x !== part.pin[0] ||
    generatedRoot?.y !== part.pin[1] ||
    (part.target && (generatedEnd?.x !== part.target[0] || generatedEnd?.y !== part.target[1]))
  )
    throw new Error(`${part.name} source metadata does not match its generated geometry contract.`);
}
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
