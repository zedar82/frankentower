import test from 'node:test';
import assert from 'node:assert/strict';
import { ARENA, Combat, attackRange, distance } from '../src/game/combat';
import { human, stats } from '../src/game/anatomy';
function armed(id:string,feet=2){const b=human(id);b.parts=b.parts.filter(p=>p.slot!=='foot');for(let i=0;i<feet;i++)b.parts.push({uid:`foot-${i}`,slot:'foot',variant:'living'});b.parts.find(p=>p.slot==='hand')!.item={uid:'weapon',defId:id,level:1};return b;}
test('melee closes distance and holds ready attacks until the target is in reach',()=>{
  const sim=new Combat(armed('dagger'),[armed('skeletonblade')],1),node=sim.player.items[0];
  sim.activate(sim.player,node,['trigger']);assert.equal(node.activations,0);assert.equal(sim.enemies[0].hp,100);
  const initial=distance(sim.player,sim.enemies[0]);for(let i=0;i<12;i++)sim.step();
  assert.equal(node.activations,0);assert.equal(node.remaining,0);assert.ok(distance(sim.player,sim.enemies[0])<initial);
  while(!node.activations&&sim.time<8)sim.step();
  assert.ok(node.activations>0);const first=sim.logs.find(l=>l.kind==='damage'&&l.actor==='player')!;
  assert.ok(Math.hypot(first.x-first.tx!,first.y-first.ty!)<=attackRange(sim.player,sim.enemies[0],node.def)+.001);
});
test('anatomical movement is observable: one leg limps and eight legs scuttle',()=>{
  const speeds=[1,2,4,8].map(feet=>stats(armed('dagger',feet)).movementSpeed);
  assert.ok(speeds.every((s,i)=>i===0||s>speeds[i-1]));
  const travelled=[1,2,8].map(feet=>{const sim=new Combat(armed('dagger',feet),[armed('skeletonblade')],2);for(let i=0;i<10;i++)sim.step();return sim.player.walked;});
  assert.ok(travelled[0]<travelled[1]&&travelled[1]<travelled[2]);
});
test('fighters acquire the nearest living opponent and retarget after a death',()=>{
  const sim=new Combat(armed('dagger'),[armed('skeletonblade'),armed('skeletonblade')],3);
  sim.enemies[0].x=500;sim.enemies[1].x=sim.player.x+40;sim.enemies[1].y=sim.player.y;
  assert.equal(sim.target(sim.player),sim.enemies[1]);sim.enemies[1].hp=0;assert.equal(sim.target(sim.player),sim.enemies[0]);
});
test('heavy weapons anticipate an in-range blow and short blades do not',()=>{
  for(const [id,expected] of [['maul',true],['dagger',false]] as const){const sim=new Combat(armed(id),[armed('skeletonblade')],4);sim.enemies[0].x=sim.player.x+40;sim.enemies[0].y=sim.player.y;sim.player.items[0].remaining=.2;sim.step();assert.equal(sim.player.windup>0,expected);}
});
test('ranged fighters keep distance but cannot strike across the whole room',()=>{
  const sim=new Combat(armed('crossbow'),[armed('skeletonblade')],5),node=sim.player.items[0];
  sim.activate(sim.player,node);assert.equal(node.activations,0);
  sim.enemies[0].x=sim.player.x+140;sim.enemies[0].y=sim.player.y;
  sim.activate(sim.player,node);assert.equal(node.activations,1);assert.ok(sim.enemies[0].hp<100);
  sim.enemies[0].x=sim.player.x+35;const before=sim.player.x;sim.step();assert.ok(sim.player.x<before);
});
test('living fighters remain inside the circular arena under crowd pressure',()=>{
  const sim=new Combat(armed('dagger',8),Array.from({length:6},()=>armed('skeletonblade',4)),6);
  sim.actors.forEach(a=>{a.hp=10000;a.stats.maxHp=10000;});
  for(let i=0;i<300;i++){sim.step();for(const a of sim.actors.filter(a=>a.hp>0))assert.ok(Math.hypot((a.x-ARENA.cx)/(ARENA.rx-a.radius),(a.y-ARENA.cy)/(ARENA.ry-a.radius))<=1.00001);}
});
test('each starter survives the spatial reference encounter from opposite entrances',()=>{
  for(const id of ['dagger','club','knife']){const sim=new Combat(armed(id),[armed('skeletonblade')],1234);assert.ok(sim.runToEnd(),id);assert.ok(sim.player.walked>60);}
});
