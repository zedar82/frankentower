import test from 'node:test';
import assert from 'node:assert/strict';
import { Combat, armMotion } from '../src/game/combat';
import { human } from '../src/game/anatomy';
import { ARM_STRIKE_TIME, ARM_RECOVERY_TIME } from '../src/game/attack-motion';

function fixture(...weapons: string[]) {
  const build = human('Timing patient');
  build.parts.filter(p => p.slot === 'hand').forEach((p, i) => {
    if (weapons[i]) p.item = { uid: `weapon-${i}`, defId: weapons[i], level: 1 };
  });
  const target = human('Practice dummy'); target.healthFactor = 100;
  const sim = new Combat(build, [target], 12);
  sim.player.stats.movementSpeed = sim.enemies[0].stats.movementSpeed = 0;
  sim.enemies[0].x = sim.player.x + 40; sim.enemies[0].y = sim.player.y;
  return sim;
}
const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} ≠ ${expected}`);
function until(sim: Combat, condition: () => boolean) {
  for (let i = 0; i < 2000 && !condition(); i++) sim.step(.01);
  assert.ok(condition(), 'condition reached');
}

test('each hand reveals its own cooldown without dealing damage during preparation', () => {
  const sim = fixture('dagger', 'club'), [dagger, club] = sim.player.items;
  for (let i = 0; i < 20; i++) sim.step(.01);
  const fast = armMotion(sim.player, dagger, sim.time), slow = armMotion(sim.player, club, sim.time);
  assert.ok(fast.drawback > slow.drawback); assert.ok(slow.drawback > 0);
  assert.equal(fast.strike, undefined); assert.equal(slow.strike, undefined);
  assert.equal(sim.enemies[0].hp, sim.enemies[0].stats.maxHp);
  until(sim, () => !!dagger.strike);
  assert.equal(club.strike, undefined); assert.equal(dagger.activations, 0);
  until(sim, () => dagger.activations === 1);
  assert.equal(club.activations, 0);
  near(armMotion(sim.player, dagger, sim.time).recovery!, 0);
});

test('daggers and clubs hit at contact with the same fixed forward-stroke duration', () => {
  for (const id of ['dagger', 'club']) for (const speed of [.5, 1, 2]) {
    const sim = fixture(id), node = sim.player.items[0]; sim.player.stats.speed = speed;
    until(sim, () => !!node.strike);
    const strike = { ...node.strike! }, hp = sim.enemies[0].hp;
    near(strike.impactAt - strike.startedAt, ARM_STRIKE_TIME);
    near(strike.impactAt, node.def.cooldown! / speed);
    while (sim.time + .01 < strike.impactAt - 1e-8) {
      sim.step(.01); assert.equal(sim.enemies[0].hp, hp); assert.equal(node.activations, 0);
    }
    until(sim, () => node.activations === 1);
    assert.ok(sim.enemies[0].hp < hp);
    const hit = sim.logs.find(e => e.kind === 'damage' && e.actor === 'player')!;
    near(hit.time, strike.impactAt); near(node.lastActivated, hit.time);
    near(armMotion(sim.player, node, sim.time).recovery!, 0);
    assert.equal(node.strike, undefined);
    near(node.remaining, node.def.cooldown!);
    while (sim.time < hit.time + ARM_RECOVERY_TIME + .01) sim.step(.01);
    assert.equal(armMotion(sim.player, node, sim.time).recovery, undefined);
  }
});

test('a speed change during the committed stroke does not stretch or accelerate it', () => {
  const sim = fixture('club'), node = sim.player.items[0];
  until(sim, () => !!node.strike);
  const contact = node.strike!.impactAt;
  sim.player.stats.speed = 4;
  until(sim, () => node.activations === 1);
  near(node.lastActivated, contact);
  until(sim, () => !!node.strike);
  near(node.strike!.impactAt - node.strike!.startedAt, ARM_STRIKE_TIME);
  near(node.strike!.impactAt - contact, node.def.cooldown! / 4);
});

test('direct triggers and zero-reaching cooldown reductions stay immediate and clear pending strokes', () => {
  for (const reduce of [false, true]) {
    const sim = fixture('maul'), node = sim.player.items[0];
    until(sim, () => !!node.strike);
    const before = sim.enemies[0].hp;
    if (reduce) {
      sim.activate(sim.player, node, [], [{ kind: 'cdr', amount: 1, select: { self: true } }], undefined, 'test-reduction');
      sim.step(.01);
    } else sim.activate(sim.player, node, ['trigger-root']);
    assert.equal(node.activations, reduce ? 2 : 1);
    assert.ok(sim.enemies[0].hp < before); assert.equal(node.strike, undefined);
    assert.ok(node.lastActivated < node.def.cooldown!);
    const hits = node.damage;
    for (let i = 0; i < 20; i++) sim.step(.01);
    assert.equal(node.damage, hits, 'the displaced scheduled strike must not resolve again');
  }
});

test('partial cooldown reduction advances a committed pose without losing the reduction', () => {
  const sim = fixture('club'), node = sim.player.items[0];
  until(sim, () => !!node.strike);
  const contact = node.strike!.impactAt, before = node.remaining;
  sim.activate(sim.player, node, [], [{ kind: 'cdr', amount: .02, select: { self: true } }], undefined, 'test-reduction');
  near(node.remaining, before - .02); near(node.strike!.impactAt, contact - .02);
  until(sim, () => node.damage > 0);
  near(node.lastActivated, contact - .02);
});

test('committed attacks recheck reach and dead attackers cannot land pending blows', () => {
  for (const escape of [false, true]) {
    const sim = fixture('club'), node = sim.player.items[0];
    until(sim, () => !!node.strike);
    const hp = sim.enemies[0].hp;
    if (escape) sim.enemies[0].x = 500; else sim.player.hp = 0;
    for (let i = 0; i < 20; i++) sim.step(.01);
    assert.equal(sim.enemies[0].hp, hp); assert.equal(node.activations, 0);
  }
});
