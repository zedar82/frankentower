import { human } from '../src/game/anatomy';
import { ITEM_MAP } from '../src/game/content';
import type { Build } from '../src/game/types';
export const SHOWCASE: Record<string,[string,number][]> = {
  'Blood machine':[['knife',3],['dagger',3],['bloodletter',2],['cleaver',2],['redhat',2],['artery',1],['donor',1],['bloodboots',2],['bloodrunner',2],['bloodboots',1],['rabbit',1],['heart',2],['vampire',2],['bloodengine',1]],
  'Mana machine':[['bonewand',3],['stormwand',2],['necrowand',1],['bonewand',2],['conductor',2],['brain',1],['hydra',1],['apocalypse',1],['golemplate',2],['runners',3],['rabbit',2],['wizardheart',2],['pump',1],['ouroboros',1],['heart',2]],
  'Shield machine':[['maul',3],['parry',2],['saint',2],['club',3],['ram',2],['horns',3],['donor',2],['spurs',2],['ironboots',3],['rabbit',1],['ironboots',2],['pump',1],['warheart',1],['heart',2]],
  'Poison machine':[['necrowand',1],['bonewand',2],['viper',2],['hydra',1],['horns',3],['donor',1],['plague',3],['venomboots',3],['venomboots',2],['plague',1],['rabbit',1],['dance',1],['wizardheart',2],['pump',1],['heart',2]],
};
export function showcase(name:string):Build{
  const b=human(name);
  SHOWCASE[name].forEach(([id,level],i)=>{
    const slot=ITEM_MAP[id].slot;
    let part=b.parts.find(p=>p.slot===slot&&!p.item);
    if(!part){part={uid:`graft-${i}`,slot,variant:'living'};b.parts.push(part);}
    part.item={uid:`item-${i}`,defId:id,level};
  });
  return b;
}
