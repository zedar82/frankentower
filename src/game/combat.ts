import { ITEM_MAP } from './content';
import { LEVEL_SCALE, equipped, stats, usable, count } from './anatomy';
import { Random, successes } from './random';
import { clone, type Build, type Effect, type EventKind, type Item, type ItemDef, type Selector, type Stats } from './types';
export interface CombatItem { item: Item; def: ItemDef; slot: string; remaining: number; activations: number; damage: number; healing: number; shielding: number }
export interface Actor { id: string; side: 'player' | 'enemy'; build: Build; stats: Stats; hp: number; mana: number; shield: number; bleed: number; poison: number; poisonOwner?: string; items: CombatItem[]; damage: number; healing: number; lastHit: number; lastAction: number }
export interface LogEntry { id: number; time: number; kind: 'damage' | 'heal' | 'shield' | 'activation' | 'status' | 'suppressed' | 'resource' | 'death'; actor: string; target?: string; item?: string; value?: number; text: string; chain: string[]; crit?: number }
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
    for (const actor of this.actors) this.emit(actor, { kind: 'start', ancestry: [] });
    this.drain(); this.checkEnd();
  }
  private makeActor(build: Build, side: Actor['side'], id: string, hp?: number): Actor {
    build = clone(build);
    const s = stats(build);
    const items = equipped(build).filter(x => usable(build, x.item)).map(({ item, part }) => {
      const def = ITEM_MAP[item.defId];
      return { item, def, slot: part.slot, remaining: def.cooldown ?? Infinity, activations: 0, damage: 0, healing: 0, shielding: 0 };
    });
    for (const part of build.parts.filter(p => p.variant === 'serpent')) items.push({ item: { uid: `${part.uid}-bite`, defId: 'serpentbite', level: 1 }, def: ITEM_MAP.serpentbite, slot: 'head', remaining: 3, activations: 0, damage: 0, healing: 0, shielding: 0 });
    return { id, side, build, stats: s, hp: Math.min(s.maxHp, hp ?? s.maxHp), mana: s.maxMana, shield: 0, bleed: 0, poison: 0, items, damage: 0, healing: 0, lastHit: -10, lastAction: -10 };
  }
  get player() { return this.actors[0]; }
  get enemies() { return this.actors.slice(1); }
  target(actor: Actor, preferred?: string): Actor | undefined {
    return this.actors.find(a => a.id === preferred && a.side !== actor.side && a.hp > 0) ?? this.actors.find(a => a.side !== actor.side && a.hp > 0);
  }
  private log(kind: LogEntry['kind'], actor: Actor, text: string, ancestry: string[] = [], extra: Partial<LogEntry> = {}) {
    const entry: LogEntry = { id: ++this.serial, time: this.time, kind, actor: actor.id, text, chain: ancestry, ...extra };
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
    const cost = actions.reduce((sum, e) => sum + (e.cost ?? 0), 0);
    if (actor.mana < cost) {
      this.log('resource', actor, `${node.def.name}: needs ${cost} Mana.`, branch, { item: node.item.uid }); return;
    }
    actor.mana -= cost;
    if (!effects) node.remaining = node.def.cooldown ?? Infinity;
    if (!supplemental) node.activations++;
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
            this.log('status', actor, `${node.def.name}: +${Math.round(amount)} ${effect.kind} on ${target.build.name}.`, ancestry, { target: target.id, item: node.item.uid, value: amount });
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
            other.remaining = Math.max(0, effect.percent ? other.remaining * (1 - amount) : other.remaining - amount);
            if (other.remaining <= 0) { other.remaining = other.def.cooldown ?? Infinity; this.jobs.push({ actor, node: other, ancestry, target: preferred }); }
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
    this.log('damage', actor, `${node.def.name} → ${target.build.name}: ${Math.round(dealt)}${crit ? ` (Crit ×${crit + 1})` : ''}${dealt === 0 ? ' (blocked)' : ''}.`, ancestry, { target: target.id, item: node.item.uid, value: dealt, crit });
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
  step(delta = .05) {
    if (this.done) return;
    this.time += delta; this.tickAccumulator += delta;
    for (const actor of this.actors.filter(a => a.hp > 0)) {
      const normal = stats(actor.build, actor.mana);
      actor.stats.capacity = normal.capacity;
      actor.stats.efficiency = normal.efficiency;
      const rate = actor.stats.efficiency * actor.stats.speed;
      for (const node of actor.items) {
        node.remaining -= delta * rate;
        if (node.remaining <= 1e-8) { node.remaining = node.def.cooldown ?? Infinity; this.jobs.push({ actor, node, ancestry: [] }); }
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
  private checkEnd() { if (this.player.hp <= 0 || this.enemies.every(e => e.hp <= 0)) { this.done = true; this.won = this.player.hp > 0; } }
  runToEnd(maxTime = 160) { while (!this.done && this.time < maxTime) this.step(); return this.won; }
  chainNames(chain: string[]) {
    return chain.map(key => { const node = this.actors.flatMap(a => a.items.map(n => ({ actor: a, node: n }))).find(x => key === `${x.actor.id}:${x.node.item.uid}` || key.startsWith(`${x.actor.id}:${x.node.item.uid}#`)); return node ? node.node.def.name + (key.includes('#') ? ' (reaction)' : '') : key; });
  }
}
