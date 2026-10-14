import { defaultSave } from './game/run';
import { ITEM_MAP, PROCEDURES } from './game/content';
import { SLOT_DEFINITIONS, VARIANT_DEFINITIONS } from './game/anatomy-content';
import { stats } from './game/anatomy';
import { RULESET, SATCHEL_CAPACITY, type Save, type Build } from './game/types';

export class InvalidSaveError extends Error {
  constructor() {
    super('These patient records are damaged. Reconnect will not repair them.');
    this.name = 'InvalidSaveError';
  }
}
type Data = Record<string, unknown>;
function requireValid(condition: unknown): asserts condition {
  if (!condition) throw new InvalidSaveError();
}
function object(value: unknown): Data {
  requireValid(value !== null && typeof value === 'object' && !Array.isArray(value));
  return value as Data;
}
function text(value: unknown) {
  requireValid(typeof value === 'string' && value.length > 0 && value.length <= 256);
  return value;
}
function longText(value: unknown) {
  requireValid(typeof value === 'string' && value.length <= 2048);
}
function number(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER, integer = true): number {
  requireValid(
    typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= min &&
      value <= max &&
      (!integer || Number.isSafeInteger(value)),
  );
  return value;
}
function boolean(value: unknown) {
  requireValid(typeof value === 'boolean');
}
function array(value: unknown, max: number): unknown[] {
  requireValid(Array.isArray(value) && value.length <= max);
  return value;
}
function unique(value: unknown, seen: Set<string>) {
  const id = text(value);
  requireValid(!seen.has(id));
  seen.add(id);
  return id;
}
function item(value: unknown, seen: Set<string>, slot?: string) {
  const i = object(value);
  unique(i.uid, seen);
  const id = text(i.defId);
  requireValid(Object.hasOwn(ITEM_MAP, id));
  number(i.level, 1, 3);
  requireValid(!slot || ITEM_MAP[id].slot === slot);
}
function build(value: unknown, items = new Set<string>()) {
  const b = object(value);
  text(b.name);
  const parts = array(b.parts, 1000);
  requireValid(parts.length > 0);
  const ids = new Set<string>();
  for (const value of parts) {
    const p = object(value);
    unique(p.uid, ids);
    const slot = text(p.slot),
      variant = text(p.variant);
    requireValid(
      Object.hasOwn(SLOT_DEFINITIONS, slot) && Object.hasOwn(VARIANT_DEFINITIONS, variant),
    );
    if (p.item !== undefined) item(p.item, items, slot);
  }
  for (const factor of ['healthFactor', 'powerFactor'])
    if (b[factor] !== undefined) number(b[factor], 0.001, 1000, false);
}
function fightActorReport(value: unknown) {
  const a = object(value);
  build(a.build);
  const maxHp = number(a.maxHp, 1, 1_000_000, false),
    maxMana = number(a.maxMana, 0, 1_000_000, false);
  number(a.hp, 0, maxHp, false);
  number(a.mana, 0, maxMana, false);
  number(a.damage, 0, 1_000_000_000, false);
  number(a.healing, 0, 1_000_000_000, false);
  if (a.diedAt !== undefined) number(a.diedAt, 0, 3600, false);
}
function fightReport(value: unknown) {
  const r = object(value);
  number(r.floor, 1, 100);
  number(r.seed, 0, 0xffffffff);
  requireValid(['victory', 'stalemate', 'defeat'].includes(text(r.outcome)));
  number(r.duration, 0, 3600, false);
  fightActorReport(r.patient);
  for (const enemy of array(r.enemies, 6)) fightActorReport(enemy);
  for (const entry of array(r.contributions, 1000)) {
    const c = object(entry);
    text(c.uid);
    text(c.name);
    number(c.level, 1, 3);
    number(c.activations, 0);
    number(c.damage, 0, 1_000_000_000, false);
    number(c.healing, 0, 1_000_000_000, false);
    number(c.shielding, 0, 1_000_000_000, false);
  }
  number(r.suppressed, 0);
  boolean(r.transcriptTruncated);
  let priorTime = 0;
  for (const entry of array(r.transcript, 400)) {
    const log = object(entry);
    number(log.id, 1);
    const time = number(log.time, priorTime, 3600, false);
    priorTime = time;
    requireValid(
      ['damage', 'heal', 'shield', 'activation', 'status', 'suppressed', 'resource', 'death'].includes(
        text(log.kind),
      ),
    );
    text(log.actor);
    if (log.target !== undefined) text(log.target);
    if (log.ability !== undefined) text(log.ability);
    if (log.value !== undefined) number(log.value, 0, 1_000_000_000, false);
    longText(log.text);
    for (const chain of array(log.chain, 64)) text(chain);
    if (log.crit !== undefined) number(log.crit, 0, 100, false);
    if (log.shieldBreak !== undefined) boolean(log.shieldBreak);
    if (log.attack !== undefined)
      requireValid(['slash', 'heavy', 'bolt', 'arrow'].includes(text(log.attack)));
    if (log.status !== undefined) requireValid(['bleed', 'poison'].includes(text(log.status)));
  }
}
function run(value: unknown) {
  const r = object(value),
    items = new Set<string>();
  number(r.seed, 0, 0xffffffff);
  number(r.rng, 1, 0xffffffff);
  number(r.serial, 10);
  number(r.floor, 1, 100);
  number(r.highest, 0, number(r.floor));
  number(r.gold);
  number(r.shopTier, 1, 5);
  boolean(r.shopFrozen);
  boolean(r.operated);
  build(r.build, items);
  number(r.hp, 0, stats(r.build as unknown as Build).maxHp, false);
  for (const entry of array(r.stash, SATCHEL_CAPACITY)) item(entry, items);
  const offers = array(r.offers, 4);
  requireValid(offers.length === 4);
  for (const entry of offers) if (entry !== null) item(entry, items);
  const procedures = new Set<string>();
  for (const entry of array(r.procedures, PROCEDURES.length)) {
    const id = unique(entry, procedures);
    requireValid(PROCEDURES.some((p) => p.id === id));
  }
  requireValid(
    ['start', 'build', 'combat', 'result', 'checkpoint', 'dead', 'retired', 'complete'].includes(
      text(r.phase),
    ),
  );
  for (const entry of array(r.lastEnemies, 6)) build(entry);
  if (r.lastReport !== null) fightReport(r.lastReport);
  for (const counter of ['victories', 'purchases', 'rerolls', 'surgeries']) number(r[counter]);
  // Generated IDs must not be reused after loading.
  const prefix = `r${r.seed}-`;
  for (const id of [...items, ...(r.build as unknown as Build).parts.map((p) => p.uid)]) {
    if (id.startsWith(prefix)) number(Number(id.slice(prefix.length)), 1, number(r.serial));
  }
}
export function parseSave(raw: string | null): Save {
  if (raw === null) return defaultSave();
  try {
    requireValid(raw.length <= 2_000_000);
    const s = object(JSON.parse(raw));
    text(s.version);
    if (s.version !== RULESET) return defaultSave();
    if (s.run !== null) run(s.run);
    const checkpoints = new Set<number>();
    for (const value of array(s.legacy, 5)) {
      const l = object(value),
        floor = number(l.checkpoint, 20, 100);
      requireValid(floor % 20 === 0 && !checkpoints.has(floor));
      checkpoints.add(floor);
      requireValid(l.ruleset === RULESET);
      text(l.retiredAt);
      requireValid(Number.isFinite(Date.parse(l.retiredAt as string)));
      build(l.build);
    }
    for (const value of array(s.records, 12)) {
      const r = object(value);
      text(r.name);
      text(r.reason);
      number(r.floor, 1, 100);
      build(r.build);
    }
    number(s.best, 0, 100);
    boolean(s.completed);
    const settings = object(s.settings);
    boolean(settings.sound);
    requireValid([1, 2, 4].includes(number(settings.speed)));
    const achievements = new Set<string>();
    for (const a of array(s.achievements, 100)) unique(a, achievements);
    const save = s as unknown as Save;
    if (save.run?.phase === 'combat') save.run.phase = 'build';
    return save;
  } catch {
    throw new InvalidSaveError();
  }
}
