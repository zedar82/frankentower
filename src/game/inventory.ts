import { ITEM_MAP } from './content';
import { equipped, stats, usable } from './anatomy';
import type { Item, Part, Run } from './types';

type ItemLocation =
  | { kind: 'offer'; index: number; item: Item }
  | { kind: 'stash'; item: Item }
  | { kind: 'equipped'; part: Part; item: Item };

function locateItem(run: Run, uid: string): ItemLocation | undefined {
  const index = run.offers.findIndex((item) => item?.uid === uid);
  if (index >= 0) return { kind: 'offer', index, item: run.offers[index]! };
  const item = run.stash.find((item) => item.uid === uid);
  if (item) return { kind: 'stash', item };
  const part = run.build.parts.find((part) => part.item?.uid === uid);
  if (part?.item) return { kind: 'equipped', part, item: part.item };
}

export function canMoveItem(run: Run, uid: string, partUid?: string) {
  if (run.phase !== 'build') return false;
  const location = locateItem(run, uid);
  if (!location) return false;
  const def = ITEM_MAP[location.item.defId];
  if (location.kind === 'offer' && run.gold < def.price) return false;
  if (!partUid) return true;
  const part = run.build.parts.find((part) => part.uid === partUid);
  return !!part && part.slot === def.slot && usable(run.build, location.item);
}

export function moveItem(run: Run, uid: string, partUid?: string) {
  if (!canMoveItem(run, uid, partUid)) return false;
  const location = locateItem(run, uid)!;
  if (location.kind === 'equipped' && location.part.uid === partUid) return false;
  if (location.kind === 'stash' && !partUid) return false;
  if (location.kind === 'offer' && !buy(run, location.index)) return false;
  if (location.kind === 'equipped') {
    // Clamp HP after the complete move, not halfway through an equipment swap.
    delete location.part.item;
    run.stash.push(location.item);
  }
  if (partUid) return equip(run, uid, partUid);
  run.hp = Math.min(run.hp, stats(run.build).maxHp);
  return true;
}

export function purchaseItem(run: Run, index: number) {
  const offer = run.offers[index];
  if (!offer || !buy(run, index)) return false;
  const empty = run.build.parts.find(
    (part) => part.slot === ITEM_MAP[offer.defId].slot && !part.item,
  );
  if (empty && usable(run.build, offer)) equip(run, offer.uid, empty.uid);
  return true;
}

export function buy(run: Run, index: number) {
  if (run.phase !== 'build') return false;
  const item = run.offers[index];
  if (!item) return false;
  const def = ITEM_MAP[item.defId];
  if (run.gold < def.price) return false;
  run.gold -= def.price;
  run.purchases++;
  run.stash.push(item);
  run.offers[index] = null;
  return true;
}
export function equip(run: Run, itemUid: string, partUid: string) {
  if (run.phase !== 'build') return false;
  const index = run.stash.findIndex((i) => i.uid === itemUid),
    part = run.build.parts.find((p) => p.uid === partUid);
  const item = run.stash[index];
  if (!item || !part || ITEM_MAP[item.defId].slot !== part.slot || !usable(run.build, item))
    return false;
  run.stash.splice(index, 1);
  if (part.item) run.stash.push(part.item);
  part.item = item;
  run.hp = Math.min(run.hp, stats(run.build).maxHp);
  return true;
}
export function unequip(run: Run, partUid: string) {
  if (run.phase !== 'build') return;
  const part = run.build.parts.find((p) => p.uid === partUid);
  if (part?.item) {
    run.stash.push(part.item);
    delete part.item;
    run.hp = Math.min(run.hp, stats(run.build).maxHp);
  }
}
export function sell(run: Run, itemUid: string) {
  if (run.phase !== 'build') return false;
  const i = run.stash.findIndex((x) => x.uid === itemUid);
  if (i < 0) return false;
  run.gold += Math.floor(
    ITEM_MAP[run.stash[i].defId].price * 0.5 * [0, 1, 2, 4][run.stash[i].level],
  );
  run.stash.splice(i, 1);
  return true;
}
export function combineCandidate(run: Run, item: Item) {
  return item.level < 3
    ? [...run.stash, ...equipped(run.build).map((x) => x.item)].find(
        (x) => x.uid !== item.uid && x.defId === item.defId && x.level === item.level,
      )
    : undefined;
}
export function combine(run: Run, itemUid: string) {
  if (run.phase !== 'build') return false;
  const target = [...run.stash, ...equipped(run.build).map((x) => x.item)].find(
    (x) => x.uid === itemUid,
  );
  if (!target) return false;
  const donor = combineCandidate(run, target);
  if (!donor) return false;
  run.stash = run.stash.filter((x) => x.uid !== donor.uid);
  run.build.parts.forEach((p) => {
    if (p.item?.uid === donor.uid) delete p.item;
  });
  target.level++;
  return true;
}
