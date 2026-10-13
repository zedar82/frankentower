import { LEVEL_SCALE } from '../game/abilities';
import { SLOT_PLURAL } from '../game/anatomy';
import type { Effect, ItemDef, Reaction, Stat } from '../game/types';

// Shared presentation vocabulary, derived from rules rather than item names or prose.
export const EFFECT_SYMBOLS = {
  damage: ['Attack damage', '#793624', 'M3 17 14 6 14 2 18 2 18 6 7 17M3 13 7 17M2 18 4 16'],
  bleed: ['Bleed', '#a82c29', 'M10 2 4 10 4 14 7 18 13 18 16 14 16 10ZM7 12 7 14 9 16'],
  poison: [
    'Poison',
    '#4d6928',
    'M5 3 15 3 18 6 18 12 14 15 14 18 6 18 6 15 2 12 2 6ZM6 7 6 9M14 7 14 9M8 14 8 17M12 14 12 17',
  ],
  heal: ['Healing', '#526633', 'M7 2 13 2 13 7 18 7 18 13 13 13 13 18 7 18 7 13 2 13 2 7 7 7Z'],
  shield: ['Shield', '#495d67', 'M3 2 17 2 17 10 14 15 10 18 6 15 3 10ZM10 5 10 14'],
  mana: ['Mana', '#375e98', 'M10 1 17 9 10 19 3 9ZM10 5 13 9 10 15 7 9Z'],
  armour: [
    'Armour',
    '#57514d',
    'M6 2 14 2 16 6 18 6 17 17 3 17 2 6 4 6ZM6 2 7 6 13 6 14 2M10 9 10 14',
  ],
  speed: ['Activation speed', '#7b5b22', 'M11 1 4 11 9 11 7 19 17 7 11 7Z'],
  crit: [
    'Critical chance',
    '#923e26',
    'M10 1 12 7 19 5 14 10 19 15 12 13 10 19 8 13 1 15 6 10 1 5 8 7Z',
  ],
  chance: [
    'Chance amplification',
    '#6c4985',
    'M3 3 17 3 17 17 3 17ZM6 6 6 7M14 6 14 7M10 10 10 11M6 13 6 14M14 13 14 14',
  ],
  capacity: [
    'Circulation capacity',
    '#954134',
    'M10 18 2 10 2 5 5 2 8 2 10 5 12 2 15 2 18 5 18 10ZM4 10 7 10 9 7 11 13 13 10 16 10',
  ],
  maxHp: [
    'Maximum health',
    '#7d4238',
    'M10 18 2 10 2 5 5 2 8 2 10 5 12 2 15 2 18 5 18 10ZM10 7 10 13M7 10 13 10',
  ],
  maxMana: ['Maximum mana', '#375e98', 'M10 1 17 9 10 19 3 9ZM10 6 10 12M7 9 13 9'],
  cdr: [
    'Cooldown reduction',
    '#7b592e',
    'M5 4 2 4 2 1M2 4 5 2 12 2 17 7 17 13 12 18 6 18 2 14M10 5 10 10 6 10',
  ],
  trigger: ['Activate selected items', '#7b592e', 'M3 2 17 10 3 18ZM4 10 11 10M17 3 17 17'],
  clock: [
    'Cooldown in seconds',
    '#68523a',
    'M6 2 14 2 18 6 18 14 14 18 6 18 2 14 2 6ZM10 5 10 10 14 10',
  ],
  hurt: ['When hit', '#793624', 'M10 1 12 7 19 7 14 11 16 18 10 14 4 18 6 11 1 7 8 7ZM7 8 13 12'],
} as const;
export type EffectSymbol = keyof typeof EFFECT_SYMBOLS;

export function EffectIcon({ kind }: { kind: EffectSymbol }) {
  const [, color, path] = EFFECT_SYMBOLS[kind];
  return (
    <svg className="effect-icon" viewBox="0 0 20 20" aria-hidden="true" style={{ color }}>
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="miter" />
    </svg>
  );
}

