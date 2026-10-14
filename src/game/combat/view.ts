import type { Build } from '../types';
import { createCombatActors } from './formation';
import type { CombatView, LogEntry } from './types';

export function createCombatPreview(player: Build, enemies: Build[], hp?: number): CombatView {
  const actors = createCombatActors(player, enemies, hp);
  return {
    actors,
    time: 0,
    logs: [] as LogEntry[],
    done: false,
    player: actors[0],
    enemies: actors.slice(1),
  };
}
