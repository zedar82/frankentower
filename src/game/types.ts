export const RULESET = 'frankentower-1';
export type Slot = 'hand' | 'head' | 'foot' | 'chest' | 'heart';
export type ItemType = 'Weapon' | 'Wand' | 'Shield' | 'Helmet' | 'Armour' | 'Shoe' | 'Heart';
export type Tag = 'Blade' | 'Blood' | 'Bone' | 'Blunt' | 'Arcane' | 'Poison' | 'Mechanical' | 'Holy' | 'Melee' | 'Ranged' | 'Magical' | 'Octopod' | 'Chance';
export type EventKind = 'start' | 'activated' | 'hit' | 'crit' | 'kill' | 'hurt' | 'block' | 'heal' | 'bleed' | 'poison' | 'poisonTick' | 'mana';
export type Stat = 'armour' | 'speed' | 'crit' | 'chance' | 'capacity' | 'maxHp' | 'maxMana';
export interface Selector { self?: boolean; type?: ItemType; tag?: Tag; slot?: Slot; random?: boolean; longest?: boolean; other?: boolean }
export interface Effect {
  kind: 'damage' | 'heal' | 'shield' | 'bleed' | 'poison' | 'mana' | 'trigger' | 'cdr' | 'stat';
  amount?: number;
  select?: Selector;
  all?: boolean;
  percent?: boolean;
  stat?: Stat;
  direct?: boolean;
  cost?: number;
  chance?: number;
  per?: Slot;
  shieldBonus?: number;
}
export interface Reaction { event: EventKind; tag?: Tag; type?: ItemType; slot?: Slot; own?: boolean; chance?: number; effects: Effect[] }
export interface ItemDef {
  id: string; name: string; slot: Slot; type: ItemType; tags: Tag[]; rarity: number; price: number;
  icon: string; text: string; cooldown?: number; effects?: Effect[]; reactions?: Reaction[];
  stats?: Partial<Record<Stat, number>>; signature: string; lv3?: Reaction[]; requires?: { slot: Slot; count: number };
}
export interface Item { uid: string; defId: string; level: number }
export interface Part { uid: string; slot: Slot; variant: 'living' | 'clockwork' | 'necrotic' | 'serpent' | 'ganglion'; item?: Item }
export interface Build { name: string; parts: Part[]; healthFactor?: number; powerFactor?: number }
export interface Stats { maxHp: number; maxMana: number; capacity: number; load: number; efficiency: number; speed: number; movementSpeed: number; armour: number; crit: number; chance: number; necrotic: number; octopod: number }
export interface Procedure { id: string; name: string; text: string; quote: string; price: number; add?: { slot: Slot; variant?: Part['variant']; count: number }[]; remove?: { slot: Slot; count: number }[]; minFloor: number }
export type Phase = 'start' | 'build' | 'combat' | 'result' | 'checkpoint' | 'dead' | 'retired' | 'complete';
export interface Run { seed: number; rng: number; serial: number; floor: number; highest: number; gold: number; shopTier: number; build: Build; hp: number; stash: Item[]; offers: (Item | null)[]; procedures: string[]; operated: boolean; phase: Phase; lastEnemies: Build[]; victories: number; purchases: number; rerolls: number; surgeries: number }
export interface Legacy { checkpoint: number; build: Build; ruleset: string; retiredAt: string }
export interface Save { version: string; run: Run | null; legacy: Legacy[]; records: { name: string; floor: number; build: Build; reason: string }[]; best: number; completed: boolean; settings: { sound: boolean; speed: number }; achievements: string[] }
export const clone = <T,>(x: T): T => structuredClone(x);
