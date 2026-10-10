import { ITEM_MAP } from '../game/content';
import { LEVEL_SCALE, SLOT_LABEL, usable } from '../game/anatomy';
import { combine, combineCandidate, equip, sell, unequip } from '../game/inventory';
import type { Item, Run } from '../game/types';
import { Modal } from './Modal';
import { Icon } from './Icon';

interface Props {
  run: Run;
  selected: Item;
  onClose(): void;
  onPurchase(index: number): void;
  onEquip(): void;
  onChange(event?: string): void;
}
export function ItemDetails({ run, selected, onClose, onPurchase, onEquip, onChange }: Props) {
  const def = ITEM_MAP[selected.defId],
    offerIndex = run.offers.findIndex((x) => x?.uid === selected.uid),
    ownerPart = run.build.parts.find((p) => p.item?.uid === selected.uid),
    inTray = run.stash.some((x) => x.uid === selected.uid);
  return (
    <Modal title={def.name} onClose={() => onClose()}>
      <div className="item-detail-art">
        <Icon name={def.icon} size={76} variant={def.id} />
        <div>
          <span className="stars">{'★'.repeat(def.rarity)}</span>
          <p>
            {def.type} · {SLOT_LABEL[def.slot]} slot
          </p>
          <strong>Level {selected.level}</strong>
        </div>
      </div>
      <div className="tag-list">
        {def.tags.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <p className="item-rules">{def.text}</p>
      {selected.level > 1 && (
        <p className="mint">
          Damage, healing, Shield, status amounts and passive stats are ×
          {LEVEL_SCALE[selected.level]}. Timers and cooldown reductions retain their listed values.
        </p>
      )}
      <div className={`signature ${selected.level === 3 ? 'unlocked' : ''}`}>
        <span className="eyebrow">LEVEL 3 SIGNATURE</span>
        <p>{def.signature}</p>
      </div>
      {def.requires && (
        <p className={usable(run.build, selected) ? 'mint' : 'blood'}>
          Requires {def.requires.count} {SLOT_LABEL[def.requires.slot]} slots.{' '}
          {usable(run.build, selected)
            ? 'Your anatomy qualifies.'
            : 'Add the required anatomy before equipping.'}
        </p>
      )}
      {offerIndex >= 0 ? (
        <button
          className="primary full"
          disabled={run.phase !== 'build' || run.gold < def.price}
          onClick={() => onPurchase(offerIndex)}
        >
          Buy for {def.price} gold
        </button>
      ) : (
        <>
          <div className="detail-actions">
            {combineCandidate(run, selected) && (
              <button
                disabled={run.phase !== 'build'}
                onClick={() => {
                  combine(run, selected.uid);
                  onClose();
                  onEquip();
                  onChange('item_combined');
                }}
              >
                Combine duplicates → Lv{selected.level + 1}
              </button>
            )}
            {ownerPart && (
              <button
                disabled={run.phase !== 'build'}
                onClick={() => {
                  unequip(run, ownerPart.uid);
                  onClose();
                  onChange();
                }}
              >
                Move to tray
              </button>
            )}
            {inTray && (
              <button
                disabled={run.phase !== 'build'}
                onClick={() => {
                  sell(run, selected.uid);
                  onClose();
                  onChange('item_sold');
                }}
              >
                Sell for {Math.floor(def.price * 0.5 * [0, 1, 2, 4][selected.level])} gold
              </button>
            )}
          </div>
          {inTray && (
            <>
              <h3>Choose a {SLOT_LABEL[def.slot]} slot</h3>
              <div className="equip-targets">
                {run.build.parts
                  .filter((p) => p.slot === def.slot)
                  .map((p, i) => (
                    <button
                      key={p.uid}
                      disabled={run.phase !== 'build' || !usable(run.build, selected)}
                      onClick={() => {
                        equip(run, selected.uid, p.uid);
                        onClose();
                        onEquip();
                        onChange('item_equipped');
                      }}
                    >
                      {SLOT_LABEL[p.slot]} {i + 1}
                      <small>
                        {p.item ? `Swap ${ITEM_MAP[p.item.defId].name}` : 'Empty socket'}
                      </small>
                    </button>
                  ))}
              </div>
            </>
          )}
        </>
      )}
      <p className="fine-print">
        Two identical items at the same level combine into the next level. Each item instance can
        activate once per causal branch; separate branches are independent.
      </p>
    </Modal>
  );
}
