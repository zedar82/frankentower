import { useState } from 'react';
import { ITEM_MAP } from '../game/content';
import { SLOT_LABEL, SLOT_PLURAL, usable } from '../game/anatomy';
import { canMoveItem, itemMoveReason } from '../game/inventory';
import { SATCHEL_CAPACITY, type Item, type Run, type Slot } from '../game/types';
import { Icon } from './Icon';
import { Modal } from './Modal';
import { ItemInspector } from './ItemDetails';
import { PagedList, Tabs, useDisplayMode } from './Paging';
import type { useItemDrag } from './hooks/useItemDrag';

export const EQUIPMENT_SLOTS: Slot[] = ['head', 'hand', 'chest', 'heart', 'foot'];

export function EquipmentOverview({
  run,
  onManage,
  includeSatchel = true,
}: {
  run: Run;
  onManage(slot?: Slot): void;
  includeSatchel?: boolean;
}) {
  return (
    <aside className="equipment-overview iron-panel" aria-label="Equipment overview">
      {includeSatchel && (
        <div className="panel-heading">
          <h3>Equipment</h3>
          <button aria-label="Equipment & satchel ↗" onClick={() => onManage()}>
            Equipment ↗
          </button>
        </div>
      )}
      {EQUIPMENT_SLOTS.map((slot) => {
        const parts = run.build.parts.filter((part) => part.slot === slot);
        const inactive = parts.filter((part) => part.item && !usable(run.build, part.item)).length;
        return (
          <button
            className={`equipment-category socket-${slot}`}
            key={slot}
            onClick={() => onManage(slot)}
          >
            <span>
              <Icon name={slot} size={24} />
              {SLOT_PLURAL[slot]}
            </span>
            <strong>
              {parts.filter((part) => part.item).length} / {parts.length}
              {inactive > 0 && <small> · {inactive} inactive</small>}
            </strong>
            <span className="equipment-preview" aria-hidden="true">
              {parts.slice(0, 2).map((part) => (
                <span key={part.uid} className={part.item ? 'occupied' : 'vacant'}>
                  {part.item ? (
                    <Icon
                      name={ITEM_MAP[part.item.defId].icon}
                      variant={part.item.defId}
                      size={30}
                    />
                  ) : (
                    '+'
                  )}
                </span>
              ))}
              {parts.length > 2 && <small>+{parts.length - 2}</small>}
            </span>
            <span>→</span>
          </button>
        );
      })}
      {includeSatchel && (
        <button className="satchel-access" onClick={() => onManage()}>
          <span>
            Satchel {run.stash.length} / {SATCHEL_CAPACITY}
          </span>
          <span className="satchel-preview" aria-hidden="true">
            {Array.from({ length: 4 }, (_, i) => (
              <span key={i}>
                {run.stash[i] && (
                  <Icon
                    name={ITEM_MAP[run.stash[i].defId].icon}
                    variant={run.stash[i].defId}
                    size={22}
                  />
                )}
              </span>
            ))}
          </span>
          <span>→</span>
        </button>
      )}
    </aside>
  );
}

export function SatchelOverview({ run, onOpen }: { run: Run; onOpen(): void }) {
  return (
    <button
      className="satchel-overview iron-panel"
      onClick={onOpen}
      aria-label={`Manage satchel, ${run.stash.length} of ${SATCHEL_CAPACITY} spaces occupied`}
    >
      <span>
        Satchel{' '}
        <strong>
          {run.stash.length} / {SATCHEL_CAPACITY}
        </strong>
      </span>
      <span className="satchel-cells" aria-hidden="true">
        {Array.from({ length: SATCHEL_CAPACITY }, (_, index) => (
          <span key={index} className={run.stash[index] ? 'occupied' : 'vacant'}>
            {run.stash[index] && (
              <Icon
                name={ITEM_MAP[run.stash[index].defId].icon}
                variant={run.stash[index].defId}
                size={28}
              />
            )}
          </span>
        ))}
      </span>
    </button>
  );
}

