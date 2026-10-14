import { useState } from 'react';
import { SATCHEL_CAPACITY, type Item, type Run, type Slot, type Stats } from '../game/types';
import { ITEM_MAP } from '../game/content';
import { describeItemRules } from '../game/descriptions';
import { archetypes } from '../game/anatomy';
import { purchaseReason } from '../game/inventory';
import { rerollCost, upgradeCost, RECOVERY_COST } from '../game/shop';
import { Icon } from './Icon';
import { DressingRoom } from './Arena';
import { EquipmentOverview, SatchelOverview } from './Equipment';
import { Modal } from './Modal';
import { PagedList, useDisplayMode } from './Paging';
import { EFFECT_SYMBOLS, EffectIcon, EffectSummary, type EffectSymbol } from './EffectSummary';
import type { useItemDrag } from './hooks/useItemDrag';

export type ShopAction = 'reroll' | 'upgrade' | 'freeze' | 'recover';
interface Props {
  run: Run;
  stats: Stats;
  drag: ReturnType<typeof useItemDrag>;
  onInspect(item: Item): void;
  onPurchase(index: number): void;
  onAction(action: ShopAction): void;
  onCatalogue(): void;
  onFight(): void;
  onManage(slot?: Slot): void;
  onSatchel(): void;
  onBuild(): void;
}

