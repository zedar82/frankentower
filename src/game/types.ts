export const RULESET = 'frankentower-4';
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
export type Targeting =
  | { kind: 'single' }
  | { kind: 'count'; count: number }
  | { kind: 'area'; radius: number; center: 'self' | 'target' };
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
  | (AmountEffect & { kind: 'damage'; direct?: boolean; shieldBonus?: number })
  | (AmountEffect & { kind: 'bleed' | 'poison' })
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
  targeting?: Targeting;
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
  targeting?: Targeting;
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
export type CombatOutcome = 'ongoing' | 'victory' | 'stalemate' | 'defeat' | 'failure';
export interface FightActorReport {
  build: Build;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  damage: number;
  healing: number;
  diedAt?: number;
}
export interface FightContribution {
  uid: string;
  name: string;
  level: number;
  activations: number;
  damage: number;
  healing: number;
  shielding: number;
}
export interface FightTranscriptEntry {
  id: number;
  time: number;
  kind: 'damage' | 'heal' | 'shield' | 'activation' | 'status' | 'suppressed' | 'resource' | 'death';
  actor: string;
  target?: string;
  ability?: string;
  value?: number;
  text: string;
  chain: string[];
  crit?: number;
  shieldBreak?: boolean;
  attack?: 'slash' | 'heavy' | 'bolt' | 'arrow';
  status?: 'bleed' | 'poison';
}
export interface CompletedFightReport {
  floor: number;
  seed: number;
  outcome: Exclude<CombatOutcome, 'ongoing' | 'failure'>;
  duration: number;
  patient: FightActorReport;
  enemies: FightActorReport[];
  contributions: FightContribution[];
  suppressed: number;
  transcript: FightTranscriptEntry[];
  transcriptTruncated: boolean;
}
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
  lastReport: CompletedFightReport | null;
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
