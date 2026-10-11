import { useState } from 'react';
import { ITEMS, ITEM_MAP } from '../game/content';
import { equipped, identity } from '../game/anatomy';
import type { Build, Item, Run, Save } from '../game/types';
import type { Combat } from '../game/combat';
import { Icon } from './Icon';
import { Creature } from './Creature';
import { ItemInspector } from './ItemDetails';
import { PatientSummary } from './PatientSummary';
import { PagedList, PagedText, Tabs } from './Paging';

const HELP = {
  Build:
    'Buy equipment to fill matching slots. Extra hands hold extra weapons; extra heads wear extra helmets. Manage equipment to move items into your eight-space satchel, swap, sell, or combine duplicates. Two identical items at the same level combine into the next level.\n\nStock refreshes free on every new floor. Freeze stock for free to keep the remaining offers, including purchased positions, until you unfreeze. Paid refresh and upgrades replace stock even when frozen.',
  Surgery:
    'Surgery opens every five floors. Choose one procedure per visit. New anatomy gives HP and slots; it also asks your hearts for more circulation. Under-supported bodies activate equipment more slowly.\n\nReview changes before performing a procedure. Equipment displaced by anatomy removal needs room in your satchel. Manage equipment to make room before surgery.',
  Combat:
    'Combat is automatic and spatial. Melee attackers approach their targets; ranged attackers try to keep their distance. Use 1×, 2× or 4× speed, and pause to inspect opponents. Space starts combat or pauses it when no workspace is open.\n\nAfter a fight, optionally read its combat log, visit the doctor on appointment floors, and shop before the next room. Long battles lose 2% maximum HP/s after 90 seconds.',
  Defence:
    'Armour subtracts a flat amount from each attack.\n\nShield absorbs one direct attack. All remaining Shield is then lost.\n\nBleed adds damage when a direct attack penetrates defence. It does not tick by itself or trigger more Bleed.\n\nPoison deals damage once per second and loses 10 per tick. Status damage bypasses Armour and Shield.',
  Engines:
    'Mana powers Wands and necrotic hearts. Each Head recovers 10 Mana/s; necrotic hearts spend 20 Mana/s each.\n\nChance overflow grants one success per full 100%, then rolls the remainder. Critical tiers add damage: 230% is ×3 damage, with a 30% chance of ×4.\n\nTriggers activate an item without waiting for its timer. Each instance activates once per branch, preventing recursive loops.\n\nOctopod set: 2 pieces +10% speed; 4 +20% Crit; 6 +80 capacity; 8 +50% speed.',
  Legacy:
    'Defeat a guardian every twenty floors. Retire to preserve your exact build as that floor’s guardian next run. Continuing risks losing that opportunity. Floor 100 preserves its champion automatically.\n\nEvery patient starts human. Guardians and previous patients are available in the Hall of Shame.\n\nCreated by Daniel Andersen.',
};
export function Help() {
  const [section, setSection] = useState<keyof typeof HELP>('Build');
  return (
    <div className="reference-view">
      <label>
        Clinical reference
        <select
          aria-label="Clinical reference"
          value={section}
          onChange={(event) => setSection(event.target.value as keyof typeof HELP)}
        >
          {Object.keys(HELP).map((key) => (
            <option key={key}>{key}</option>
          ))}
        </select>
      </label>
      <PagedText key={section} text={HELP[section]} label={section} />
    </div>
  );
}

export function Hall({ save }: { save: Save }) {
  const [section, setSection] = useState<'Guardians' | 'Patients' | 'Awards'>('Guardians');
  const [build, setBuild] = useState<Build>();
  const [page, setPage] = useState(0);
  if (build)
    return (
      <div className="reference-view">
        <button onClick={() => setBuild(undefined)}>← Back to Hall of Shame</button>
        <PatientSummary build={build} />
      </div>
    );
  return (
    <div className="reference-view">
      <p>
        Best floor {save.best} · {save.legacy.length} guardians · {save.achievements.length}{' '}
        achievements
      </p>
      <Tabs
        label="Hall records"
        value={section}
        values={['Guardians', 'Patients', 'Awards']}
        onChange={(value) => {
          setSection(value);
          setPage(0);
        }}
      />
      {section === 'Guardians' ? (
        <PagedList
          page={page}
          onPage={setPage}
          items={save.legacy}
          empty="No guardians yet. Defeat floor 20 and retire to appoint your first."
          render={(legacy) => (
            <button
              className="hall-entry"
              key={legacy.checkpoint}
              onClick={() => setBuild(legacy.build)}
            >
              <span className="hall-floor">{legacy.checkpoint}</span>
              <Creature build={legacy.build} compact />
              <span>
                <strong>{legacy.build.name}</strong>
                <small>
                  {identity(legacy.build)} · {equipped(legacy.build).length} items
                </small>
              </span>
            </button>
          )}
        />
      ) : section === 'Patients' ? (
        <PagedList
          page={page}
          onPage={setPage}
          items={save.records}
          empty="No previous patients."
          render={(record, index) => (
            <button className="record-entry" key={index} onClick={() => setBuild(record.build)}>
              <strong>{record.name}</strong>
              <span>
                {record.reason} · floor {record.floor} · Inspect →
              </span>
            </button>
          )}
        />
      ) : (
        <PagedList
          page={page}
          onPage={setPage}
          items={save.achievements}
          empty="No achievements yet."
          rowHeight={64}
          render={(award) => (
            <div key={award} className="award-entry">
              ✦ {award}
            </div>
          )}
        />
      )}
    </div>
  );
}

