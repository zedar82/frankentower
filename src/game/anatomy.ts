import { ITEM_MAP } from './content';
import type { Build, Item, Part, Slot, Stats } from './types';
export const LEVEL_SCALE = [0, 1, 1.6, 2.4];
export const SLOT_LABEL: Record<Slot, string> = { hand: 'Hand', head: 'Head', foot: 'Foot', chest: 'Chest', heart: 'Heart' };
export const SLOT_PLURAL: Record<Slot, string> = { hand: 'Hands', head: 'Heads', foot: 'Feet', chest: 'Chests', heart: 'Hearts' };
export function count(build: Build, slot: Slot) { return build.parts.filter(p => p.slot === slot).length; }
export function human(name = 'Agnes'): Build {
  return { name, parts: (['head', 'chest', 'hand', 'hand', 'foot', 'foot', 'heart'] as Slot[]).map((slot, i) => ({ uid: `part-${i}`, slot, variant: 'living' })) };
}
export function equipped(build: Build): { part: Part; item: Item }[] { return build.parts.flatMap(part => part.item ? [{ part, item: part.item }] : []); }
export function usable(build: Build, item: Item) { const r = ITEM_MAP[item.defId]?.requires; return !r || count(build, r.slot) >= r.count; }
export function stats(build: Build, mana = Infinity): Stats {
  const result: Stats = { maxHp: 0, maxMana: count(build, 'head') * 20, capacity: 0, load: 0, efficiency: 1, speed: 1, armour: 0, crit: 0, chance: 1, necrotic: 0, octopod: 0 };
  for (const p of build.parts) {
    result.maxHp += { chest: 40, head: 16, hand: 8, foot: 8, heart: 12 }[p.slot];
    if (p.slot === 'heart') {
      if (p.variant === 'necrotic') { result.necrotic++; if (mana > 0) result.capacity += 22; }
      else result.capacity += p.variant === 'ganglion' ? 6 : 12;
    } else if (p.variant !== 'clockwork') result.load += { chest: 2, head: 3, hand: 2, foot: 1.5 }[p.slot];
    if (!p.item || !usable(build, p.item)) continue;
    const def = ITEM_MAP[p.item.defId];
    if (!def) continue;
    const scale = LEVEL_SCALE[p.item.level];
    for (const [k, value] of Object.entries(def.stats ?? {})) {
      const key = k as keyof Stats;
      result[key] += value * scale;
    }
    if (def.tags.includes('Octopod')) result.octopod++;
  }
  if (result.octopod >= 2) result.speed += .1;
  if (result.octopod >= 4) result.crit += 20;
  if (result.octopod >= 6) result.capacity += 8;
  if (result.octopod >= 8) result.speed += .5;
  result.maxHp = Math.round(result.maxHp * (build.healthFactor ?? 1));
  result.efficiency = result.load === 0 ? 1 : Math.min(1, Math.pow(result.capacity / result.load, 1.3));
  return result;
}
export function archetypes(build: Build): string[] {
  const heads = count(build, 'head'), hands = count(build, 'hand'), feet = count(build, 'foot'), hearts = count(build, 'heart');
  const tags = [];
  if (heads === 0) tags.push('Headless'); else if (heads === 2) tags.push('Bicephalic'); else if (heads >= 3) tags.push('Polycephalic');
  if (hands >= 4) tags.push('Many-Armed'); else if (hands === 0) tags.push('Armless');
  if (feet >= 8) tags.push('Octopod'); else if (feet >= 4) tags.push('Many-Legged'); else if (feet === 0) tags.push('Slug');
  if (hearts >= 3) tags.push('Polycardiac');
  if (build.parts.length >= 18) tags.push('Monstrosity');
  return tags.length ? tags : ['Human'];
}
export function identity(build: Build) { const tags = archetypes(build); return tags[0] === 'Human' ? build.name : `${build.name} the ${tags.join(' ')}`; }
export function canFunction(build: Build) { return count(build, 'head') > 0 || build.parts.some(p => p.variant === 'ganglion'); }
