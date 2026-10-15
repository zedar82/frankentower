import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSave, finishFight, newRun, startRun } from '../src/game/run';
import { encounter } from '../src/game/encounters';
import { human } from '../src/game/anatomy';
import { Combat } from '../src/game/combat';
import { parseSave, InvalidSaveError } from '../src/save-validation';
import { RULESET } from '../src/game/types';

function fixture() {
  const s = defaultSave();
  s.run = newRun(8675309);
  startRun(s.run, 'knife');
  return s;
}
test('valid current saves retain builds, inventory, settings and saved enemy compositions', () => {
  for (let floor = 1; floor <= 100; floor++) {
    const s = fixture();
    s.run!.floor = floor;
    s.run!.lastEnemies = encounter(floor, s.run!.seed, []);
    assert.deepEqual(parseSave(JSON.stringify(s)), s);
  }
});
test('completed fight reports survive save reload without using a fresh preview', () => {
  const s = fixture(),
    run = s.run!;
  const sim = new Combat(run.build, [human('Test enemy')], 1234, run.hp);
  sim.player.hp = 0;
  sim.step();
  run.phase = 'dead';
  run.hp = 0;
  run.lastReport = sim.completedReport(run.floor, 1234);
  const restored = parseSave(JSON.stringify(s));
  assert.deepEqual(restored.run!.lastReport, run.lastReport);
  assert.equal(restored.run!.lastReport!.outcome, 'defeat');
  assert.equal(restored.run!.lastReport!.patient.hp, 0);
});
test('completed reports round trip when the encounter seed expression is signed', () => {
  for (const seed of [0x80000000, 0xffffffff]) {
    const save = defaultSave();
    const run = (save.run = newRun(seed));
    startRun(run, 'knife');
    const fightSeed = run.seed ^ (run.floor * 15485863);
    assert.ok(fightSeed < 0);
    const combat = new Combat(run.build, encounter(run.floor, run.seed, []), fightSeed, run.hp);
    run.phase = 'combat';
    combat.runToEnd();
    run.lastReport = combat.completedReport(run.floor, fightSeed);
    finishFight(run, combat.player.hp, combat.won, save);
    assert.equal(run.lastReport.seed, fightSeed >>> 0);
    const serialized = JSON.stringify(save);
    assert.deepEqual(parseSave(serialized), JSON.parse(serialized));
  }
});
test('missing and incompatible saves reset without migration; interrupted combat returns to build', () => {
  assert.deepEqual(parseSave(null), defaultSave());
  assert.deepEqual(parseSave(JSON.stringify({ version: 'old' })), defaultSave());
  const s = fixture();
  s.run!.phase = 'combat';
  s.run!.hp = 701;
  const restored = parseSave(JSON.stringify(s));
  assert.equal(restored.run!.phase, 'build');
  assert.equal(restored.run!.hp, 701);
  assert.equal(restored.run!.seed, s.run!.seed);
});
test('corrupt nested saves fail before reaching gameplay, including unowned inventory and duplicate identities', () => {
  const mutations: ((s: any) => void)[] = [
    (s) => {
      delete s.run;
    },
    (s) => {
      s.settings.speed = 0;
    },
    (s) => {
      s.settings.sound = 'yes';
    },
    (s) => {
      s.run.floor = 101;
    },
    (s) => {
      s.run.hp = -1;
    },
    (s) => {
      s.run.hp = 1e200;
    },
    (s) => {
      s.run.gold = 1.5;
    },
    (s) => {
      s.run.rng = -2;
    },
    (s) => {
      s.run.serial = 10;
    },
    (s) => {
      s.run.phase = 'unknown';
    },
    (s) => {
      s.run.build.parts[0].slot = '__proto__';
    },
    (s) => {
      s.run.build.parts[0].variant = 'toString';
    },
    (s) => {
      s.run.build.parts[0].item = s.run.build.parts[2].item;
    },
    (s) => {
      s.run.build.parts[1].uid = s.run.build.parts[0].uid;
    },
    (s) => {
      s.run.stash = [{ uid: 'x', defId: 'missing', level: 1 }];
    },
    (s) => {
      s.run.stash = [{ uid: 'x', defId: 'knife', level: 0 }];
    },
    (s) => {
      s.run.stash = [{ uid: 'x', defId: '__proto__', level: 1 }];
    },
    (s) => {
      s.run.stash = [s.run.build.parts[2].item];
    },
    (s) => {
      s.run.offers[0].defId = 'missing';
    },
    (s) => {
      s.run.offers = [];
    },
    (s) => {
      s.run.procedures = ['missing'];
    },
    (s) => {
      s.run.build.powerFactor = -1;
    },
    (s) => {
      s.run.lastEnemies = [null];
    },
    (s) => {
      s.run.lastEnemies = encounter(2, s.run.seed, []);
      s.run.lastEnemies[0].enemyProfileId = 'removed-enemy-profile';
    },
    (s) => {
      s.records = [{ build: null }];
    },
    (s) => {
      s.legacy = [{ checkpoint: 21, ruleset: RULESET }];
    },
    (s) => {
      s.best = null;
    },
  ];
  for (const mutate of mutations) {
    const s = fixture();
    mutate(s);
    assert.throws(() => parseSave(JSON.stringify(s)), InvalidSaveError, mutate.toString());
  }
  for (const raw of ['', 'null', '[]', '{', '1', '{}'])
    assert.throws(() => parseSave(raw), InvalidSaveError);
});
test('legacy and final-build records are independently validated and round trip', () => {
  const s = fixture();
  s.legacy = [
    {
      checkpoint: 20,
      ruleset: RULESET,
      retiredAt: new Date().toISOString(),
      build: structuredClone(s.run!.build),
    },
  ];
  s.records = [
    { name: 'Agnes', floor: 20, reason: 'Retired', build: structuredClone(s.run!.build) },
  ];
  assert.deepEqual(parseSave(JSON.stringify(s)), s);
  s.legacy.push(structuredClone(s.legacy[0]));
  assert.throws(() => parseSave(JSON.stringify(s)), InvalidSaveError);
});
