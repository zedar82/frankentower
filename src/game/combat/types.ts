import type { BuildAbility } from '../abilities';
import type { Build, Effect, EventKind, Stat, Stats } from '../types';

export interface ArmStrike {
  startedAt: number;
  impactAt: number;
  rate: number;
  facing: number;
  targets: string[];
}
export interface CombatAbility extends BuildAbility {
  remaining: number;
  activations: number;
  damage: number;
  healing: number;
  shielding: number;
  lastActivated: number;
  strike?: ArmStrike;
  lastStrikeFacing?: number;
}
export interface Actor {
  id: string;
  side: 'player' | 'enemy';
  build: Build;
  stats: Stats;
  capacityWithMana: number;
  capacityWithoutMana: number;
  hp: number;
  mana: number;
  shield: number;
  bleed: number;
  poison: number;
  poisonOwner?: string;
  abilities: CombatAbility[];
  modifiers: Partial<Record<Stat, number>>;
  damage: number;
  healing: number;
  lastHit: number;
  lastAction: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  facing: number;
  walked: number;
  windup: number;
  windupItem?: string;
  diedAt?: number;
}
export interface LogEntry {
  id: number;
  time: number;
  kind:
    'damage' | 'heal' | 'shield' | 'activation' | 'status' | 'suppressed' | 'resource' | 'death';
  actor: string;
  target?: string;
  ability?: string;
  value?: number;
  text: string;
  chain: string[];
  crit?: number;
  x: number;
  y: number;
  tx?: number;
  ty?: number;
  shieldBreak?: boolean;
  attack?: 'slash' | 'heavy' | 'bolt' | 'arrow';
  status?: 'bleed' | 'poison';
}
export interface CombatView {
  actors: Actor[];
  time: number;
  logs: LogEntry[];
  done: boolean;
  failure?: string;
  player: Actor;
  enemies: Actor[];
}
export interface CombatEvent {
  kind: EventKind;
  source?: CombatAbility;
  target?: string;
  ancestry: string[];
  value?: number;
}
export interface Job {
  actor: Actor;
  node: CombatAbility;
  ancestry: string[];
  effects?: Effect[];
  target?: string;
  targets?: string[];
  targeting?: import('../types').Targeting;
  reactionId?: string;
}
