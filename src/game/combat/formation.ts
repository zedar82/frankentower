import { buildAbilities } from '../abilities';
import { circulationEfficiency, compileBuildStats, count, statsFromCompiled } from '../anatomy';
import { clone, type Build } from '../types';
import type { Actor, CombatAbility } from './types';
import { ITEM_MAP, type ItemCatalog } from '../content';

function makeActor(build: Build, side: Actor['side'], id: string, hp: number | undefined, itemCatalog: ItemCatalog): Actor {
  build = clone(build);
  const compiledStats = compileBuildStats(build, itemCatalog);
  const actorStats = statsFromCompiled(compiledStats);
  const { capacityWithMana, capacityWithoutMana } = compiledStats;
  const abilities: CombatAbility[] = buildAbilities(build, itemCatalog).map((ability) => ({
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
    compiledStats,
    stats: actorStats,
    capacityWithMana,
    capacityWithoutMana,
    hp: Math.min(actorStats.maxHp, hp ?? actorStats.maxHp),
    mana: actorStats.maxMana,
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

export function refreshCirculation(actor: Actor) {
  const baseCapacity = actor.mana > 0 ? actor.capacityWithMana : actor.capacityWithoutMana;
  actor.stats.capacity = baseCapacity + (actor.modifiers.capacity ?? 0);
  actor.stats.efficiency = circulationEfficiency(actor.stats.capacity, actor.stats.load);
}

export function createCombatActors(player: Build, enemies: Build[], hp?: number, itemCatalog: ItemCatalog = ITEM_MAP): Actor[] {
  const actors = [
    makeActor(player, 'player', 'player', hp, itemCatalog),
    ...enemies.map((build, index) => makeActor(build, 'enemy', `enemy-${index}`, undefined, itemCatalog)),
  ];
  actors[0].x = 185;
  actors[0].y = 250;
  actors.slice(1).forEach((actor, index) => {
    const angle = (index - (enemies.length - 1) / 2) * 0.58;
    actor.x = 410 + Math.cos(angle) * 65;
    actor.y = 238 + Math.sin(angle) * 100;
  });
  return actors;
}
