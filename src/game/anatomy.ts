import { buildAbilities, LEVEL_SCALE } from './abilities';
import { count } from './body';
import { SLOT_DEFINITIONS, VARIANT_DEFINITIONS } from './anatomy-content';
import { activeSets } from './sets';
import type { Build, Slot, Stat, Stats } from './types';
export { count, human, equipped, usable } from './body';
export { LEVEL_SCALE } from './abilities';
export const SLOT_LABEL: Record<Slot, string> = {
  hand: 'Hand',
  head: 'Head',
  foot: 'Foot',
  chest: 'Chest',
  heart: 'Heart',
};
export const SLOT_PLURAL: Record<Slot, string> = {
  hand: 'Hands',
  head: 'Heads',
  foot: 'Feet',
  chest: 'Chests',
  heart: 'Hearts',
};
export interface CompiledBuildStats {
  base: Stats;
  capacityWithMana: number;
  capacityWithoutMana: number;
  footCount: number;
  healthFactor: number;
}

/** Compile anatomy and equipment facts that stay fixed throughout a fight. */
export function compileBuildStats(build: Build): CompiledBuildStats {
  const result: Stats = {
    maxHp: 0,
    maxMana: 0,
    capacity: 0,
    load: 0,
    efficiency: 1,
    speed: 1,
    movementSpeed: 0,
    armour: 0,
    crit: 0,
    chance: 1,
    manaPerSecond: 0,
    sets: {},
  };
  let capacityWithoutMana = 0;
  for (const part of build.parts) {
    const slot = SLOT_DEFINITIONS[part.slot],
      variant = VARIANT_DEFINITIONS[part.variant];
    result.maxHp += slot.hp;
    result.maxMana += slot.mana ?? 0;
    result.manaPerSecond += slot.manaPerSecond ?? 0;
    result.load += slot.load * (variant.loadMultiplier ?? 1);
    if (part.slot === 'heart' && variant.heart) {
      const heart = variant.heart;
      result.capacity += heart.capacity;
      if (!heart.requiresMana) capacityWithoutMana += heart.capacity;
      result.manaPerSecond += heart.manaPerSecond ?? 0;
    } else {
      const capacity = slot.capacity ?? 0;
      result.capacity += capacity;
      capacityWithoutMana += capacity;
    }
  }
  for (const ability of buildAbilities(build)) {
    for (const [key, value] of Object.entries(ability.def.stats ?? {})) {
      const scaled = value * LEVEL_SCALE[ability.level];
      result[key as Stat] += scaled;
      if (key === 'capacity') capacityWithoutMana += scaled;
    }
  }
  for (const { def, pieces } of activeSets(build)) result.sets[def.id] = pieces;
  result.efficiency = circulationEfficiency(result.capacity, result.load);
  const footCount = count(build, 'foot');
  result.movementSpeed = movementSpeed(footCount, result.speed);
  return {
    base: result,
    capacityWithMana: result.capacity,
    capacityWithoutMana,
    footCount,
    healthFactor: build.healthFactor ?? 1,
  };
}

export function statsFromCompiled(
  compiled: CompiledBuildStats,
  mana = Infinity,
  modifiers: Partial<Record<Stat, number>> = {},
): Stats {
  const result: Stats = {
    ...compiled.base,
    sets: { ...compiled.base.sets },
    capacity: (mana > 0 ? compiled.capacityWithMana : compiled.capacityWithoutMana) +
      (modifiers.capacity ?? 0),
  };
  for (const [key, value] of Object.entries(modifiers)) {
    if (key !== 'capacity') result[key as Stat] += value;
  }
  result.maxHp = Math.round(result.maxHp * compiled.healthFactor);
  result.efficiency = circulationEfficiency(result.capacity, result.load);
  result.movementSpeed = movementSpeed(compiled.footCount, result.speed);
  return result;
}

export function stats(
  build: Build,
  mana = Infinity,
  modifiers: Partial<Record<Stat, number>> = {},
): Stats {
  return statsFromCompiled(compileBuildStats(build), mana, modifiers);
}

function movementSpeed(feet: number, speed: number) {
  return (feet === 0 ? 14 : feet === 1 ? 30 : 58 + Math.min(10, feet - 2) * 14) *
    (1 + (speed - 1) * 0.5);
}

export function circulationEfficiency(capacity: number, load: number) {
  return load === 0 ? 1 : Math.min(1, Math.pow(Math.max(0, capacity) / load, 1.3));
}
export function archetypes(build: Build): string[] {
  const heads = count(build, 'head'),
    hands = count(build, 'hand'),
    feet = count(build, 'foot'),
    hearts = count(build, 'heart');
  const tags = [];
  if (heads === 0) tags.push('Headless');
  else if (heads === 2) tags.push('Bicephalic');
  else if (heads >= 3) tags.push('Polycephalic');
  if (hands >= 4) tags.push('Many-Armed');
  else if (hands === 0) tags.push('Armless');
  if (feet >= 8) tags.push('Octopod');
  else if (feet >= 4) tags.push('Many-Legged');
  else if (feet === 0) tags.push('Slug');
  if (hearts >= 3) tags.push('Polycardiac');
  if (build.parts.length >= 18) tags.push('Monstrosity');
  return tags.length ? tags : ['Human'];
}
export function identity(build: Build) {
  const tags = archetypes(build);
  return tags[0] === 'Human' ? build.name : `${build.name} the ${tags.join(' ')}`;
}
export function canFunction(build: Build) {
  return (
    count(build, 'head') > 0 ||
    build.parts.some((part) => VARIANT_DEFINITIONS[part.variant].controller)
  );
}
