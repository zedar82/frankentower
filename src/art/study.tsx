import { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Arena, DressingRoom } from '../ui/Arena';
import { Combat } from '../game/combat';
import type { Build, Part } from '../game/types';
import { puppetReady } from './pixel';

if (!import.meta.env.DEV) throw new Error('Art review is development-only');
type Options = {
  heads: number;
  arms: number;
  legs: number;
  fur: boolean;
  gear: boolean;
  alternate: boolean;
};
export function studyBuild(name: string, options: Options): Build {
  const { heads, arms, legs, fur, gear, alternate } = options;
  const parts: Part[] = [
    { uid: `${name}-chest`, slot: 'chest', variant: fur ? 'rat' : 'living' },
    { uid: `${name}-heart`, slot: 'heart', variant: 'living' },
  ];
  for (let i = 0; i < heads; i++)
    parts.push({
      uid: `${name}-head-${i}`,
      slot: 'head',
      variant: (i + (alternate ? 1 : 0)) % 2 ? 'serpent' : 'rat',
      ...(gear ? { item: { uid: `${name}-crown-${i}`, defId: 'horns', level: 1 as const } } : {}),
    });
  for (let i = 0; i < arms; i++)
    parts.push({
      uid: `${name}-arm-${i}`,
      slot: 'hand',
      variant: (i + (alternate ? 1 : 0)) % 2 ? 'rat' : 'living',
      ...(gear ? { item: { uid: `${name}-weapon-${i}`, defId: 'knife', level: 1 as const } } : {}),
    });
  const legVariants: Part['variant'][] = ['living', 'bone', 'serpent'];
  for (let i = 0; i < legs; i++)
    parts.push({
      uid: `${name}-leg-${i}`,
      slot: 'foot',
      variant: legVariants[(i + (alternate ? 1 : 0)) % 3],
      ...(gear ? { item: { uid: `${name}-shoe-${i}`, defId: 'runners', level: 1 as const } } : {}),
    });
  return { name, parts, healthFactor: 8, powerFactor: 0.25 };
}
export const studyCases: Build[] = [
  studyBuild('01 · Balanced grafts', {
    heads: 1,
    arms: 2,
    legs: 2,
    fur: false,
    gear: false,
    alternate: false,
  }),
  studyBuild('02 · Two heads, three arms', {
    heads: 2,
    arms: 3,
    legs: 2,
    fur: false,
    gear: false,
    alternate: false,
  }),
  studyBuild('03 · Fur trunk, equipped', {
    heads: 1,
    arms: 2,
    legs: 2,
    fur: true,
    gear: true,
    alternate: true,
  }),
  studyBuild('04 · Head-heavy, capped taper', {
    heads: 3,
    arms: 2,
    legs: 1,
    fur: false,
    gear: true,
    alternate: false,
  }),
  studyBuild('05 · Leg-heavy, capped taper', {
    heads: 1,
    arms: 2,
    legs: 5,
    fur: true,
    gear: false,
    alternate: true,
  }),
  studyBuild('06 · Two arm rows, mixed materials', {
    heads: 2,
    arms: 4,
    legs: 3,
    fur: false,
    gear: true,
    alternate: true,
  }),
];
const qualityBuild = studyBuild('Living rendering baseline', {
  heads: 1,
  arms: 2,
  legs: 2,
  fur: false,
  gear: false,
  alternate: false,
});
qualityBuild.parts.forEach((p) => (p.variant = 'living'));
qualityBuild.parts
  .filter((p) => p.slot === 'hand')
  .forEach(
    (p, i) => (p.item = { uid: `quality-weapon-${i}`, defId: i ? 'dagger' : 'knife', level: 1 }),
  );
function Review() {
  const [options, setOptions] = useState<Options>({
    heads: 2,
    arms: 3,
    legs: 2,
    fur: false,
    gear: true,
    alternate: false,
  });
  const build = useMemo(() => studyBuild('Your graft mixture', options), [options]);
  const [time, setTime] = useState(1.8);
  const combat = useMemo(() => {
    const result = new Combat(build, [studyCases[2]], 541);
    for (let t = 0; t < time; t += 0.05) result.step(0.05);
    return result;
  }, [build, time]);
  const set = (key: keyof Options, value: number | boolean) =>
    setOptions((old) => ({ ...old, [key]: value }));
  return (
    <main>
      <h1>FRANKENTOWER · modular assembly study</h1>
      <p>
        Actual DressingRoom and Arena canvases. New cutouts, fixed interfaces, two-step maximum
        taper. Structural assembly is accepted; material and seam polish remains open.
      </p>
      <div className="gallery">
        {studyCases.map((b) => (
          <section key={b.name}>
            <h2>{b.name}</h2>
            <DressingRoom build={b} floor={1} />
          </section>
        ))}
      </div>
      <h2>Rendering quality baseline</h2>
      <div className="quality" style={{ width: 'min(100%,960px)' }}>
        <DressingRoom build={qualityBuild} floor={1} />
      </div>
      <h2>Mix and match</h2>
      <div className="controls">
        {(['heads', 'arms', 'legs'] as const).map((key) => (
          <label key={key}>
            {key}{' '}
            <input
              type="number"
              min="0"
              max={key === 'arms' ? 8 : 6}
              value={options[key]}
              onChange={(e) =>
                set(key, Math.max(0, Math.min(key === 'arms' ? 8 : 6, Number(e.target.value))))
              }
            />
          </label>
        ))}
        <label>
          <input
            type="checkbox"
            checked={options.fur}
            onChange={(e) => set('fur', e.target.checked)}
          />{' '}
          Fur torso
        </label>
        <label>
          <input
            type="checkbox"
            checked={options.gear}
            onChange={(e) => set('gear', e.target.checked)}
          />{' '}
          Crowns and cleavers
        </label>
        <label>
          <input
            type="checkbox"
            checked={options.alternate}
            onChange={(e) => set('alternate', e.target.checked)}
          />{' '}
          Swap material order
        </label>
      </div>
      <div className="interactive">
        <DressingRoom build={build} floor={1} />
        <div>
          <label>
            Combat time {time.toFixed(2)}s{' '}
            <input
              type="range"
              min="0"
              max="6"
              step=".05"
              value={time}
              onChange={(e) => setTime(Number(e.target.value))}
            />
          </label>
          <Arena combat={combat} floor={1} paused={true} onInspect={() => {}} />
        </div>
      </div>
    </main>
  );
}
const style = document.createElement('style');
style.textContent = `body{margin:0;background:#111016;color:#e5cca5;font:15px Georgia,serif}main{max-width:1060px;margin:auto;padding:24px}h1{font-size:25px}h2{font-size:17px}p{line-height:1.5;color:#c0aea0}.gallery{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.gallery section{background:#1a171f;padding:10px}.dressing-room{width:100%;height:auto;image-rendering:pixelated}.controls{display:flex;flex-wrap:wrap;gap:18px;background:#27202a;padding:15px;margin-bottom:20px}input[type=number]{width:40px}.interactive{display:grid;grid-template-columns:320px 1fr;gap:20px}.arena-scene{position:relative}.arena-scene canvas{width:100%;image-rendering:pixelated}.actor-target{position:absolute;background:transparent;border:0;cursor:pointer}.paused-banner{display:none}input[type=range]{width:75%}@media(max-width:750px){.gallery{grid-template-columns:repeat(2,1fr)}.interactive{grid-template-columns:1fr}}`;
document.head.append(style);
await puppetReady;
createRoot(document.getElementById('root')!).render(<Review />);
