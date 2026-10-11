import { useState } from 'react';
import { ITEM_MAP, PROCEDURES } from '../game/content';
import { stats, SLOT_PLURAL } from '../game/anatomy';
import { procedurePreview, procedureReason } from '../game/surgery';
import type { Run } from '../game/types';
import { DressingRoom } from './Arena';
import { PagedText, Tabs, useDisplayMode } from './Paging';

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
  const [section, setSection] = useState<'Changes' | 'Procedure' | 'Patient'>('Changes');
  const [bodyView, setBodyView] = useState<'Current' | 'Proposed'>('Current');
  const { compact } = useDisplayMode();
  const p = PROCEDURES.find((p) => p.id === id);
  const preview = p && !run.operated ? procedurePreview(run, p) : null;
  const before = stats(run.build),
    after = preview ? stats(preview.build) : before;
  const reason = p ? procedureReason(run, p) : 'No procedures available.';
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
    <main className="surgery-screen">
      <div className="station-title">
        <span className="eyebrow">DR. SUTCHER’S PRACTICE · FLOOR {run.floor}</span>
        <h2>Reconstructive medicine</h2>
      </div>
      <div className="surgery-stage">
        {(!compact || section === 'Patient') && (
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
        )}
        <section className="procedure-content iron-panel">
          <div className="procedure-picker">
            <label>
              Available procedures
              <select
                aria-label="Available procedures"
                value={id}
                onChange={(event) => {
                  setId(event.target.value);
                  setSection('Changes');
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
          <Tabs<typeof section>
            label="Procedure information"
            value={section}
            values={compact ? ['Changes', 'Procedure', 'Patient'] : ['Changes', 'Procedure']}
            onChange={setSection}
          />
          <div className="procedure-card">
            <h3>{p?.name ?? 'Your appointment'}</h3>
            <PagedText
              key={`${id}-${section}`}
              text={
                section !== 'Procedure'
                  ? changes
                  : `${p?.text ?? ''}\n\n“${p?.quote ?? 'Your procedure is complete.'}”\n— Dr. Sutcher\n\nOne procedure per visit. Your hearts must support your new anatomy.`
              }
              label={section}
            />
          </div>
          <p className="procedure-reason action-reason">
            {reason ?? 'Review the consequences, then confirm your procedure.'}
          </p>
        </section>
      </div>
      <footer className="screen-actions">
        <button disabled={!!reason} onClick={() => p && onOperate(p.id)}>
          Perform procedure · {p?.price ? `${p.price} gold` : 'No charge'}
        </button>
        <button onClick={onManage}>Manage equipment</button>
        <button className="primary" onClick={onContinue}>
          Continue to supplies →
        </button>
      </footer>
    </main>
  );
}
