import { stats, count } from './anatomy';
import { buildAbilities } from './abilities';
import { Random, successes } from './random';
import { ARM_STRIKE_TIME } from './attack-motion';
import { clone, type Build, type Effect, type Selector } from './types';
import type { Actor, CombatAbility, CombatEvent, Job, LogEntry } from './combat/types';
import { matchesReaction, matchesSelector, reactionsFor } from './combat/reactions';
import { resolveEffect } from './combat/effects';
import {
  attackRange,
  attackStyle,
  distance,
  moveActors,
  offensive,
  usesArmStrike,
} from './combat/spatial';
export type { Actor, CombatAbility, LogEntry } from './combat/types';
export {
  ARENA,
  armMotion,
  attackRange,
  attackStyle,
  distance,
  usesArmStrike,
} from './combat/spatial';
export class Combat {
  actors: Actor[];
  time = 0;
  logs: LogEntry[] = [];
  rng: Random;
  done = false;
  won = false;
  suppressed = 0;
  failure?: string;
  private serial = 0;
  private jobs: Job[] = [];
  private tickAccumulator = 0;
  constructor(player: Build, enemies: Build[], seed: number, hp?: number) {
    this.rng = new Random(seed);
    this.actors = [
      this.makeActor(player, 'player', 'player', hp),
      ...enemies.map((b, i) => this.makeActor(b, 'enemy', `enemy-${i}`)),
    ];
    this.player.x = 185;
    this.player.y = 250;
    this.enemies.forEach((a, i) => {
      const angle = (i - (enemies.length - 1) / 2) * 0.58;
      a.x = 410 + Math.cos(angle) * 65;
      a.y = 238 + Math.sin(angle) * 100;
    });
    for (const actor of this.actors) this.emit(actor, { kind: 'start', ancestry: [] });
    this.drain();
    this.checkEnd();
  }
  private makeActor(build: Build, side: Actor['side'], id: string, hp?: number): Actor {
    build = clone(build);
    const s = stats(build);
    const abilities: CombatAbility[] = buildAbilities(build).map((ability) => ({
      ...ability,
      remaining: ability.def.cooldown ?? Infinity,
      activations: 0,
      damage: 0,
      healing: 0,
      shielding: 0,
      lastActivated: -10,
    }));
    return {
      id,
      side,
      build,
      stats: s,
      hp: Math.min(s.maxHp, hp ?? s.maxHp),
      mana: s.maxMana,
      shield: 0,
      bleed: 0,
      poison: 0,
      abilities,
      modifiers: {},
      damage: 0,
      healing: 0,
      lastHit: -10,
      lastAction: -10,
      x: 320,
      y: 238,
      vx: 0,
      vy: 0,
      radius:
        20 + Math.min(8, count(build, 'foot')) + Math.min(6, Math.max(0, count(build, 'hand') - 2)),
      facing: side === 'player' ? 1 : -1,
      walked: 0,
      windup: 0,
    };
  }
  get player() {
    return this.actors[0];
  }
  get enemies() {
    return this.actors.slice(1);
  }
  target(actor: Actor, preferred?: string): Actor | undefined {
    return (
      this.actors.find((a) => a.id === preferred && a.side !== actor.side && a.hp > 0) ??
      this.actors
        .filter((a) => a.side !== actor.side && a.hp > 0)
        .sort((a, b) => distance(actor, a) - distance(actor, b))[0]
    );
  }
  private log(
    kind: LogEntry['kind'],
    actor: Actor,
    text: string,
    ancestry: string[] = [],
    extra: Partial<LogEntry> = {},
  ) {
    const target = this.actors.find((a) => a.id === extra.target);
    const entry: LogEntry = {
      id: ++this.serial,
      time: this.time,
      kind,
      actor: actor.id,
      text,
      chain: ancestry,
      x: actor.x,
      y: actor.y,
      tx: target?.x,
      ty: target?.y,
      ...extra,
    };
    this.logs.push(entry);
    if (this.logs.length > 400) this.logs.shift();
  }
  private emit(actor: Actor, event: CombatEvent) {
    if (actor.hp <= 0) return;
    for (const node of actor.abilities)
      for (const [index, rule] of reactionsFor(node).entries()) {
        if (!matchesReaction(node, rule, event)) continue;
        const times =
          rule.chance === undefined ? 1 : successes(rule.chance * actor.stats.chance, this.rng);
        const selfActivation =
          rule.effects.length === 1 &&
          rule.effects[0].kind === 'trigger' &&
          rule.effects[0].select?.self;
        for (let n = 0; n < times; n++)
          this.jobs.push({
            actor,
            node,
            effects: selfActivation ? undefined : rule.effects,
            reactionId: selfActivation ? undefined : (rule.id ?? `reaction-${index}`),
            ancestry: event.ancestry,
            target: event.target,
          });
      }
  }
  select(actor: Actor, origin: CombatAbility, selector: Selector = {}) {
    let items = actor.abilities.filter((candidate) => matchesSelector(candidate, origin, selector));
    if (selector.longest) {
      items = items.filter((n) => Number.isFinite(n.remaining));
      items.sort((a, b) => b.remaining - a.remaining);
      return items.slice(0, 1);
    }
    return selector.random && items.length ? [this.rng.pick(items)] : items;
  }
  // Each branch owns its ancestry. Siblings never mutate or share an activation set.
  activate(
    actor: Actor,
    node: CombatAbility,
    ancestry: string[] = [],
    effects?: Effect[],
    target?: string,
    reactionId?: string,
  ) {
    if (actor.hp <= 0 || !this.target(actor, target)) return;
    const key = `${actor.id}:${node.uid}`;
    const reactionKey = reactionId ? `${key}#${reactionId}` : key;
    if (ancestry.includes(reactionKey)) {
      this.suppressed++;
      this.log(
        'suppressed',
        actor,
        `Recursive ${reactionId ? 'reaction' : 'activation'} suppressed: ${node.def.name}`,
        [...ancestry, reactionKey],
        { ability: node.uid },
      );
      return;
    }
    // A passive On Hit/On Crit rule belongs to its originating activation. It
    // may resolve once without pretending the item activated a second time.
    const supplemental = !!reactionId && ancestry.includes(key);
    const branch = [
      ...ancestry,
      ...(supplemental ? [] : [key]),
      ...(reactionId ? [reactionKey] : []),
    ];
    const actions = effects ?? node.def.effects ?? [];
    // An explicit trigger still resolves immediately. A normal strike reaches this method at contact.
    const strike = node.strike;
    if (!effects) node.strike = undefined;
    const opponent = this.target(actor, target)!;
    // Reactions retain their causal ancestry, but physical attacks still need reach.
    if (offensive(actions) && distance(actor, opponent) > attackRange(actor, opponent, node.def))
      return;
    const cost = actions.reduce((sum, e) => sum + (e.cost ?? 0), 0);
    if (actor.mana < cost) {
      if (!effects) node.remaining = node.def.cooldown ?? Infinity;
      this.log('resource', actor, `${node.def.name}: needs ${cost} Mana.`, branch, {
        ability: node.uid,
      });
      return;
    }
    actor.mana -= cost;
    if (!effects) node.remaining = node.def.cooldown ?? Infinity;
    if (!supplemental) {
      node.activations++;
      node.lastActivated = this.time;
      node.lastStrikeFacing = strike?.facing ?? actor.facing;
    }
    actor.lastAction = this.time;
    this.log(
      'activation',
      actor,
      `${node.def.name} activated${effects ? ' by reaction' : ancestry.length ? ' by trigger' : ''}.`,
      branch,
      { ability: node.uid },
    );
    const engine = {
      actors: this.actors,
      time: this.time,
      rng: this.rng,
      target: (actor, preferred) => this.target(actor, preferred),
      select: (actor, origin, selector) => this.select(actor, origin, selector),
      hit: (...args) => this.hit(...args),
      log: (...args) => this.log(...args),
      emit: (...args) => this.emit(...args),
      enqueue: (job) => this.jobs.push(job),
    } satisfies import('./combat/effects').EffectEngine;
    for (const effect of actions) resolveEffect(engine, actor, node, effect, branch, target);
    if (!supplemental)
      this.emit(actor, { kind: 'activated', source: node, ancestry: branch, target });
  }
  hit(
    actor: Actor,
    target: Actor,
    node: CombatAbility,
    amount: number,
    ancestry: string[] = [],
    direct = true,
    crit = 0,
  ) {
    if (target.hp <= 0) return;
    const afterArmour = Math.max(0, amount - target.stats.armour);
    const shielding = direct ? target.shield : 0;
    const dealt = Math.max(0, afterArmour - shielding);
    if (direct) target.shield = 0;
    this.log(
      'damage',
      actor,
      `${node.def.name} → ${target.build.name}: ${Math.round(dealt)}${crit ? ` (Crit ×${crit + 1})` : ''}${dealt === 0 ? ' (blocked)' : ''}.`,
      ancestry,
      {
        target: target.id,
        ability: node.uid,
        value: dealt,
        crit,
        shieldBreak: shielding > 0,
        attack: direct ? attackStyle(node.def) : undefined,
      },
    );
    if (direct && dealt <= 0)
      this.emit(target, { kind: 'block', source: node, ancestry, target: actor.id });
    if (dealt > 0) {
      const actual = Math.min(target.hp, dealt);
      target.hp -= actual;
      actor.damage += actual;
      node.damage += actual;
      target.lastHit = this.time;
      if (target.hp > 0)
        this.emit(target, {
          kind: 'hurt',
          source: node,
          ancestry,
          value: actual,
          target: actor.id,
        });
      if (direct) {
        this.emit(actor, { kind: 'hit', source: node, ancestry, value: actual, target: target.id });
        if (crit)
          this.emit(actor, {
            kind: 'crit',
            source: node,
            ancestry,
            value: crit,
            target: target.id,
          });
        if (target.bleed > 0 && target.hp > 0) {
          const bleeding = Math.min(target.hp, target.bleed);
          target.hp -= bleeding;
          actor.damage += bleeding;
          node.damage += bleeding;
          this.log(
            'damage',
            actor,
            `Bleed → ${target.build.name}: ${Math.round(bleeding)}.`,
            ancestry,
            { target: target.id, ability: node.uid, value: bleeding },
          );
          this.emit(actor, {
            kind: 'bleed',
            source: node,
            ancestry,
            value: bleeding,
            target: target.id,
          });
        }
      }
    }
    if (target.hp <= 0) {
      this.log('death', target, `${target.build.name} has died.`, ancestry);
      this.emit(actor, { kind: 'kill', source: node, ancestry, target: target.id });
    }
  }
  private drain() {
    let i = 0;
    while (i < this.jobs.length && i < 50000) {
      const job = this.jobs[i++];
      this.activate(job.actor, job.node, job.ancestry, job.effects, job.target, job.reactionId);
      if (this.player.hp <= 0 || this.enemies.every((e) => e.hp <= 0)) break;
    }
    if (i >= 50000) {
      this.failure = 'This trigger network exceeded the simulation budget.';
      this.done = true;
      this.log('resource', this.player, this.failure);
    }
    this.jobs = [];
  }
  step(delta = 0.05) {
    if (this.done) return;
    this.time += delta;
    this.tickAccumulator += delta;
    moveActors(this.actors, this.time, delta, (actor) => this.target(actor));
    for (const actor of this.actors.filter((a) => a.hp > 0)) {
      const normal = stats(actor.build, actor.mana, actor.modifiers);
      actor.stats.capacity = normal.capacity;
      actor.stats.efficiency = normal.efficiency;
      const rate = actor.stats.efficiency * actor.stats.speed;
      for (const node of actor.abilities) {
        if (!node.strike) {
          const before = node.remaining;
          node.remaining = Math.max(0, before - delta * rate);
          const target = this.target(actor);
          if (
            usesArmStrike(node) &&
            rate > 0 &&
            node.remaining <= ARM_STRIKE_TIME * rate &&
            target &&
            distance(actor, target) <= attackRange(actor, target, node.def)
          ) {
            const startedAt =
              this.time - delta + Math.max(0, (before - ARM_STRIKE_TIME * rate) / rate);
            node.strike = {
              startedAt,
              impactAt: startedAt + ARM_STRIKE_TIME,
              rate,
              facing: actor.facing,
            };
          }
        }
        if (node.strike)
          node.remaining = Math.max(0, (node.strike.impactAt - this.time) * node.strike.rate);
        if (node.remaining <= 1e-8) this.jobs.push({ actor, node, ancestry: [] });
      }
    }
    this.drain();
    this.checkEnd();
    if (this.done) return;
    if (this.tickAccumulator >= 1 - 1e-8) {
      this.tickAccumulator -= 1;
      for (const actor of this.actors.filter((a) => a.hp > 0)) {
        // Normal brains recover 10 Mana/s each; necrotic pumps spend 20 Mana/s each.
        actor.mana = Math.max(
          0,
          Math.min(actor.stats.maxMana, actor.mana + actor.stats.manaPerSecond),
        );
        if (actor.poison > 0) {
          const amount = Math.min(actor.hp, actor.poison);
          actor.hp -= amount;
          actor.lastHit = this.time;
          const owner = this.actors.find((a) => a.id === actor.poisonOwner);
          if (owner) {
            owner.damage += amount;
            this.emit(owner, { kind: 'poisonTick', ancestry: [], target: actor.id, value: amount });
          }
          this.log(
            'damage',
            owner ?? actor,
            `Poison → ${actor.build.name}: ${Math.round(amount)}.`,
            [],
            { target: actor.id, value: amount },
          );
          actor.poison = Math.max(0, actor.poison - 10);
          if (actor.hp <= 0) {
            this.log('death', actor, `${actor.build.name} has died.`);
            if (owner) this.emit(owner, { kind: 'kill', ancestry: [], target: actor.id });
          }
        }
      }
      this.drain();
      this.checkEnd();
    }
    // No permanent stalemates: both teams begin losing 2% maximum HP/s after 90s.
    if (this.time > 90) {
      for (const a of this.actors.filter((a) => a.hp > 0))
        a.hp = Math.max(0, a.hp - a.stats.maxHp * 0.02 * delta);
      this.checkEnd();
    }
  }
  private checkEnd() {
    for (const a of this.actors) if (a.hp <= 0) a.diedAt ??= this.time;
    if (this.player.hp <= 0 || this.enemies.every((e) => e.hp <= 0)) {
      this.done = true;
      this.won = this.player.hp > 0;
    }
  }
  runToEnd(maxTime = 160) {
    while (!this.done && this.time < maxTime) this.step();
    return this.won;
  }
  chainNames(chain: string[]) {
    return chain.map((key) => {
      const node = this.actors
        .flatMap((a) => a.abilities.map((n) => ({ actor: a, node: n })))
        .find(
          (x) =>
            key === `${x.actor.id}:${x.node.uid}` || key.startsWith(`${x.actor.id}:${x.node.uid}#`),
        );
      return node ? node.node.def.name + (key.includes('#') ? ' (reaction)' : '') : key;
    });
  }
}
