import { ITEM_MAP } from './content';
import type { Build, Item, Part, Slot } from './types';

export function count(build: Build, slot: Slot) {
  return build.parts.filter((part) => part.slot === slot).length;
}

export function human(name = 'Agnes'): Build {
  const slots: Slot[] = ['head', 'chest', 'hand', 'hand', 'foot', 'foot', 'heart'];
  return { name, parts: slots.map((slot, i) => ({ uid: `part-${i}`, slot, variant: 'living' })) };
}

export function equipped(build: Build): { part: Part; item: Item }[] {
  return build.parts.flatMap((part) => (part.item ? [{ part, item: part.item }] : []));
}

export function usable(build: Build, item: Item) {
  const requirement = ITEM_MAP[item.defId]?.requires;
  return !requirement || count(build, requirement.slot) >= requirement.count;
}
