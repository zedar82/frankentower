import { ITEMS } from './content/items';
import { ENEMY_ITEMS } from './content/enemies';
import type { ItemDef } from './types';
export { ITEMS } from './content/items';
export { ENEMY_ITEMS } from './content/enemies';
export { PROCEDURES } from './content/procedures';

// Build the complete catalogue once, without registration side effects. Fail
// loudly instead of silently replacing an earlier definition with a duplicate.
const definitions = [...ITEMS, ...ENEMY_ITEMS];
const itemIds = new Set<string>();
for (const definition of definitions) {
  if (itemIds.has(definition.id)) throw new Error(`Duplicate item definition: ${definition.id}`);
  itemIds.add(definition.id);
}
export type ItemCatalog = Readonly<Record<string, ItemDef>>;

export const ITEM_MAP: ItemCatalog = Object.freeze(Object.fromEntries(
  definitions.map((item) => [item.id, item]),
));
