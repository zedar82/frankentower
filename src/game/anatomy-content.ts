import type { AbilityDef, Part, Slot } from './types';

interface SlotDefinition {
  hp: number;
  load: number;
  mana?: number;
  manaPerSecond?: number;
  capacity?: number;
}

interface VariantDefinition {
  controller?: boolean;
  loadMultiplier?: number;
  heart?: { capacity: number; requiresMana?: boolean; manaPerSecond?: number };
  abilities?: Partial<Record<Slot, AbilityDef[]>>;
}

export const SLOT_DEFINITIONS: Record<Slot, SlotDefinition> = {
  chest: { hp: 400, load: 20 },
  head: { hp: 160, load: 30, mana: 200, manaPerSecond: 10 },
  hand: { hp: 80, load: 20 },
  foot: { hp: 80, load: 15 },
  heart: { hp: 120, load: 0, capacity: 120 },
};

export const VARIANT_DEFINITIONS: Record<Part['variant'], VariantDefinition> = {
  living: {},
  clockwork: { loadMultiplier: 0 },
  necrotic: { heart: { capacity: 220, requiresMana: true, manaPerSecond: -20 } },
  ganglion: { controller: true, heart: { capacity: 60 } },
  serpent: {
    abilities: {
      head: [
        {
          id: 'serpentbite',
          name: 'Serpent bite',
          icon: 'dagger',
          type: 'Weapon',
          tags: ['Poison', 'Melee'],
          cooldown: 3,
          text: 'Every 3s: attack for 100 and apply 40 Poison.',
          effects: [
            { kind: 'damage', amount: 100, direct: true },
            { kind: 'poison', amount: 40 },
          ],
        },
      ],
    },
  },
  rat: {},
  bone: {},
};
