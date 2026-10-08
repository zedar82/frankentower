import { ITEMS, ITEM_MAP, PROCEDURES } from './content';
import { count, equipped, human, stats, usable, canFunction } from './anatomy';
import { Random } from './random';
import { clone, RULESET, type Build, type Item, type Legacy, type Procedure, type Run, type Save, type Slot } from './types';
export const defaultSave = (): Save => ({ version: RULESET, run: null, legacy: [], records: [], best: 0, completed: false, settings: { sound: true, speed: 1 }, achievements: [] });
export const floorReward = (floor: number) => 9 + Math.floor(floor / 10) + (floor % 20 === 0 ? 20 : 0);
function uid(run: Run) { return `r${run.seed}-${++run.serial}`; }
export function newRun(seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0): Run {
  const rng = new Random(seed);
  const build = human(rng.pick(['Agnes', 'Digby', 'Margaret', 'Channing', 'Florence', 'Edgar', 'Mabel', 'Basil', 'Winifred', 'Percy']));
  const run: Run = { seed, rng: rng.state, serial: 10, floor: 1, highest: 0, gold: 28, shopTier: 1, build, hp: 100, stash: [], offers: [], procedures: [], operated: false, phase: 'start', lastEnemies: [], victories: 0, purchases: 0, rerolls: 0, surgeries: 0 };
  refreshShop(run);
  return run;
}
export function startRun(run: Run, weapon: string) {
  if (run.phase !== 'start' || !['dagger', 'club', 'knife'].includes(weapon)) return;
  const hand = run.build.parts.find(p => p.slot === 'hand')!;
  hand.item = { uid: uid(run), defId: weapon, level: 1 };
  run.phase = 'build';
}
export function refreshShop(run: Run) {
  const rng = new Random(run.rng);
  const owned = [...run.stash, ...equipped(run.build).map(x => x.item)];
  run.offers = Array.from({ length: 6 }, (_, i) => {
    const roll = rng.next();
    const maxRarity = Math.min(5, run.shopTier);
    let rarity = Math.min(maxRarity, roll < .35 ? 1 : roll < .65 ? 2 : roll < .84 ? 3 : roll < .95 ? 4 : 5);
    if (i === 0) rarity = maxRarity;
    const pool = ITEMS.filter(d => d.rarity === rarity && (run.floor !== 1 || i !== 0 || d.effects?.some(e => ['damage','poison'].includes(e.kind))));
    const duplicate = owned.filter(d => ITEM_MAP[d.defId].rarity <= maxRarity);
    const def = i === 5 && duplicate.length && rng.next() < .6 ? ITEM_MAP[rng.pick(duplicate).defId] : rng.pick(pool);
    return { uid: uid(run), defId: def.id, level: 1 };
  });
  const procedures = PROCEDURES.filter(p => p.minFloor <= run.floor && procedureReason(run, p, true) === null);
  const available = [...procedures];
  const choices: string[] = [];
  // A dependable pump is always offered: overload is a decision, not a shop lottery.
  const support = available.findIndex(p => p.id === 'heart');
  if (support >= 0) choices.push(available.splice(support, 1)[0].id);
  const grafts = available.filter(p => p.add?.some(a => a.slot !== 'heart'));
  if (grafts.length) { const p = rng.pick(grafts); choices.push(p.id); available.splice(available.indexOf(p),1); }
  while (choices.length < 4 && available.length) choices.push(available.splice(rng.int(available.length), 1)[0].id);
  // IDs are stored rather than content objects so saves follow the current ruleset.
  run.procedures = choices;
  run.rng = rng.state;
}
export function buy(run: Run, index: number) {
  if (run.phase !== 'build') return false;
  const item = run.offers[index];
  if (!item) return false;
  const def = ITEM_MAP[item.defId];
  if (run.gold < def.price) return false;
  run.gold -= def.price; run.purchases++; run.stash.push(item); run.offers[index] = null;
  return true;
}
export function equip(run: Run, itemUid: string, partUid: string) {
  if (run.phase !== 'build') return false;
  const index = run.stash.findIndex(i => i.uid === itemUid), part = run.build.parts.find(p => p.uid === partUid);
  const item = run.stash[index];
  if (!item || !part || ITEM_MAP[item.defId].slot !== part.slot || !usable(run.build, item)) return false;
  run.stash.splice(index, 1); if (part.item) run.stash.push(part.item); part.item = item;
  run.hp = Math.min(run.hp, stats(run.build).maxHp);
  return true;
}
export function unequip(run: Run, partUid: string) {
  if (run.phase !== 'build') return;
  const part = run.build.parts.find(p => p.uid === partUid);
  if (part?.item) { run.stash.push(part.item); delete part.item; run.hp = Math.min(run.hp, stats(run.build).maxHp); }
}
export function sell(run: Run, itemUid: string) {
  if (run.phase !== 'build') return false;
  const i = run.stash.findIndex(x => x.uid === itemUid);
  if (i < 0) return false;
  run.gold += Math.floor(ITEM_MAP[run.stash[i].defId].price * .5 * [0, 1, 2, 4][run.stash[i].level]); run.stash.splice(i, 1); return true;
}
export function combineCandidate(run: Run, item: Item) {
  return item.level < 3 ? [...run.stash, ...equipped(run.build).map(x => x.item)].find(x => x.uid !== item.uid && x.defId === item.defId && x.level === item.level) : undefined;
}
export function combine(run: Run, itemUid: string) {
  if (run.phase !== 'build') return false;
  const target = [...run.stash, ...equipped(run.build).map(x => x.item)].find(x => x.uid === itemUid);
  if (!target) return false;
  const donor = combineCandidate(run, target);
  if (!donor) return false;
  run.stash = run.stash.filter(x => x.uid !== donor.uid);
  run.build.parts.forEach(p => { if (p.item?.uid === donor.uid) delete p.item; });
  target.level++;
  return true;
}
export function reroll(run: Run) { const cost = 2 + run.shopTier; if (run.phase !== 'build' || run.gold < cost) return false; run.gold -= cost; run.rerolls++; const p = run.procedures; refreshShop(run); run.procedures = p; return true; }
export function upgradeShop(run: Run) { const cost = 12 + run.shopTier * 8; if (run.phase !== 'build' || run.shopTier >= 5 || run.gold < cost) return false; run.gold -= cost; run.shopTier++; const p = run.procedures; refreshShop(run); run.procedures = p; return true; }
export function recover(run: Run) { if (run.phase !== 'build' || run.gold < 10 || run.hp >= stats(run.build).maxHp) return false; run.gold -= 10; run.hp = Math.min(stats(run.build).maxHp, run.hp + Math.ceil(stats(run.build).maxHp * .5)); return true; }
export function procedureReason(run: Run, p: Procedure, ignoreMoney = false) {
  if (!ignoreMoney && run.operated) return 'One procedure per visit.';
  if (!ignoreMoney && run.gold < p.price) return 'Insufficient gold.';
  if (!ignoreMoney && (run.phase !== 'build' || run.floor % 5 !== 0)) return 'Surgery opens every five floors.';
  for (const remove of p.remove ?? []) if (count(run.build, remove.slot) < remove.count) return `Requires ${remove.count} ${remove.slot} slots.`;
  const test = clone(run.build);
  for (const remove of p.remove ?? []) { let n = remove.count; test.parts = test.parts.filter(part => part.slot !== remove.slot || n-- <= 0); }
  for (const add of p.add ?? []) for (let i = 0; i < add.count; i++) test.parts.push({ uid: `preview-${i}`, slot: add.slot, variant: add.variant ?? 'living' });
  if (!canFunction(test)) return 'A living head or ganglion controller is required.';
  return null;
}
export function operate(run: Run, id: string) {
  const p = PROCEDURES.find(p => p.id === id);
  if (!p || !run.procedures.includes(id) || procedureReason(run, p)) return false;
  const before = stats(run.build).maxHp;
  for (const remove of p.remove ?? []) for (let i = 0; i < remove.count; i++) {
    const candidates = run.build.parts.filter(part => part.slot === remove.slot);
    const part = candidates.find(p => !p.item) ?? candidates[candidates.length - 1];
    if (part.item) run.stash.push(part.item);
    run.build.parts = run.build.parts.filter(x => x.uid !== part.uid);
  }
  for (const add of p.add ?? []) for (let i = 0; i < add.count; i++) run.build.parts.push({ uid: uid(run), slot: add.slot, variant: add.variant ?? 'living' });
  run.gold -= p.price; run.operated = true; run.surgeries++;
  const max = stats(run.build).maxHp; run.hp = Math.max(1, Math.min(max, run.hp + max - before));
  return true;
}
export function advance(run: Run) {
  if (!['result', 'checkpoint'].includes(run.phase) || run.floor >= 100) return false;
  run.floor++; run.phase = 'build';
  if (run.floor % 5 === 0) { run.operated = false; refreshShop(run); }
  return true;
}
export function finishFight(run: Run, hp: number, won: boolean, save: Save) {
  run.hp = Math.max(0, Math.round(hp));
  if (!won) { run.phase = 'dead'; record(save, run, 'Died'); return; }
  run.victories++; run.highest = run.floor; save.best = Math.max(save.best, run.floor);
  run.gold += floorReward(run.floor);
  run.hp = Math.min(stats(run.build).maxHp, run.hp + Math.ceil(stats(run.build).maxHp * .25));
  run.phase = run.floor === 100 ? 'complete' : run.floor % 20 === 0 ? 'checkpoint' : 'result';
  if (run.floor === 100) { save.completed = true; retire(save, run, false); run.phase = 'complete'; }
  if (count(run.build, 'hand') === 1 && !save.achievements.includes('Mostly Armless')) save.achievements.push('Mostly Armless');
  if (count(run.build, 'foot') === 1 && !save.achievements.includes('Hop to It')) save.achievements.push('Hop to It');
  if (count(run.build, 'head') === 0 && count(run.build, 'foot') === 4 && count(run.build, 'hand') === 2 && !save.achievements.includes('Headless Horseman')) save.achievements.push('Headless Horseman');
  if (stats(run.build).octopod >= 8 && !save.achievements.includes('Well-Heeled')) save.achievements.push('Well-Heeled');
}
function record(save: Save, run: Run, reason: string) { save.records.unshift({ name: run.build.name, floor: run.floor, build: clone(run.build), reason }); save.records = save.records.slice(0, 12); }
export function retire(save: Save, run: Run, end = true) {
  if (!['checkpoint', 'complete'].includes(run.phase)) return false;
  const legacy: Legacy = { checkpoint: run.floor, build: clone(run.build), ruleset: RULESET, retiredAt: new Date().toISOString() };
  save.legacy = [...save.legacy.filter(x => x.checkpoint !== run.floor), legacy].sort((a, b) => a.checkpoint - b.checkpoint);
  record(save, run, 'Retired'); if (end) run.phase = 'retired'; return true;
}
function enemy(name: string, item: string, hp: number, power: number, armour = 0): Build {
  const b = human(name); b.healthFactor = hp / 100; b.powerFactor = power;
  b.parts.find(p => p.slot === 'hand')!.item = { uid: `${name}-weapon`, defId: item, level: 1 };
  if (armour) b.parts.find(p => p.slot === 'chest')!.item = { uid: `${name}-armour`, defId: armour >= 5 ? 'golemplate' : 'plate', level: Math.min(3, armour) };
  return b;
}
export function encounter(floor: number, seed: number, legacy: Legacy[]): Build[] {
  if (floor % 20 === 0) {
    const old = legacy.find(b => b.checkpoint === floor && b.ruleset === RULESET);
    if (old) return [clone(old.build)];
    const boss = human(['Dr. Sutcher', 'The Ward Matron', 'Professor Polycard', 'The Chief Resident', 'The First Patient'][floor / 20 - 1]);
    const byFloor: Record<number, string[]> = { 20: ['cleaver', 'shield', 'plate', 'horns', 'bloodboots', 'runners', 'heart'], 40: ['bloodletter', 'knife', 'barbed', 'redhat', 'bloodrunner', 'bloodboots', 'vampire'], 60: ['bonewand', 'stormwand', 'golemplate', 'conductor', 'rabbit', 'runners', 'wizardheart'], 80: ['maul', 'parry', 'donor', 'ram', 'spurs', 'octoboot', 'pump'], 100: ['saint', 'necrowand', 'donor', 'hydra', 'dance', 'plague', 'bloodengine'] };
    const ids = byFloor[floor];
    const slots: Slot[] = ['hand', 'hand', 'chest', 'head', 'foot', 'foot', 'heart'];
    slots.forEach((slot, i) => { const part = boss.parts.find(p => p.slot === slot && !p.item)!; part.item = { uid: `boss-${floor}-${i}`, defId: ids[i], level: 1 }; });
    boss.healthFactor = 1.25 + floor * .015;
    boss.powerFactor = .65 + floor * .002;
    return [boss];
  }
  const rng = new Random((seed ^ Math.imul(floor, 2654435761)) >>> 0);
  const archetypes = [
    { name: 'Grave rat', item: 'ratbite', cost: 2, hp: 42, power: .45, armour: 0 },
    { name: 'Skeleton', item: 'skeletonblade', cost: 4, hp: 100, power: 1, armour: 0 },
    { name: 'Ogre', item: 'ogrefist', cost: 7, hp: 160, power: 1.1, armour: 0 },
    { name: 'Grave mage', item: 'magebolt', cost: 5, hp: 75, power: .95, armour: 0 },
    { name: 'Bone archer', item: 'archershot', cost: 4, hp: 80, power: .9, armour: 0 },
    { name: 'Iron knight', item: 'skeletonblade', cost: 6, hp: 120, power: .85, armour: 2 },
    { name: 'Golem', item: 'ogrefist', cost: 10, hp: 200, power: 1.1, armour: 5 },
  ];
  if (floor === 1) return [enemy('Skeleton', 'skeletonblade', 100, 1)];
  let budget = 4 + Math.floor(floor / 7);
  const result: Build[] = [];
  while (budget >= 2 && result.length < 6) {
    const pool = archetypes.filter(a => a.cost <= budget && (floor >= 8 || a.cost <= 4));
    const a = rng.pick(pool); budget -= a.cost;
    result.push(enemy(a.name, a.item, a.hp * (1 + floor * .025), a.power * (1 + floor * .009), a.armour));
  }
  return result;
}
