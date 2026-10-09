import type { ReactNode } from 'react';
import type { Item, Run, Stats } from '../game/types';
import { ITEM_MAP } from '../game/content';
import { identity, SLOT_LABEL } from '../game/anatomy';
import { canMoveItem } from '../game/inventory';
import { rerollCost, upgradeCost, RECOVERY_COST } from '../game/shop';
import { Icon } from './Icon';
import { DressingRoom } from './Arena';
import type { useItemDrag } from './hooks/useItemDrag';

export type ShopAction = 'reroll' | 'upgrade' | 'recover' | 'freeze';
interface Props {
  run: Run;
  stats: Stats;
  slots: ReactNode;
  drag: ReturnType<typeof useItemDrag>;
  renderItem(item: Item): ReactNode;
  onInspect(item: Item): void;
  onPurchase(index: number): void;
  onAction(action: ShopAction): void;
  onCatalogue(): void;
  onFight(): void;
}

export function Shop({
  run,
  stats: s,
  slots,
  drag,
  renderItem,
  onInspect,
  onPurchase,
  onAction,
  onCatalogue,
  onFight,
}: Props) {
  return (
    <>
      <div className="shop-patient">
        <div className="patient-heading">
          <div>
            <span className="eyebrow">{identity(run.build)}</span>
            <h1>{run.build.name}</h1>
            <div className="shop-health">
              HP {Math.ceil(run.hp)} / {s.maxHp}
              <div className="meter health">
                <i style={{ width: Math.max(0, run.hp / s.maxHp) * 100 + '%' }} />
              </div>
              <span>
                MP {s.maxMana} / {s.maxMana}
              </span>
            </div>
          </div>
          <div className="battle-heading">
            <span className="eyebrow">THE LOWER KEEP</span>
            <span>READY</span>
            <span className={s.efficiency < 1 ? 'overload' : ''}>
              Circulation {Math.round(s.efficiency * 100)}%
            </span>
          </div>
        </div>
        <div className="anatomy-scene">
          <DressingRoom build={run.build} floor={run.floor} />
          <div className="slot-groups">{slots}</div>
        </div>
        <p className="socket-hint">
          Drag equipment to a matching slot or into your satchel. Select an item to inspect it.
        </p>
      </div>
      <div
        className={
          'tray satchel ' + (drag.dragged && canMoveItem(run, drag.dragged.uid) ? 'drop-ready' : '')
        }
        {...drag.dropProps()}
      >
        <div className="tray-heading">
          <span className="eyebrow">
            SATCHEL · {run.stash.length} / {Math.max(8, run.stash.length)}
          </span>
          <button className="quiet" onClick={() => onCatalogue()}>
            Item index ↗
          </button>
        </div>
        <div className="tray-items">
          {run.stash.map(renderItem)}
          {Array.from({ length: Math.max(0, 8 - run.stash.length) }, (_, i) => (
            <div className="satchel-empty" key={i} aria-hidden="true" />
          ))}
        </div>
      </div>
      <div className="quartermaster">
        <div className="station-title">
          <div>
            <span className="eyebrow">FLOOR {run.floor} · QUARTERMASTER</span>
            <h2>Take what you need.</h2>
          </div>
          <span className="shop-tier">{'◆'.repeat(run.shopTier)}</span>
        </div>
        <div className="shop-grid">
          {run.offers.map((offer, i) =>
            offer ? (
              <div
                {...drag.dragProps(offer)}
                className={'shop-card rarity-' + ITEM_MAP[offer.defId].rarity}
                key={offer.uid}
              >
                <button
                  className="card-info"
                  onClick={() => onInspect(offer)}
                  aria-label={'Inspect ' + ITEM_MAP[offer.defId].name}
                >
                  <div className="item-art">
                    <Icon name={ITEM_MAP[offer.defId].icon} size={58} />
                  </div>
                  <h3>{ITEM_MAP[offer.defId].name}</h3>
                  <span className="offer-type">
                    {SLOT_LABEL[ITEM_MAP[offer.defId].slot]} · {ITEM_MAP[offer.defId].type}
                  </span>
                  <p>{ITEM_MAP[offer.defId].text}</p>
                </button>
                <button
                  className="buy-button"
                  disabled={run.phase !== 'build' || run.gold < ITEM_MAP[offer.defId].price}
                  onClick={() => onPurchase(i)}
                  aria-label={'Buy ' + ITEM_MAP[offer.defId].name}
                >
                  {ITEM_MAP[offer.defId].price} <span>●</span>
                </button>
              </div>
            ) : (
              <div className="sold-card" key={'sold-' + i}>
                —
              </div>
            ),
          )}
        </div>
        <div className="shop-stock-status">
          <span>
            {run.shopFrozen
              ? 'Stock frozen · kept until you unfreeze'
              : 'Fresh stock on every new floor'}
          </span>
          <button
            className={'freeze-button' + (run.shopFrozen ? ' active' : '')}
            aria-pressed={run.shopFrozen}
            disabled={run.phase !== 'build'}
            onClick={() => onAction('freeze')}
          >
            {run.shopFrozen ? 'Unfreeze stock' : 'Freeze stock'}
          </button>
        </div>
        <div className="shop-actions">
          <button
            disabled={run.phase !== 'build' || run.gold < rerollCost(run)}
            onClick={() => onAction('reroll')}
          >
            Fresh stock <span>{rerollCost(run)} ●</span>
          </button>
          <button
            disabled={run.phase !== 'build' || run.shopTier >= 5 || run.gold < upgradeCost(run)}
            onClick={() => onAction('upgrade')}
          >
            Better stock <span>{upgradeCost(run)} ●</span>
          </button>
          <button
            className="recover-button"
            disabled={run.gold < RECOVERY_COST || run.hp >= s.maxHp}
            onClick={() => onAction('recover')}
          >
            Recover {RECOVERY_COST} ●
          </button>
        </div>
        <div className="station-footer">
          <span>
            {run.gold} gold · Floor {run.floor}
          </span>
          <button className="primary" onClick={onFight}>
            To the arena →
          </button>
        </div>
      </div>
    </>
  );
}