const format = (value: number) => String(Math.round(value * 100) / 100);
const statValue = (stat: Stat, value: number) =>
  `${value >= 0 ? '+' : ''}${format(value * (stat === 'speed' || stat === 'chance' ? 100 : 1))}${['speed', 'chance', 'crit'].includes(stat) ? '%' : ''}`;
const eventSymbols: Partial<Record<Reaction['event'], EffectSymbol>> = {
  hurt: 'hurt',
  hit: 'damage',
  crit: 'crit',
  block: 'shield',
  heal: 'heal',
  bleed: 'bleed',
  poison: 'poison',
  poisonTick: 'poison',
  mana: 'mana',
  activated: 'trigger',
};

function EffectValue({ effect, scale }: { effect: Effect; scale: number }) {
  const kind = effect.kind === 'stat' ? effect.stat : effect.kind;
  const value =
    effect.kind === 'trigger'
      ? ''
      : effect.kind === 'stat'
        ? statValue(effect.stat, effect.amount)
        : effect.kind === 'cdr'
          ? `−${format(effect.amount * (effect.percent ? 100 : 1))}${effect.percent ? '%' : 's'}`
          : format(effect.amount * scale);
  return (
    <>
      {effect.cost !== undefined && (
        <>
          <EffectIcon kind="mana" />
          <span>−{effect.cost}</span>
          <small>→</small>
        </>
      )}
      <EffectIcon kind={kind} />
      <span>{value}</span>
      {(effect.kind === 'trigger' || effect.kind === 'cdr') && effect.select && (
        <small>
          {effect.select.longest
            ? 'Longest'
            : (effect.select.type ??
              effect.select.tag ??
              effect.select.slot ??
              (effect.select.self ? 'Self' : 'All'))}
          {effect.select.random ? '?' : ''}
        </small>
      )}
      {'per' in effect && effect.per && <small>/{effect.per}</small>}
      {'all' in effect && effect.all && <small>∀</small>}
      {effect.chance !== undefined && <small>{effect.chance}%</small>}
    </>
  );
}

export function EffectSummary({ def, level }: { def: ItemDef; level: number }) {
  const scale = LEVEL_SCALE[level];
  return (
    <span className="effect-summary" aria-label={def.text}>
      {level > 1 && (
        <span className="effect-chip">
          <small>
            Lv{level}
            {level === 3 ? '★' : ''}
          </small>
        </span>
      )}
      {def.requires && (
        <span className="effect-chip">
          <small>
            Needs {def.requires.count} {SLOT_PLURAL[def.requires.slot]}
          </small>
        </span>
      )}
      {Object.entries(def.stats ?? {}).map(([stat, value]) => (
        <span className="effect-chip" key={stat} title={EFFECT_SYMBOLS[stat as Stat][0]}>
          <EffectIcon kind={stat as Stat} />
          <span>{statValue(stat as Stat, value * scale)}</span>
        </span>
      ))}
      {(def.effects ?? []).map((effect, index) => (
        <span className="effect-chip" key={`active-${index}`}>
          <EffectValue effect={effect} scale={scale} />
          {effect.kind === 'damage' && effect.shieldBonus !== undefined && (
            <small>
              +{format(effect.shieldBonus * scale)}
              <EffectIcon kind="shield" />
            </small>
          )}
        </span>
      ))}
      {(def.reactions ?? []).flatMap((reaction, index) =>
        reaction.effects.map((effect, effectIndex) => (
          <span className="effect-chip reaction-chip" key={`reaction-${index}-${effectIndex}`}>
            {reaction.own && <small>own</small>}
            {(reaction.tag || reaction.type || reaction.slot) && (
              <small>{reaction.tag ?? reaction.type ?? reaction.slot}</small>
            )}
            {eventSymbols[reaction.event] ? (
              <EffectIcon kind={eventSymbols[reaction.event]!} />
            ) : (
              <small>{reaction.event}</small>
            )}
            {reaction.event === 'poisonTick' && <small>tick</small>}
            {reaction.chance !== undefined && <small>{reaction.chance}%</small>}
            <small>→</small>
            <EffectValue effect={effect} scale={scale} />
          </span>
        )),
      )}
    </span>
  );
}
