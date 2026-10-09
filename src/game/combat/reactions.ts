import type { Reaction, Selector } from '../types';
import type { CombatAbility, CombatEvent } from './types';

export function reactionsFor(ability: CombatAbility): Reaction[] {
  return [
    ...(ability.def.reactions ?? []),
    ...(ability.level === 3 ? (ability.def.lv3 ?? []) : []),
  ];
}

export function matchesReaction(ability: CombatAbility, rule: Reaction, event: CombatEvent) {
  const source = event.source;
  return (
    rule.event === event.kind &&
    (!rule.own || source?.uid === ability.uid) &&
    (!rule.source || source?.source.kind === rule.source) &&
    (!rule.tag || source?.def.tags.includes(rule.tag)) &&
    (!rule.type || source?.def.type === rule.type) &&
    (!rule.slot || source?.slot === rule.slot)
  );
}

export function matchesSelector(
  candidate: CombatAbility,
  origin: CombatAbility,
  selector: Selector,
) {
  // Set passives listen to events but aren't accidental equipment trigger targets.
  // Explicit self/source selectors can target them when a rule asks for it.
  const sourceMatches =
    selector.self ||
    selector.source === 'any' ||
    (selector.source ? candidate.source.kind === selector.source : candidate.source.kind !== 'set');
  return (
    sourceMatches &&
    (!selector.self || candidate === origin) &&
    (!selector.other || candidate !== origin) &&
    (!selector.type || candidate.def.type === selector.type) &&
    (!selector.tag || candidate.def.tags.includes(selector.tag)) &&
    (!selector.slot || candidate.slot === selector.slot)
  );
}
