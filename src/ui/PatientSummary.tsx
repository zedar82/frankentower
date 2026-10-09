import { archetypes, equipped, identity, stats } from '../game/anatomy';
import { buildAbilities } from '../game/abilities';
import { ITEM_MAP } from '../game/content';
import type { Build } from '../game/types';
import { Creature } from './Creature';
import { Icon } from './Icon';
const fmt = (value: number) => (Number.isInteger(value) ? value : value.toFixed(1));

export function PatientSummary({ build }: { build: Build }) {
  const bs = stats(build);
  return (
    <>
      <div className="build-summary">
        <Creature build={build} />
        <div>
          <h3>{identity(build)}</h3>
          <p>{archetypes(build).join(' / ')}</p>
          <div className="inspect-stats">
            <span>{bs.maxHp} HP</span>
            <span>{bs.maxMana} Mana</span>
            <span>{Math.round(bs.movementSpeed)} Movement</span>
            <span>{fmt(bs.armour)} Armour</span>
            <span>{Math.round(bs.efficiency * 100)}% circulation</span>
          </div>
        </div>
      </div>
      <div className="inspect-equipment">
        {equipped(build).map(({ part, item }) => (
          <div className="inspect-item" key={part.uid}>
            <Icon name={ITEM_MAP[item.defId].icon} />
            <div>
              <strong>
                {ITEM_MAP[item.defId].name} <small>Lv{item.level}</small>
              </strong>
              <p>{ITEM_MAP[item.defId].text}</p>
              {item.level === 3 && <p className="mint">{ITEM_MAP[item.defId].signature}</p>}
            </div>
          </div>
        ))}
        {buildAbilities(build)
          .filter((ability) => ability.source.kind !== 'item')
          .map((ability) => (
            <div className="inspect-item" key={ability.uid}>
              <Icon name={ability.def.icon} />
              <div>
                <strong>{ability.def.name}</strong>
                <small>{ability.source.kind === 'limb' ? 'Anatomy ability' : 'Set bonus'}</small>
                <p>{ability.def.text}</p>
              </div>
            </div>
          ))}
      </div>
    </>
  );
}