export function Catalogue({ run, onChange }: { run: Run; onChange(event?: string): void }) {
  const [tag, setTag] = useState('All');
  const [selected, setSelected] = useState<Item>();
  const [page, setPage] = useState(0);
  return (
    <div className="reference-view">
      {selected ? (
        <>
          <button onClick={() => setSelected(undefined)}>← Back to equipment index</button>
          <ItemInspector
            run={run}
            selected={selected}
            onClose={() => setSelected(undefined)}
            onPurchase={() => {}}
            onEquip={() => {}}
            onTargets={() => {}}
            onChange={onChange}
          />
        </>
      ) : (
        <>
          <label>
            Equipment family
            <select
              aria-label="Equipment family"
              value={tag}
              onChange={(event) => {
                setTag(event.target.value);
                setPage(0);
              }}
            >
              {['All', 'Blood', 'Arcane', 'Poison', 'Mechanical', 'Chance', 'Octopod', 'Bone'].map(
                (value) => (
                  <option key={value}>{value}</option>
                ),
              )}
            </select>
          </label>
          <PagedList
            page={page}
            onPage={setPage}
            items={ITEMS.filter((def) => tag === 'All' || def.tags.some((value) => value === tag))}
            empty="No equipment in this family."
            render={(def) => (
              <button
                className={`catalogue-item rarity-${def.rarity}`}
                key={def.id}
                onClick={() => setSelected({ uid: 'index-' + def.id, defId: def.id, level: 1 })}
              >
                <Icon name={def.icon} variant={def.id} size={40} />
                <span>
                  <strong>{def.name}</strong>
                  <small>
                    {def.type} · {'★'.repeat(def.rarity)} · Inspect →
                  </small>
                </span>
              </button>
            )}
          />
        </>
      )}
    </div>
  );
}

export function Report({ run, sim }: { run: Run; sim: Combat }) {
  const [section, setSection] = useState<
    'Summary' | 'Contribution' | 'Patient' | 'Enemies' | 'Transcript'
  >('Summary');
  const [build, setBuild] = useState<Build>();
  const [page, setPage] = useState(0);
  return (
    <div className="reference-view report-view">
      <label>
        Battle report
        <select
          aria-label="Battle report"
          value={section}
          onChange={(event) => {
            setSection(event.target.value as typeof section);
            setBuild(undefined);
          }}
        >
          {['Summary', 'Contribution', 'Patient', 'Enemies', 'Transcript'].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </label>
      {section === 'Summary' ? (
        <PagedText
          text={`${run.build.name} · Floor ${run.floor}\n${run.phase === 'dead' ? 'Did not survive' : run.phase === 'retired' ? 'Retired as guardian' : run.phase === 'complete' ? 'Tower completed' : sim.done ? 'Encounter survived' : 'Current observation'}\n\nDuration ${sim.time.toFixed(1)}s\nDamage ${Math.round(sim.player.damage)}\nHealing ${Math.round(sim.player.healing)}\n\n${sim.suppressed} recursive activations prevented.\n\nEquipment contribution, patient details, final enemies, and the complete combat transcript are available from the report menu.`}
          label="Summary"
        />
      ) : section === 'Contribution' ? (
        <>
          <h3>Equipment contribution</h3>
          <PagedList
            page={page}
            onPage={setPage}
            items={[...sim.player.abilities].sort((a, b) => b.damage - a.damage)}
            rowHeight={80}
            minWidth={320}
            render={(ability) => (
              <div className="contribution-entry" key={ability.uid}>
                <strong>
                  {ability.def.name} · Lv{ability.level}
                </strong>
                <span>
                  {ability.activations} acts · {Math.round(ability.damage)} damage ·{' '}
                  {Math.round(ability.healing)} healing
                </span>
              </div>
            )}
          />
        </>
      ) : section === 'Patient' ? (
        <PatientSummary build={run.build} />
      ) : section === 'Enemies' ? (
        build ? (
          <>
            <button onClick={() => setBuild(undefined)}>← Back to enemies</button>
            <PatientSummary build={build} />
          </>
        ) : (
          <PagedList
            items={run.lastEnemies}
            empty="No final encounter recorded."
            render={(enemy, index) => (
              <button key={index} className="hall-entry" onClick={() => setBuild(enemy)}>
                <Creature build={enemy} compact />
                <span>
                  {enemy.name}
                  <small>Inspect →</small>
                </span>
              </button>
            )}
          />
        )
      ) : (
        <>
          <p>{sim.suppressed} recursive activations prevented.</p>
          <div
            className="combat-transcript"
            tabIndex={0}
            role="region"
            aria-label="Scrollable combat log"
          >
            {sim.logs.map((log) => (
              <div key={log.id} className={`transcript-line ${log.kind}`}>
                <time>{log.time.toFixed(1)}s</time>
                <span>
                  {log.text}
                  <small>{sim.chainNames(log.chain).join(' → ')}</small>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function Starter({ run, onChoose }: { run: Run; onChoose(id: string): void }) {
  return (
    <div className="starter-view">
      <p className="welcome-copy">One hundred floors. One ordinary body.</p>
      <p>Choose your first weapon. It attacks automatically.</p>
      <PagedList
        items={['dagger', 'club', 'knife']}
        minWidth={280}
        rowHeight={112}
        render={(id) => (
          <button className="starter-weapon" key={id} onClick={() => onChoose(id)}>
            <Icon name={ITEM_MAP[id].icon} variant={id} size={44} />
            <span>
              <strong>{ITEM_MAP[id].name}</strong>
              <small>{ITEM_MAP[id].text}</small>
              <b>Choose →</b>
            </span>
          </button>
        )}
      />
      <span className="eyebrow">{run.build.name} · HUMAN · 1000 HP</span>
    </div>
  );
}
