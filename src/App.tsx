import { useEffect, useRef, useState } from 'react';
import { ITEM_MAP } from './game/content';
import { equipped, stats } from './game/anatomy';
import { advance, finishFight, floorReward, newRun, retire, startRun } from './game/run';
import { recover, reroll, toggleShopFreeze, upgradeShop } from './game/shop';
import { canMoveItem, moveItemResult, purchaseItemResult } from './game/inventory';
import { operateResult } from './game/surgery';
import { encounter } from './game/encounters';
import { type Build, type Item, type Save, type Slot } from './game/types';
import { hasOffensiveAbility } from './game/abilities';
import { Combat } from './game/combat';
import { createCombatPreview } from './game/combat/view';
import type { CombatView } from './game/combat/types';
import {
  hostPaused,
  persist,
  platformStatus,
  subscribePlatform,
  telemetry,
  retrySave,
  savePending,
} from './platform';
import { sound } from './audio';
import { useItemDrag } from './ui/hooks/useItemDrag';
import { ItemDetails } from './ui/ItemDetails';
import { PatientSummary } from './ui/PatientSummary';
import { Shop } from './ui/Shop';
import { Icon } from './ui/Icon';
import { Creature } from './ui/Creature';
import { Modal } from './ui/Modal';
import { Arena } from './ui/Arena';
import { EquipmentWorkspace } from './ui/Equipment';
import { Surgery } from './ui/Surgery';
import { Help, Hall, Catalogue, Report, Starter } from './ui/Reference';
import { PagedText, useDisplayMode } from './ui/Paging';
import { useRunSession } from './useRunSession';
import { useCombatSession } from './useCombatSession';
import { useRunNavigation } from './ui/useRunNavigation';
import { useAppOverlay } from './ui/useAppOverlay';

