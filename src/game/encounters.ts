import { human, stats } from './anatomy';
import { Random } from './random';
import { RULESET, clone, type Build, type Legacy, type Slot } from './types';

function enemy(name: string, item: string, hp: number, power: number, armour = 0): Build {
  const anatomy: Record<
    string,
    { slots: Slot[]; material: 'living' | 'clockwork' | 'necrotic' | 'rat' | 'bone' }
  > = {
    'Grave rat': {
      slots: ['head', 'chest', 'heart', 'hand', 'hand', 'foot', 'foot', 'foot', 'foot'],
      material: 'rat',
    },
    Skeleton: {
      slots: ['head', 'chest', 'heart', 'hand', 'hand', 'foot', 'foot'],
      material: 'bone',
    },
    Ogre: {
      slots: [
        'head',
        'head',
        'chest',
        'chest',
        'heart',
        'heart',
        'hand',
        'hand',
        'hand',
        'hand',
        'foot',
        'foot',
      ],
      material: 'living',
    },
    'Grave mage': {
      slots: ['head', 'head', 'chest', 'heart', 'heart', 'hand', 'hand', 'foot', 'foot'],
      material: 'necrotic',
    },
    'Bone archer': {
      slots: ['head', 'chest', 'heart', 'hand', 'hand', 'foot', 'foot'],
      material: 'bone',
    },
    'Iron knight': {
      slots: ['head', 'chest', 'heart', 'hand', 'hand', 'foot', 'foot'],
      material: 'clockwork',
    },
    Golem: {
      slots: [
        'head',
        'chest',
        'chest',
        'heart',
        'heart',
        'heart',
        'hand',
        'hand',
        'hand',
        'hand',
        'foot',
        'foot',
        'foot',
        'foot',
      ],
      material: 'clockwork',
    },
  };
  const profile = anatomy[name];
  const b = human(name);
  if (profile) {
    b.parts = profile.slots.map((slot, i) => ({
      uid: `${name.toLowerCase().replace(/\s+/g, '-')}-${i}`,
      slot,
      variant: profile.material,
    }));
  }
  // Keep each prototype's authored HP while letting its new anatomy determine the silhouette.
  b.healthFactor = hp / stats(b).maxHp;
  b.powerFactor = power;
  b.parts.find((p) => p.slot === 'hand')!.item = { uid: `${name}-weapon`, defId: item, level: 1 };
  if (armour)
    b.parts.find((p) => p.slot === 'chest')!.item = {
      uid: `${name}-armour`,
      defId: armour >= 5 ? 'golemplate' : 'plate',
      level: Math.min(3, armour),
    };
  return b;
}
export function encounter(floor: number, seed: number, legacy: Legacy[]): Build[] {
  if (floor % 20 === 0) {
    const old = legacy.find((b) => b.checkpoint === floor && b.ruleset === RULESET);
    if (old) return [clone(old.build)];
    const boss = human(
      [
        'Dr. Sutcher',
        'The Ward Matron',
        'Professor Polycard',
        'The Chief Resident',
        'The First Patient',
      ][floor / 20 - 1],
    );
    const byFloor: Record<number, string[]> = {
      20: ['cleaver', 'shield', 'plate', 'horns', 'bloodboots', 'runners', 'heart'],
      40: ['bloodletter', 'knife', 'barbed', 'redhat', 'bloodrunner', 'bloodboots', 'vampire'],
      60: ['bonewand', 'stormwand', 'golemplate', 'conductor', 'rabbit', 'runners', 'wizardheart'],
      80: ['maul', 'parry', 'donor', 'ram', 'spurs', 'octoboot', 'pump'],
      100: ['saint', 'necrowand', 'donor', 'hydra', 'dance', 'plague', 'bloodengine'],
    };
    const ids = byFloor[floor];
    const slots: Slot[] = ['hand', 'hand', 'chest', 'head', 'foot', 'foot', 'heart'];
    slots.forEach((slot, i) => {
      const part = boss.parts.find((p) => p.slot === slot && !p.item)!;
      part.item = { uid: `boss-${floor}-${i}`, defId: ids[i], level: 1 };
    });
    boss.healthFactor = 1.25 + floor * 0.015;
    boss.powerFactor = 0.65 + floor * 0.002;
    return [boss];
  }
  const rng = new Random((seed ^ Math.imul(floor, 2654435761)) >>> 0);
  const archetypes = [
    { name: 'Grave rat', item: 'ratbite', cost: 2, hp: 420, power: 0.45, armour: 0 },
    { name: 'Skeleton', item: 'skeletonblade', cost: 4, hp: 1000, power: 1, armour: 0 },
    { name: 'Ogre', item: 'ogrefist', cost: 7, hp: 1600, power: 1.1, armour: 0 },
    { name: 'Grave mage', item: 'magebolt', cost: 5, hp: 750, power: 0.95, armour: 0 },
    { name: 'Bone archer', item: 'archershot', cost: 4, hp: 800, power: 0.9, armour: 0 },
    { name: 'Iron knight', item: 'skeletonblade', cost: 6, hp: 1200, power: 0.85, armour: 2 },
    { name: 'Golem', item: 'ogrefist', cost: 10, hp: 2000, power: 1.1, armour: 5 },
  ];
  if (floor === 1) return [enemy('Skeleton', 'skeletonblade', 1000, 1)];
  let budget = 4 + Math.floor(floor / 7);
  const result: Build[] = [];
  while (budget >= 2 && result.length < 6) {
    const pool = archetypes.filter((a) => a.cost <= budget && (floor >= 8 || a.cost <= 4));
    const a = rng.pick(pool);
    budget -= a.cost;
    result.push(
      enemy(a.name, a.item, a.hp * (1 + floor * 0.025), a.power * (1 + floor * 0.009), a.armour),
    );
  }
  return result;
}
