import { PROCEDURES } from './content';
import { canFunction, count, stats } from './anatomy';
import { clone, type Procedure, type Run } from './types';
import { Random } from './random';
import { nextUid } from './run-id';

export function procedureReason(run: Run, p: Procedure, ignoreMoney = false) {
  if (!ignoreMoney && run.operated) return 'One procedure per visit.';
  if (!ignoreMoney && run.gold < p.price) return 'Insufficient gold.';
  if (!ignoreMoney && (run.phase !== 'build' || run.floor % 5 !== 0))
    return 'Surgery opens every five floors.';
  for (const remove of p.remove ?? [])
    if (count(run.build, remove.slot) < remove.count)
      return `Requires ${remove.count} ${remove.slot} slots.`;
  const test = clone(run.build);
  for (const remove of p.remove ?? []) {
    let n = remove.count;
    test.parts = test.parts.filter((part) => part.slot !== remove.slot || n-- <= 0);
  }
  for (const add of p.add ?? [])
    for (let i = 0; i < add.count; i++)
      test.parts.push({ uid: `preview-${i}`, slot: add.slot, variant: add.variant ?? 'living' });
  if (!canFunction(test)) return 'A living head or ganglion controller is required.';
  return null;
}
export function operate(run: Run, id: string) {
  const p = PROCEDURES.find((p) => p.id === id);
  if (!p || !run.procedures.includes(id) || procedureReason(run, p)) return false;
  const before = stats(run.build).maxHp;
  for (const remove of p.remove ?? [])
    for (let i = 0; i < remove.count; i++) {
      const candidates = run.build.parts.filter((part) => part.slot === remove.slot);
      const part = candidates.find((p) => !p.item) ?? candidates[candidates.length - 1];
      if (part.item) run.stash.push(part.item);
      run.build.parts = run.build.parts.filter((x) => x.uid !== part.uid);
    }
  for (const add of p.add ?? [])
    for (let i = 0; i < add.count; i++)
      run.build.parts.push({ uid: nextUid(run), slot: add.slot, variant: add.variant ?? 'living' });
  run.gold -= p.price;
  run.operated = true;
  run.surgeries++;
  const max = stats(run.build).maxHp;
  run.hp = Math.max(1, Math.min(max, run.hp + max - before));
  return true;
}

export function refreshProcedures(run: Run) {
  const rng = new Random(run.rng);
  const procedures = PROCEDURES.filter(
    (p) => p.minFloor <= run.floor && procedureReason(run, p, true) === null,
  );
  const available = [...procedures];
  const choices: string[] = [];
  // A dependable pump is always offered: overload is a decision, not a shop lottery.
  const support = available.findIndex((p) => p.id === 'heart');
  if (support >= 0) choices.push(available.splice(support, 1)[0].id);
  const grafts = available.filter((p) => p.add?.some((a) => a.slot !== 'heart'));
  if (grafts.length) {
    const p = rng.pick(grafts);
    choices.push(p.id);
    available.splice(available.indexOf(p), 1);
  }
  while (choices.length < 4 && available.length)
    choices.push(available.splice(rng.int(available.length), 1)[0].id);
  // IDs are stored rather than content objects so saves follow the current ruleset.
  run.procedures = choices;
  run.rng = rng.state;
}
