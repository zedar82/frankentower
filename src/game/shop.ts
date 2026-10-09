import { ITEMS, ITEM_MAP } from './content';
import { equipped, stats } from './anatomy';
import { Random } from './random';
import { nextUid } from './run-id';
import type { Run } from './types';

export function refreshStock(run: Run) {
  const rng = new Random(run.rng);
  const owned = [...run.stash, ...equipped(run.build).map((x) => x.item)];
  run.offers = Array.from({ length: 4 }, (_, i) => {
    const roll = rng.next();
    const maxRarity = Math.min(5, run.shopTier);
    let rarity = Math.min(
      maxRarity,
      roll < 0.35 ? 1 : roll < 0.65 ? 2 : roll < 0.84 ? 3 : roll < 0.95 ? 4 : 5,
    );
    if (i === 0) rarity = maxRarity;
    const pool = ITEMS.filter(
      (d) =>
        d.rarity === rarity &&
        (run.floor !== 1 ||
          i !== 0 ||
          d.effects?.some((e) => ['damage', 'poison'].includes(e.kind))),
    );
    const duplicate = owned.filter((d) => ITEM_MAP[d.defId].rarity <= maxRarity);
    const def =
      i === 3 && duplicate.length && rng.next() < 0.6
        ? ITEM_MAP[rng.pick(duplicate).defId]
        : rng.pick(pool);
    return { uid: nextUid(run), defId: def.id, level: 1 };
  });
  run.rng = rng.state;
}

export const RECOVERY_COST = 10;
export const rerollCost = (run: Run) => 2 + run.shopTier;
export const upgradeCost = (run: Run) => 12 + run.shopTier * 8;

export function toggleShopFreeze(run: Run) {
  if (run.phase !== 'build') return false;
  run.shopFrozen = !run.shopFrozen;
  return true;
}
export function reroll(run: Run) {
  const cost = rerollCost(run);
  if (run.phase !== 'build' || run.gold < cost) return false;
  run.gold -= cost;
  run.rerolls++;
  refreshStock(run);
  return true;
}
export function upgradeShop(run: Run) {
  const cost = upgradeCost(run);
  if (run.phase !== 'build' || run.shopTier >= 5 || run.gold < cost) return false;
  run.gold -= cost;
  run.shopTier++;
  refreshStock(run);
  return true;
}
export function recover(run: Run) {
  if (run.phase !== 'build' || run.gold < RECOVERY_COST || run.hp >= stats(run.build).maxHp)
    return false;
  run.gold -= RECOVERY_COST;
  run.hp = Math.min(stats(run.build).maxHp, run.hp + Math.ceil(stats(run.build).maxHp * 0.5));
  return true;
}
