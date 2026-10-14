import { useState } from 'react';
import { ITEM_MAP } from '../game/content';
import { LEVEL_SCALE, SLOT_LABEL } from '../game/anatomy';
import {
  combineResult,
  combineCandidate,
  unequipResult,
  itemMoveReason,
  purchaseReason,
  sellResult,
} from '../game/inventory';
import type { InventoryResult } from '../game/inventory';
import type { Item, Run } from '../game/types';
import { Modal } from './Modal';
import { Icon } from './Icon';
import { PagedText, Tabs } from './Paging';

interface Props {
  run: Run;
  selected: Item;
  onClose(): void;
  onPurchase(index: number): void;
  onEquip(): void;
  onChange(event?: string): void;
  onTargets(item: Item): void;
  onMessage?(message: string): void;
}

export function ItemInspector({
  run,
  selected,
  onClose,
  onPurchase,
  onEquip,
  onChange,
  onTargets,
  onMessage,
}: Props) {
  const [section, setSection] = useState<'Rules' | 'Signature' | 'About'>('Rules');
  const def = ITEM_MAP[selected.defId];
  const offerIndex = run.offers.findIndex((item) => item?.uid === selected.uid);
  const owner = run.build.parts.find((part) => part.item?.uid === selected.uid);
  const inTray = run.stash.some((item) => item.uid === selected.uid);
  const reason =
    offerIndex >= 0
      ? purchaseReason(run, offerIndex)
      : owner
        ? itemMoveReason(run, selected.uid)
        : null;
  const text =
    section === 'Rules'
      ? `${def.text}${selected.level > 1 ? `\n\nDamage, healing, Shield, status amounts and passive stats are ×${LEVEL_SCALE[selected.level]}. Timers and cooldown reductions retain their listed values.` : ''}${def.requires ? `\n\nRequires ${def.requires.count} ${SLOT_LABEL[def.requires.slot]} slots.` : ''}`
      : section === 'Signature'
        ? `Level 3 signature${selected.level === 3 ? ' — active' : ' — unlock by combining'}\n\n${def.signature}`
        : `${def.type} · ${SLOT_LABEL[def.slot]} equipment\nRarity ${def.rarity} · Level ${selected.level}\nTags: ${def.tags.join(', ') || 'None'}\n\nTwo identical items at the same level combine into the next level. Each instance activates once per causal branch; separate branches are independent.`;
  const act = (action: () => InventoryResult, event: string) => {
    const result = action();
    if (!result.ok) {
      onMessage?.(result.message);
      return;
    }
    onChange(event);
    onEquip();
    onClose();
  };
  return (
    <div className="item-inspector">
      <div className="item-detail-art">
        <Icon name={def.icon} size={64} variant={def.id} />
        <div>
          <h3>{def.name}</h3>
          <span>
            {SLOT_LABEL[def.slot]} · Lv{selected.level} · {'★'.repeat(def.rarity)}
          </span>
        </div>
      </div>
      <Tabs<typeof section>
        label="Item information"
        value={section}
        values={['Rules', 'Signature', 'About']}
        onChange={setSection}
      />
      <PagedText key={section} text={text} label={section} />
      {reason && (
        <p className="action-reason" role="status">
          {reason}
        </p>
      )}
      {(offerIndex >= 0 || owner || inTray) && (
        <div className="detail-actions">
          {offerIndex >= 0 && (
            <button className="primary" disabled={!!reason} onClick={() => onPurchase(offerIndex)}>
              Buy for {def.price} gold
            </button>
          )}
          {run.phase === 'build' && (
            <button onClick={() => onTargets(selected)}>
              {offerIndex >= 0 ? 'Buy into slot…' : 'Equip / swap…'}
            </button>
          )}
          {owner && (
            <button
              disabled={!!reason}
              onClick={() => act(() => unequipResult(run, owner.uid), 'item_unequipped')}
            >
              Move to satchel
            </button>
          )}
          {inTray && (
            <button
              disabled={run.phase !== 'build'}
              onClick={() => act(() => sellResult(run, selected.uid), 'item_sold')}
            >
              Sell for {Math.floor(def.price * 0.5 * [0, 1, 2, 4][selected.level])} gold
            </button>
          )}
          {combineCandidate(run, selected) && (
            <button
              disabled={run.phase !== 'build'}
              onClick={() => act(() => combineResult(run, selected.uid), 'item_combined')}
            >
              Combine → Lv{selected.level + 1}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function ItemDetails(props: Props) {
  return (
    <Modal title="Equipment inspection" onClose={props.onClose}>
      <ItemInspector {...props} />
    </Modal>
  );
}
