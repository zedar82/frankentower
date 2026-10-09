import { ITEMS } from './content/items';
import { ENEMY_ITEMS } from './content/enemies';
import type { ItemDef } from './types';
export { ITEMS } from './content/items';
export { ENEMY_ITEMS } from './content/enemies';
export { PROCEDURES } from './content/procedures';

// Build the complete catalogue once, without registration side effects.
export const ITEM_MAP: Record<string, ItemDef> = Object.fromEntries(
  [...ITEMS, ...ENEMY_ITEMS].map((item) => [item.id, item]),
);
