import { PROCEDURES } from './content';
import { canFunction, count, stats } from './anatomy';
import { clone, SATCHEL_CAPACITY, type Part, type Procedure, type Run } from './types';
import { Random } from './random';
import { nextUid } from './run-id';

export type ProcedureAccess = 'player' | 'stock';
export type ProcedurePlan = {
  build: Run['build'];
  removed: Part[];
  displaced: NonNullable<Part['item']>[];
  reason: string | null;
};

/** One validated projection is shared by availability, preview and execution. */
export function procedurePlan(
  run: Run,
  p: Procedure,
  access: ProcedureAccess = 'player',
): ProcedurePlan {
  const build = clone(run.build);
  const removed: Part[] = [];
  for (const remove of p.remove ?? [])
    for (let i = 0; i < remove.count; i++) {
      const candidates = build.parts.filter((part) => part.slot === remove.slot);
      const part = candidates.find((candidate) => !candidate.item) ?? candidates[candidates.length - 1];
      if (!part) continue;
      removed.push(part);
      build.parts = build.parts.filter((candidate) => candidate.uid !== part.uid);
    }
  for (const add of p.add ?? [])
    for (let i = 0; i < add.count; i++)
      build.parts.push({
        uid: `preview-${add.slot}-${build.parts.length}`,
        slot: add.slot,
        variant: add.variant ?? 'living',
      });
  const displaced = removed.flatMap((part) => (part.item ? [part.item] : []));
  let reason: string | null = null;
  if (access === 'player' && run.operated) reason = 'One procedure per visit.';
  else if (access === 'player' && run.gold < p.price) reason = 'Insufficient gold.';
  else if (access === 'player' && (run.phase !== 'build' || run.floor % 5 !== 0))
    reason = 'Surgery opens every five floors.';
  for (const remove of p.remove ?? [])
    if (!reason && count(run.build, remove.slot) < remove.count)
      reason = `Requires ${remove.count} ${remove.slot} slots.`;
  if (!reason && !canFunction(build)) reason = 'A living head or ganglion controller is required.';
  if (
    !reason &&
    access === 'player' &&
    run.stash.length + displaced.length > SATCHEL_CAPACITY
  )
    reason = `Free ${run.stash.length + displaced.length - SATCHEL_CAPACITY} satchel space(s) for displaced equipment.`;
  return { build, removed, displaced, reason };
}

export function procedurePreview(run: Run, p: Procedure) {
  const { build, removed, displaced } = procedurePlan(run, p);
  return { build, removed, displaced };
}

export function procedureReason(run: Run, p: Procedure, access: ProcedureAccess = 'player') {
  return procedurePlan(run, p, access).reason;
}

export type ProcedureResult =
  | { ok: true; removedPartUids: string[]; displacedItemUids: string[] }
  | { ok: false; reason: string };

export function operateResult(run: Run, id: string): ProcedureResult {
  const p = PROCEDURES.find((procedure) => procedure.id === id);
  if (!p || !run.procedures.includes(id))
    return { ok: false, reason: 'This procedure is no longer available.' };
  const plan = procedurePlan(run, p);
  if (plan.reason) return { ok: false, reason: plan.reason };
  const before = stats(run.build).maxHp;
  run.stash.push(...plan.displaced);
  run.build.parts = run.build.parts.filter(
    (part) => !plan.removed.some((removed) => removed.uid === part.uid),
  );
  for (const add of p.add ?? [])
    for (let i = 0; i < add.count; i++)
      run.build.parts.push({ uid: nextUid(run), slot: add.slot, variant: add.variant ?? 'living' });
  run.gold -= p.price;
  run.operated = true;
  run.surgeries++;
  const max = stats(run.build).maxHp;
  run.hp = Math.max(1, Math.min(max, run.hp + max - before));
  return {
    ok: true,
    removedPartUids: plan.removed.map((part) => part.uid),
    displacedItemUids: plan.displaced.map((item) => item.uid),
  };
}

export function operate(run: Run, id: string) {
  return operateResult(run, id).ok;
}

export function refreshProcedures(run: Run) {
  const rng = new Random(run.rng);
  const procedures = PROCEDURES.filter(
    (p) => p.minFloor <= run.floor && procedureReason(run, p, 'stock') === null,
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
