import { Random, successes } from './random';
import { ARM_STRIKE_TIME } from './attack-motion';
import {
  clone,
  type Build,
  type CombatOutcome,
  type CompletedFightReport,
  type Effect,
  type FightActorReport,
  type Selector,
  type Targeting,
} from './types';
import type {
  Actor,
  CombatAbility,
  CombatEvent,
  CombatFeedback,
  Job,
  LogEntry,
} from './combat/types';
import { createCombatActors, refreshCirculation } from './combat/formation';
import { ITEM_MAP, type ItemCatalog } from './content';
import { matchesReaction, matchesSelector, reactionsFor } from './combat/reactions';
import { resolveEffect } from './combat/effects';
import {
  attackRange,
  attackStyle,
  distance,
  moveActors,
  hostile,
  usesArmStrike,
} from './combat/spatial';
export type { Actor, CombatAbility, CombatFeedback, LogEntry } from './combat/types';
export {
  ARENA,
  armMotion,
  attackRange,
  attackStyle,
  distance,
  usesArmStrike,
} from './combat/spatial';
// Long unresolved encounters end as a win for a surviving player. Keep this
// separate from runToEnd's optional diagnostic horizon.
export const COMBAT_STALEMATE_SECONDS = 160;
export class Combat {
  actors: Actor[];
  time = 0;
  logs: LogEntry[] = [];
  feedback: CombatFeedback[] = [];
  logTruncated = false;
  rng: Random;
  done = false;
  won = false;
  outcome: CombatOutcome = 'ongoing';
  suppressed = 0;
  failure?: string;
  private serial = 0;
  private jobs: Job[] = [];
  private tickAccumulator = 0;
  constructor(player: Build, enemies: Build[], seed: number, hp?: number, itemCatalog: ItemCatalog = ITEM_MAP) {
    this.rng = new Random(seed);
    this.actors = createCombatActors(player, enemies, hp, itemCatalog);
    for (const actor of this.actors) this.emit(actor, { kind: 'start', ancestry: [] });
    this.drain();
    this.checkEnd();
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
  private selectTargets(
    actor: Actor,
    node: CombatAbility,
    preferred?: string,
    targeting: Targeting = node.def.targeting ?? { kind: 'single' },
    includeDeadCenter = false,
  ): Actor[] {
    const enemies = this.actors.filter((a) => a.side !== actor.side && a.hp > 0);
    const ordered = [...enemies].sort((a, b) => distance(actor, a) - distance(actor, b));
    const inReach = (candidate: Actor) =>
      distance(actor, candidate) <= attackRange(actor, candidate, node.def);
    const preferredActor = preferred
      ? this.actors.find(
          (a) => a.id === preferred && a.side !== actor.side && (includeDeadCenter || a.hp > 0),
        )
      : undefined;
    if (targeting.kind === 'single') {
      const selected =
        preferredActor && (includeDeadCenter || inReach(preferredActor))
          ? preferredActor
          : ordered.find(inReach);
      return selected ? [selected] : [];
    }
    if (targeting.kind === 'count') {
      const candidates = ordered.filter(inReach);
      return candidates.slice(0, Math.max(0, Math.floor(targeting.count)));
    }
    if (targeting.center === 'self') {
      return enemies.filter((candidate) => distance(actor, candidate) <= targeting.radius);
    }
    const center =
      preferredActor && (includeDeadCenter || inReach(preferredActor))
        ? preferredActor
        : ordered.find(inReach);
    return center
      ? enemies.filter((candidate) => distance(center, candidate) <= targeting.radius)
      : [];
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
    if (this.logs.length > 400) {
      this.logs.shift();
      this.logTruncated = true;
    }
    if (
      entry.kind === 'damage' ||
      entry.kind === 'heal' ||
      entry.kind === 'shield' ||
      entry.kind === 'status'
    ) {
      const { id, time, kind, actor, value, crit, x, y, tx, ty, shieldBreak, attack, status } =
        entry;
      this.feedback.push({
        id,
        time,
        kind,
        actor,
        value,
        crit,
        x,
        y,
        tx,
        ty,
        shieldBreak,
        attack,
        status,
      });
      if (this.feedback.length > 64) this.feedback.shift();
    }
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
        for (let n = 0; n < times; n++) {
          const targeting = rule.targeting ?? node.def.targeting;
          const targets = selfActivation
            ? undefined
            : targeting
              ? this.selectTargets(actor, node, event.target, targeting, true).map((a) => a.id)
              : event.target
                ? [event.target]
                : this.selectTargets(actor, node).map((a) => a.id);
          this.jobs.push({
            actor,
            node,
            effects: selfActivation ? undefined : rule.effects,
            reactionId: selfActivation ? undefined : (rule.id ?? `reaction-${index}`),
            ancestry: event.ancestry,
            target: event.target,
            targets,
            targeting,
          });
        }
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
    lockedTargets?: string[],
    targeting?: Targeting,
  ) {
    if (actor.hp <= 0) return;
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
    const selected = lockedTargets
      ? lockedTargets
          .map((id) => this.actors.find((candidate) => candidate.id === id))
          .filter((candidate): candidate is Actor => !!candidate && candidate.side !== actor.side)
      : this.selectTargets(actor, node, target, targeting ?? node.def.targeting);
    if (hostile(actions) && selected.length === 0) return;
    const primaryTarget = target ?? selected[0]?.id;
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
      select: (actor, origin, selector) => this.select(actor, origin, selector),
      hit: (...args) => this.hit(...args),
      log: (...args) => this.log(...args),
      emit: (...args) => this.emit(...args),
      enqueue: (job) => this.jobs.push(job),
    } satisfies import('./combat/effects').EffectEngine;
    for (const effect of actions)
      resolveEffect(engine, actor, node, effect, branch, selected, primaryTarget);
    if (!supplemental)
      this.emit(actor, {
        kind: 'activated',
        source: node,
        ancestry: branch,
        target: primaryTarget,
      });
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
      this.activate(
        job.actor,
        job.node,
        job.ancestry,
        job.effects,
        job.target,
        job.reactionId,
        job.targets,
        job.targeting,
      );
      if (this.player.hp <= 0 || this.enemies.every((e) => e.hp <= 0)) break;
    }
    if (i >= 50000) {
      this.failure = 'This trigger network exceeded the simulation budget.';
      this.done = true;
      this.outcome = 'failure';
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
      refreshCirculation(actor);
      const rate = actor.stats.efficiency * actor.stats.speed;
      for (const node of actor.abilities) {
        if (!node.strike) {
          const before = node.remaining;
          node.remaining = Math.max(0, before - delta * rate);
          const targets = this.selectTargets(actor, node);
          if (
            usesArmStrike(node) &&
            rate > 0 &&
            node.remaining <= ARM_STRIKE_TIME * rate &&
            targets.length > 0
          ) {
            const startedAt =
              this.time - delta + Math.max(0, (before - ARM_STRIKE_TIME * rate) / rate);
            node.strike = {
              startedAt,
              impactAt: startedAt + ARM_STRIKE_TIME,
              rate,
              facing: actor.facing,
              targets: targets.map((candidate) => candidate.id),
            };
          }
        }
        if (node.strike)
          node.remaining = Math.max(0, (node.strike.impactAt - this.time) * node.strike.rate);
        if (node.remaining <= 1e-8)
          this.jobs.push({
            actor,
            node,
            ancestry: [],
            targets: node.strike?.targets,
          });
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
            // Generic pool tick: current reactions match poisonTick, not an item.
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
    if (this.failure) {
      this.done = true;
      this.outcome = 'failure';
      return;
    }
    if (this.player.hp <= 0 || this.enemies.every((e) => e.hp <= 0)) {
      this.done = true;
      this.won = this.player.hp > 0;
      this.outcome = this.won ? 'victory' : 'defeat';
      return;
    }
    if (this.time >= COMBAT_STALEMATE_SECONDS) {
      this.done = true;
      this.won = this.player.hp > 0;
      this.outcome = this.won ? 'stalemate' : 'defeat';
    }
  }
  runToEnd(maxTime = COMBAT_STALEMATE_SECONDS) {
    while (!this.done && this.time < maxTime) this.step();
    return this.won;
  }
  completedReport(floor: number, seed: number): CompletedFightReport {
    if (!this.done || this.outcome === 'ongoing' || this.outcome === 'failure')
      throw new Error('Only a completed fight can be saved as a report.');
    const snapshot = (actor: Actor): FightActorReport => ({
      build: clone(actor.build),
      hp: actor.hp,
      maxHp: actor.stats.maxHp,
      mana: actor.mana,
      maxMana: actor.stats.maxMana,
      damage: actor.damage,
      healing: actor.healing,
      ...(actor.diedAt === undefined ? {} : { diedAt: actor.diedAt }),
    });
    return {
      floor,
      seed,
      outcome: this.outcome,
      duration: this.time,
      patient: snapshot(this.player),
      enemies: this.enemies.map(snapshot),
      contributions: this.player.abilities.map((ability) => ({
        uid: ability.uid,
        name: ability.def.name,
        level: ability.level,
        activations: ability.activations,
        damage: ability.damage,
        healing: ability.healing,
        shielding: ability.shielding,
      })),
      suppressed: this.suppressed,
      transcript: this.logs.map((entry) => ({
        ...entry,
        chain: this.chainNames(entry.chain),
      })),
      transcriptTruncated: this.logTruncated,
    };
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