interface Props {
  run: Run;
  initialSlot?: Slot;
  initialItem?: Item;
  initialView?: 'Slots' | 'Satchel';
  drag: ReturnType<typeof useItemDrag>;
  onMove(item: Item, partUid?: string): void;
  onChange(event?: string): void;
  onPurchase(index: number): void;
  onClose(): void;
}
export function EquipmentWorkspace({
  run,
  initialSlot = 'hand',
  initialItem,
  initialView = 'Slots',
  drag,
  onMove,
  onChange,
  onPurchase,
  onClose,
}: Props) {
  const [slot, setSlot] = useState(initialItem ? ITEM_MAP[initialItem.defId].slot : initialSlot);
  const [selected, setSelected] = useState<Item | undefined>(initialItem);
  const [details, setDetails] = useState(false);
  const [target, setTarget] = useState<string>();
  const [pages, setPages] = useState<Partial<Record<Slot, number>>>({});
  const [view, setView] = useState<'Slots' | 'Satchel'>(initialView);
  const { compact } = useDisplayMode();
  const parts = run.build.parts.filter((part) => part.slot === slot);
  const select = (item: Item) => {
    setSelected(item);
    setSlot(ITEM_MAP[item.defId].slot);
    setTarget(undefined);
    setView('Slots');
  };
  const transfer = (uid?: string) => {
    if (!selected || !canMoveItem(run, selected.uid, uid)) return;
    onMove(selected, uid);
    setSelected(undefined);
    setTarget(undefined);
  };
  const targetPart = run.build.parts.find((part) => part.uid === target);
  const unavailableReason =
    selected && !parts.some((part) => canMoveItem(run, selected.uid, part.uid))
      ? parts.length
        ? itemMoveReason(run, selected.uid, parts[0].uid)
        : `No ${SLOT_PLURAL[slot].toLowerCase()} in this anatomy. Choose another category or add anatomy through surgery.`
      : null;
  const back = () => {
    setDetails(false);
    setSelected(undefined);
  };
  return (
    <Modal title="Equipment & satchel" onClose={onClose} wide>
      <div className="equipment-workspace">
        {details && selected ? (
          <>
            <button className="workspace-back" onClick={() => setDetails(false)}>
              ← Back to slots
            </button>
            <ItemInspector
              run={run}
              selected={selected}
              onClose={back}
              onChange={onChange}
              onEquip={() => {}}
              onPurchase={(index) => {
                onPurchase(index);
                back();
              }}
              onTargets={(item) => {
                select(item);
                setDetails(false);
              }}
            />
          </>
        ) : (
          <>
            <div className="workspace-toolbar">
              <label>
                Equipment category{' '}
                <select
                  aria-label="Equipment category"
                  value={slot}
                  onChange={(event) => {
                    setSlot(event.target.value as Slot);
                    setTarget(undefined);
                  }}
                >
                  {EQUIPMENT_SLOTS.map((value) => (
                    <option key={value} value={value}>
                      {SLOT_PLURAL[value]} (
                      {run.build.parts.filter((part) => part.slot === value).length})
                    </option>
                  ))}
                </select>
              </label>
              <span>{run.gold} gold</span>
            </div>
            {compact && (
              <Tabs<typeof view>
                label="Equipment workspace"
                value={view}
                values={['Slots', 'Satchel']}
                onChange={setView}
              />
            )}
            <div className="selected-equipment" aria-live="polite">
              {selected ? (
                <>
                  <Icon name={ITEM_MAP[selected.defId].icon} variant={selected.defId} size={32} />
                  <strong>{ITEM_MAP[selected.defId].name}</strong>
                  <button onClick={() => setDetails(true)}>Inspect</button>
                  <button onClick={() => setSelected(undefined)}>Clear</button>
                </>
              ) : (
                <p>
                  {targetPart
                    ? `Choose an item for ${SLOT_LABEL[slot]} ${parts.indexOf(targetPart) + 1}.`
                    : 'Choose an item to inspect or move. Empty slots belong to your existing anatomy.'}
                </p>
              )}
            </div>
            {(!compact || view === 'Slots') && (
              <PagedList
                items={parts}
                page={pages[slot] ?? 0}
                onPage={(page) => setPages((previous) => ({ ...previous, [slot]: page }))}
                minWidth={150}
                rowHeight={84}
                label={`${SLOT_PLURAL[slot]} page`}
                empty={`No ${SLOT_PLURAL[slot].toLowerCase()} in this anatomy.`}
                render={(part, index) => {
                  const reason = selected ? itemMoveReason(run, selected.uid, part.uid) : null;
                  return (
                    <button
                      key={part.uid}
                      {...drag.dropProps(part.uid)}
                      {...(part.item ? drag.dragProps(part.item) : {})}
                      disabled={!!selected && !!reason}
                      className={`equipment-slot ${part.item ? 'filled' : ''} ${selected && !reason ? 'drop-ready' : ''} ${part.item && !usable(run.build, part.item) ? 'inactive' : ''}`}
                      onClick={() => {
                        if (selected) transfer(part.uid);
                        else if (part.item) {
                          select(part.item);
                          setDetails(true);
                        } else {
                          setTarget(part.uid);
                          setView('Satchel');
                        }
                      }}
                      aria-label={`${SLOT_LABEL[slot]} ${index + 1}: ${part.item ? ITEM_MAP[part.item.defId].name : 'Empty slot'}`}
                    >
                      <Icon
                        name={part.item ? ITEM_MAP[part.item.defId].icon : slot}
                        variant={part.item?.defId}
                        size={32}
                      />
                      <span>
                        <strong>
                          {SLOT_LABEL[slot]} {index + 1}
                        </strong>
                        <small>
                          {part.variant} ·{' '}
                          {part.item
                            ? `Lv${part.item.level}${!usable(run.build, part.item) ? ' · Inactive' : ''}`
                            : 'Empty +'}
                        </small>
                        <span>
                          {part.item ? ITEM_MAP[part.item.defId].name : 'Choose equipment'}
                        </span>
                      </span>
                    </button>
                  );
                }}
              />
            )}
            {selected && (
              <p className="action-reason">
                {unavailableReason ??
                  (!usable(run.build, selected)
                    ? 'Your anatomy does not meet this item’s requirements.'
                    : run.offers.some((item) => item?.uid === selected.uid)
                      ? `Choose a slot to buy for ${ITEM_MAP[selected.defId].price} gold. Displaced equipment goes into the satchel.`
                      : 'Select a matching slot to equip or swap. Displaced equipment goes into the satchel.')}
              </p>
            )}
            {(!compact || view === 'Satchel') && (
              <div className="workspace-satchel tray satchel" {...drag.dropProps()}>
                <div className="panel-heading">
                  <h3>
                    Satchel {run.stash.length} / {SATCHEL_CAPACITY}
                  </h3>
                  {selected && (
                    <button disabled={!canMoveItem(run, selected.uid)} onClick={() => transfer()}>
                      Move to satchel
                    </button>
                  )}
                </div>
                {selected && !canMoveItem(run, selected.uid) && (
                  <small className="action-reason">{itemMoveReason(run, selected.uid)}</small>
                )}
                <div className="tray-items">
                  {Array.from({ length: SATCHEL_CAPACITY }, (_, index) => {
                    const item = run.stash[index];
                    return item ? (
                      <button
                        className={`item-tile ${selected?.uid === item.uid ? 'selected' : ''}`}
                        {...drag.dragProps(item)}
                        key={item.uid}
                        aria-label={`Select ${ITEM_MAP[item.defId].name}, level ${item.level}`}
                        disabled={!!targetPart && !canMoveItem(run, item.uid, targetPart.uid)}
                        onClick={() => {
                          if (targetPart) {
                            onMove(item, targetPart.uid);
                            setTarget(undefined);
                          } else select(item);
                        }}
                      >
                        <Icon name={ITEM_MAP[item.defId].icon} variant={item.defId} size={32} />
                        <small>Lv{item.level}</small>
                      </button>
                    ) : (
                      <div
                        key={`empty-${index}`}
                        className="satchel-empty"
                        aria-label="Empty satchel space"
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
