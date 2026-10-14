import { useState } from 'react';
import { ITEM_MAP, PROCEDURES } from '../game/content';
import { stats, SLOT_PLURAL } from '../game/anatomy';
import { procedurePlan } from '../game/surgery';
import { SATCHEL_CAPACITY, type Run } from '../game/types';
import { DressingRoom } from './Arena';
import { PagedText, Tabs } from './Paging';
import { Modal } from './Modal';
import { EffectIcon } from './EffectSummary';
import { Icon } from './Icon';

export function Surgery({
  run,
  onOperate,
  onManage,
  onContinue,
}: {
  run: Run;
  onOperate(id: string): void;
  onManage(): void;
  onContinue(): void;
}) {
  const [id, setId] = useState(run.procedures[0] ?? '');
  const [section, setSection] = useState<'Changes' | 'Procedure' | 'Patient'>('Patient');
  const [bodyView, setBodyView] = useState<'Current' | 'Proposed'>('Current');
  const p = PROCEDURES.find((p) => p.id === id);
  const plan = p ? procedurePlan(run, p) : null;
  const preview = plan && !run.operated ? plan : null;
  const before = stats(run.build),
    after = preview ? stats(preview.build) : before;
  const reason = plan?.reason ?? (p ? null : 'No procedures available.');
  const changes =
    p && !run.operated
      ? [
          p.name,
          ...(p.remove ?? []).map(
            (change) => `Remove ${change.count} ${SLOT_PLURAL[change.slot].toLowerCase()}.`,
          ),
          ...(p.add ?? []).map(
            (change) =>
              `Add ${change.count} ${change.variant ?? 'living'} ${SLOT_PLURAL[change.slot].toLowerCase()}.`,
          ),
          `Maximum HP: ${before.maxHp} → ${after.maxHp}`,
          `Mana: ${before.maxMana} → ${after.maxMana}`,
          `Circulation: ${Math.round(before.efficiency * 100)}% → ${Math.round(after.efficiency * 100)}%`,
          `Capacity / load: ${before.capacity} / ${before.load} → ${after.capacity} / ${after.load}`,
          `Movement: ${Math.round(before.movementSpeed)} → ${Math.round(after.movementSpeed)}`,
          `Equipment to satchel: ${preview?.displaced.map((item) => ITEM_MAP[item.defId].name).join(', ') || 'None'}`,
          ...(preview?.removed.map(
            (part) =>
              `Remove ${part.variant} ${part.slot} ${run.build.parts.filter((candidate) => candidate.slot === part.slot).findIndex((candidate) => candidate.uid === part.uid) + 1}.`,
          ) ?? []),
        ].join('\n')
      : run.operated
        ? `Procedure complete.\n\nCurrent patient:\nMaximum HP ${before.maxHp}\nMana ${before.maxMana}\nCirculation ${Math.round(before.efficiency * 100)}%\nCapacity ${before.capacity} / Load ${before.load}\nMovement ${Math.round(before.movementSpeed)}\n\nContinue to supplies when you are ready.`
        : 'No procedures available.';
  return (
    <main className="surgery-screen clinic-scene">
      <div className="station-title">
        <span className="eyebrow">DR. SUTCHER’S PRACTICE · FLOOR {run.floor}</span>
        <h2>Reconstructive medicine</h2>
      </div>
      <div className="surgery-stage">
        {
          <div className="clinic-patient">
            <Tabs<typeof bodyView>
              label="Anatomy preview"
              value={bodyView}
              values={['Current', 'Proposed']}
              onChange={setBodyView}
            />
            <DressingRoom
              build={bodyView === 'Proposed' && preview ? preview.build : run.build}
              floor={run.floor}
              surgery
              embedded
            />
            <div className="patient-label">
              {run.build.name} ·{' '}
              {bodyView === 'Proposed' && preview ? 'Proposed anatomy' : 'Current anatomy'}
            </div>
          </div>
        }
        <section className="procedure-content parchment">
          <div className="procedure-picker">
            <label>
              Available procedures
              <select
                aria-label="Available procedures"
                value={id}
                onChange={(event) => {
                  setId(event.target.value);
                  setSection('Patient');
                }}
              >
                {run.procedures.map((value) => (
                  <option key={value} value={value}>
                    {PROCEDURES.find((p) => p.id === value)?.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="procedure-overview">
            <h3>{p?.name ?? 'Your appointment'}</h3>
            <div className="procedure-anatomy-effects">
              {run.operated ? (
                <strong>Procedure complete</strong>
              ) : (
                <>
                  {(p?.remove ?? []).map((change, index) => (
                    <span key={`remove-${index}`}>
                      −{change.count} {SLOT_PLURAL[change.slot]}
                    </span>
                  ))}
                  {(p?.add ?? []).map((change, index) => (
                    <span key={`add-${index}`}>
                      +{change.count} {change.variant ?? 'living'} {SLOT_PLURAL[change.slot]}
                    </span>
                  ))}
                </>
              )}
            </div>
            <dl className="procedure-comparison">
              <div>
                <dt>
                  <EffectIcon kind="maxHp" />
                  HP
                </dt>
                <dd>
                  {before.maxHp} → {after.maxHp}
                </dd>
              </div>
              <div>
                <dt>
                  <EffectIcon kind="maxMana" />
                  Mana
                </dt>
                <dd>
                  {before.maxMana} → {after.maxMana}
                </dd>
              </div>
              <div>
                <dt>
                  <EffectIcon kind="capacity" />
                  Circulation
                </dt>
                <dd>
                  {Math.round(before.efficiency * 100)}% → {Math.round(after.efficiency * 100)}%
                </dd>
              </div>
              <div>
                <dt>Satchel</dt>
                <dd>
                  {run.stash.length} → {run.stash.length + (preview?.displaced.length ?? 0)} /{' '}
                  {SATCHEL_CAPACITY}
                </dd>
              </div>
            </dl>
            <div className="procedure-review-actions">
              <button onClick={() => setSection('Changes')}>Changes</button>
              <button onClick={() => setSection('Procedure')}>Procedure</button>
            </div>
          </div>
          <p className="procedure-reason action-reason">
            {reason ?? 'Review the consequences, then confirm your procedure.'}
          </p>
        </section>
      </div>
      <footer className="screen-actions clinic-actions">
        <button disabled={!!reason} onClick={() => p && onOperate(p.id)}>
          Perform procedure ·{' '}
          {p?.price ? (
            <>
              <Icon name="gold" size={14} /> {p.price}
            </>
          ) : (
            'Free'
          )}
        </button>
        <button onClick={onManage}>Manage equipment</button>
        <button className="primary" onClick={onContinue}>
          Continue to supplies →
        </button>
      </footer>
      {section !== 'Patient' && (
        <Modal title="Procedure review" onClose={() => setSection('Patient')}>
          <Tabs<'Changes' | 'Procedure'>
            label="Procedure information"
            value={section}
            values={['Changes', 'Procedure']}
            onChange={setSection}
          />
          <PagedText
            key={`${id}-${section}`}
            text={
              section === 'Changes'
                ? changes
                : `${p?.text ?? ''}\n\n“${p?.quote ?? 'Your procedure is complete.'}”\n— Dr. Sutcher\n\nOne procedure per visit. Your hearts must support your new anatomy.`
            }
            label={section}
          />
          <p className="action-reason">
            {reason ?? 'These consequences apply to the selected patient.'}
          </p>
        </Modal>
      )}
    </main>
  );
}
