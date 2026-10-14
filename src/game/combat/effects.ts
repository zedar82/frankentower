import { LEVEL_SCALE } from '../abilities';
import { count, statsFromCompiled } from '../anatomy';
import { ARM_STRIKE_TIME } from '../attack-motion';
import { successes, type Random } from '../random';
import type { Effect, Selector } from '../types';
import type { Actor, CombatAbility, CombatEvent, Job, LogEntry } from './types';

// The effect executor can request combat operations without owning the queue,
// clocks, movement, or causal-branch lifecycle.
export interface EffectEngine {
  actors: Actor[];
  time: number;
  rng: Random;
  select(actor: Actor, origin: CombatAbility, selector?: Selector): CombatAbility[];
  hit(
    actor: Actor,
    target: Actor,
    node: CombatAbility,
    amount: number,
    ancestry: string[],
    direct: boolean,
    crit: number,
  ): void;
  log(
    kind: LogEntry['kind'],
    actor: Actor,
    text: string,
    ancestry?: string[],
    extra?: Partial<LogEntry>,
  ): void;
  emit(actor: Actor, event: CombatEvent): void;
  enqueue(job: Job): void;
}

export function resolveEffect(
  engine: EffectEngine,
  actor: Actor,
  node: CombatAbility,
  effect: Effect,
  ancestry: string[],
  targets: Actor[],
  preferred?: string,
) {
  if (actor.hp <= 0) return;
  const rolls =
    effect.chance === undefined ? 1 : successes(effect.chance * actor.stats.chance, engine.rng);
  for (let r = 0; r < rolls; r++) {
    const scale = LEVEL_SCALE[node.level];
    const amount =
      ('amount' in effect ? effect.amount : 0) *
      (effect.kind === 'cdr' || effect.kind === 'trigger' || effect.kind === 'stat' ? 1 : scale) *
      ('per' in effect && effect.per ? count(actor.build, effect.per) : 1);
    switch (effect.kind) {
      case 'damage':
        for (const target of targets.filter((candidate) => candidate.hp > 0)) {
          const tiers = effect.direct
            ? successes(actor.stats.crit * actor.stats.chance, engine.rng)
            : 0;
          const value =
            (amount + (actor.shield > 0 ? (effect.shieldBonus ?? 0) * scale : 0)) *
            (actor.build.powerFactor ?? 1) *
            (1 + tiers);
          engine.hit(actor, target, node, value, ancestry, effect.direct ?? false, tiers);
        }
        break;
      case 'bleed':
      case 'poison':
        for (const target of targets.filter((candidate) => candidate.hp > 0)) {
          target[effect.kind] += amount;
          // Poison is one target-owned pool. The latest applicator owns its
          // actor-level damage credit; ticks do not split by item source.
          if (effect.kind === 'poison') target.poisonOwner = actor.id;
          engine.log(
            'status',
            actor,
            `${node.def.name}: +${Math.round(amount)} ${effect.kind} on ${target.build.name}.`,
            ancestry,
            { target: target.id, ability: node.uid, value: amount, status: effect.kind },
          );
          if (effect.kind === 'poison')
            engine.emit(actor, {
              kind: 'poison',
              source: node,
              target: target.id,
              ancestry,
              value: amount,
            });
        }
        break;
      case 'heal': {
        const healed = Math.max(0, Math.min(amount, actor.stats.maxHp - actor.hp));
        if (healed > 0) {
          actor.hp += healed;
          actor.healing += healed;
          node.healing += healed;
          engine.log('heal', actor, `${node.def.name} heals ${Math.round(healed)}.`, ancestry, {
            ability: node.uid,
            value: healed,
          });
          engine.emit(actor, {
            kind: 'heal',
            source: node,
            ancestry,
            value: healed,
            target: preferred,
          });
        }
        break;
      }
      case 'shield':
        actor.shield += amount;
        node.shielding += amount;
        engine.log('shield', actor, `${node.def.name}: +${Math.round(amount)} Shield.`, ancestry, {
          value: amount,
          ability: node.uid,
        });
        break;
      case 'mana': {
        const gain = Math.min(amount, actor.stats.maxMana - actor.mana);
        actor.mana += gain;
        if (gain > 0) {
          engine.log('resource', actor, `${node.def.name}: +${Math.round(gain)} Mana.`, ancestry, {
            value: gain,
            ability: node.uid,
          });
          engine.emit(actor, {
            kind: 'mana',
            source: node,
            ancestry,
            value: gain,
            target: preferred,
          });
        }
        break;
      }
      case 'stat':
        actor.modifiers[effect.stat] = (actor.modifiers[effect.stat] ?? 0) + amount;
        actor.stats = statsFromCompiled(actor.compiledStats, actor.mana, actor.modifiers);
        actor.hp = Math.min(actor.hp, actor.stats.maxHp);
        actor.mana = Math.min(actor.mana, actor.stats.maxMana);
        break;
      case 'trigger':
        for (const other of engine.select(actor, node, effect.select)) {
          engine.enqueue({ actor, node: other, ancestry, target: preferred });
        }
        break;
      case 'cdr':
        for (const other of engine.select(actor, node, effect.select)) {
          if (!Number.isFinite(other.remaining)) continue;
          const remaining = Math.max(
            0,
            effect.percent ? other.remaining * (1 - amount) : other.remaining - amount,
          );
          other.remaining = remaining;
          // Direct reductions advance the pose too, preserving immediate CDR/trigger semantics.
          if (other.strike) {
            other.strike.impactAt = engine.time + remaining / other.strike.rate;
            other.strike.startedAt = other.strike.impactAt - ARM_STRIKE_TIME;
          }
          if (remaining <= 0) engine.enqueue({ actor, node: other, ancestry, target: preferred });
        }
        break;
      default: {
        const unhandled: never = effect;
        throw new Error(`Unsupported effect: ${JSON.stringify(unhandled)}`);
      }
    }
  }
}
