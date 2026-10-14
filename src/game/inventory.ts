import { ITEM_MAP } from './content';
import { equipped, stats, usable } from './anatomy';
import { SATCHEL_CAPACITY, type Item, type Part, type Run } from './types';

type ItemLocation =
  | { kind: 'offer'; index: number; item: Item }
  | { kind: 'stash'; item: Item }
  | { kind: 'equipped'; part: Part; item: Item };

export type InventoryFailureCode =
  | 'wrong_phase'
  | 'missing_item'
  | 'missing_offer'
  | 'insufficient_gold'
  | 'wrong_slot'
  | 'anatomy_requirement'
  | 'already_equipped'
  | 'already_in_satchel'
  | 'satchel_full'
  | 'missing_pair';
export type InventoryResult =
  | { ok: true; itemUid: string }
  | { ok: false; code: InventoryFailureCode; message: string };

function failedMove(reason: string): Extract<InventoryResult, { ok: false }> {
  const code: InventoryFailureCode = reason.startsWith('Equipment can only')
    ? 'wrong_phase'
    : reason === 'Insufficient gold.'
      ? 'insufficient_gold'
      : reason === 'Choose a matching equipment slot.'
        ? 'wrong_slot'
        : reason.startsWith('Your anatomy')
          ? 'anatomy_requirement'
          : reason === 'Already equipped here.'
            ? 'already_equipped'
            : reason === 'Already in the satchel.'
              ? 'already_in_satchel'
              : reason.startsWith('Satchel full')
                ? 'satchel_full'
                : 'missing_item';
  return { ok: false, code, message: reason };
}

function locateItem(run: Run, uid: string): ItemLocation | undefined {
  const index = run.offers.findIndex((item) => item?.uid === uid);
  if (index >= 0) return { kind: 'offer', index, item: run.offers[index]! };
  const item = run.stash.find((item) => item.uid === uid);
  if (item) return { kind: 'stash', item };
  const part = run.build.parts.find((part) => part.item?.uid === uid);
  if (part?.item) return { kind: 'equipped', part, item: part.item };
}

export function itemMoveReason(run: Run, uid: string, partUid?: string): string | null {
  if (run.phase !== 'build') return 'Equipment can only be changed between fights.';
  const location = locateItem(run, uid);
  if (!location) return 'This item is no longer available.';
  const def = ITEM_MAP[location.item.defId];
  if (location.kind === 'offer' && run.gold < def.price) return 'Insufficient gold.';
  const part = partUid ? run.build.parts.find((part) => part.uid === partUid) : undefined;
  if (partUid && (!part || part.slot !== def.slot)) return 'Choose a matching equipment slot.';
  if (part && !usable(run.build, location.item))
    return 'Your anatomy does not meet this item’s requirements.';
  if (location.kind === 'equipped' && location.part.uid === partUid)
    return 'Already equipped here.';
  if (location.kind === 'stash' && !part) return 'Already in the satchel.';
  const finalSize =
    run.stash.length - (location.kind === 'stash' ? 1 : 0) + (part ? (part.item ? 1 : 0) : 1);
  return finalSize > SATCHEL_CAPACITY
    ? 'Satchel full. Equip, combine, or sell an item to make room.'
    : null;
}

export function canMoveItem(run: Run, uid: string, partUid?: string) {
  return itemMoveReason(run, uid, partUid) === null;
}

export function moveItem(run: Run, uid: string, partUid?: string) {
  if (!canMoveItem(run, uid, partUid)) return false;
  const location = locateItem(run, uid)!;
  const part = partUid ? run.build.parts.find((part) => part.uid === partUid)! : undefined;
  // Validate final occupancy before spending or mutating. No intermediate stash overflow.
  if (location.kind === 'offer') {
    run.gold -= ITEM_MAP[location.item.defId].price;
    run.purchases++;
    run.offers[location.index] = null;
  }
  if (location.kind === 'stash') run.stash = run.stash.filter((item) => item.uid !== uid);
  if (location.kind === 'equipped') delete location.part.item;
  if (part) {
    if (part.item) run.stash.push(part.item);
    part.item = location.item;
  } else run.stash.push(location.item);
  // Clamp only after the complete operation, including HP equipment swaps.
  run.hp = Math.min(run.hp, stats(run.build).maxHp);
  return true;
}

export function moveItemResult(run: Run, uid: string, partUid?: string): InventoryResult {
  const reason = itemMoveReason(run, uid, partUid);
  if (reason) return failedMove(reason);
  return moveItem(run, uid, partUid)
    ? { ok: true, itemUid: uid }
    : failedMove('This item is no longer available.');
}

export function purchaseDestination(run: Run, index: number) {
  const offer = run.offers[index];
  return offer && usable(run.build, offer)
    ? run.build.parts.find((part) => part.slot === ITEM_MAP[offer.defId].slot && !part.item)?.uid
    : undefined;
}
export function purchaseReason(run: Run, index: number) {
  const offer = run.offers[index];
  return offer
    ? itemMoveReason(run, offer.uid, purchaseDestination(run, index))
    : 'Already purchased.';
}
export function purchaseItem(run: Run, index: number) {
  const offer = run.offers[index];
  return !!offer && moveItem(run, offer.uid, purchaseDestination(run, index));
}
export function purchaseItemResult(run: Run, index: number): InventoryResult {
  const offer = run.offers[index];
  if (!offer) return { ok: false, code: 'missing_offer', message: 'Already purchased.' };
  return moveItemResult(run, offer.uid, purchaseDestination(run, index));
}

export function buy(run: Run, index: number) {
  const item = run.offers[index];
  return !!item && moveItem(run, item.uid);
}
export function equip(run: Run, itemUid: string, partUid: string) {
  return run.stash.some((item) => item.uid === itemUid) && moveItem(run, itemUid, partUid);
}
export function unequip(run: Run, partUid: string) {
  const part = run.build.parts.find((p) => p.uid === partUid);
  return !!part?.item && moveItem(run, part.item.uid);
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
  run.hp = Math.min(run.hp, stats(run.build).maxHp);
  return true;
}
