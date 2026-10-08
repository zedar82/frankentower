import test from 'node:test';
import assert from 'node:assert/strict';
import { Combat } from '../src/game/combat';
import { encounter } from '../src/game/run';
import { SHOWCASE,showcase } from './builds';
import { stats } from '../src/game/anatomy';
for(const name of Object.keys(SHOWCASE)){
  test(`${name} can defeat late-game compositions and the final guardian`,()=>{
    const build=showcase(name);
    for(const floor of [59,79,99,100]){
      const combat=new Combat(build,encounter(floor,7987,[]),1234);
      assert.equal(combat.runToEnd(),true,`${name}, floor ${floor}, ${Math.round(combat.player.damage)} damage, ${Math.round(combat.player.healing)} healing`);
      assert.equal(combat.failure,undefined);
    }
    assert.ok(stats(build).efficiency>.6);
  });
}
