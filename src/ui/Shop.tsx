import { useState } from 'react';
import type { Item, Run, Slot, Stats } from '../game/types';
import { ITEM_MAP } from '../game/content';
import { archetypes, SLOT_LABEL } from '../game/anatomy';
import { purchaseReason } from '../game/inventory';
import { rerollCost, upgradeCost, RECOVERY_COST } from '../game/shop';
import { Icon } from './Icon';
import { DressingRoom } from './Arena';
import { EquipmentOverview } from './Equipment';
import { PageControls, PagedText, PagedList, Tabs, useDisplayMode } from './Paging';
import type { useItemDrag } from './hooks/useItemDrag';

export type ShopAction = 'reroll' | 'upgrade' | 'recover' | 'freeze';
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
  onBuild,
}: Props) {
  const { compact, short } = useDisplayMode();
  const [view, setView] = useState<'Patient' | 'Stock' | 'Gear' | 'Services'>('Stock');
  const [offerPage, setOfferPage] = useState(0);
  const show = (name: typeof view) =>
    compact
      ? view === name
      : name === 'Services'
        ? view === 'Services'
        : name === 'Stock'
          ? view !== 'Services'
          : true;
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
    <main className={`shop-screen ${compact ? 'compact-shop' : 'desktop-shop'}`}>
      <div className="station-title">
        <span className="eyebrow">FLOOR {run.floor} · QUARTERMASTER</span>
        <h2>Take what you need.</h2>
      </div>
      {compact && (
        <Tabs<typeof view>
          label="Shop views"
          value={view}
          values={['Patient', 'Stock', 'Gear', 'Services']}
          onChange={setView}
        />
      )}
      <div className="shop-stage">
        {show('Patient') && (
          <>
            <section className="patient-paper parchment">
              <span className="eyebrow">PATIENT RECORD</span>
              <button
                className="patient-name"
                aria-label={`Inspect ${run.build.name}`}
                onClick={onBuild}
              >
                <div className="patient-identity">
                  <h1>{run.build.name}</h1>
                  <small className={`patient-circulation ${s.efficiency < 1 ? 'overload' : ''}`}>
                    Circulation {Math.round(s.efficiency * 100)}%
                  </small>
                </div>
                <span>Inspect ↗</span>
              </button>
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
          </>
        )}
        {show('Gear') && <EquipmentOverview run={run} onManage={onManage} />}
        {show('Stock') && (
          <section className="stock-counter" aria-label="Quartermaster stock">
            <div className="panel-heading">
              <h3>Quartermaster</h3>
              <span>
                Tier {run.shopTier} · {run.shopFrozen ? 'Frozen' : 'Fresh each floor'}
              </span>
              <button onClick={() => onAction('freeze')} aria-pressed={run.shopFrozen}>
                {run.shopFrozen ? 'Unfreeze stock' : 'Freeze stock'}
              </button>
            </div>
            <p className="stock-state">
              Tier {run.shopTier} · {run.shopFrozen ? 'Frozen stock' : 'Fresh each floor'}
            </p>
            <div className="shop-grid">
              {run.offers.map((offer, index) => (
                <div
                  key={offer?.uid ?? `sold-${index}`}
                  className="offer-position"
                  hidden={compact && index !== offerPage}
                >
                  {offer ? (
                    <article
                      className={`shop-card rarity-${ITEM_MAP[offer.defId].rarity}`}
                      {...drag.dragProps(offer)}
                    >
                      <button
                        className="card-info"
                        aria-label={`Inspect ${ITEM_MAP[offer.defId].name}`}
                        onClick={() => onInspect(offer)}
                      >
                        <Icon name={ITEM_MAP[offer.defId].icon} variant={offer.defId} size={64} />
                        <div>
                          <h3>{ITEM_MAP[offer.defId].name}</h3>
                          <span className="offer-type">
                            {SLOT_LABEL[ITEM_MAP[offer.defId].slot]} · {ITEM_MAP[offer.defId].type}
                          </span>
                        </div>
                      </button>
                      <PagedText text={ITEM_MAP[offer.defId].text} label="Effect" />
                      {purchaseReason(run, index) && (
                        <small className="purchase-reason">{purchaseReason(run, index)}</small>
                      )}
                      <button
                        className="buy-button"
                        aria-label={`Buy ${ITEM_MAP[offer.defId].name}`}
                        disabled={!!purchaseReason(run, index)}
                        onClick={() => onPurchase(index)}
                      >
                        <Icon name="gold" size={20} /> {ITEM_MAP[offer.defId].price} · Buy
                      </button>
                    </article>
                  ) : (
                    <div className="sold-card">
                      <h3>Purchased</h3>
                      <p>This position stays empty until stock refreshes.</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {compact && (
              <PageControls label="Offer" page={offerPage} total={4} onPage={setOfferPage} />
            )}
          </section>
        )}
        {show('Services') && (
          <section className="shop-services iron-panel">
            <h3>Patient services</h3>
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
                    Tier {run.shopTier} ·{' '}
                    {run.shopFrozen
                      ? 'Keep these offers on the next floor.'
                      : 'New offers on each floor.'}
                  </small>
                </div>,
                <div className="service-option">
                  <button onClick={onCatalogue}>Equipment index →</button>
                  <small>Browse all equipment.</small>
                </div>,
              ]}
              rowHeight={short ? 64 : 80}
              minWidth={220}
              label="Services page"
              render={(node, index) => <div key={index}>{node}</div>}
            />
          </section>
        )}
      </div>
      <footer className="screen-actions">
        <button onClick={() => onManage()}>Equipment & satchel ↗</button>
        {!compact && (
          <button onClick={() => setView(view === 'Services' ? 'Stock' : 'Services')}>
            {view === 'Services' ? 'Back to stock' : 'Patient services'}
          </button>
        )}
        <button className="primary" onClick={onFight}>
          To the arena →
        </button>
      </footer>
    </main>
  );
}