export function Shop({
  run,
  stats: s,
  drag,
  onInspect,
  onPurchase,
  onAction,
  onCatalogue,
  onFight,
  onManage,
  onSatchel,
  onBuild,
}: Props) {
  const { compact, short, shopLandscape } = useDisplayMode();
  const [services, setServices] = useState(false);
  const [iconGuide, setIconGuide] = useState(false);
  const service = (label: string, cost: number, action: ShopAction, reason: string | null) => (
    <div className="service-option">
      <button disabled={!!reason} onClick={() => onAction(action)}>
        {label} <span>{cost} gold</span>
      </button>
      <small>
        {reason ??
          (action === 'recover'
            ? 'Recover 50% maximum HP.'
            : action === 'upgrade'
              ? 'Improve available rarity and replace stock.'
              : 'Replace all current offers.')}
      </small>
    </div>
  );
  return (
    <main
      className={`shop-screen workshop-shop compact-offers ${compact ? 'compact-workshop' : 'wide-workshop'} ${short ? 'short-workshop' : ''} ${shopLandscape ? 'landscape-workshop' : ''}`}
    >
      <div className="workshop-scene">
        <section
          className="patient-paper parchment"
          role="button"
          tabIndex={0}
          aria-label={`Inspect ${run.build.name}`}
          onClick={onBuild}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onBuild();
            }
          }}
        >
          <span className="eyebrow">PATIENT RECORD</span>
          <div className="patient-name">
            <div className="patient-identity">
              <h1>{run.build.name}</h1>
              <small className={`patient-circulation ${s.efficiency < 1 ? 'overload' : ''}`}>
                Circulation {Math.round(s.efficiency * 100)}%
              </small>
            </div>
            <span>Inspect ↗</span>
          </div>
          <p>{archetypes(run.build)[0]}</p>
          <div className="patient-meters">
            <div>
              HP{' '}
              <strong>
                {Math.ceil(run.hp)} / {s.maxHp}
              </strong>
              <div className="meter health">
                <i style={{ width: `${Math.max(0, run.hp / s.maxHp) * 100}%` }} />
              </div>
            </div>
            <div>
              MP{' '}
              <strong>
                {s.maxMana} / {s.maxMana}
              </strong>
              <div className="meter mana">
                <i style={{ width: '100%' }} />
              </div>
            </div>
            <span className={s.efficiency < 1 ? 'overload' : ''}>
              Circulation <strong>{Math.round(s.efficiency * 100)}%</strong>
            </span>
          </div>
        </section>
        <div className="shop-creature">
          <DressingRoom build={run.build} floor={run.floor} embedded />
        </div>
        <EquipmentOverview run={run} onManage={onManage} includeSatchel={false} />
        <div className="short-inventory-tools">
          <button
            className="short-equipment-summary"
            onClick={() => onManage()}
            aria-label="Manage equipment"
          >
            <strong>Gear ↗</strong>
            <small>
              {run.build.parts.filter((part) => part.item).length} / {run.build.parts.length}
            </small>
          </button>
          <button className="short-satchel-summary" onClick={onSatchel} aria-label="Open satchel">
            <strong>Satchel</strong>
            <small>
              {run.stash.length} / {SATCHEL_CAPACITY}
            </small>
          </button>
        </div>
        <SatchelOverview run={run} onOpen={onSatchel} />
      </div>
      <section className="stock-counter workshop-stock" aria-label="Quartermaster stock">
        <div className="panel-heading">
          <h3>Quartermaster</h3>
          <span className="stock-caption">
            Tier {run.shopTier} · {run.shopFrozen ? 'Frozen stock' : 'Fresh each floor'}
          </span>
          <button
            className="effect-guide-button"
            aria-label="Effect icon guide"
            onClick={() => setIconGuide(true)}
          >
            ?
          </button>
          <button
            className="stock-freeze"
            onClick={() => onAction('freeze')}
            aria-label={run.shopFrozen ? 'Unfreeze stock' : 'Freeze stock'}
            aria-pressed={run.shopFrozen}
            title="Keep these offers on the next floor · Free"
          >
            <span aria-hidden="true">❄</span>
            <small>{run.shopFrozen ? 'Frozen' : 'Freeze'}</small>
          </button>
        </div>
        <div className="shop-grid">
          {run.offers.map((offer, index) => {
            const reason = purchaseReason(run, index),
              def = offer && ITEM_MAP[offer.defId];
            return (
              <div key={offer?.uid ?? `sold-${index}`} className="offer-position">
                {offer && def ? (
                  <article
                    className={`shop-card rarity-${def.rarity}`}
                    data-slot={def.slot}
                    {...drag.dragProps(offer)}
                  >
                    <div className="offer-topline">
                      <button
                        className="offer-artline"
                        aria-label={`Inspect ${def.name} artwork`}
                        onClick={() => onInspect(offer)}
                      >
                        <span
                          className="offer-cooldown"
                          title={
                            def.cooldown
                              ? `Every ${def.cooldown} seconds`
                              : 'Passive or reactive effect'
                          }
                        >
                          {def.cooldown ? (
                            <>
                              <EffectIcon kind="clock" />
                              {def.cooldown}s
                            </>
                          ) : (
                            '—'
                          )}
                        </span>
                        <Icon name={def.icon} variant={offer.defId} size={40} />
                      </button>
                      <button
                        className="buy-button"
                        aria-label={`Buy ${def.name} for ${def.price} gold`}
                        disabled={!!reason}
                        onClick={() => onPurchase(index)}
                      >
                        <span>
                          <Icon name="gold" size={16} /> {def.price}
                        </span>
                      </button>
                    </div>
                    <button
                      className="card-info"
                      aria-label={`Inspect ${def.name}`}
                      aria-description={describeItemRules(def, offer.level)}
                      onClick={() => onInspect(offer)}
                    >
                      <h3>{def.name}</h3>
                      <EffectSummary def={def} level={offer.level} />
                    </button>
                    {reason && (
                      <small className="offer-blocked" role="status">
                        {run.gold < def.price
                          ? `Need ${def.price - run.gold} gold`
                          : 'Satchel full'}
                      </small>
                    )}
                  </article>
                ) : (
                  <div className="sold-card">
                    <h3>Purchased</h3>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
      <footer className="screen-actions workshop-actions">
        <button
          disabled={run.gold < rerollCost(run)}
          aria-label="Fresh stock"
          onClick={() => onAction('reroll')}
        >
          <span>↻ Fresh stock</span>
          <small>
            <Icon name="gold" size={14} /> {rerollCost(run)}
          </small>
        </button>
        {!compact && (
          <button
            disabled={run.shopTier >= 5 || run.gold < upgradeCost(run)}
            onClick={() => onAction('upgrade')}
          >
            <span>Better stock</span>
            <small>
              <Icon name="gold" size={14} /> {upgradeCost(run)}
            </small>
          </button>
        )}
        {!compact && (
          <button
            disabled={run.hp >= s.maxHp || run.gold < RECOVERY_COST}
            onClick={() => onAction('recover')}
          >
            <span>Recover</span>
            <small>
              <Icon name="gold" size={14} /> {RECOVERY_COST}
            </small>
          </button>
        )}
        <button aria-label="Patient services" onClick={() => setServices(true)}>
          Services
        </button>
        <button className="primary" onClick={onFight}>
          To the arena →
        </button>
      </footer>
      {iconGuide && (
        <Modal title="Effect icons" onClose={() => setIconGuide(false)}>
          <p className="icon-guide-caption">
            Numbers beside icons are amounts. An arrow means event → effect. Inspect an item for
            targets, conditions and full rules.
          </p>
          <PagedList
            items={Object.entries(EFFECT_SYMBOLS)}
            rowHeight={44}
            minWidth={150}
            label="Icon guide page"
            render={([kind, [label]]) => (
              <div className="icon-guide-entry" key={kind}>
                <EffectIcon kind={kind as EffectSymbol} />
                {label}
              </div>
            )}
          />
        </Modal>
      )}
      {services && (
        <Modal title="Quartermaster services" onClose={() => setServices(false)}>
          <div className="workshop-services">
            <PagedList
              items={[
                service(
                  'Fresh stock',
                  rerollCost(run),
                  'reroll',
                  run.gold < rerollCost(run) ? 'Insufficient gold.' : null,
                ),
                service(
                  'Better stock',
                  upgradeCost(run),
                  'upgrade',
                  run.shopTier >= 5
                    ? 'Maximum shop tier reached.'
                    : run.gold < upgradeCost(run)
                      ? 'Insufficient gold.'
                      : null,
                ),
                service(
                  'Recover',
                  RECOVERY_COST,
                  'recover',
                  run.hp >= s.maxHp
                    ? 'Already at full health.'
                    : run.gold < RECOVERY_COST
                      ? 'Insufficient gold.'
                      : null,
                ),
                <div className="service-option">
                  <button
                    aria-label={run.shopFrozen ? 'Unfreeze stock' : 'Freeze stock'}
                    aria-pressed={run.shopFrozen}
                    onClick={() => onAction('freeze')}
                  >
                    {run.shopFrozen ? 'Unfreeze stock' : 'Freeze stock'}
                    <span>Free</span>
                  </button>
                  <small>
                    {run.shopFrozen
                      ? 'Keep these offers on the next floor.'
                      : 'New offers on each floor.'}
                  </small>
                </div>,
                <div className="service-option">
                  <button
                    onClick={() => {
                      setServices(false);
                      onCatalogue();
                    }}
                  >
                    Equipment index →
                  </button>
                  <small>Browse all equipment.</small>
                </div>,
              ]}
              rowHeight={short ? 64 : 84}
              minWidth={240}
              label="Services page"
              render={(node, index) => <div key={index}>{node}</div>}
            />
          </div>
        </Modal>
      )}
    </main>
  );
}
