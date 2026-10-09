import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAbilities, hasOffensiveAbility } from '../src/game/abilities';
import { human, stats } from '../src/game/anatomy';
import { VARIANT_DEFINITIONS } from '../src/game/anatomy-content';
import { SET_DEFINITIONS, type SetDefinition } from '../src/game/sets';
import { Combat } from '../src/game/combat';

function patient() {
  const build = human('Patient');
  build.parts[2].item = { uid: 'dagger', defId: 'dagger', level: 1 };
  return build;
}

function inReach(build = patient()) {
  const target = human('Target');
  target.healthFactor = 100;
  const sim = new Combat(build, [target], 12);
  sim.enemies[0].x = sim.player.x + 40;
  sim.enemies[0].y = sim.player.y;
  return sim;
}

test('limb abilities have independent identities and use the common offensive rules', () => {
  const build = human();
  build.parts[0].variant = 'serpent';
  build.parts.push({ uid: 'extra-serpent', slot: 'head', variant: 'serpent' });
  const abilities = buildAbilities(build);
  assert.equal(abilities.length, 2);
  assert.ok(abilities.every((ability) => ability.source.kind === 'limb'));
  assert.equal(new Set(abilities.map((ability) => ability.uid)).size, 2);
  assert.equal(hasOffensiveAbility(build), true);
  const sim = inReach(build);
  for (const ability of sim.player.abilities) sim.activate(sim.player, ability);
  assert.equal(sim.enemies[0].bleed, 0);
  assert.equal(sim.enemies[0].poison, 80);
  assert.equal(sim.player.damage, 200);
  assert.equal(sim.suppressed, 0);
});

test('own-hit limb reactions resolve without reactivating their originating ability', () => {
  const definition = VARIANT_DEFINITIONS.serpent.abilities!.head![0];
  const previous = definition.reactions;
  definition.reactions = [
    { id: 'own-hit-mana', event: 'hit', own: true, effects: [{ kind: 'mana', amount: 13 }] },
  ];
  try {
    const build = human();
    build.parts[0].variant = 'serpent';
    const sim = inReach(build),
      bite = sim.player.abilities[0];
    sim.player.mana = 0;
    sim.activate(sim.player, bite);
    sim.step();
    assert.equal(sim.player.mana, 13);
    assert.equal(bite.activations, 1);
    assert.equal(sim.suppressed, 0);
  } finally {
    definition.reactions = previous;
  }
});

test('set thresholds stack once and scale independently of equipment levels', () => {
  const build = human();
  build.parts = build.parts.filter((part) => part.slot !== 'foot');
  for (let i = 0; i < 8; i++)
    build.parts.push({
      uid: `foot-${i}`,
      slot: 'foot',
      variant: 'clockwork',
      item: { uid: `shoe-${i}`, defId: 'runners', level: 3 },
    });
  const abilities = buildAbilities(build).filter((ability) => ability.source.kind === 'set');
  assert.equal(abilities.length, 4);
  assert.ok(abilities.every((ability) => ability.level === 1));
  const calculated = stats(build);
  assert.equal(calculated.sets.octopod, 8);
  assert.equal(calculated.crit, 20);
  assert.equal(calculated.capacity, 200);
  assert.ok(Math.abs(calculated.speed - (1 + 8 * 0.1 * 2.4 + 0.1 + 0.5)) < 1e-8);
});

test('a declarative set supports static stats, timers, and source-filtered reactions', () => {
  const definition: SetDefinition = {
    id: 'test-blade',
    name: 'Test blades',
    tag: 'Blade',
    bonuses: [
      {
        pieces: 1,
        ability: {
          id: 'test-blade-1',
          name: 'Test blade bonus',
          icon: 'dagger',
          tags: ['Blade'],
          text: '',
          stats: { armour: 7 },
          cooldown: 0.5,
          effects: [{ kind: 'heal', amount: 5 }],
          reactions: [
            {
              id: 'weapon-activation',
              event: 'activated',
              source: 'item',
              effects: [{ kind: 'heal', amount: 9 }],
            },
          ],
        },
      },
    ],
  };
  SET_DEFINITIONS.push(definition);
  try {
    const sim = inReach(),
      [weapon, bonus] = sim.player.abilities;
    sim.player.hp = 800;
    assert.equal(bonus.source.kind, 'set');
    assert.equal(sim.player.stats.armour, 7);
    assert.deepEqual(sim.select(sim.player, weapon), [weapon]);
    assert.deepEqual(sim.select(sim.player, weapon, { source: 'set' }), [bonus]);
    sim.activate(sim.player, weapon);
    sim.step();
    assert.equal(sim.player.hp, 809);
    bonus.remaining = 0;
    sim.step();
    assert.equal(sim.player.hp, 814);
    assert.equal(sim.suppressed, 0);
    const enemy = new Combat(human(), [patient()], 12);
    assert.ok(enemy.enemies[0].abilities.some((ability) => ability.source.kind === 'set'));
    assert.equal(enemy.enemies[0].stats.armour, 7);
  } finally {
    SET_DEFINITIONS.pop();
  }
});

test('temporary circulation modifiers survive recalculation and necrotic heart shutdown', () => {
  const build = patient();
  for (let i = 0; i < 8; i++)
    build.parts.push({ uid: `hand-${i}`, slot: 'hand', variant: 'living' });
  build.parts.push({ uid: 'necrotic-heart', slot: 'heart', variant: 'necrotic' });
  const sim = inReach(build),
    weapon = sim.player.abilities[0];
  sim.activate(sim.player, weapon, [], [{ kind: 'stat', stat: 'capacity', amount: 100 }]);
  sim.player.mana = 0;
  sim.step();
  assert.equal(sim.player.stats.capacity, 220);
  assert.equal(sim.player.stats.efficiency, stats(build, 0, { capacity: 100 }).efficiency);
  sim.step();
  assert.equal(sim.player.stats.capacity, 220);
});
