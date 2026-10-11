export const RULESET = 'frankentower-3';
export const SATCHEL_CAPACITY = 8;
export type Slot = 'hand' | 'head' | 'foot' | 'chest' | 'heart';
export type ItemType = 'Weapon' | 'Wand' | 'Shield' | 'Helmet' | 'Armour' | 'Shoe' | 'Heart';
export type Tag =
  | 'Blade'
  | 'Blood'
  | 'Bone'
  | 'Blunt'
  | 'Arcane'
  | 'Poison'
  | 'Mechanical'
  | 'Holy'
  | 'Melee'
  | 'Ranged'
  | 'Magical'
  | 'Octopod'
  | 'Chance';
export type EventKind =
  | 'start'
  | 'activated'
  | 'hit'
  | 'crit'
  | 'kill'
  | 'hurt'
  | 'block'
  | 'heal'
  | 'bleed'
  | 'poison'
  | 'poisonTick'
  | 'mana';
export type Stat = 'armour' | 'speed' | 'crit' | 'chance' | 'capacity' | 'maxHp' | 'maxMana';
export type AbilitySourceKind = 'item' | 'limb' | 'set';
export interface Selector {
  self?: boolean;
  type?: ItemType;
  tag?: Tag;
  slot?: Slot;
  random?: boolean;
  longest?: boolean;
  other?: boolean;
  source?: AbilitySourceKind | 'any';
}
interface EffectBase {
  chance?: number;
  cost?: number;
}
interface AmountEffect extends EffectBase {
  amount: number;
  per?: Slot;
}
export type Effect =
  | (AmountEffect & { kind: 'damage'; all?: boolean; direct?: boolean; shieldBonus?: number })
  | (AmountEffect & { kind: 'bleed' | 'poison'; all?: boolean })
  | (AmountEffect & { kind: 'heal' | 'shield' | 'mana' })
  | (EffectBase & { kind: 'trigger'; select?: Selector })
  | (EffectBase & { kind: 'cdr'; amount: number; select?: Selector; percent?: boolean })
  | (AmountEffect & { kind: 'stat'; stat: Stat });
export interface Reaction {
  id?: string;
  event: EventKind;
  tag?: Tag;
  type?: ItemType;
  slot?: Slot;
  own?: boolean;
  source?: AbilitySourceKind;
  chance?: number;
  effects: Effect[];
}
export interface AbilityDef {
  id: string;
  name: string;
  type?: ItemType;
  tags: Tag[];
  icon: string;
  text: string;
  cooldown?: number;
  effects?: Effect[];
  reactions?: Reaction[];
  stats?: Partial<Record<Stat, number>>;
  lv3?: Reaction[];
  movement?: { retreatAfterAttack?: boolean };
}
export interface ItemDef extends AbilityDef {
  slot: Slot;
  type: ItemType;
  rarity: number;
  price: number;
  signature: string;
  requires?: { slot: Slot; count: number };
}
export interface Item {
  uid: string;
  defId: string;
  level: number;
}
export interface Part {
  uid: string;
  slot: Slot;
  variant: 'living' | 'clockwork' | 'necrotic' | 'serpent' | 'ganglion' | 'rat' | 'bone';
  item?: Item;
}
export interface Build {
  name: string;
  parts: Part[];
  healthFactor?: number;
  powerFactor?: number;
}
export interface Stats {
  maxHp: number;
  maxMana: number;
  capacity: number;
  load: number;
  efficiency: number;
  speed: number;
  movementSpeed: number;
  armour: number;
  crit: number;
  chance: number;
  manaPerSecond: number;
  sets: Record<string, number>;
}
export interface Procedure {
  id: string;
  name: string;
  text: string;
  quote: string;
  price: number;
  add?: { slot: Slot; variant?: Part['variant']; count: number }[];
  remove?: { slot: Slot; count: number }[];
  minFloor: number;
}
export type Phase =
  'start' | 'build' | 'combat' | 'result' | 'checkpoint' | 'dead' | 'retired' | 'complete';
export interface Run {
  seed: number;
  rng: number;
  serial: number;
  floor: number;
  highest: number;
  gold: number;
  shopTier: number;
  shopFrozen: boolean;
  build: Build;
  hp: number;
  stash: Item[];
  offers: (Item | null)[];
  procedures: string[];
  operated: boolean;
  phase: Phase;
  lastEnemies: Build[];
  victories: number;
  purchases: number;
  rerolls: number;
  surgeries: number;
}
export interface Legacy {
  checkpoint: number;
  build: Build;
  ruleset: string;
  retiredAt: string;
}
export interface Save {
  version: string;
  run: Run | null;
  legacy: Legacy[];
  records: { name: string; floor: number; build: Build; reason: string }[];
  best: number;
  completed: boolean;
  settings: { sound: boolean; speed: number };
  achievements: string[];
}
export const clone = <T>(x: T): T => structuredClone(x);
