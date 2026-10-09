import { Combat } from '../src/game/combat';
import { ITEM_MAP } from '../src/game/content';
import { equipped, stats, usable } from '../src/game/anatomy';
import { advance, defaultSave, finishFight, newRun, startRun } from '../src/game/run';
import { recover, reroll, upgradeShop } from '../src/game/shop';
import { buy, combine, combineCandidate, equip } from '../src/game/inventory';
import { operate, procedureReason } from '../src/game/surgery';
import { encounter } from '../src/game/encounters';
import { PROCEDURES } from '../src/game/content';
import type { Item, Run } from '../src/game/types';
const archetypes: Record<string, string[]> = {
  blood: [
    'knife',
    'bloodboots',
    'heart',
    'horns',
    'bloodletter',
    'bloodrunner',
    'apron',
    'vampire',
    'redhat',
    'bloodengine',
    'cleaver',
    'artery',
  ],
  arcane: [
    'bonewand',
    'heart',
    'bandage',
    'horns',
    'runners',
    'wizardheart',
    'conductor',
    'stormwand',
    'brain',
    'necrowand',
    'artery',
    'ouroboros',
    'apocalypse',
  ],
  bulwark: [
    'club',
    'plate',
    'shield',
    'horns',
    'ironboots',
    'heart',
    'barbed',
    'maul',
    'parry',
    'ram',
    'pump',
    'golemplate',
    'saint',
    'donor',
  ],
  venom: [
    'knife',
    'venomboots',
    'heart',
    'horns',
    'viper',
    'plague',
    'hydra',
    'necrowand',
    'bloodboots',
    'golemplate',
  ],
};
function value(i: Item, strategy: string) {
  const d = ITEM_MAP[i.defId];
  let rank = archetypes[strategy].indexOf(d.id);
  if (rank < 0) {
    const offence =
      d.effects?.reduce(
        (n, e) =>
          n +
          (e.kind === 'damage'
            ? (e.amount ?? 0) / (d.cooldown ?? 4)
            : e.kind === 'poison'
              ? (e.amount ?? 0) * 2
              : 0),
        0,
      ) ?? 0;
    // Keep strategy scores in their original range after combat units increased.
    return (3 + d.rarity * 4 + Math.min(15, offence / 10)) * [0, 1, 1.7, 2.7][i.level];
  }
  return (10 + d.rarity * 7 + rank * 0.4) * [0, 1, 1.7, 2.7][i.level];
}
function buildPhase(r: Run, strategy: string) {
  if (r.gold >= 12 + r.shopTier * 8 && r.shopTier < Math.min(5, 1 + Math.floor(r.floor / 12)))
    upgradeShop(r);
  if (r.floor % 5 === 0 && !r.operated) {
    const s = stats(r.build);
    const wish =
      s.efficiency < 0.9
        ? ['heart', 'tripump', 'necrotic']
        : strategy === 'arcane'
          ? ['head', 'heart', 'arm']
          : strategy === 'venom'
            ? ['feet', 'octopod', 'head', 'heart']
            : strategy === 'bulwark'
              ? ['arm', 'fourarms', 'heart', 'head']
              : ['arm', 'feet', 'head', 'heart'];
    const p = wish
      .map((id) => PROCEDURES.find((p) => p.id === id)!)
      .find((p) => r.procedures.includes(p.id) && !procedureReason(r, p));
    if (p) operate(r, p.id);
  }
  if (r.gold >= 40 + r.shopTier * 8 && r.shopTier < Math.min(5, 1 + Math.floor(r.floor / 12)))
    upgradeShop(r);
  for (let cycle = 0; cycle < 3; cycle++) {
    for (let n = 0; n < 6; n++) {
      const i = r.offers[n];
      if (!i || !value(i, strategy) || !usable(r.build, i)) continue;
      const def = ITEM_MAP[i.defId],
        candidates = r.build.parts.filter((p) => p.slot === def.slot);
      const duplicate = [...r.stash, ...equipped(r.build).map((x) => x.item)].some(
        (x) => x.defId === i.defId && x.level < 3,
      );
      const replacement = candidates.find(
        (p) => !p.item || value(p.item, strategy) < value(i, strategy),
      );
      if (!duplicate && !replacement) continue;
      if (r.gold < def.price) continue;
      buy(r, n);
      if (replacement) equip(r, i.uid, replacement.uid);
      for (const item of [...r.stash, ...equipped(r.build).map((x) => x.item)])
        if (combineCandidate(r, item)) combine(r, item.uid);
    }
    for (const i of [...r.stash]) {
      const p = r.build.parts.find(
        (p) =>
          p.slot === ITEM_MAP[i.defId].slot &&
          (!p.item || value(p.item, strategy) < value(i, strategy)),
      );
      if (p && usable(r.build, i)) equip(r, i.uid, p.uid);
    }
    if (cycle < 2 && r.gold > 42) reroll(r);
    else break;
  }
  if (r.floor % 5 === 0 && !r.operated) {
    const s = stats(r.build);
    const wish =
      s.efficiency < 0.9
        ? ['heart', 'tripump', 'necrotic']
        : strategy === 'arcane'
          ? ['head', 'polyhead', 'heart', 'arm']
          : strategy === 'venom'
            ? ['feet', 'octopod', 'head', 'heart']
            : strategy === 'bulwark'
              ? ['arm', 'fourarms', 'heart', 'head']
              : ['arm', 'feet', 'head', 'heart'];
    const p = wish
      .map((id) => PROCEDURES.find((p) => p.id === id)!)
      .find((p) => r.procedures.includes(p.id) && !procedureReason(r, p));
    if (p) operate(r, p.id);
  }
  if (r.hp < stats(r.build).maxHp * 0.65 && r.gold >= 10) recover(r);
}
for (const strategy of Object.keys(archetypes)) {
  const floors: number[] = [];
  let failures = 0;
  for (let seed = 1; seed <= 16; seed++) {
    const save = defaultSave(),
      r = newRun(seed * 7919);
    save.run = r;
    startRun(r, strategy === 'bulwark' ? 'club' : 'knife');
    while (!['dead', 'complete'].includes(r.phase)) {
      buildPhase(r, strategy);
      const sim = new Combat(
        r.build,
        encounter(r.floor, r.seed, []),
        r.seed ^ (r.floor * 15485863),
        r.hp,
      );
      r.phase = 'combat';
      sim.runToEnd();
      if (sim.failure) failures++;
      finishFight(r, sim.player.hp, sim.won, save);
      if (['result', 'checkpoint'].includes(r.phase)) advance(r);
    }
    floors.push(r.floor);
    if (seed === 1)
      console.log(
        'sample',
        strategy,
        JSON.stringify({
          floor: r.floor,
          gold: r.gold,
          tier: r.shopTier,
          parts: r.build.parts.length,
          efficiency: stats(r.build).efficiency,
          items: equipped(r.build).map((x) => `${x.item.defId}:${x.item.level}`),
        }),
      );
  }
  console.log(
    strategy,
    JSON.stringify({
      min: Math.min(...floors),
      median: floors.sort((a, b) => a - b)[8],
      max: Math.max(...floors),
      completed: floors.filter((x) => x === 100).length,
      simulationFailures: failures,
      floors,
    }),
  );
}
