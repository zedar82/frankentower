import { ITEM_MAP } from './content';
import { equipped, usable } from './body';
import { VARIANT_DEFINITIONS } from './anatomy-content';
import { activeSets } from './sets';
import type { AbilityDef, Build, Item, Slot } from './types';

export const LEVEL_SCALE = [0, 1, 1.6, 2.4];

export type AbilitySource =
  | { kind: 'item'; item: Item; partUid: string }
  | { kind: 'limb'; partUid: string }
  | { kind: 'set'; setId: string; pieces: number };

export interface BuildAbility {
  uid: string;
  def: AbilityDef;
  level: number;
  slot?: Slot;
  source: AbilitySource;
}

// One ordered list drives static stats and runtime abilities on both sides.
// Limb/set instances never pretend to be inventory items.
export function buildAbilities(build: Build): BuildAbility[] {
  const abilities: BuildAbility[] = equipped(build)
    .filter(({ item }) => usable(build, item))
    .map(({ part, item }) => ({
      uid: item.uid,
      def: ITEM_MAP[item.defId],
      level: item.level,
      slot: part.slot,
      source: { kind: 'item', item, partUid: part.uid },
    }));

  for (const part of build.parts) {
    for (const def of VARIANT_DEFINITIONS[part.variant].abilities?.[part.slot] ?? []) {
      abilities.push({
        uid: `limb:${part.uid}:${def.id}`,
        def,
        level: 1,
        slot: part.slot,
        source: { kind: 'limb', partUid: part.uid },
      });
    }
  }
  for (const { def, pieces } of activeSets(build)) {
    for (const bonus of def.bonuses) {
      if (pieces >= bonus.pieces)
        abilities.push({
          uid: `set:${def.id}:${bonus.pieces}`,
          def: bonus.ability,
          level: 1,
          source: { kind: 'set', setId: def.id, pieces: bonus.pieces },
        });
    }
  }
  return abilities;
}

export function hasOffensiveAbility(build: Build) {
  return buildAbilities(build).some(({ def, level }) =>
    [
      ...(def.effects ?? []),
      ...[...(def.reactions ?? []), ...(level === 3 ? (def.lv3 ?? []) : [])].flatMap(
        (rule) => rule.effects,
      ),
    ].some((effect) => ['damage', 'poison', 'trigger'].includes(effect.kind)),
  );
}
