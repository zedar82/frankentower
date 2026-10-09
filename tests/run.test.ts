import test from 'node:test';
import assert from 'node:assert/strict';
import { advance,buy,combine,defaultSave,encounter,equip,finishFight,newRun,operate,refreshShop,reroll,retire,startRun } from '../src/game/run';
import { RULESET, clone } from '../src/game/types';
import { count,equipped,stats } from '../src/game/anatomy';
import { Combat } from '../src/game/combat';

test('shops and encounter budgets are reproducible and build-agnostic',()=>{
  const a=newRun(5432),b=newRun(5432);assert.deepEqual(a,b);
  assert.equal(a.offers.length,4);startRun(a,'dagger');assert.equal(reroll(a),true);assert.equal(a.offers.length,4);
  for(const floor of [1,5,19,47,99])assert.deepEqual(encounter(floor,a.seed,[]),encounter(floor,b.seed,[]));
  for(let f=1;f<=100;f++){const enemies=encounter(f,a.seed,[]);assert.ok(enemies.length>=1 && enemies.length<=6);assert.ok(enemies.every(b=>stats(b).maxHp>0));}
});
test('enemy archetypes use distinct paper-puppet anatomy and materials',()=>{
  const found=new Map<string,ReturnType<typeof encounter>[number]>();
  for(let seed=0;seed<30;seed++)for(let floor=2;floor<=100;floor++)for(const build of encounter(floor,seed,[]))found.set(build.name,build);
  for(const name of ['Grave rat','Skeleton','Ogre','Grave mage','Bone archer','Iron knight','Golem'])assert.ok(found.has(name),`missing ${name}`);
  const rat=found.get('Grave rat')!;assert.equal(count(rat,'foot'),4);assert.ok(rat.parts.every(p=>p.variant==='rat'));
  const ogre=found.get('Ogre')!;assert.equal(count(ogre,'hand'),4);assert.equal(count(ogre,'head'),2);
  const golem=found.get('Golem')!;assert.equal(count(golem,'foot'),4);assert.ok(golem.parts.every(p=>p.variant==='clockwork'));
  assert.ok(found.get('Skeleton')!.parts.every(p=>p.variant==='bone'));
});
test('rat and bone donor grafts create reusable, equipable player anatomy',()=>{
  const r=newRun(554);startRun(r,'dagger');r.floor=20;r.gold=200;r.procedures=['ratgraft'];
  assert.equal(operate(r,'ratgraft'),true);
  assert.equal(r.build.parts.find(p=>p.slot==='chest')?.variant,'rat');
  assert.equal(r.build.parts.find(p=>p.slot==='head')?.variant,'rat');
  assert.equal(r.build.parts.filter(p=>p.slot==='foot'&&p.variant==='rat').length,2);
  const ratHand=r.build.parts.find(p=>p.slot==='hand'&&p.variant==='rat')!;
  r.stash.push({uid:'graft-knife',defId:'knife',level:1});assert.equal(equip(r,'graft-knife',ratHand.uid),true);assert.equal(ratHand.item?.defId,'knife');
  const b=newRun(555);startRun(b,'club');b.floor=20;b.gold=200;b.procedures=['bonegraft'];assert.equal(operate(b,'bonegraft'),true);
  assert.ok(b.build.parts.filter(p=>['chest','head','hand','foot'].includes(p.slot)).some(p=>p.variant==='bone'));
  const boneHand=b.build.parts.find(p=>p.slot==='hand'&&p.variant==='bone')!;
  b.stash.push({uid:'bone-knife',defId:'knife',level:1});assert.equal(equip(b,'bone-knife',boneHand.uid),true);
});
test('buying is atomic and compatible sockets enforce anatomy',()=>{
  const r=newRun(123);startRun(r,'dagger');r.gold=0;assert.equal(buy(r,0),false);assert.ok(r.offers[0]);
  r.gold=100;assert.equal(buy(r,0),true);const i=r.stash[0];
  const defSlot=(awaitImportSlot(i.defId));const wrongSlot=r.build.parts.find(p=>p.slot!==defSlot)!;
  assert.equal(equip(r,i.uid,wrongSlot.uid),false);assert.equal(r.stash.length,1);assert.equal(r.offers[0],null);
});
import { ITEM_MAP } from '../src/game/content';
function awaitImportSlot(id:string){return ITEM_MAP[id].slot;}
test('duplicate combining consumes only one matching instance',()=>{
  const r=newRun(1);startRun(r,'dagger');r.stash.push({uid:'copy',defId:'dagger',level:1},{uid:'other',defId:'club',level:1});
  const target=equipped(r.build)[0].item;assert.equal(combine(r,target.uid),true);assert.equal(target.level,2);assert.equal(r.stash.length,1);assert.equal(combine(r,target.uid),false);
  r.stash.push({uid:'copy2',defId:'dagger',level:2});assert.equal(combine(r,target.uid),true);assert.equal(target.level,3);assert.equal(combine(r,target.uid),false);
});
test('surgery adds real sockets and soft overload, removal preserves equipment',()=>{
  const r=newRun(4);startRun(r,'dagger');r.floor=5;r.gold=100;r.procedures=['arm','amputate'];
  assert.equal(operate(r,'arm'),true);assert.equal(count(r.build,'hand'),3);assert.ok(stats(r.build).efficiency<1);assert.equal(operate(r,'arm'),false);
  r.operated=false;r.build.parts.filter(p=>p.slot==='hand').forEach((p,i)=>p.item={uid:'knife'+i,defId:'knife',level:1});
  assert.equal(operate(r,'amputate'),true);assert.equal(count(r.build,'hand'),2);assert.equal(r.stash.length,1);
});
test('headless conversion requires an alternative controller',()=>{
  const r=newRun(42);startRun(r,'dagger');r.floor=30;r.gold=100;r.procedures=['ganglion'];assert.equal(operate(r,'ganglion'),true);assert.equal(count(r.build,'head'),0);assert.ok(r.build.parts.some(p=>p.variant==='ganglion'));
});
test('retirement stores a deep snapshot and becomes the next checkpoint opponent',()=>{
  const save=defaultSave(),r=newRun(4);startRun(r,'knife');r.floor=20;r.phase='checkpoint';save.run=r;
  assert.equal(retire(save,r),true);const boss=encounter(20,89,save.legacy)[0];assert.deepEqual(boss,r.build);r.build.name='Changed';assert.notEqual(save.legacy[0].build.name,r.build.name);
  const player=clone(boss);const sim=new Combat(player,[boss],123);assert.equal(stats(player).maxHp,sim.enemies[0].hp);
});
test('successful floors award gold, recover health, and stop at checkpoints',()=>{
  const save=defaultSave(),r=newRun(4);startRun(r,'dagger');r.phase='combat';r.floor=20;
  finishFight(r,30,true,save);assert.equal(r.phase,'checkpoint');assert.equal(r.hp,55);assert.equal(save.best,20);assert.equal(advance(r),true);assert.equal(r.floor,21);
  r.floor=100;r.phase='combat';finishFight(r,30,true,save);assert.equal(r.phase,'complete');assert.equal(save.completed,true);assert.equal(save.legacy[0].checkpoint,100);assert.equal(save.legacy[0].ruleset,RULESET);
});
test('defeat preserves the final build for inspection',()=>{
  const save=defaultSave(),r=newRun(7);startRun(r,'club');r.phase='combat';finishFight(r,0,false,save);assert.equal(r.phase,'dead');assert.equal(save.records.length,1);assert.equal(save.records[0].build.name,r.build.name);
});
