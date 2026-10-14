import { count, human, stats } from './anatomy';
import { Random } from './random';
import { nextUid } from './run-id';
import { refreshProcedures } from './surgery';
import { refreshStock } from './shop';
import { clone, RULESET, type Legacy, type Run, type Save } from './types';
export const defaultSave = (): Save => ({
  version: RULESET,
  run: null,
  legacy: [],
  records: [],
  best: 0,
  completed: false,
  settings: { sound: true, speed: 1 },
  achievements: [],
});
export const floorReward = (floor: number) =>
  9 + Math.floor(floor / 10) + (floor % 20 === 0 ? 20 : 0);

export function newRun(seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0): Run {
  const rng = new Random(seed);
  const build = human(
    rng.pick([
      'Agnes',
      'Digby',
      'Margaret',
      'Channing',
      'Florence',
      'Edgar',
      'Mabel',
      'Basil',
      'Winifred',
      'Percy',
    ]),
  );
  const run: Run = {
    seed,
    rng: rng.state,
    serial: 10,
    floor: 1,
    highest: 0,
    gold: 28,
    shopTier: 1,
    shopFrozen: false,
    build,
    hp: 1000,
    stash: [],
    offers: [],
    procedures: [],
    operated: false,
    phase: 'start',
    lastEnemies: [],
    lastReport: null,
    victories: 0,
    purchases: 0,
    rerolls: 0,
    surgeries: 0,
  };
  refreshStock(run);
  refreshProcedures(run);
  return run;
}
export function startRun(run: Run, weapon: string) {
  if (run.phase !== 'start' || !['dagger', 'club', 'knife'].includes(weapon)) return;
  const hand = run.build.parts.find((p) => p.slot === 'hand')!;
  hand.item = { uid: nextUid(run), defId: weapon, level: 1 };
  run.phase = 'build';
}
export function advance(run: Run) {
  if (!['result', 'checkpoint'].includes(run.phase) || run.floor >= 100) return false;
  run.floor++;
  run.phase = 'build';
  if (!run.shopFrozen) refreshStock(run);
  if (run.floor % 5 === 0) {
    run.operated = false;
    refreshProcedures(run);
  }
  return true;
}
export function finishFight(run: Run, hp: number, won: boolean, save: Save) {
  run.hp = Math.max(0, Math.round(hp));
  if (!won) {
    run.phase = 'dead';
    record(save, run, 'Died');
    return;
  }
  run.victories++;
  run.highest = run.floor;
  save.best = Math.max(save.best, run.floor);
  run.gold += floorReward(run.floor);
  run.hp = Math.min(stats(run.build).maxHp, run.hp + Math.ceil(stats(run.build).maxHp * 0.25));
  run.phase = run.floor === 100 ? 'complete' : run.floor % 20 === 0 ? 'checkpoint' : 'result';
  if (run.floor === 100) {
    save.completed = true;
    retire(save, run, false);
    run.phase = 'complete';
  }
  if (count(run.build, 'hand') === 1 && !save.achievements.includes('Mostly Armless'))
    save.achievements.push('Mostly Armless');
  if (count(run.build, 'foot') === 1 && !save.achievements.includes('Hop to It'))
    save.achievements.push('Hop to It');
  if (
    count(run.build, 'head') === 0 &&
    count(run.build, 'foot') === 4 &&
    count(run.build, 'hand') === 2 &&
    !save.achievements.includes('Headless Horseman')
  )
    save.achievements.push('Headless Horseman');
  if (stats(run.build).sets.octopod >= 8 && !save.achievements.includes('Well-Heeled'))
    save.achievements.push('Well-Heeled');
}
function record(save: Save, run: Run, reason: string) {
  save.records.unshift({ name: run.build.name, floor: run.floor, build: clone(run.build), reason });
  save.records = save.records.slice(0, 12);
}
export function retire(save: Save, run: Run, end = true) {
  if (!['checkpoint', 'complete'].includes(run.phase)) return false;
  const legacy: Legacy = {
    checkpoint: run.floor,
    build: clone(run.build),
    ruleset: RULESET,
    retiredAt: new Date().toISOString(),
  };
  save.legacy = [...save.legacy.filter((x) => x.checkpoint !== run.floor), legacy].sort(
    (a, b) => a.checkpoint - b.checkpoint,
  );
  record(save, run, 'Retired');
  if (end) run.phase = 'retired';
  return true;
}
