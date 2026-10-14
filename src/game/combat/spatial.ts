import {
  ARM_STRIKE_TIME,
  ARM_RECOVERY_TIME,
  clampProgress,
  drawbackProgress,
  type ArmMotion,
} from '../attack-motion';
import type { AbilityDef, Effect } from '../types';
import type { Actor, CombatAbility, LogEntry } from './types';

export const ARENA = { width: 640, height: 400, cx: 320, cy: 238, rx: 268, ry: 137 };
export const distance = (a: Pick<Actor, 'x' | 'y'>, b: Pick<Actor, 'x' | 'y'>) =>
  Math.hypot(a.x - b.x, a.y - b.y);
export const attackStyle = (def: AbilityDef): LogEntry['attack'] =>
  def.tags.includes('Magical')
    ? 'bolt'
    : def.tags.includes('Ranged')
      ? 'arrow'
      : def.tags.includes('Blunt')
        ? 'heavy'
        : 'slash';
export function attackRange(actor: Actor, target: Actor, def: AbilityDef) {
  return def.tags.includes('Magical')
    ? 240
    : def.tags.includes('Ranged')
      ? 205
      : actor.radius + target.radius + 23;
}
export const offensive = (effects: Effect[]) =>
  effects.some((e) => e.kind === 'damage' && e.direct);
export const hostile = (effects: Effect[]) =>
  effects.some((e) => e.kind === 'damage' || e.kind === 'bleed' || e.kind === 'poison');
export const usesArmStrike = (node: CombatAbility) =>
  node.slot === 'hand' && offensive(node.def.effects ?? []);
export function armMotion(actor: Actor, node: CombatAbility, time: number): ArmMotion {
  const rate = actor.stats.speed * actor.stats.efficiency;
  const motion: ArmMotion = {
    drawback: Number.isFinite(node.def.cooldown)
      ? drawbackProgress(node.remaining, node.def.cooldown!, rate)
      : 0,
    facing: actor.facing,
  };
  if (node.strike)
    return {
      ...motion,
      facing: node.strike.facing,
      strike: clampProgress((time - node.strike.startedAt) / ARM_STRIKE_TIME),
    };
  const age = time - node.lastActivated;
  if (age >= 0 && age < ARM_RECOVERY_TIME)
    return {
      ...motion,
      facing: node.lastStrikeFacing ?? actor.facing,
      recovery: age / ARM_RECOVERY_TIME,
    };
  return motion;
}
export function moveActors(
  actors: Actor[],
  time: number,
  delta: number,
  targetFor: (actor: Actor) => Actor | undefined,
) {
  for (const actor of actors) {
    actor.vx = 0;
    actor.vy = 0;
    actor.windup = 0;
    actor.windupItem = undefined;
    if (actor.hp <= 0) {
      actor.diedAt ??= time;
      continue;
    }
    const target = targetFor(actor);
    if (!target) continue;
    const d = Math.max(0.01, distance(actor, target)),
      nx = (target.x - actor.x) / d,
      ny = (target.y - actor.y) / d;
    actor.facing = nx < 0 ? -1 : 1;
    const attacks = actor.abilities.filter((n) => offensive(n.def.effects ?? []));
    const melee = attacks.some(
      (n) => !n.def.tags.includes('Ranged') && !n.def.tags.includes('Magical'),
    );
    const rate = actor.stats.speed * actor.stats.efficiency;
    for (const node of attacks)
      if (attackStyle(node.def) === 'heavy' && d <= attackRange(actor, target, node.def)) {
        const anticipation = Math.min(0.65, (node.def.cooldown ?? 2) * 0.2) * rate;
        if (anticipation > 0 && node.remaining < anticipation) {
          const progress = 1 - Math.max(0, node.remaining) / anticipation;
          if (progress > actor.windup) {
            actor.windup = progress;
            actor.windupItem = node.uid;
          }
        }
      }
    const preferred = melee || attacks.length === 0 ? actor.radius + target.radius + 12 : 150;
    const direction = actor.side === 'player' ? 1 : Number(actor.id.split('-')[1]) % 2 ? 1 : -1;
    let forward = d > preferred + 5 ? 1 : d < preferred - 8 ? -0.55 : 0;
    // Short blades step away after a strike, then close for the next one.
    if (
      melee &&
      actor.abilities.some((n) => n.def.movement?.retreatAfterAttack) &&
      time - actor.lastAction < 0.16 &&
      d < preferred + 2
    )
      forward = -0.7;
    const strafe =
      d < preferred + 70 ? (actor.side === 'enemy' ? 0.52 : 0.3) * direction : 0.08 * direction;
    let mx = nx * forward - ny * strafe,
      my = ny * forward + nx * strafe;
    const length = Math.max(1, Math.hypot(mx, my));
    const speed =
      actor.stats.movementSpeed *
      Math.max(0.5, Math.sqrt(actor.stats.efficiency)) *
      (actor.windup > 0 ? 0.16 : 1);
    mx = (mx / length) * speed * delta;
    my = (my / length) * speed * delta;
    actor.x += mx;
    actor.y += my;
    actor.vx = mx / delta;
    actor.vy = my / delta;
    actor.walked += Math.hypot(mx, my);
  }
  // Soft body separation keeps packs legible without obstacle/pathfinding AI.
  const alive = actors.filter((a) => a.hp > 0);
  for (let i = 0; i < alive.length; i++)
    for (let j = i + 1; j < alive.length; j++) {
      const a = alive[i],
        b = alive[j],
        d = distance(a, b),
        gap = a.radius + b.radius;
      if (d >= gap) continue;
      const nx = d > 0.001 ? (b.x - a.x) / d : 1,
        ny = d > 0.001 ? (b.y - a.y) / d : 0,
        push = (gap - d) * 0.5;
      a.x -= nx * push;
      a.y -= ny * push;
      b.x += nx * push;
      b.y += ny * push;
    }
  for (const a of alive) {
    const rx = ARENA.rx - a.radius,
      ry = ARENA.ry - a.radius;
    const radial = Math.hypot((a.x - ARENA.cx) / rx, (a.y - ARENA.cy) / ry);
    if (radial > 1) {
      a.x = ARENA.cx + (a.x - ARENA.cx) / radial;
      a.y = ARENA.cy + (a.y - ARENA.cy) / radial;
    }
  }
}
