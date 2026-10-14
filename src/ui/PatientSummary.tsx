import { useState } from 'react';
import { archetypes, equipped, identity, stats, SLOT_LABEL } from '../game/anatomy';
import { describeAbilityRules, describeItemRules, describeSignature } from '../game/descriptions';
import { buildAbilities } from '../game/abilities';
import { ITEM_MAP } from '../game/content';
import type { Build } from '../game/types';
import { Creature } from './Creature';
import { Icon } from './Icon';
import { PagedList, PagedText, Tabs } from './Paging';

export function PatientSummary({ build }: { build: Build }) {
  const [section, setSection] = useState<'Patient' | 'Equipment' | 'Abilities' | 'Anatomy'>(
    'Patient',
  );
  const [detail, setDetail] = useState<string | null>(null);
  const [pages, setPages] = useState<Partial<Record<typeof section, number>>>({});
  const bs = stats(build);
  return (
    <div className="patient-inspection">
      <Tabs
        label="Build information"
        value={section}
        values={['Patient', 'Equipment', 'Abilities', 'Anatomy']}
        onChange={(value) => {
          setSection(value);
          setDetail(null);
        }}
      />
      {detail ? (
        <>
          <button onClick={() => setDetail(null)}>← Back to {section.toLowerCase()}</button>
          <PagedText text={detail} />
        </>
      ) : section === 'Patient' ? (
        <div className="build-summary">
          <Creature build={build} />
          <PagedText
            text={`${build.name}\n${identity(build)}\n${archetypes(build).join(' / ')}\n\n${bs.maxHp} HP · ${bs.maxMana} Mana\n${Math.round(bs.movementSpeed)} Movement\n${bs.armour} Armour · ${Math.round(bs.crit)}% Crit\n${Math.round(bs.chance * 100)}% Chance · ${Math.round(bs.speed * 100)}% Activation speed\n${Math.round(bs.efficiency * 100)}% circulation\nCapacity ${bs.capacity} / Load ${bs.load}\nMana recovery ${bs.manaPerSecond}/s`}
            label="Patient"
          />
        </div>
      ) : section === 'Equipment' ? (
        <PagedList
          page={pages[section] ?? 0}
          onPage={(page) => setPages((previous) => ({ ...previous, [section]: page }))}
          items={equipped(build)}
          render={({ part, item }) => (
            <button
              className="inspect-item"
              key={part.uid}
              onClick={() =>
                setDetail(
                  `${ITEM_MAP[item.defId].name} · Lv${item.level}\n${part.variant} ${SLOT_LABEL[part.slot]}\n\n${describeItemRules(ITEM_MAP[item.defId], item.level)}\n\nLevel 3 signature${item.level === 3 ? ' — active' : ''}:\n${describeSignature(ITEM_MAP[item.defId])}`,
                )
              }
            >
              <Icon name={ITEM_MAP[item.defId].icon} variant={item.defId} />
              <span>
                <strong>{ITEM_MAP[item.defId].name}</strong>
                <small>
                  {SLOT_LABEL[part.slot]} · Lv{item.level} · Inspect →
                </small>
              </span>
            </button>
          )}
        />
      ) : section === 'Abilities' ? (
        <PagedList
          page={pages[section] ?? 0}
          onPage={(page) => setPages((previous) => ({ ...previous, [section]: page }))}
          items={buildAbilities(build).filter((ability) => ability.source.kind !== 'item')}
          empty="No intrinsic abilities or active set bonuses."
          render={(ability) => (
            <button
              className="inspect-item"
              key={ability.uid}
              onClick={() =>
                setDetail(
                  `${ability.def.name}\n${ability.source.kind === 'limb' ? 'Anatomy ability' : 'Set bonus'}\n\n${describeAbilityRules(ability.def, ability.level)}`,
                )
              }
            >
              <Icon name={ability.def.icon} />
              <span>
                <strong>{ability.def.name}</strong>
                <small>Inspect →</small>
              </span>
            </button>
          )}
        />
      ) : (
        <PagedList
          page={pages[section] ?? 0}
          onPage={(page) => setPages((previous) => ({ ...previous, [section]: page }))}
          items={build.parts}
          minWidth={150}
          rowHeight={72}
          render={(part, index) => (
            <button
              key={part.uid}
              className="inspect-item"
              onClick={() =>
                setDetail(
                  `${SLOT_LABEL[part.slot]} ${build.parts.slice(0, index + 1).filter((candidate) => candidate.slot === part.slot).length}\nMaterial: ${part.variant}\nEquipment: ${part.item ? ITEM_MAP[part.item.defId].name : 'Empty slot'}`,
                )
              }
            >
              <Icon name={part.slot} />
              <span>
                <strong>
                  {SLOT_LABEL[part.slot]}{' '}
                  {
                    build.parts
                      .slice(0, index + 1)
                      .filter((candidate) => candidate.slot === part.slot).length
                  }
                </strong>
                <small>{part.variant} · Inspect →</small>
              </span>
            </button>
          )}
        />
      )}
    </div>
  );
}
