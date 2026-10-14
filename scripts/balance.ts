import { Combat } from '../src/game/combat';
import { ITEM_MAP } from '../src/game/content';
import { equipped, stats, usable } from '../src/game/anatomy';
import { advance, defaultSave, finishFight, newRun, startRun } from '../src/game/run';
import { recover, reroll, upgradeShop } from '../src/game/shop';
import {
  buy,
  combine,
  combineCandidate,
  equip,
  purchaseItem,
  purchaseReason,
  sell,
} from '../src/game/inventory';
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
type BalanceDiagnostics = {
  blockedPurchases: number;
  blockedTransfers: number;
  itemsSold: number;
  goldSpent: number;
  satchelItems: number;
  satchelObservations: number;
  blockedReasons: string[];
};
function spend(r: Run, diagnostics: BalanceDiagnostics, action: () => unknown) {
  const before = r.gold;
  const result = action();
  diagnostics.goldSpent += Math.max(0, before - r.gold);
  return result;
}
function acquireOffer(
  r: Run,
  index: number,
  replacement: (typeof r.build.parts)[number] | undefined,
  strategy: string,
  diagnostics: BalanceDiagnostics,
) {
  const offer = r.offers[index];
  if (!offer) return false;
  const def = ITEM_MAP[offer.defId];
  let acquired = false;
  if (replacement && !replacement.item) {
    acquired = !!spend(r, diagnostics, () => purchaseItem(r, index));
  } else {
    if (r.stash.length >= 8) {
      const discard = [...r.stash]
        .sort((a, b) => value(a, strategy) - value(b, strategy))
        .find((item) => value(item, strategy) < value(offer, strategy));
      if (!discard || !sell(r, discard.uid)) {
        diagnostics.blockedPurchases++;
        if (diagnostics.blockedReasons.length < 12)
          diagnostics.blockedReasons.push(
            `Floor ${r.floor}: ${def.name} blocked by a full satchel; no lower-value item to sell.`,
          );
        return false;
      }
      diagnostics.itemsSold++;
    }
    acquired = !!spend(r, diagnostics, () => buy(r, index));
    if (acquired && replacement && !equip(r, offer.uid, replacement.uid)) {
      diagnostics.blockedTransfers++;
      if (diagnostics.blockedReasons.length < 12)
        diagnostics.blockedReasons.push(`Floor ${r.floor}: purchased ${def.name} but could not equip it.`);
    }
  }
  if (!acquired) {
    diagnostics.blockedPurchases++;
    if (diagnostics.blockedReasons.length < 12)
      diagnostics.blockedReasons.push(
        `Floor ${r.floor}: ${def.name} blocked: ${purchaseReason(r, index) ?? 'transfer rejected.'}`,
      );
  }
  return acquired;
}
function buildPhase(r: Run, strategy: string, diagnostics: BalanceDiagnostics) {
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
    if (p) spend(r, diagnostics, () => operate(r, p.id));
  }
  if (r.gold >= 40 + r.shopTier * 8 && r.shopTier < Math.min(5, 1 + Math.floor(r.floor / 12)))
    spend(r, diagnostics, () => upgradeShop(r));
  for (let cycle = 0; cycle < 3; cycle++) {
    for (const [n, i] of r.offers.entries()) {
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
      if (!acquireOffer(r, n, replacement, strategy, diagnostics)) continue;
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
    if (cycle < 2 && r.gold > 42) spend(r, diagnostics, () => reroll(r));
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
    if (p) spend(r, diagnostics, () => operate(r, p.id));
  }
  if (r.hp < stats(r.build).maxHp * 0.65 && r.gold >= 10)
    spend(r, diagnostics, () => recover(r));
  diagnostics.satchelItems += r.stash.length;
  diagnostics.satchelObservations++;
}
for (const strategy of Object.keys(archetypes)) {
  const floors: number[] = [];
  const diagnostics: BalanceDiagnostics & {
    simulationFailures: number;
    unresolvedRuns: number;
    stalemates: number;
    completedRuns: number;
    deaths: number;
  } = {
    blockedPurchases: 0,
    blockedTransfers: 0,
    itemsSold: 0,
    goldSpent: 0,
    satchelItems: 0,
    satchelObservations: 0,
    blockedReasons: [],
    simulationFailures: 0,
    unresolvedRuns: 0,
    stalemates: 0,
    completedRuns: 0,
    deaths: 0,
  };
  for (let seed = 1; seed <= 16; seed++) {
    const save = defaultSave(),
      r = newRun(seed * 7919);
    save.run = r;
    startRun(r, strategy === 'bulwark' ? 'club' : 'knife');
    let diagnosticStop: 'simulationFailure' | 'unresolved' | undefined;
    let lastOutcome = 'not started';
    while (!['dead', 'complete'].includes(r.phase)) {
      buildPhase(r, strategy, diagnostics);
      const fightSeed = r.seed ^ (r.floor * 15485863);
      const sim = new Combat(
        r.build,
        encounter(r.floor, r.seed, []),
        fightSeed,
        r.hp,
      );
      r.phase = 'combat';
      sim.runToEnd();
      lastOutcome = sim.outcome;
      if (sim.failure) {
        diagnostics.simulationFailures++;
        diagnosticStop = 'simulationFailure';
        break;
      }
      if (!sim.done) {
        diagnostics.unresolvedRuns++;
        diagnosticStop = 'unresolved';
        break;
      }
      if (sim.outcome === 'stalemate') diagnostics.stalemates++;
      finishFight(r, sim.player.hp, sim.won, save);
      if (['result', 'checkpoint'].includes(r.phase)) advance(r);
    }
    if (r.phase === 'complete') diagnostics.completedRuns++;
    else if (r.phase === 'dead') diagnostics.deaths++;
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
          outcome: lastOutcome,
          termination: diagnosticStop ?? r.phase,
        }),
      );
  }
  console.log(
    strategy,
    JSON.stringify({
      min: Math.min(...floors),
      median: floors.sort((a, b) => a - b)[8],
      max: Math.max(...floors),
      completed: diagnostics.completedRuns,
      deaths: diagnostics.deaths,
      diagnosticStops: diagnostics.simulationFailures + diagnostics.unresolvedRuns,
      simulationFailures: diagnostics.simulationFailures,
      unresolvedRuns: diagnostics.unresolvedRuns,
      stalemates: diagnostics.stalemates,
      blockedPurchases: diagnostics.blockedPurchases,
      blockedTransfers: diagnostics.blockedTransfers,
      itemsSold: diagnostics.itemsSold,
      goldSpent: diagnostics.goldSpent,
      averageSatchelOccupancy: diagnostics.satchelObservations
        ? diagnostics.satchelItems / diagnostics.satchelObservations
        : 0,
      blockedReasons: diagnostics.blockedReasons,
      floors,
    }),
  );
}