const SHOP_ACTIONS = { reroll, upgrade: upgradeShop, recover, freeze: toggleShopFreeze };
export function App({ initialSave }: { initialSave: Save }) {
  const combatRef = useRef<Combat | null>(null);
  const previewRef = useRef<{ floor: number; build: Build; combat: CombatView } | null>(null);
  const { saveRef, save, run, refresh, update } = useRunSession(initialSave, () => {
    if (!combatRef.current) previewRef.current = null;
  });
  const { screen: flowStep, enterCombat, enterNextFloor, finishClinic, resetForNewRun, returnToShop } =
    useRunNavigation(run.phase, run.floor, initialSave.run?.phase);
  const {
    overlay,
    modal,
    selected,
    equipment,
    inspected,
    fightError,
    setModal,
    setSelected,
    setEquipment,
    setInspected,
    setFightError,
  } = useAppOverlay();
  const { compact } = useDisplayMode();
  const [paused, setPaused] = useState(false);
  const [toast, setToast] = useState('');
  const isCombat = run.phase === 'combat';
  const isEnd = ['dead', 'retired', 'complete'].includes(run.phase);
  const nextEnemies = encounter(run.floor, run.seed, save.legacy);
  if (
    !combatRef.current &&
    (!previewRef.current ||
      previewRef.current.floor !== run.floor ||
      previewRef.current.build !== run.build)
  ) {
    previewRef.current = {
      floor: run.floor,
      build: run.build,
      combat: createCombatPreview(run.build, nextEnemies, run.hp),
    };
  }
  const sim = combatRef.current ?? previewRef.current!.combat;
  const s = isCombat && combatRef.current ? combatRef.current.player.stats : stats(run.build);
  const notify = (message: string) => setToast(message);
  function beginFight() {
    const current = saveRef.current.run!;
    if (current.phase !== 'build') return;
    if (!hasOffensiveAbility(current.build)) {
      notify('Equip an offensive item before entering the room.');
      return;
    }
    setFightError(null);
    current.lastEnemies = encounter(current.floor, current.seed, saveRef.current.legacy);
    combatRef.current = new Combat(
      current.build,
      current.lastEnemies,
      current.seed ^ (current.floor * 15485863),
      current.hp,
    );
    current.phase = 'combat';
    enterCombat();
    setPaused(false);
    setSelected(null);
    setEquipment(null);
    update('fight_start');
  }
  function advanceFlow() {
    if (!advance(run)) return;
    combatRef.current = null;
    enterNextFloor(run.floor);
    update();
  }
  function continueFromLog() {
    if (run.phase === 'dead' || run.phase === 'complete' || run.phase === 'retired') {
      setModal('report');
      return;
    }
    advanceFlow();
  }
  function retireAtCheckpoint() {
    if (!retire(save, run)) return;
    notify(`Floor ${run.floor} is now guarded by ${run.build.name}.`);
    update('retired');
  }
  function finishLab() {
    finishClinic();
  }
  function fresh() {
    saveRef.current.run = newRun();
    combatRef.current = null;
    previewRef.current = null;
    resetForNewRun();
    setModal(null);
    setSelected(null);
    update('run_start');
  }
  function purchase(index: number) {
    const offer = run.offers[index];
    const result = purchaseItemResult(run, index);
    if (!result.ok) {
      notify(result.message);
      return;
    }
    if (!offer) return;
    sound('buy', save.settings.sound);
    notify(
      ITEM_MAP[offer.defId].name +
        (run.stash.includes(offer) ? ' added to the satchel.' : ' equipped.'),
    );
    setSelected(null);
    update('item_purchased');
  }
  const canDrop = (item: Item, partUid?: string) => canMoveItem(run, item.uid, partUid);
  function dropItem(item: Item, partUid?: string) {
    const purchased = run.offers.some((offer) => offer?.uid === item.uid);
    const result = moveItemResult(run, item.uid, partUid);
    if (!result.ok) {
      notify(result.message);
      return;
    }
    sound(purchased ? 'buy' : 'equip', save.settings.sound);
    notify(ITEM_MAP[item.defId].name + (partUid ? ' equipped.' : ' added to the satchel.'));
    update(purchased ? 'item_purchased' : 'item_equipped');
  }
  const itemDrag = useItemDrag({ enabled: run.phase === 'build', canDrop, onDrop: dropItem });
  useEffect(() => subscribePlatform(refresh), []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3200);
    return () => clearTimeout(timer);
  }, [toast]);
  const recoverFight = (message: string) => {
    const current = saveRef.current.run!;
    telemetry('simulation_failed', {
      seed: current.seed,
      floor: current.floor,
      message: message.slice(0, 256),
    });
    // The run still contains the pre-fight HP, inventory, and currency.
    current.phase = 'build';
    combatRef.current = null;
    previewRef.current = null;
    setPaused(false);
    returnToShop();
    setFightError(message);
    void persist(saveRef.current);
    refresh();
  };
  const completeFight = (combat: Combat) => {
    const current = saveRef.current.run!;
    current.lastReport = combat.completedReport(
      current.floor,
      current.seed ^ (current.floor * 15485863),
    );
    finishFight(current, combat.player.hp, combat.won, saveRef.current);
    sound(combat.won ? 'win' : 'lose', saveRef.current.settings.sound);
    telemetry('fight_complete', {
      floor: current.floor,
      won: combat.won,
      duration: combat.time,
      damage: combat.player.damage,
      healing: combat.player.healing,
      suppressed: combat.suppressed,
      equipment: equipped(current.build)
        .map((entry) => `${entry.item.defId}:${entry.item.level}`)
        .join(','),
      anatomy: current.build.parts.map((part) => `${part.slot}:${part.variant}`).join(','),
    });
    void persist(saveRef.current);
    refresh();
  };
  useCombatSession({ combatRef, saveRef, paused, refresh, onFailure: recoverFight, onComplete: completeFight });
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !(
          e.target instanceof Element &&
          e.target.closest('button, a, input, select, textarea, [role="dialog"]')
        ) &&
        !overlay &&
        run.phase !== 'start'
      ) {
        e.preventDefault();
        if (saveRef.current.run!.phase === 'combat') setPaused((v) => !v);
        else if (saveRef.current.run!.phase === 'build') beginFight();
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  });
  const battleView = flowStep !== 'shop' && flowStep !== 'lab';
  const manage = (slot?: Slot, item?: Item, view: 'Slots' | 'Satchel' = 'Slots') => {
    setSelected(null);
    setEquipment({ slot, item, view });
  };
  return (
    <div
      className={
        'app-shell in-battle' +
        (flowStep === 'shop' ? ' shopping' : flowStep === 'lab' ? ' operating' : '')
      }
    >
      <header className="main-header" aria-label="Run controls">
        <div className="journey">
          <Icon name="stairs" size={21} />
          <strong>
            <span className="floor-label">FLOOR </span>
            {String(run.floor).padStart(2, '0')}
          </strong>
          <span>/ 100</span>
        </div>
        <div className="header-tools">
          <span className="gold">
            <Icon name="gold" size={22} />
            {run.gold}
          </span>
          <button
            className="icon-button header-shortcut"
            onClick={() => setModal('hall')}
            aria-label="Hall of Shame"
            title="Hall of Shame"
          >
            ♜
          </button>
          <button
            className="icon-button header-shortcut"
            onClick={() => {
              save.settings.sound = !save.settings.sound;
              update();
            }}
            aria-label={save.settings.sound ? 'Mute sound' : 'Enable sound'}
          >
            {save.settings.sound ? '♪' : '♩'}
          </button>
          <button
            className="icon-button header-shortcut"
            onClick={() => setModal('help')}
            aria-label="How to play"
          >
            ?
          </button>
          <button
            className="icon-button"
            onClick={() => setModal('settings')}
            aria-label="Settings"
          >
            ⚙
          </button>
          <span className="save-status" role="status">
            {platformStatus()}
          </span>
        </div>
      </header>
      <div className="app-notice" role="status">
        {toast}
      </div>
      {battleView && (
        <main className="battle-world">
          <div className="arena-header">
            <div className="combat-vitals">
              <button
                className="portrait-button"
                onClick={() => {
                  setPaused(true);
                  setInspected(run.build);
                }}
                aria-label={'Inspect ' + run.build.name}
              >
                <Creature build={run.build} />
              </button>
              <div>
                <strong>{run.build.name}</strong>
                <div className="health-label">
                  <span>HP</span>
                  <b>
                    {Math.ceil(sim.player.hp)} <small>/ {s.maxHp}</small>
                  </b>
                </div>
                <div className="meter health">
                  <i style={{ width: Math.max(0, sim.player.hp / s.maxHp) * 100 + '%' }} />
                </div>
                {s.maxMana > 0 && (
                  <div className="mana-line">
                    <span>
                      MP {Math.floor(sim.player.mana)} / {s.maxMana}
                    </span>
                    <div className="meter mana">
                      <i style={{ width: (sim.player.mana / s.maxMana) * 100 + '%' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="battle-heading">
              <span className="eyebrow">
                {run.floor % 20 === 0 ? 'GUARDIAN CHAMBER' : 'THE LOWER KEEP'}
              </span>
              <span className="battle-clock">
                {isCombat || sim.done ? sim.time.toFixed(1) + 's' : 'READY'}
              </span>
              {s.efficiency < 1 && (
                <span className="overload">Circulation {Math.round(s.efficiency * 100)}%</span>
              )}
            </div>
          </div>
          <Arena
            combat={sim}
            floor={run.floor}
            paused={isCombat && (paused || hostPaused())}
            onInspect={(b) => {
              setPaused(true);
              setInspected(b);
            }}
          />
          <div className="combat-belt">
            <div className="activation-belt" aria-label="Equipment activations">
              {sim.player.abilities.slice(0, compact ? 2 : 6).map((n) => (
                <button
                  key={n.uid}
                  className={sim.time - n.lastActivated < 0.2 ? 'equipment-pulse' : ''}
                  aria-label={'Inspect ' + n.def.name}
                  onClick={() => {
                    setPaused(true);
                    if (n.source.kind === 'item') setSelected(n.source.item);
                    else setInspected(run.build);
                  }}
                >
                  <Icon name={n.def.icon} size={28} />
                </button>
              ))}
              <button
                onClick={() => {
                  setPaused(true);
                  setInspected(run.build);
                }}
              >
                All abilities ↗
              </button>
            </div>
            <div className="combat-controls">
              {isCombat && (
                <>
                  <button
                    onClick={() => setPaused(!paused)}
                    aria-label={paused ? 'Resume combat' : 'Pause combat'}
                  >
                    {paused ? '▶' : 'Ⅱ'}
                  </button>
                  {[1, 2, 4].map((speed) => (
                    <button
                      key={speed}
                      className={save.settings.speed === speed ? 'active' : ''}
                      onClick={() => {
                        save.settings.speed = speed;
                        update();
                      }}
                    >
                      {speed}×
                    </button>
                  ))}
                </>
              )}
              <button
                className="quiet"
                onClick={() => {
                  setPaused(true);
                  setModal('report');
                }}
              >
                Battle log ↗
              </button>
            </div>
          </div>
        </main>
      )}
      {flowStep === 'log' && (
        <div className="station-layer">
          <section className="flow-card">
            <span className="eyebrow">
              {run.phase === 'checkpoint'
                ? 'CHECKPOINT'
                : run.phase === 'retired'
                  ? 'GUARDIAN APPOINTED'
                  : run.phase === 'dead'
                    ? 'PATIENT LOST'
                    : run.phase === 'complete'
                      ? 'TOWER COMPLETE'
                      : 'ROOM CLEARED'}
            </span>
            <h2>
              {run.phase === 'checkpoint'
                ? 'Guardian defeated.'
                : run.phase === 'retired'
                  ? 'Your patient guards this floor.'
                  : run.phase === 'dead'
                    ? 'The patient needs recovery.'
                    : run.phase === 'complete'
                      ? 'The tower is yours.'
                      : 'The way is clear.'}
            </h2>
            <p>
              {run.phase === 'dead'
                ? (sim.failure ?? 'Your final build is in the Hall of Shame.')
                : run.phase === 'retired'
                  ? 'This build is preserved for your next run.'
                  : run.phase === 'checkpoint'
                    ? 'Review the fight or preserve this build as the floor guardian.'
                    : '+' + floorReward(run.floor) + ' gold · Recovered 25% maximum HP'}
            </p>
            <div className="flow-actions">
              <button
                className="quiet"
                onClick={() => {
                  setPaused(true);
                  setModal('report');
                }}
              >
                View battle log ↗
              </button>
              {run.phase === 'checkpoint' && (
                <button onClick={retireAtCheckpoint}>Retire as floor guardian</button>
              )}
              {isEnd ? (
                <>
                  {run.phase === 'complete' && (
                    <button onClick={() => setInspected(run.build)}>View champion →</button>
                  )}
                  <button className="primary" onClick={() => setModal('new')}>
                    Admit a new patient →
                  </button>
                </>
              ) : (
                <button className="primary" onClick={continueFromLog}>
                  Continue →
                </button>
              )}
            </div>
          </section>
        </div>
      )}
      {flowStep === 'shop' && (
        <Shop
          run={run}
          stats={s}
          drag={itemDrag}
          onInspect={setSelected}
          onPurchase={purchase}
          onAction={(action) => {
            if (SHOP_ACTIONS[action](run)) update('shop_' + action);
          }}
          onCatalogue={() => setModal('catalogue')}
          onFight={beginFight}
          onManage={manage}
          onSatchel={() => manage(undefined, undefined, 'Satchel')}
          onBuild={() => setInspected(run.build)}
        />
      )}
      {flowStep === 'lab' && (
        <Surgery
          run={run}
          onManage={() => manage()}
          onContinue={finishLab}
          onOperate={(id) => {
            const result = operateResult(run, id);
            if (result.ok) {
              sound('surgery', save.settings.sound);
              notify('Procedure complete.');
              update('procedure');
            } else notify(result.reason);
          }}
        />
      )}
      {run.phase === 'start' && (
        <Modal title="A practical improvement." wide>
          <Starter
            run={run}
            onChoose={(id) => {
              startRun(run, id);
              returnToShop();
              sound('equip', save.settings.sound);
              update('weapon_chosen');
            }}
          />
        </Modal>
      )}
      {equipment && (
        <EquipmentWorkspace
          run={run}
          initialSlot={equipment.slot}
          initialItem={equipment.item}
          initialView={equipment.view}
          drag={itemDrag}
          onMove={dropItem}
          onChange={update}
          onPurchase={purchase}
          onMessage={notify}
          onClose={() => setEquipment(null)}
        />
      )}
      {selected && !equipment && (
        <ItemDetails
          run={run}
          selected={selected}
          onClose={() => setSelected(null)}
          onPurchase={purchase}
          onEquip={() => sound('equip', save.settings.sound)}
          onChange={update}
          onMessage={notify}
          onTargets={(item) => manage(ITEM_MAP[item.defId].slot, item)}
        />
      )}
      {inspected && !equipment && !selected && (
        <Modal title="Build inspection" onClose={() => setInspected(null)} wide>
          <PatientSummary build={inspected} />
        </Modal>
      )}
      {fightError && !equipment && !selected && !inspected && (
        <Modal title="Combat interrupted" onClose={() => setFightError(null)}>
          <PagedText
            text={
              'The fight could not be resolved. Your pre-fight health, equipment, and gold are preserved. This does not count as a defeat.\n\n' +
              fightError
            }
          />
          <button onClick={() => setFightError(null)}>Return to the shop</button>
        </Modal>
      )}
      {!equipment && !selected && !inspected && !fightError && run.phase !== 'start' && (
        <>
          {modal === 'help' && (
            <Modal title="Build something that works." onClose={() => setModal(null)} wide>
              <Help />
              <button onClick={() => setModal('new')}>Begin a new run</button>
            </Modal>
          )}
          {modal === 'new' && (
            <Modal title="Admit a new patient?" onClose={() => setModal(null)}>
              <PagedText text="This ends the current run. Retired guardians and your Hall of Shame remain saved." />
              <div className="detail-actions">
                <button onClick={() => setModal(null)}>Keep this patient</button>
                <button className="primary" onClick={fresh}>
                  Begin a new run
                </button>
              </div>
            </Modal>
          )}
          {modal === 'hall' && (
            <Modal title="Hall of Shame" onClose={() => setModal(null)} wide>
              <Hall save={save} />
            </Modal>
          )}
          {modal === 'catalogue' && (
            <Modal title="Equipment index" onClose={() => setModal(null)} wide>
              <Catalogue run={run} onChange={update} />
            </Modal>
          )}
          {modal === 'report' && (
            <Modal title="Patient outcome report" onClose={() => setModal(null)} wide>
              <Report report={run.lastReport} />
            </Modal>
          )}
          {modal === 'settings' && (
            <Modal title="Settings" onClose={() => setModal(null)}>
              <div className="settings-actions">
                <button
                  aria-pressed={save.settings.sound}
                  onClick={() => {
                    save.settings.sound = !save.settings.sound;
                    update();
                  }}
                >
                  Sound {save.settings.sound ? 'on' : 'off'}
                </button>
                <button onClick={() => setModal('help')}>How to play</button>
                <button onClick={() => setModal('hall')}>Hall of Shame</button>
                <button onClick={() => setModal('new')}>Begin a new run</button>
                <span role="status">{platformStatus()}</span>
                {savePending() && (
                  <button
                    onClick={() => {
                      void retrySave();
                    }}
                  >
                    Retry save
                  </button>
                )}
              </div>
            </Modal>
          )}
        </>
      )}
    </div>
  );
}
