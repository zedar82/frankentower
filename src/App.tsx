import { useEffect, useRef, useState } from 'react';
import { ITEM_MAP, ITEMS, PROCEDURES } from './game/content';
import { count, equipped, identity, SLOT_LABEL, SLOT_PLURAL, stats, usable } from './game/anatomy';
import { advance, finishFight, floorReward, newRun, retire, startRun } from './game/run';
import { recover, reroll, toggleShopFreeze, upgradeShop } from './game/shop';
import { canMoveItem, moveItem, purchaseItem, combineCandidate, equip } from './game/inventory';
import { operate, procedureReason } from './game/surgery';
import { encounter } from './game/encounters';
import { type Build, type Item, type Save, type Slot } from './game/types';
import { hasOffensiveAbility } from './game/abilities';
import { Combat } from './game/combat';
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
import { Arena, DressingRoom } from './ui/Arena';

const SLOTS: Slot[] = ['head', 'chest', 'hand', 'foot', 'heart'];
const SHOP_ACTIONS = { reroll, upgrade: upgradeShop, recover, freeze: toggleShopFreeze };
type FlowStep = 'log' | 'lab' | 'shop' | null;
export function App({ initialSave }: { initialSave: Save }) {
  const saveRef = useRef(initialSave);
  const [, redraw] = useState(0);
  const [flowStep, setFlowStep] = useState<FlowStep>(() =>
    initialSave.run?.phase === 'result' ||
    initialSave.run?.phase === 'checkpoint' ||
    initialSave.run?.phase === 'dead' ||
    initialSave.run?.phase === 'complete'
      ? 'log'
      : initialSave.run?.phase === 'build'
        ? 'shop'
        : null,
  );
  const [modal, setModal] = useState<'help' | 'hall' | 'catalogue' | 'report' | 'new' | null>(null);
  const [selected, setSelected] = useState<Item | null>(null);
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [inspected, setInspected] = useState<Build | null>(null);
  const [paused, setPaused] = useState(false);
  const [toast, setToast] = useState('');
  const [fightError, setFightError] = useState<string | null>(null);
  const [catalogueTag, setCatalogueTag] = useState('All');
  const combatRef = useRef<Combat | null>(null);
  const pauseRef = useRef(paused);
  pauseRef.current = paused;
  const save = saveRef.current;
  if (!save.run) save.run = newRun();
  const run = save.run;
  const isCombat = run.phase === 'combat';
  const isEnd = ['dead', 'retired', 'complete'].includes(run.phase);
  const nextEnemies = encounter(run.floor, run.seed, save.legacy);
  const previewRef = useRef<{ floor: number; build: Build; combat: Combat } | null>(null);
  if (
    !combatRef.current &&
    (!previewRef.current ||
      previewRef.current.floor !== run.floor ||
      previewRef.current.build !== run.build)
  ) {
    previewRef.current = {
      floor: run.floor,
      build: run.build,
      combat: new Combat(run.build, nextEnemies, run.seed ^ (run.floor * 15485863), run.hp),
    };
  }
  const sim = combatRef.current ?? previewRef.current!.combat;
  const s = isCombat && combatRef.current ? combatRef.current.player.stats : stats(run.build);
  const notify = (message: string) => setToast(message);
  const update = (event?: string) => {
    if (!combatRef.current) previewRef.current = null;
    redraw((v) => v + 1);
    void persist(saveRef.current);
    if (event)
      telemetry(event, {
        floor: run.floor,
        seed: run.seed,
        gold: run.gold,
        items: equipped(run.build)
          .map((x) => `${x.item.defId}:${x.item.level}`)
          .join(','),
        anatomy: run.build.parts.map((p) => `${p.slot}:${p.variant}`).join(','),
        efficiency: stats(run.build).efficiency,
      });
  };
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
    setFlowStep(null);
    setPaused(false);
    setSelected(null);
    setSelectedPart(null);
    update('fight_start');
  }
  function advanceFlow() {
    if (!advance(run)) return;
    combatRef.current = null;
    setFlowStep(run.floor % 5 === 0 ? 'lab' : 'shop');
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
    setFlowStep('shop');
  }
  function fresh() {
    saveRef.current.run = newRun();
    combatRef.current = null;
    previewRef.current = null;
    setFlowStep(null);
    setModal(null);
    setSelected(null);
    update('run_start');
  }
  function purchase(index: number) {
    const offer = run.offers[index];
    if (!offer || !purchaseItem(run, index)) return;
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
    if (!moveItem(run, item.uid, partUid)) return;
    sound(purchased ? 'buy' : 'equip', save.settings.sound);
    notify(ITEM_MAP[item.defId].name + (partUid ? ' equipped.' : ' added to the satchel.'));
    update(purchased ? 'item_purchased' : 'item_equipped');
  }
  const itemDrag = useItemDrag({ enabled: run.phase === 'build', canDrop, onDrop: dropItem });
  const { dragged, dragProps, dropProps } = itemDrag;
  useEffect(() => subscribePlatform(() => redraw((v) => v + 1)), []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3200);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    let frame = 0,
      last = performance.now(),
      accumulator = 0,
      lastRender = 0,
      lastSound = 0,
      freezeUntil = 0,
      lastImpact = 0,
      lastFreeze = 0;
    let observed: Combat | null = null;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
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
      accumulator = 0;
      setPaused(false);
      setFlowStep('shop');
      setFightError(message);
      void persist(saveRef.current);
      redraw((v) => v + 1);
    };
    const tick = (now: number) => {
      const delta = Math.min((now - last) / 1000, 0.15);
      last = now;
      const current = saveRef.current.run!,
        combat = combatRef.current;
      if (combat !== observed) {
        observed = combat;
        accumulator = 0;
        lastSound = 0;
        lastImpact = 0;
        freezeUntil = 0;
      }
      if (
        current.phase === 'combat' &&
        combat &&
        !pauseRef.current &&
        !hostPaused() &&
        !document.hidden
      ) {
        if (now >= freezeUntil) accumulator += delta * saveRef.current.settings.speed;
        while (accumulator >= 0.05 && !combat.done) {
          try {
            combat.step(0.05);
          } catch (error) {
            recoverFight(error instanceof Error ? error.message : 'Combat could not continue.');
            frame = requestAnimationFrame(tick);
            return;
          }
          accumulator -= 0.05;
        }
        const hits = combat.logs
          .slice(-24)
          .filter((l) => l.kind === 'damage' && l.id > lastImpact && (l.value ?? 0) > 0);
        if (hits.length) {
          const heavy = hits.some((l) => l.attack === 'heavy');
          if (combat.time - lastSound > 0.18) {
            sound(heavy ? 'heavy' : 'hit', saveRef.current.settings.sound);
            lastSound = combat.time;
          }
          if (
            !reducedMotion &&
            now - lastFreeze > 220 &&
            hits.some((l) => l.attack === 'heavy' && (l.value ?? 0) >= 1200)
          ) {
            freezeUntil = now + 55;
            lastFreeze = now;
            accumulator = 0;
          }
          lastImpact = hits[hits.length - 1].id;
        }
        if (combat.failure) {
          recoverFight(combat.failure);
          frame = requestAnimationFrame(tick);
          return;
        }
        if (combat.done) {
          accumulator = 0;
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
              .map((x) => `${x.item.defId}:${x.item.level}`)
              .join(','),
            anatomy: current.build.parts.map((p) => `${p.slot}:${p.variant}`).join(','),
          });
          void persist(saveRef.current);
          redraw((v) => v + 1);
        } else if (now - lastRender > 70) {
          lastRender = now;
          redraw((v) => v + 1);
        }
      } else accumulator = 0;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (
      run.phase === 'result' ||
      run.phase === 'checkpoint' ||
      run.phase === 'dead' ||
      run.phase === 'complete'
    )
      setFlowStep('log');
    else if (run.phase === 'combat') setFlowStep(null);
    else if (run.phase === 'build' && !flowStep) setFlowStep('shop');
  }, [run.phase, run.floor]);
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !(e.target instanceof HTMLInputElement) &&
        !modal &&
        !fightError &&
        !selected &&
        !selectedPart &&
        !inspected &&
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
  const itemButton = (item: Item, small = false) => (
    <button
      key={item.uid}
      {...dragProps(item)}
      className={`item-tile rarity-${ITEM_MAP[item.defId].rarity} ${small ? 'small' : ''}`}
      onClick={() => setSelected(item)}
      title={`${ITEM_MAP[item.defId].name} · Lv${item.level}`}
    >
      <Icon name={ITEM_MAP[item.defId].icon} size={small ? 23 : 30} />
      <span>{ITEM_MAP[item.defId].name}</span>
      <b className="level">{item.level > 1 ? `L${item.level}` : ''}</b>
      {combineCandidate(run, item) && (
        <span className="merge-dot" title="Can combine">
          ↑
        </span>
      )}
    </button>
  );
  const battleView = flowStep !== 'shop';
  const slotGroup = (slot: Slot) => (
    <div className={`slot-group socket-${slot}`} key={slot}>
      <div className="slot-heading">
        <span>{count(run.build, slot) === 1 ? SLOT_LABEL[slot] : SLOT_PLURAL[slot]}</span>
        <small>{count(run.build, slot)}</small>
      </div>
      <div className="slot-grid">
        {run.build.parts
          .filter((p) => p.slot === slot)
          .map((part) => (
            <button
              key={part.uid}
              {...(part.item ? dragProps(part.item) : {})}
              {...dropProps(part.uid)}
              disabled={isCombat}
              className={`equipment-slot ${dragged ? (canDrop(dragged, part.uid) ? 'drop-ready' : 'drop-blocked') : ''} ${part.item ? 'filled' : ''} ${part.item && !usable(run.build, part.item) ? 'inactive' : ''}`}
              onClick={() => (part.item ? setSelected(part.item) : setSelectedPart(part.uid))}
              title={part.item ? ITEM_MAP[part.item.defId].name : `Empty ${slot} slot`}
              aria-label={
                part.item
                  ? `${ITEM_MAP[part.item.defId].name}, level ${part.item.level}`
                  : `Empty ${slot} slot`
              }
            >
              <Icon name={part.item ? ITEM_MAP[part.item.defId].icon : slot} size={32} />
              <span>{part.item ? ITEM_MAP[part.item.defId].name : `Empty ${slot}`}</span>
              <small>
                {part.item && part.item.level > 1 ? `L${part.item.level}` : !part.item ? '+' : ''}
              </small>
              {part.variant !== 'living' && <i className="variant-dot" title={part.variant} />}
            </button>
          ))}
      </div>
    </div>
  );
  return (
    <div className={'app-shell in-battle' + (flowStep === 'shop' ? ' shopping' : '')}>
      <header className="main-header">
        <a
          className="wordmark"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setModal('help');
          }}
          aria-label="FRANKENTOWER help"
        >
          FRANKEN<span>TOWER</span>
        </a>
        <div className="journey">
          <Icon name="stairs" size={21} />
          <strong>FLOOR {String(run.floor).padStart(2, '0')}</strong>
          <span>/ 100</span>
        </div>
        <div className="header-tools">
          <span className="gold">
            <Icon name="gold" size={22} />
            {run.gold}
          </span>
          <button
            className="icon-button"
            onClick={() => setModal('hall')}
            aria-label="Hall of Shame"
            title="Hall of Shame"
          >
            ♜
          </button>
          <button
            className="icon-button"
            onClick={() => {
              save.settings.sound = !save.settings.sound;
              update();
            }}
            aria-label={save.settings.sound ? 'Mute sound' : 'Enable sound'}
          >
            {save.settings.sound ? '♪' : '♩'}
          </button>
          <button className="icon-button" onClick={() => setModal('help')} aria-label="How to play">
            ?
          </button>
          <span className="save-status" role="status">
            {platformStatus()}
          </span>
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
      </header>
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
          {run.phase !== 'build' && run.phase !== 'start' && run.phase !== 'combat' && (
            <div className={'outcome-banner ' + (run.phase === 'dead' ? 'defeat' : '')}>
              <span className="eyebrow">
                {run.phase === 'dead'
                  ? 'PATIENT LOST'
                  : run.phase === 'complete'
                    ? 'TOWER COMPLETE'
                    : 'ROOM CLEARED'}
              </span>
              <h2>
                {run.phase === 'dead'
                  ? 'The patient needs recovery.'
                  : run.phase === 'complete'
                    ? 'A considerable improvement.'
                    : 'The way is clear.'}
              </h2>
              <p>
                {run.phase === 'dead'
                  ? (sim.failure ?? 'Your final build is in the Hall of Shame.')
                  : '+' + floorReward(run.floor) + ' gold · Recovered 25% maximum HP'}
              </p>
            </div>
          )}
          <div className="combat-belt">
            <div className="activation-belt" aria-label="Equipment activations">
              {sim.player.abilities.map((n) => (
                <button
                  key={n.uid}
                  className={sim.time - n.lastActivated < 0.2 ? 'equipment-pulse' : ''}
                  onClick={() => {
                    setPaused(true);
                    if (n.source.kind === 'item') setSelected(n.source.item);
                    else setInspected(run.build);
                  }}
                  title={n.def.name}
                  aria-label={'Inspect ' + n.def.name}
                >
                  <Icon name={n.def.icon} size={28} />
                </button>
              ))}
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
                : run.phase === 'dead'
                  ? 'PATIENT LOST'
                  : run.phase === 'complete'
                    ? 'TOWER COMPLETE'
                    : 'ROOM CLEARED'}
            </span>
            <h2>
              {run.phase === 'checkpoint'
                ? 'Guardian defeated.'
                : run.phase === 'dead'
                  ? 'The patient needs recovery.'
                  : run.phase === 'complete'
                    ? 'The tower is yours.'
                    : 'The way is clear.'}
            </h2>
            <p>
              {run.phase === 'dead'
                ? (sim.failure ?? 'Your final build is in the Hall of Shame.')
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
                <button
                  className="primary"
                  onClick={() => (run.phase === 'complete' ? setModal('report') : setModal('new'))}
                >
                  {run.phase === 'complete' ? 'View champion →' : 'Admit a new patient →'}
                </button>
              ) : (
                <button className="primary" onClick={continueFromLog}>
                  Continue →
                </button>
              )}
            </div>
          </section>
        </div>
      )}
      {(flowStep === 'shop' || flowStep === 'lab') && (
        <div className={'station-layer station-' + flowStep}>
          <section className="station-panel">
            {flowStep === 'lab' ? (
              <>
                <div className="station-title">
                  <div>
                    <span className="eyebrow">DR. SUTCHER’S PRACTICE · FLOOR {run.floor}</span>
                    <h2>Reconstructive medicine</h2>
                  </div>
                </div>
                <div className="clinic-body">
                  <DressingRoom build={run.build} floor={run.floor} surgery />
                  <div>
                    <strong>{run.build.name}</strong>
                    <div className="station-sockets">{SLOTS.map(slotGroup)}</div>
                  </div>
                </div>
                <div className="procedure-content">
                  <blockquote className="doctor-quote">
                    “You’ll never make it to the top with your body like that. Here, let me help…”
                    <cite>Dr. Sutcher</cite>
                  </blockquote>
                  <p className="procedure-intro">
                    {run.operated ? 'Your procedure is complete.' : 'One procedure per visit.'}
                  </p>
                  {run.procedures.map((id) => {
                    const procedure = PROCEDURES.find((x) => x.id === id)!,
                      reason = procedureReason(run, procedure);
                    return (
                      <div className="procedure-card" key={id}>
                        <div className="procedure-card-heading">
                          <Icon name={procedure.add?.[0].slot ?? 'surgery'} size={30} />
                          <h3>{procedure.name}</h3>
                        </div>
                        <p>{procedure.text}</p>
                        <blockquote>“{procedure.quote}”</blockquote>
                        <button
                          disabled={!!reason}
                          title={reason ?? procedure.text}
                          onClick={() => {
                            if (operate(run, id)) {
                              sound('surgery', save.settings.sound);
                              notify('Procedure complete.');
                              update('procedure');
                            }
                          }}
                        >
                          Perform procedure{' '}
                          <span>
                            {procedure.price === 0 ? 'No charge' : procedure.price + ' ●'}
                          </span>
                        </button>
                        {reason && <small className="procedure-reason">{reason}</small>}
                      </div>
                    );
                  })}
                </div>
                <div className="station-footer">
                  <span>One procedure</span>
                  <button className="primary" onClick={finishLab}>
                    Continue to supplies →
                  </button>
                </div>
              </>
            ) : (
              <Shop
                run={run}
                stats={s}
                slots={SLOTS.map(slotGroup)}
                drag={itemDrag}
                renderItem={(item) => itemButton(item, true)}
                onInspect={setSelected}
                onPurchase={purchase}
                onAction={(action) => {
                  if (SHOP_ACTIONS[action](run)) update('shop_' + action);
                }}
                onCatalogue={() => setModal('catalogue')}
                onFight={beginFight}
              />
            )}
          </section>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {run.phase === 'start' && (
        <Modal title="A practical improvement." wide>
          <div className="welcome-layout">
            <div className="welcome-specimen">
              <Creature build={run.build} />
              <span className="eyebrow">{run.build.name.toUpperCase()} / HUMAN / 1000 HP</span>
            </div>
            <div>
              <p className="welcome-copy">
                One hundred floors. One ordinary body.
                <br />
                We can do something about the second part.
              </p>
              <p>
                Choose your first weapon. It attacks automatically. Buy equipment, graft new
                anatomy, and give your hearts enough capacity to keep it all working.
              </p>
              <div className="starter-weapons">
                {['dagger', 'club', 'knife'].map((id) => (
                  <button
                    key={id}
                    onClick={() => {
                      startRun(run, id);
                      setFlowStep('shop');
                      sound('equip', save.settings.sound);
                      update('weapon_chosen');
                    }}
                  >
                    <Icon name={ITEM_MAP[id].icon} size={32} />
                    <strong>{ITEM_MAP[id].name}</strong>
                    <small>{ITEM_MAP[id].text}</small>
                    <span>Choose →</span>
                  </button>
                ))}
              </div>
              <p className="fine-print">
                Every patient starts human. At floors 20, 40, 60 and 80 you may retire and become a
                guardian for your next run.
              </p>
            </div>
          </div>
        </Modal>
      )}
      {selected && (
        <ItemDetails
          run={run}
          selected={selected}
          onClose={() => setSelected(null)}
          onPurchase={purchase}
          onEquip={() => sound('equip', save.settings.sound)}
          onChange={update}
        />
      )}
      {selectedPart && (
        <Modal title="Fill the socket." onClose={() => setSelectedPart(null)}>
          <p>Select an item from your tray.</p>
          <div className="equip-targets">
            {run.stash
              .filter(
                (i) =>
                  ITEM_MAP[i.defId].slot ===
                  run.build.parts.find((p) => p.uid === selectedPart)?.slot,
              )
              .map((item) => (
                <button
                  key={item.uid}
                  disabled={!usable(run.build, item) || run.phase !== 'build'}
                  onClick={() => {
                    equip(run, item.uid, selectedPart);
                    setSelectedPart(null);
                    sound('equip', save.settings.sound);
                    update('item_equipped');
                  }}
                >
                  <Icon name={ITEM_MAP[item.defId].icon} />
                  {ITEM_MAP[item.defId].name}
                  <small>Lv{item.level}</small>
                </button>
              ))}
          </div>
          {!run.stash.some(
            (i) =>
              ITEM_MAP[i.defId].slot === run.build.parts.find((p) => p.uid === selectedPart)?.slot,
          ) && (
            <p className="empty-state">
              No matching equipment in the tray. Buy an item from the supply cabinet to fill this
              slot.
            </p>
          )}
        </Modal>
      )}
      {inspected && (
        <Modal title="Build inspection" onClose={() => setInspected(null)} wide>
          {<PatientSummary build={inspected} />}
        </Modal>
      )}
      {fightError && (
        <Modal title="Combat interrupted" onClose={() => setFightError(null)}>
          <p>
            The fight could not be resolved. Your pre-fight health, equipment, and gold are
            preserved. This does not count as a defeat.
          </p>
          <p>{fightError}</p>
          <button onClick={() => setFightError(null)}>Return to the shop</button>
        </Modal>
      )}
      {modal === 'help' && (
        <Modal title="Build something that works." onClose={() => setModal(null)} wide>
          <div className="help-grid">
            <div>
              <h3>01 / Build</h3>
              <p>
                Buy equipment to fill matching slots. Extra hands hold extra weapons; extra heads
                wear extra helmets. Select an equipped item to move it to the tray or combine
                duplicates. Stock refreshes free on every new floor. Freeze stock to keep it until
                you unfreeze.
              </p>
              <h3>02 / Reconstruct</h3>
              <p>
                Surgery opens every five floors. Choose one procedure per visit. New anatomy gives
                HP and slots; it also asks your hearts for more circulation. Under-supported bodies
                activate equipment more slowly.
              </p>
              <h3>03 / Observe</h3>
              <p>
                Combat is automatic. Use 1×, 2× or 4× speed, and pause to inspect an opponent. After
                a fight, optionally read its battle log, visit the doctor on appointment floors, and
                shop before the next room. Space starts combat or pauses it.
              </p>
              <h3>04 / Leave a legacy</h3>
              <p>
                Defeat a guardian every twenty floors. Retire to preserve your exact build as that
                floor’s guardian next run. Continue to risk losing that opportunity. Floor 100
                preserves its champion automatically.
              </p>
            </div>
            <div className="rules-glossary">
              <h3>Clinical reference</h3>
              <p>
                <b>Movement</b> comes from your legs. Melee weapons wait until a target is within
                reach. More legs move faster; ranged attackers try to keep their distance.
              </p>
              <p>
                <b>Armour</b> subtracts a flat amount from each attack.
              </p>
              <p>
                <b>Shield</b> absorbs one direct attack. All remaining Shield is then lost.
              </p>
              <p>
                <b>Bleed</b> adds damage when a direct attack penetrates defence. It does not tick
                by itself or trigger more Bleed.
              </p>
              <p>
                <b>Poison</b> deals damage once per second and loses 10 per tick. Status damage
                bypasses Armour and Shield.
              </p>
              <p>
                <b>Mana</b> powers Wands and necrotic hearts. Each Head recovers 10 Mana/s; necrotic
                hearts spend 20 Mana/s each.
              </p>
              <p>
                <b>Chance overflow</b> grants one success per full 100%, then rolls the remainder.
                Critical tiers add damage: 230% is ×3 damage, with a 30% chance of ×4.
              </p>
              <p>
                <b>Triggers</b> activate an item without waiting for its timer. Each instance
                activates once per branch, preventing recursive loops.
              </p>
              <p>
                <b>Octopod set</b> 2 pieces: +10% speed. 4: +20% Crit. 6: +80 capacity. 8: +50%
                speed.
              </p>
              <p>
                <b>Long battles</b> lose 2% maximum HP/s after 90 seconds.
              </p>
            </div>
          </div>
          <div className="help-footer">
            <p>
              Original game for RUN’s Monster Mash jam.
              <br />
              Created by Daniel Andersen.
            </p>
            <button onClick={() => setModal('new')}>Begin a new run</button>
          </div>
        </Modal>
      )}
      {modal === 'new' && (
        <Modal title="Admit a new patient?" onClose={() => setModal(null)}>
          <p>This ends the current run. Retired guardians and your Hall of Shame remain saved.</p>
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
          <p className="modal-lead">
            A record of useful improvements. Your retired patients now guard the tower.
          </p>
          <div className="hall-summary">
            <span>
              Best floor <b>{save.best}</b>
            </span>
            <span>
              Guardians <b>{save.legacy.length} / 5</b>
            </span>
            <span>
              Achievements <b>{save.achievements.length}</b>
            </span>
          </div>
          {save.legacy.length === 0 && (
            <div className="empty-state">
              No guardians yet. Defeat floor 20 and retire to appoint your first.
            </div>
          )}
          {save.legacy.map((l) => (
            <button
              className="hall-entry"
              key={l.checkpoint}
              onClick={() => {
                setModal(null);
                setInspected(l.build);
              }}
            >
              <span className="hall-floor">{l.checkpoint}</span>
              <Creature build={l.build} compact />
              <div>
                <h3>{identity(l.build)}</h3>
                <p>
                  {l.build.parts.length} parts · {equipped(l.build).length} equipped items
                </p>
              </div>
              <span>Inspect →</span>
            </button>
          ))}
          {save.achievements.length > 0 && (
            <div className="tag-list achievements">
              {save.achievements.map((a) => (
                <span key={a}>✦ {a}</span>
              ))}
            </div>
          )}
          {save.records.length > 0 && (
            <>
              <h3 className="records-title">Previous patients</h3>
              {save.records.map((r, i) => (
                <button
                  className="record-entry"
                  key={i}
                  onClick={() => {
                    setModal(null);
                    setInspected(r.build);
                  }}
                >
                  <strong>{identity(r.build)}</strong>
                  <span>
                    {r.reason} · floor {r.floor}
                  </span>
                </button>
              ))}
            </>
          )}
        </Modal>
      )}
      {modal === 'catalogue' && (
        <Modal title="Equipment index" onClose={() => setModal(null)} wide>
          <p className="modal-lead">
            {ITEMS.length} components. A considerable number of possibilities.
          </p>
          <div className="catalogue-filters">
            {['All', 'Blood', 'Arcane', 'Poison', 'Mechanical', 'Chance', 'Octopod', 'Bone'].map(
              (tag) => (
                <button
                  className={catalogueTag === tag ? 'active' : ''}
                  key={tag}
                  onClick={() => setCatalogueTag(tag)}
                >
                  {tag}
                </button>
              ),
            )}
          </div>
          <div className="catalogue-list">
            {ITEMS.filter(
              (d) => catalogueTag === 'All' || d.tags.some((t) => t === catalogueTag),
            ).map((d) => (
              <button
                className={`catalogue-item rarity-${d.rarity}`}
                key={d.id}
                onClick={() => {
                  setModal(null);
                  setSelected({ uid: 'index-' + d.id, defId: d.id, level: 1 });
                }}
              >
                <Icon name={d.icon} size={30} />
                <div>
                  <strong>{d.name}</strong>
                  <p>{d.text}</p>
                </div>
                <span>{'★'.repeat(d.rarity)}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
      {modal === 'report' && (
        <Modal title="Patient outcome report" onClose={() => setModal(null)} wide>
          <p className="modal-lead">
            {identity(run.build)} · floor {run.floor} ·{' '}
            {run.phase === 'dead'
              ? 'Did not survive'
              : run.phase === 'retired'
                ? 'Retired as guardian'
                : run.phase === 'complete'
                  ? 'Tower completed'
                  : sim?.done
                    ? 'Encounter survived'
                    : 'Current observation'}
          </p>
          {sim && (
            <>
              <div className="hall-summary">
                <span>
                  Duration <b>{sim.time.toFixed(1)}s</b>
                </span>
                <span>
                  Damage <b>{Math.round(sim.player.damage)}</b>
                </span>
                <span>
                  Healing <b>{Math.round(sim.player.healing)}</b>
                </span>
              </div>
              <h3>Equipment contribution</h3>
              <div className="contribution-table">
                <div className="table-row table-heading">
                  <span>Component</span>
                  <span>Acts</span>
                  <span>Damage</span>
                  <span>Heal</span>
                </div>
                {[...sim.player.abilities]
                  .sort((a, b) => b.damage - a.damage)
                  .map((n) => (
                    <div className="table-row" key={n.uid}>
                      <span>
                        {n.def.name} <small>L{n.level}</small>
                      </span>
                      <span>{n.activations}</span>
                      <span>{Math.round(n.damage)}</span>
                      <span>{Math.round(n.healing)}</span>
                    </div>
                  ))}
              </div>
              <details className="full-transcript">
                <summary>
                  Combat transcript & causal chains · {sim.suppressed} recursive activations
                  prevented
                </summary>
                {sim.logs.map((l) => (
                  <div key={l.id} className={`transcript-line ${l.kind}`}>
                    <time>{l.time.toFixed(1)}s</time>
                    <span>
                      {l.text}
                      <small>{sim.chainNames(l.chain).join(' → ')}</small>
                    </span>
                  </div>
                ))}
              </details>
            </>
          )}
          {<PatientSummary build={run.build} />}
          {run.lastEnemies.length > 0 && (
            <>
              <h3>Final encounter</h3>
              <div className="encounter-inspect">
                {run.lastEnemies.map((b, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setModal(null);
                      setInspected(b);
                    }}
                  >
                    {b.name} →
                  </button>
                ))}
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
