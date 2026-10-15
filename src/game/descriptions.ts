import { LEVEL_SCALE } from './abilities';
import type { AbilityDef, Effect, ItemDef, Reaction, Slot, Stat } from './types';

const slotPlural: Record<Slot, string> = {
  hand: 'Hands',
  head: 'Heads',
  foot: 'Feet',
  chest: 'Chests',
  heart: 'Hearts',
};
const slotSingular: Record<Slot, string> = {
  hand: 'hand',
  head: 'head',
  foot: 'foot',
  chest: 'chest',
  heart: 'heart',
};

const format = (value: number) => String(Math.round(value * 100) / 100);
const statLabel: Record<Stat, string> = {
  armour: 'Armour',
  speed: 'Activation speed',
  crit: 'Critical chance',
  chance: 'Chance amplification',
  capacity: 'Circulation capacity',
  maxHp: 'Maximum health',
  maxMana: 'Maximum Mana',
};
const effectUnit: Partial<Record<Effect['kind'], string>> = {
  damage: 'damage',
  bleed: 'Bleed',
  poison: 'Poison',
  heal: 'HP',
  shield: 'Shield',
  mana: 'Mana',
};

function selectorLabel(
  select: NonNullable<Extract<Effect, { kind: 'trigger' | 'cdr' }>['select']>,
) {
  if (select.self) return 'this item';
  const category = select.type
    ? { singular: `${select.type} item`, plural: `${select.type} items` }
    : select.tag
      ? { singular: `${select.tag} item`, plural: `${select.tag} items` }
      : select.slot
        ? {
            singular: `${slotPlural[select.slot]} item`,
            plural: `${slotPlural[select.slot]} items`,
          }
        : undefined;
  const target = category?.singular ?? 'eligible item';
  if (select.random) return `a random ${select.other ? 'other ' : ''}${target}`;
  if (select.longest)
    return `the ${select.other ? 'other ' : ''}${target} with the longest remaining cooldown`;
  return `${select.other ? 'other ' : ''}${category?.plural ?? 'eligible items'}`;
}

function effectText(effect: Effect, scale: number): string {
  if (effect.kind === 'trigger') return `activate ${selectorLabel(effect.select ?? {})}`;
  if (effect.kind === 'cdr')
    return `reduce cooldown of ${selectorLabel(effect.select ?? {})} by ${format(effect.amount * (effect.percent ? 100 : 1))}${effect.percent ? '%' : 's'}`;
  if (effect.kind === 'stat') {
    const amount = effect.amount * (effect.stat === 'speed' || effect.stat === 'chance' ? 100 : 1);
    return `${amount >= 0 ? 'gain' : 'lose'} ${format(Math.abs(amount))}${['speed', 'chance', 'crit'].includes(effect.stat) ? '%' : ''} ${statLabel[effect.stat]}`;
  }
  const amount = format(effect.amount * scale);
  const per = 'per' in effect && effect.per ? ` per ${slotSingular[effect.per]}` : '';
  const cost = effect.cost === undefined ? '' : `spend ${effect.cost} Mana to `;
  const verb =
    effect.kind === 'damage'
      ? 'deal'
      : effect.kind === 'bleed' || effect.kind === 'poison'
        ? 'apply'
        : effect.kind === 'heal'
          ? 'heal'
          : effect.kind === 'shield'
            ? 'gain'
            : 'gain';
  const bonus =
    effect.kind === 'damage' && effect.shieldBonus !== undefined
      ? ` (+${format(effect.shieldBonus * scale)} while Shielded)`
      : '';
  return `${cost}${verb} ${amount} ${effectUnit[effect.kind] ?? effect.kind}${bonus}${per ? `${per}${effect.per === 'foot' ? ' slot' : ''}` : ''}`;
}

function targetingText(targeting: NonNullable<AbilityDef['targeting']>): string | undefined {
  if (targeting.kind === 'count') return `Targets ${targeting.count} enemies.`;
  if (targeting.kind === 'area')
    return `Affects enemies within ${targeting.radius} units of ${targeting.center === 'self' ? 'the user' : 'the target'}.`;
  return undefined;
}

function reactionText(reaction: Reaction, scale: number): string {
  const subject = [
    reaction.own ? 'own' : '',
    reaction.type,
    reaction.tag,
    reaction.slot ? slotPlural[reaction.slot] : '',
    reaction.source ? `${reaction.source}-sourced` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const when = `${subject ? `${subject} ` : ''}${reaction.event.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}`;
  const chance = reaction.chance === undefined ? '' : ` (${reaction.chance}% chance)`;
  const targeting = reaction.targeting ? targetingText(reaction.targeting) : undefined;
  return `When ${when}${chance}: ${reaction.effects.map((effect) => `${effectText(effect, scale)}${effect.chance === undefined ? '' : ` (${effect.chance}% chance)`}`).join(', then ')}.${targeting ? ` ${targeting}` : ''}`;
}

/** User-facing factual rules, derived from the same fields used by combat. */
export function describeAbilityRules(
  def: AbilityDef & { requires?: ItemDef['requires'] },
  level = 1,
): string {
  const scale = LEVEL_SCALE[level] ?? 1;
  const lines: string[] = [];
  if ('requires' in def && def.requires)
    lines.push(`Requires ${def.requires.count} ${slotPlural[def.requires.slot].toLowerCase()}.`);
  if (def.cooldown !== undefined) lines.push(`Cooldown: ${format(def.cooldown)}s.`);
  const targeting = targetingText(def.targeting ?? { kind: 'single' });
  if (targeting) lines.push(targeting);
  // Passive equipment stats scale with level; runtime stat effects retain their authored amount.
  for (const [stat, value] of Object.entries(def.stats ?? {}))
    lines.push(`${effectText({ kind: 'stat', stat: stat as Stat, amount: value * scale }, 1)}.`);
  for (const effect of def.effects ?? [])
    lines.push(
      `${effectText(effect, scale)}${effect.chance === undefined ? '' : ` (${effect.chance}% chance)`}.`,
    );
  for (const reaction of def.reactions ?? []) lines.push(reactionText(reaction, scale));
  if (level === 3)
    for (const reaction of def.lv3 ?? []) lines.push(`Signature: ${reactionText(reaction, scale)}`);
  return lines.join('\n') || 'No direct effects or passive stats.';
}

export function describeItemRules(def: ItemDef, level: number): string {
  return describeAbilityRules(def, level);
}

export function describeSignature(def: ItemDef): string {
  const rules = (def.lv3 ?? []).map((reaction) => reactionText(reaction, LEVEL_SCALE[3]));
  return rules.join('\n') || 'No level 3 effect.';
}
