import type { Build } from '../types';
import { createCombatActors } from './formation';
import { ITEM_MAP, type ItemCatalog } from '../content';
import type { CombatView, LogEntry } from './types';

export function createCombatPreview(player: Build, enemies: Build[], hp?: number, itemCatalog: ItemCatalog = ITEM_MAP): CombatView {
  const actors = createCombatActors(player, enemies, hp, itemCatalog);
  return {
    actors,
    time: 0,
    logs: [] as LogEntry[],
    feedback: [],
    done: false,
    player: actors[0],
    enemies: actors.slice(1),
  };
}
