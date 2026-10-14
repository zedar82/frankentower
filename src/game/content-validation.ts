import { ENEMY_ITEMS, ITEM_MAP, ITEMS, PROCEDURES } from './content';
import { CHECKPOINT_ENEMY_PROFILES, ENEMY_PROFILES } from './content/enemies';
import { SLOT_DEFINITIONS, VARIANT_DEFINITIONS } from './anatomy-content';
import { SET_DEFINITIONS } from './sets';
import type { AbilityDef, Effect, ItemDef, Selector, Slot, Targeting } from './types';

const slotTypes: Record<Slot, string[]> = {
  hand: ['Weapon', 'Wand', 'Shield'],
  head: ['Helmet'],
  chest: ['Armour'],
  foot: ['Shoe'],
  heart: ['Heart'],
};

function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Invalid game content: ${message}`);
}
function finite(value: unknown, label: string, min = -Infinity) {
  ensure(typeof value === 'number' && Number.isFinite(value) && value >= min, label);
}
function integer(value: unknown, label: string, min = 1, max = Number.MAX_SAFE_INTEGER) {
  ensure(
    Number.isSafeInteger(value) && (value as number) >= min && (value as number) <= max,
    label,
  );
}
function targeting(value: Targeting | undefined, label: string) {
  if (!value) return;
  if (value.kind === 'single') return;
  if (value.kind === 'count') {
    integer(value.count, `${label} target count must be a positive integer.`);
    return;
  }
  ensure(value.kind === 'area', `${label} has an unknown target kind.`);
  finite(value.radius, `${label} area radius must be finite and positive.`, Number.MIN_VALUE);
  ensure(
    value.center === 'self' || value.center === 'target',
    `${label} has an invalid area center.`,
  );
}
function selector(value: Selector | undefined, label: string) {
  if (!value) return;
  ensure(!(value.self && value.other), `${label} cannot select both self and other.`);
  ensure(!(value.random && value.longest), `${label} cannot combine random and longest selection.`);
  if (value.slot)
    ensure(Object.hasOwn(slotTypes, value.slot), `${label} refers to an unknown slot.`);
  if (value.slot && value.type)
    ensure(
      slotTypes[value.slot].includes(value.type),
      `${label} combines an incompatible slot and item type.`,
    );
}
function effect(value: Effect, label: string) {
  if ('amount' in value) finite(value.amount, `${label} amount must be finite and nonnegative.`, 0);
  if (value.chance !== undefined)
    finite(value.chance, `${label} chance must be finite and nonnegative.`, 0);
  if (value.cost !== undefined)
    finite(value.cost, `${label} cost must be finite and nonnegative.`, 0);
  if ('per' in value && value.per)
    ensure(
      Object.hasOwn(SLOT_DEFINITIONS, value.per),
      `${label} refers to an unknown anatomy slot.`,
    );
  if (value.kind === 'damage' && value.shieldBonus !== undefined)
    finite(value.shieldBonus, `${label} shield bonus must be finite and nonnegative.`, 0);
  if (value.kind === 'cdr') finite(value.amount, `${label} cooldown reduction must be finite.`, 0);
  if (value.kind === 'trigger' || value.kind === 'cdr') selector(value.select, label);
}
function ability(value: AbilityDef, label: string) {
  ensure(!!value.id && !!value.name && !!value.icon, `${label} needs an id, name and icon.`);
  targeting(value.targeting, label);
  if (value.cooldown !== undefined)
    finite(value.cooldown, `${label} cooldown must be finite and positive.`, Number.MIN_VALUE);
  for (const [stat, amount] of Object.entries(value.stats ?? {}))
    finite(amount, `${label} ${stat} stat must be finite.`);
  for (const [index, rule] of [...(value.reactions ?? []), ...(value.lv3 ?? [])].entries()) {
    const ruleLabel = `${label} reaction ${index + 1}`;
    targeting(rule.targeting, ruleLabel);
    if (rule.chance !== undefined)
      finite(rule.chance, `${ruleLabel} chance must be finite and nonnegative.`, 0);
    if (rule.id) ensure(rule.id.length <= 128, `${ruleLabel} id is too long.`);
    for (const [effectIndex, action] of rule.effects.entries())
      effect(action, `${ruleLabel} effect ${effectIndex + 1}`);
  }
  for (const [index, action] of (value.effects ?? []).entries())
    effect(action, `${label} effect ${index + 1}`);
  const ids = new Set<string>();
  for (const [index, rule] of [...(value.reactions ?? []), ...(value.lv3 ?? [])].entries()) {
    if (!rule.id) continue;
    ensure(!ids.has(rule.id), `${label} repeats explicit reaction id ${rule.id} at ${index + 1}.`);
    ids.add(rule.id);
  }
}

export function validateContent() {
  const ids = new Set<string>();
  for (const definition of [...ITEMS, ...ENEMY_ITEMS]) {
    ensure(!ids.has(definition.id), `duplicate item id ${definition.id}.`);
    ids.add(definition.id);
    const item = definition as ItemDef;
    integer(item.rarity, `${item.id} rarity must be an integer from 1 to 5.`, 1, 5);
    finite(item.price, `${item.id} price must be finite and nonnegative.`, 0);
    ensure(
      slotTypes[item.slot]?.includes(item.type),
      `${item.id} has an incompatible slot and type.`,
    );
    if (item.requires) {
      ensure(
        Object.hasOwn(SLOT_DEFINITIONS, item.requires.slot),
        `${item.id} requires an unknown slot.`,
      );
      integer(item.requires.count, `${item.id} requirement count must be a positive integer.`);
    }
    ability(item, item.id);
  }
  for (const [id, definition] of Object.entries(ITEM_MAP))
    ensure(id === definition.id, `catalogue key ${id} does not match its definition.`);

  const enemyProfileIds = new Set<string>();
  for (const profile of [...ENEMY_PROFILES, ...CHECKPOINT_ENEMY_PROFILES]) {
    ensure(!!profile.id && !!profile.name, 'enemy profiles need stable ids and display names.');
    ensure(!enemyProfileIds.has(profile.id), `duplicate enemy profile id ${profile.id}.`);
    enemyProfileIds.add(profile.id);
    integer(profile.cost, `${profile.id} budget cost must be a nonnegative integer.`, 0);
    finite(profile.baseHp, `${profile.id} base HP must be nonnegative.`, 0);
    finite(profile.power, `${profile.id} power factor must be positive.`, Number.MIN_VALUE);
    ensure(
      profile.healthFactor !== undefined || profile.baseHp > 0,
      `${profile.id} needs base HP or an authored health factor.`,
    );
    if (profile.healthFactor !== undefined)
      finite(
        profile.healthFactor,
        `${profile.id} health factor must be positive.`,
        Number.MIN_VALUE,
      );
    ensure(profile.anatomy.slots.length > 0, `${profile.id} anatomy must have at least one part.`);
    ensure(
      Object.hasOwn(VARIANT_DEFINITIONS, profile.anatomy.material),
      `${profile.id} uses an unknown material.`,
    );
    for (const slot of profile.anatomy.slots)
      ensure(Object.hasOwn(SLOT_DEFINITIONS, slot), `${profile.id} uses an unknown anatomy slot.`);
    const equipmentIds = new Set<string>();
    const equipmentCounts = new Map<Slot, number>();
    for (const equipment of profile.equipment) {
      const definition = ITEM_MAP[equipment.defId];
      ensure(
        !!definition && definition.slot === equipment.slot,
        `${profile.id} has invalid ${equipment.defId} equipment.`,
      );
      integer(equipment.level, `${profile.id} equipment levels must be from 1 to 3.`, 1, 3);
      ensure(!equipmentIds.has(equipment.uid), `${profile.id} repeats item uid ${equipment.uid}.`);
      equipmentIds.add(equipment.uid);
      ensure(
        profile.anatomy.slots.includes(equipment.slot),
        `${profile.id} lacks a ${equipment.slot} slot.`,
      );
      equipmentCounts.set(equipment.slot, (equipmentCounts.get(equipment.slot) ?? 0) + 1);
    }
    for (const [slot, count] of equipmentCounts)
      ensure(
        count <= profile.anatomy.slots.filter((partSlot) => partSlot === slot).length,
        `${profile.id} has more ${slot} equipment than anatomy.`,
      );
    ensure(!!profile.presentation.artKey, `${profile.id} needs a presentation key.`);
    finite(
      profile.presentation.scale,
      `${profile.id} presentation scale must be positive.`,
      Number.MIN_VALUE,
    );
  }

  const procedureIds = new Set<string>();
  for (const procedure of PROCEDURES) {
    ensure(!procedureIds.has(procedure.id), `duplicate procedure id ${procedure.id}.`);
    ensure(
      !!procedure.name && !!procedure.quote,
      `${procedure.id} needs an authored name and quote.`,
    );
    procedureIds.add(procedure.id);
    integer(procedure.price, `${procedure.id} price must be a nonnegative integer.`, 0);
    integer(
      procedure.minFloor,
      `${procedure.id} minimum floor must be a positive integer.`,
      1,
      100,
    );
    for (const change of [...(procedure.add ?? []), ...(procedure.remove ?? [])]) {
      ensure(
        Object.hasOwn(SLOT_DEFINITIONS, change.slot),
        `${procedure.id} refers to an unknown anatomy slot.`,
      );
      integer(change.count, `${procedure.id} anatomy counts must be positive integers.`);
    }
    for (const addition of procedure.add ?? [])
      if (addition.variant)
        ensure(
          Object.hasOwn(VARIANT_DEFINITIONS, addition.variant),
          `${procedure.id} adds an unknown anatomy variant.`,
        );
  }

  const setIds = new Set<string>(),
    abilityIds = new Set<string>();
  for (const definition of SET_DEFINITIONS) {
    ensure(!setIds.has(definition.id), `duplicate set id ${definition.id}.`);
    setIds.add(definition.id);
    const thresholds = new Set<number>();
    let last = 0;
    for (const bonus of definition.bonuses) {
      integer(bonus.pieces, `${definition.id} thresholds must be positive integers.`);
      ensure(
        !thresholds.has(bonus.pieces) && bonus.pieces > last,
        `${definition.id} thresholds must be unique and ascending.`,
      );
      thresholds.add(bonus.pieces);
      last = bonus.pieces;
      ensure(!abilityIds.has(bonus.ability.id), `duplicate set ability id ${bonus.ability.id}.`);
      abilityIds.add(bonus.ability.id);
      ability(bonus.ability, bonus.ability.id);
    }
  }
  for (const [variant, definition] of Object.entries(VARIANT_DEFINITIONS))
    for (const [slot, abilities] of Object.entries(definition.abilities ?? {}))
      for (const abilityDef of abilities ?? []) ability(abilityDef, `${variant} ${slot} ability`);
}
