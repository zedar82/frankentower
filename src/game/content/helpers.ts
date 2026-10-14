import type { Effect, ItemDef, Reaction, Selector, Stat } from '../types';
export const damage = (
  amount: number,
  extra: Partial<Extract<Effect, { kind: 'damage' }>> = {},
): Effect => ({ kind: 'damage', amount, direct: true, ...extra });
export const fx = (
  kind: 'heal' | 'shield' | 'bleed' | 'poison' | 'mana',
  amount: number,
): Effect => ({ kind, amount });
export const stat = (amount: number, stat: Stat): Effect => ({ kind: 'stat', amount, stat });
export const react = (
  event: Reaction['event'],
  effects: Effect[],
  extra: Partial<Reaction> = {},
): Reaction => ({ event, effects, ...extra });
export const trigger = (select: Selector): Effect => ({ kind: 'trigger', select });
export const cdr = (amount: number, select: Selector, percent = false): Effect => ({
  kind: 'cdr',
  amount,
  select,
  percent,
});
export function item(definition: Omit<ItemDef, 'price'> & { price?: number }): ItemDef {
  return {
    targeting: { kind: 'single' },
    price: [0, 8, 13, 21, 32, 48][definition.rarity],
    ...definition,
  };
}
