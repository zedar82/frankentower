import { ITEM_MAP } from './content';
import { LEVEL_SCALE, equipped, stats, usable, count } from './anatomy';
import { Random, successes } from './random';
import { ARM_STRIKE_TIME, ARM_RECOVERY_TIME, clampProgress, drawbackProgress, type ArmMotion } from './attack-motion';
import { clone, type Build, type Effect, type EventKind, type Item, type ItemDef, type Selector, type Stats } from './types';
export interface ArmStrike { startedAt: number; impactAt: number; rate: number; facing: number }
export interface CombatItem { item: Item; def: ItemDef; slot: string; remaining: number; activations: number; damage: number; healing: number; shielding: number; lastActivated: number; strike?: ArmStrike; lastStrikeFacing?: number }
export interface Actor { id: string; side: 'player' | 'enemy'; build: Build; stats: Stats; hp: number; mana: number; shield: number; bleed: number; poison: number; poisonOwner?: string; items: CombatItem[]; damage: number; healing: number; lastHit: number; lastAction: number; x: number; y: number; vx: number; vy: number; radius: number; facing: number; walked: number; windup: number; windupItem?: string; diedAt?: number }
export interface LogEntry { id: number; time: number; kind: 'damage' | 'heal' | 'shield' | 'activation' | 'status' | 'suppressed' | 'resource' | 'death'; actor: string; target?: string; item?: string; value?: number; text: string; chain: string[]; crit?: number; x: number; y: number; tx?: number; ty?: number; shieldBreak?: boolean; attack?: 'slash' | 'heavy' | 'bolt' | 'arrow'; status?: 'bleed' | 'poison' }
export const ARENA = { width: 640, height: 400, cx: 320, cy: 238, rx: 268, ry: 137 };
export const distance = (a: Pick<Actor, 'x' | 'y'>, b: Pick<Actor, 'x' | 'y'>) => Math.hypot(a.x - b.x, a.y - b.y);
export const attackStyle = (def: ItemDef): LogEntry['attack'] => def.tags.includes('Magical') ? 'bolt' : def.tags.includes('Ranged') ? 'arrow' : def.tags.includes('Blunt') ? 'heavy' : 'slash';
export function attackRange(actor: Actor, target: Actor, def: ItemDef) { return def.tags.includes('Magical') ? 240 : def.tags.includes('Ranged') ? 205 : actor.radius + target.radius + 23; }
const offensive = (effects: Effect[]) => effects.some(e => e.kind === 'damage' && e.direct);
export const usesArmStrike = (node: CombatItem) => node.slot === 'hand' && offensive(node.def.effects ?? []);
export function armMotion(actor: Actor, node: CombatItem, time: number): ArmMotion {
  const rate = actor.stats.speed * actor.stats.efficiency;
  const motion: ArmMotion = { drawback: Number.isFinite(node.def.cooldown) ? drawbackProgress(node.remaining, node.def.cooldown!, rate) : 0, facing: actor.facing };
  if (node.strike) return { ...motion, facing: node.strike.facing, strike: clampProgress((time - node.strike.startedAt) / ARM_STRIKE_TIME) };
  const age = time - node.lastActivated;
  if (age >= 0 && age < ARM_RECOVERY_TIME) return { ...motion, facing: node.lastStrikeFacing ?? actor.facing, recovery: age / ARM_RECOVERY_TIME };
  return motion;
}
interface CombatEvent { kind: EventKind; source?: CombatItem; target?: string; ancestry: string[]; value?: number }
interface Job { actor: Actor; node: CombatItem; ancestry: string[]; effects?: Effect[]; target?: string; reactionId?: string }
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
    this.actors = [this.makeActor(player, 'player', 'player', hp), ...enemies.map((b, i) => this.makeActor(b, 'enemy', `enemy-${i}`))];
    this.player.x = 185; this.player.y = 250;
    this.enemies.forEach((a, i) => { const angle = (i - (enemies.length - 1) / 2) * .58; a.x = 410 + Math.cos(angle) * 65; a.y = 238 + Math.sin(angle) * 100; });
    for (const actor of this.actors) this.emit(actor, { kind: 'start', ancestry: [] });
    this.drain(); this.checkEnd();
  }
  private makeActor(build: Build, side: Actor['side'], id: string, hp?: number): Actor {
    build = clone(build);
    const s = stats(build);
    const items = equipped(build).filter(x => usable(build, x.item)).map(({ item, part }) => {
      const def = ITEM_MAP[item.defId];
      return { item, def, slot: part.slot, remaining: def.cooldown ?? Infinity, activations: 0, damage: 0, healing: 0, shielding: 0, lastActivated: -10 };
    });
    for (const part of build.parts.filter(p => p.variant === 'serpent')) items.push({ item: { uid: `${part.uid}-bite`, defId: 'serpentbite', level: 1 }, def: ITEM_MAP.serpentbite, slot: 'head', remaining: 3, activations: 0, damage: 0, healing: 0, shielding: 0, lastActivated: -10 });
    return { id, side, build, stats: s, hp: Math.min(s.maxHp, hp ?? s.maxHp), mana: s.maxMana, shield: 0, bleed: 0, poison: 0, items, damage: 0, healing: 0, lastHit: -10, lastAction: -10, x: 320, y: 238, vx: 0, vy: 0, radius: 20 + Math.min(8, count(build, 'foot')) + Math.min(6, Math.max(0, count(build, 'hand') - 2)), facing: side === 'player' ? 1 : -1, walked: 0, windup: 0 };
  }
  get player() { return this.actors[0]; }
  get enemies() { return this.actors.slice(1); }
  target(actor: Actor, preferred?: string): Actor | undefined {
    return this.actors.find(a => a.id === preferred && a.side !== actor.side && a.hp > 0) ?? this.actors.filter(a => a.side !== actor.side && a.hp > 0).sort((a, b) => distance(actor, a) - distance(actor, b))[0];
  }
  private log(kind: LogEntry['kind'], actor: Actor, text: string, ancestry: string[] = [], extra: Partial<LogEntry> = {}) {
    const target = this.actors.find(a => a.id === extra.target);
    const entry: LogEntry = { id: ++this.serial, time: this.time, kind, actor: actor.id, text, chain: ancestry, x: actor.x, y: actor.y, tx: target?.x, ty: target?.y, ...extra };
    this.logs.push(entry); if (this.logs.length > 400) this.logs.shift();
  }
  private emit(actor: Actor, event: CombatEvent) {
    if (actor.hp <= 0) return;
    for (const node of actor.items) for (const [index,rule] of [...(node.def.reactions ?? []), ...(node.item.level === 3 ? node.def.lv3 ?? [] : [])].entries()) {
      if (rule.event !== event.kind || rule.own && event.source?.item.uid !== node.item.uid || rule.tag && !event.source?.def.tags.includes(rule.tag) || rule.type && event.source?.def.type !== rule.type || rule.slot && event.source?.slot !== rule.slot) continue;
      const times = rule.chance === undefined ? 1 : successes(rule.chance * actor.stats.chance, this.rng);
      const selfActivation = rule.effects.length === 1 && rule.effects[0].kind === 'trigger' && rule.effects[0].select?.self;
      for (let n = 0; n < times; n++) this.jobs.push({ actor, node, effects: selfActivation ? undefined : rule.effects, reactionId: selfActivation ? undefined : `reaction-${index}`, ancestry: event.ancestry, target: event.target });
    }
  }
  select(actor: Actor, origin: CombatItem, selector: Selector = {}) {
    let items = actor.items.filter(n => (!selector.self || n === origin) && (!selector.other || n !== origin) && (!selector.type || n.def.type === selector.type) && (!selector.tag || n.def.tags.includes(selector.tag)) && (!selector.slot || n.slot === selector.slot));
    if (selector.longest) { items = items.filter(n => Number.isFinite(n.remaining)); items.sort((a, b) => b.remaining - a.remaining); return items.slice(0, 1); }
    return selector.random && items.length ? [this.rng.pick(items)] : items;
  }
  // Each branch owns its ancestry. Siblings never mutate or share an activation set.
  activate(actor: Actor, node: CombatItem, ancestry: string[] = [], effects?: Effect[], target?: string, reactionId?: string) {
    if (actor.hp <= 0 || !this.target(actor, target)) return;
    const key = `${actor.id}:${node.item.uid}`;
    const reactionKey = reactionId ? `${key}#${reactionId}` : key;
    if (ancestry.includes(reactionKey)) {
      this.suppressed++;
      this.log('suppressed', actor, `Recursive ${reactionId ? 'reaction' : 'activation'} suppressed: ${node.def.name}`, [...ancestry, reactionKey], { item: node.item.uid });
      return;
    }
    // A passive On Hit/On Crit rule belongs to its originating activation. It
    // may resolve once without pretending the item activated a second time.
    const supplemental = !!reactionId && ancestry.includes(key);
    const branch = [...ancestry, ...(supplemental ? [] : [key]), ...(reactionId ? [reactionKey] : [])];
    const actions = effects ?? node.def.effects ?? [];
    // An explicit trigger still resolves immediately. A normal strike reaches this method at contact.
    const strike = node.strike;
    if (!effects) node.strike = undefined;
    const opponent = this.target(actor, target)!;
    // Reactions retain their causal ancestry, but physical attacks still need reach.
    if (offensive(actions) && distance(actor, opponent) > attackRange(actor, opponent, node.def)) return;
    const cost = actions.reduce((sum, e) => sum + (e.cost ?? 0), 0);
    if (actor.mana < cost) {
      if (!effects) node.remaining = node.def.cooldown ?? Infinity;
      this.log('resource', actor, `${node.def.name}: needs ${cost} Mana.`, branch, { item: node.item.uid }); return;
    }
    actor.mana -= cost;
    if (!effects) node.remaining = node.def.cooldown ?? Infinity;
    if (!supplemental) { node.activations++; node.lastActivated = this.time; node.lastStrikeFacing = strike?.facing ?? actor.facing; }
    actor.lastAction = this.time;
    this.log('activation', actor, `${node.def.name} activated${effects ? ' by reaction' : ancestry.length ? ' by trigger' : ''}.`, branch, { item: node.item.uid });
    for (const effect of actions) this.effect(actor, node, effect, branch, target);
    if (!supplemental) this.emit(actor, { kind: 'activated', source: node, ancestry: branch, target });
  }
  private effect(actor: Actor, node: CombatItem, effect: Effect, ancestry: string[], preferred?: string) {
    if (actor.hp <= 0) return;
    const rolls = effect.chance === undefined ? 1 : successes(effect.chance * actor.stats.chance, this.rng);
    for (let r = 0; r < rolls; r++) {
      const scale = LEVEL_SCALE[node.item.level];
      const amount = (effect.amount ?? 0) * (effect.kind === 'cdr' || effect.kind === 'trigger' || effect.kind === 'stat' ? 1 : scale) * (effect.per ? count(actor.build, effect.per) : 1);
      const targets = effect.all ? this.actors.filter(a => a.side !== actor.side && a.hp > 0) : [this.target(actor, preferred)].filter((a): a is Actor => !!a);
      switch (effect.kind) {
        case 'damage':
          for (const target of targets) {
            const tiers = effect.direct ? successes(actor.stats.crit * actor.stats.chance, this.rng) : 0;
            const value = (amount + (actor.shield > 0 ? (effect.shieldBonus ?? 0) * scale : 0)) * (actor.build.powerFactor ?? 1) * (1 + tiers);
            this.hit(actor, target, node, value, ancestry, effect.direct ?? false, tiers);
          }
          break;
        case 'bleed': case 'poison':
          for (const target of targets) {
            target[effect.kind] += amount;
            if (effect.kind === 'poison') target.poisonOwner = actor.id;
            this.log('status', actor, `${node.def.name}: +${Math.round(amount)} ${effect.kind} on ${target.build.name}.`, ancestry, { target: target.id, item: node.item.uid, value: amount, status: effect.kind });
            if (effect.kind === 'poison') this.emit(actor, { kind: 'poison', source: node, target: target.id, ancestry, value: amount });
          }
          break;
        case 'heal': {
          const healed = Math.max(0, Math.min(amount, actor.stats.maxHp - actor.hp));
          if (healed > 0) {
            actor.hp += healed; actor.healing += healed; node.healing += healed;
            this.log('heal', actor, `${node.def.name} heals ${Math.round(healed)}.`, ancestry, { item: node.item.uid, value: healed });
            this.emit(actor, { kind: 'heal', source: node, ancestry, value: healed, target: preferred });
          }
          break;
        }
        case 'shield':
          actor.shield += amount; node.shielding += amount;
          this.log('shield', actor, `${node.def.name}: +${Math.round(amount)} Shield.`, ancestry, { value: amount, item: node.item.uid }); break;
        case 'mana': {
          const gain = Math.min(amount, actor.stats.maxMana - actor.mana);
          actor.mana += gain;
          if (gain > 0) { this.log('resource', actor, `${node.def.name}: +${Math.round(gain)} Mana.`, ancestry, { value: gain, item: node.item.uid }); this.emit(actor, { kind: 'mana', source: node, ancestry, value: gain, target: preferred }); }
          break;
        }
        case 'stat':
          if (effect.stat === 'armour' || effect.stat === 'crit' || effect.stat === 'chance' || effect.stat === 'speed' || effect.stat === 'capacity') actor.stats[effect.stat] += amount;
          break;
        case 'trigger':
          for (const other of this.select(actor, node, effect.select)) {
            this.jobs.push({ actor, node: other, ancestry, target: preferred });
          }
          break;
        case 'cdr':
          for (const other of this.select(actor, node, effect.select)) {
            if (!Number.isFinite(other.remaining)) continue;
            const remaining = Math.max(0, effect.percent ? other.remaining * (1 - amount) : other.remaining - amount);
            other.remaining = remaining;
            // Direct reductions advance the pose too, preserving immediate CDR/trigger semantics.
            if (other.strike) { other.strike.impactAt = this.time + remaining / other.strike.rate; other.strike.startedAt = other.strike.impactAt - ARM_STRIKE_TIME; }
            if (remaining <= 0) this.jobs.push({ actor, node: other, ancestry, target: preferred });
          }
          break;
      }
    }
  }
  hit(actor: Actor, target: Actor, node: CombatItem, amount: number, ancestry: string[] = [], direct = true, crit = 0) {
    if (target.hp <= 0) return;
    const afterArmour = Math.max(0, amount - target.stats.armour);
    const shielding = direct ? target.shield : 0;
    const dealt = Math.max(0, afterArmour - shielding);
    if (direct) target.shield = 0;
    this.log('damage', actor, `${node.def.name} → ${target.build.name}: ${Math.round(dealt)}${crit ? ` (Crit ×${crit + 1})` : ''}${dealt === 0 ? ' (blocked)' : ''}.`, ancestry, { target: target.id, item: node.item.uid, value: dealt, crit, shieldBreak: shielding > 0, attack: direct ? attackStyle(node.def) : undefined });
    if (direct && dealt <= 0) this.emit(target, { kind: 'block', source: node, ancestry, target: actor.id });
    if (dealt > 0) {
      const actual = Math.min(target.hp, dealt); target.hp -= actual; actor.damage += actual; node.damage += actual; target.lastHit = this.time;
      if (target.hp > 0) this.emit(target, { kind: 'hurt', source: node, ancestry, value: actual, target: actor.id });
      if (direct) {
        this.emit(actor, { kind: 'hit', source: node, ancestry, value: actual, target: target.id });
        if (crit) this.emit(actor, { kind: 'crit', source: node, ancestry, value: crit, target: target.id });
        if (target.bleed > 0 && target.hp > 0) {
          const bleeding = Math.min(target.hp, target.bleed); target.hp -= bleeding; actor.damage += bleeding; node.damage += bleeding;
          this.log('damage', actor, `Bleed → ${target.build.name}: ${Math.round(bleeding)}.`, ancestry, { target: target.id, item: node.item.uid, value: bleeding });
          this.emit(actor, { kind: 'bleed', source: node, ancestry, value: bleeding, target: target.id });
        }
      }
    }
    if (target.hp <= 0) { this.log('death', target, `${target.build.name} has died.`, ancestry); this.emit(actor, { kind: 'kill', source: node, ancestry, target: target.id }); }
  }
  private drain() {
    let i = 0;
    while (i < this.jobs.length && i < 50000) {
      const job = this.jobs[i++]; this.activate(job.actor, job.node, job.ancestry, job.effects, job.target, job.reactionId);
      if (this.player.hp <= 0 || this.enemies.every(e => e.hp <= 0)) break;
    }
    if (i >= 50000) { this.failure = 'This trigger network exceeded the simulation budget.'; this.done = true; this.log('resource', this.player, this.failure); }
    this.jobs = [];
  }
  private move(delta: number) {
    for (const actor of this.actors) {
      actor.vx = 0; actor.vy = 0; actor.windup = 0; actor.windupItem = undefined;
      if (actor.hp <= 0) { actor.diedAt ??= this.time; continue; }
      const target = this.target(actor);
      if (!target) continue;
      const d = Math.max(.01, distance(actor, target)), nx = (target.x - actor.x) / d, ny = (target.y - actor.y) / d;
      actor.facing = nx < 0 ? -1 : 1;
      const attacks = actor.items.filter(n => offensive(n.def.effects ?? []));
      const melee = attacks.some(n => !n.def.tags.includes('Ranged') && !n.def.tags.includes('Magical'));
      const rate = actor.stats.speed * actor.stats.efficiency;
      for (const node of attacks) if (attackStyle(node.def) === 'heavy' && d <= attackRange(actor, target, node.def)) {
        const anticipation = Math.min(.65, (node.def.cooldown ?? 2) * .2) * rate;
        if (anticipation > 0 && node.remaining < anticipation) { const progress = 1 - Math.max(0, node.remaining) / anticipation; if (progress > actor.windup) { actor.windup = progress; actor.windupItem = node.item.uid; } }
      }
      const preferred = melee || attacks.length === 0 ? actor.radius + target.radius + 12 : 150;
      const direction = actor.side === 'player' ? 1 : Number(actor.id.split('-')[1]) % 2 ? 1 : -1;
      let forward = d > preferred + 5 ? 1 : d < preferred - 8 ? -.55 : 0;
      // Short blades step away after a strike, then close for the next one.
      if (melee && actor.items.some(n => n.def.id === 'dagger' || n.def.id === 'ratbite') && this.time - actor.lastAction < .16 && d < preferred + 2) forward = -.7;
      const strafe = d < preferred + 70 ? (actor.side === 'enemy' ? .52 : .3) * direction : .08 * direction;
      let mx = nx * forward - ny * strafe, my = ny * forward + nx * strafe;
      const length = Math.max(1, Math.hypot(mx, my));
      const speed = actor.stats.movementSpeed * Math.max(.5, Math.sqrt(actor.stats.efficiency)) * (actor.windup > 0 ? .16 : 1);
      mx = mx / length * speed * delta; my = my / length * speed * delta;
      actor.x += mx; actor.y += my; actor.vx = mx / delta; actor.vy = my / delta; actor.walked += Math.hypot(mx, my);
    }
    // Soft body separation keeps packs legible without obstacle/pathfinding AI.
    const alive = this.actors.filter(a => a.hp > 0);
    for (let i = 0; i < alive.length; i++) for (let j = i + 1; j < alive.length; j++) {
      const a = alive[i], b = alive[j], d = distance(a, b), gap = a.radius + b.radius;
      if (d >= gap) continue;
      const nx = d > .001 ? (b.x - a.x) / d : 1, ny = d > .001 ? (b.y - a.y) / d : 0, push = (gap - d) * .5;
      a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
    }
    for (const a of alive) {
      const rx = ARENA.rx - a.radius, ry = ARENA.ry - a.radius;
      const radial = Math.hypot((a.x - ARENA.cx) / rx, (a.y - ARENA.cy) / ry);
      if (radial > 1) { a.x = ARENA.cx + (a.x - ARENA.cx) / radial; a.y = ARENA.cy + (a.y - ARENA.cy) / radial; }
    }
  }
  step(delta = .05) {
    if (this.done) return;
    this.time += delta; this.tickAccumulator += delta;
    this.move(delta);
    for (const actor of this.actors.filter(a => a.hp > 0)) {
      const normal = stats(actor.build, actor.mana);
      actor.stats.capacity = normal.capacity;
      actor.stats.efficiency = normal.efficiency;
      const rate = actor.stats.efficiency * actor.stats.speed;
      for (const node of actor.items) {
        if (!node.strike) {
          const before = node.remaining;
          node.remaining = Math.max(0, before - delta * rate);
          const target = this.target(actor);
          if (usesArmStrike(node) && rate > 0 && node.remaining <= ARM_STRIKE_TIME * rate && target && distance(actor, target) <= attackRange(actor, target, node.def)) {
            const startedAt = this.time - delta + Math.max(0, (before - ARM_STRIKE_TIME * rate) / rate);
            node.strike = { startedAt, impactAt: startedAt + ARM_STRIKE_TIME, rate, facing: actor.facing };
          }
        }
        if (node.strike) node.remaining = Math.max(0, (node.strike.impactAt - this.time) * node.strike.rate);
        if (node.remaining <= 1e-8) this.jobs.push({ actor, node, ancestry: [] });
      }
    }
    this.drain(); this.checkEnd();
    if (this.done) return;
    if (this.tickAccumulator >= 1 - 1e-8) {
      this.tickAccumulator -= 1;
      for (const actor of this.actors.filter(a => a.hp > 0)) {
        // Normal brains recover 1 Mana/s each; necrotic pumps spend 2 Mana/s each.
        actor.mana = Math.max(0, Math.min(actor.stats.maxMana, actor.mana + count(actor.build, 'head') - actor.stats.necrotic * 2));
        if (actor.poison > 0) {
          const amount = Math.min(actor.hp, actor.poison); actor.hp -= amount; actor.lastHit = this.time;
          const owner = this.actors.find(a => a.id === actor.poisonOwner);
          if (owner) { owner.damage += amount; this.emit(owner, { kind: 'poisonTick', ancestry: [], target: actor.id, value: amount }); }
          this.log('damage', owner ?? actor, `Poison → ${actor.build.name}: ${Math.round(amount)}.`, [], { target: actor.id, value: amount });
          actor.poison = Math.max(0, actor.poison - 1);
          if (actor.hp <= 0) { this.log('death', actor, `${actor.build.name} has died.`); if (owner) this.emit(owner, { kind: 'kill', ancestry: [], target: actor.id }); }
        }
      }
      this.drain(); this.checkEnd();
    }
    // No permanent stalemates: both teams begin losing 2% maximum HP/s after 90s.
    if (this.time > 90) { for (const a of this.actors.filter(a => a.hp > 0)) a.hp = Math.max(0, a.hp - a.stats.maxHp * .02 * delta); this.checkEnd(); }
  }
  private checkEnd() { for (const a of this.actors) if (a.hp <= 0) a.diedAt ??= this.time; if (this.player.hp <= 0 || this.enemies.every(e => e.hp <= 0)) { this.done = true; this.won = this.player.hp > 0; } }
  runToEnd(maxTime = 160) { while (!this.done && this.time < maxTime) this.step(); return this.won; }
  chainNames(chain: string[]) {
    return chain.map(key => { const node = this.actors.flatMap(a => a.items.map(n => ({ actor: a, node: n }))).find(x => key === `${x.actor.id}:${x.node.item.uid}` || key.startsWith(`${x.actor.id}:${x.node.item.uid}#`)); return node ? node.node.def.name + (key.includes('#') ? ' (reaction)' : '') : key; });
  }
}
