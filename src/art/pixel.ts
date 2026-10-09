import { count } from '../game/anatomy';
import { ITEM_MAP } from '../game/content';
import type { Build } from '../game/types';
import torsoUrl from './assets/torso.webp';
import headUrl from './assets/head.webp';
import armUrl from './assets/arm.webp';
import legUrl from './assets/leg.webp';

export type Pen = CanvasRenderingContext2D;
const ink = '#15131a';
export function rect(c: Pen, x: number, y: number, w: number, h: number, colour: string) { c.fillStyle = colour; c.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); }
export function oval(c: Pen, x: number, y: number, rx: number, ry: number, colour: string, step = 2) {
  for (let dy = -ry; dy < ry; dy += step) { const width = Math.sqrt(Math.max(0, 1 - ((dy + step / 2) / ry) ** 2)) * rx; rect(c, x - width, y + dy, width * 2, step, colour); }
}
function block(c: Pen, x: number, y: number, w: number, h: number, fill: string, light?: string) { rect(c,x-1,y-1,w+2,h+2,ink);rect(c,x,y,w,h,fill);if(light)rect(c,x,y,w,2,light); }
export function pixelItem(c: Pen, name: string, x = 0, y = 0, size = 32, variant = '') {
  c.save(); c.translate(Math.round(x),Math.round(y)); c.scale(size/32,size/32);
  const steel='#b5bec0', shine='#e3ddbc', wood='#885b3a', dark='#51474b', gold='#cba65d';
  const tint=variant.includes('blood')||variant.includes('vamp')?'#b64a50':variant.includes('necro')||variant.includes('plague')||variant.includes('venom')?'#95b865':variant.includes('storm')||variant.includes('wizard')?'#8d96d9':gold;
  switch(name){
    case 'dagger': case 'knife':
      block(c,13,22,5,9,wood,gold);block(c,8,20,16,3,gold,shine);block(c,name==='knife'?12:14,3,name==='knife'?12:5,17,steel,shine);rect(c,name==='knife'?12:14,2,3,16,shine);rect(c,17,17,4,3,'#813f42');break;
    case 'club':
      block(c,14,12,4,19,wood,gold);block(c,5,3,23,12,dark,steel);rect(c,6,5,5,9,steel);rect(c,23,5,4,9,'#76777b');rect(c,11,4,10,3,'#929b9d');rect(c,14,25,4,2,shine);break;
    case 'wand':
      block(c,14,10,4,21,wood,shine);rect(c,10,9,12,3,shine);block(c,10,2,12,9,tint,shine);rect(c,13,0,6,3,tint);rect(c,14,4,4,5,'#e0efd0');break;
    case 'shield':
      block(c,5,3,22,18,dark,gold);block(c,8,20,16,5,dark);block(c,12,25,8,4,dark);rect(c,7,5,18,3,wood);rect(c,15,5,3,20,steel);rect(c,7,12,18,3,steel);block(c,12,10,8,7,gold,shine);break;
    case 'bow':
      block(c,14,2,4,28,wood,gold);rect(c,8,4,5,3,wood);rect(c,5,7,4,18,wood);rect(c,8,25,5,3,wood);rect(c,27,5,1,23,steel);rect(c,18,2,10,2,gold);rect(c,18,28,10,2,gold);rect(c,3,15,25,2,shine);break;
    case 'helmet':
      block(c,8,8,17,14,dark,steel);rect(c,5,20,23,5,steel);rect(c,13,12,3,4,ink);rect(c,20,12,3,4,ink);rect(c,17,8,2,15,gold);rect(c,4,3,4,11,shine);rect(c,1,1,3,6,shine);rect(c,25,3,4,11,shine);rect(c,29,1,3,6,shine);break;
    case 'hood':
      block(c,9,6,14,21,'#654d69','#9b7b8d');rect(c,13,1,7,6,'#654d69');rect(c,5,24,23,5,'#654d69');rect(c,11,12,10,12,ink);rect(c,12,16,3,2,tint);rect(c,18,16,3,2,tint);break;
    case 'armour': case 'chest':
      block(c,7,7,18,21,dark,steel);block(c,2,4,8,10,steel,shine);block(c,23,4,8,10,steel,shine);rect(c,15,7,3,20,gold);rect(c,9,15,14,2,steel);rect(c,9,22,14,2,steel);break;
    case 'shoe': case 'foot':
      block(c,9,3,12,19,wood,gold);block(c,6,20,23,8,wood,gold);rect(c,6,27,24,3,dark);rect(c,10,8,10,2,tint);rect(c,10,13,10,2,tint);rect(c,24,22,5,5,steel);break;
    case 'heart':
      block(c,5,8,10,12,'#a54350','#d77469');block(c,17,8,10,12,'#a54350','#d77469');rect(c,8,17,17,7,'#a54350');rect(c,12,24,9,4,'#a54350');rect(c,15,28,4,3,'#a54350');rect(c,16,3,4,9,'#793846');rect(c,20,2,6,3,'#b46263');rect(c,8,10,4,5,'#e19581');break;
    case 'dice':
      block(c,5,5,23,23,'#c3b99c','#f0dfb4');for(const [a,b] of [[10,10],[21,10],[15,16],[10,22],[21,22]])rect(c,a,b,3,3,'#61464f');break;
    case 'hand':
      block(c,10,13,14,14,'#95a77a','#c2c095');for(let i=0;i<4;i++)block(c,10+i*4,3+i%2*2,3,14,'#95a77a');block(c,4,14,6,10,'#95a77a');break;
    case 'head':
      block(c,8,4,17,22,'#95a77a','#c2c095');rect(c,11,13,4,3,ink);rect(c,20,13,3,3,ink);rect(c,14,22,7,2,ink);rect(c,12,27,9,4,'#718061');break;
    case 'gold':
      block(c,7,7,19,19,'#b78138','#e7c576');rect(c,4,11,3,11,gold);rect(c,26,11,3,11,gold);rect(c,14,11,5,12,'#f3dc97');break;
    case 'stairs':
      for(let i=0;i<4;i++)block(c,3+i*7,25-i*7,7,6,'#868082','#c3b59b');break;
    case 'surgery':
      rect(c,14,3,5,27,steel);rect(c,3,14,27,5,steel);rect(c,14,3,5,5,shine);break;
    default: pixelItem(c,'heart');
  }
  c.restore();
}
export interface Pose { time?: number; walk?: number; moving?: boolean; facing?: number; windup?: number; windupItem?: string; activeItems?: string[]; attacking?: boolean; swing?: number; hurt?: boolean; dead?: number; enemy?: boolean }
const puppetImages = Object.fromEntries(Object.entries({ torso: torsoUrl, head: headUrl, arm: armUrl, leg: legUrl }).map(([name, src]) => {
  const img = new Image(); img.src = src; return [name, img];
})) as Record<'torso'|'head'|'arm'|'leg', HTMLImageElement>;
export const puppetReady = Promise.all(Object.values(puppetImages).map(img => img.decode().catch(() => undefined)));
export function puppetHeight(build:Build) {
  const hands=count(build,'hand'),heads=count(build,'head'),feet=count(build,'foot'),growth=Math.max(0,build.parts.length-7);
  const torsoH=65+Math.min(24,heads*3.5+hands*1.3+feet*1.25+growth*.55);
  const headH=Math.min(53,42+heads*1.5), extraHeadRows=Math.max(0,Math.floor((heads-1)/3))*12;
  return 49+torsoH*.5+19+headH*.5+extraHeadRows+20;
}
function puppetPart(c:Pen, img:HTMLImageElement, x:number, y:number, w:number, h:number) {
  c.drawImage(img, x-w/2, y-h/2, w, h);
}
function puppetMonster(c:Pen, build:Build, x:number, y:number, scale:number, pose:Pose) {
  if (!Object.values(puppetImages).every(img=>img.complete&&img.naturalWidth)) return false;
  const hands=build.parts.filter(p=>p.slot==='hand'), heads=build.parts.filter(p=>p.slot==='head'), feet=build.parts.filter(p=>p.slot==='foot');
  const hearts=count(build,'heart'), chest=build.parts.find(p=>p.slot==='chest'&&p.item);
  c.save(); c.imageSmoothingEnabled=true; c.translate(Math.round(x),Math.round(y)); c.scale(scale,scale);
  if(pose.dead!==undefined){const p=Math.min(1,pose.dead/.38);c.globalAlpha=.65;c.translate(0,4);c.scale(1,Math.max(.24,1-p));}
  const bob=pose.moving?Math.sin((pose.walk??0)*.2)*2:Math.sin((pose.time??0)*2)*.6;
  oval(c,0,0,24+Math.min(12,feet.length),5,'#0c0c11'); c.translate(pose.hurt?-2:0,-bob);
  const growth=Math.max(0,build.parts.length-7);
  const torsoW=56+Math.min(34,hands.length*2.5+feet.length*1.25+growth*.55);
  const torsoH=65+Math.min(24,heads.length*3.5+hands.length*1.3+feet.length*1.25+growth*.55);
  const torsoY=-49;
  // Legs fan out below the torso. Each ankle and boot remains visible in the frontal pose.
  feet.forEach((p,i)=>{
    const f=(i-(feet.length-1)/2)/Math.max(1,feet.length-1);
    const stride=pose.moving?Math.sin((pose.walk??0)*.22+i*Math.PI)*3:0;
    const lx=f*Math.min(34,8+feet.length*3)+stride;
    puppetPart(c,puppetImages.leg,lx,-16+stride,25,42);
    if(p.item)pixelItem(c,ITEM_MAP[p.item.defId].icon,lx+5,8+stride,19,p.item.defId);
  });
  // Extra arms grow in rows down the torso, with all of them kept in view.
  const drawArm=(i:number)=>{
    const p=hands[i]; if(!p)return;
    const side=i%2===0?-1:1, tier=Math.floor(i/2), rows=Math.max(1,Math.ceil(hands.length/2));
    const ay=torsoY-torsoH*.31+Math.min(torsoH*.7,tier*Math.min(17,torsoH*.58/Math.max(1,rows-1)));
    const ax=side*(torsoW*.37);
    const neutral=-side*.76;
    const active=!!p.item&&(pose.activeItems?.includes(p.item.uid)||pose.attacking&&!pose.activeItems);
    let angle=neutral;
    if(p.item&&pose.windupItem===p.item.uid)angle+=-side*Math.min(1,pose.windup??0)*.9;
    if(active){const t=Math.max(0,Math.min(1,pose.swing??.5));const eased=t*t*(3-2*t);angle=neutral+(-((pose.facing??1)*1.85)-neutral)*eased;}
    c.save(); c.translate(ax,ay); c.rotate(angle);
    puppetPart(c,puppetImages.arm,0,26,24,58);
    if(p.item){const def=ITEM_MAP[p.item.defId];const size=def.id==='enormous'?34:def.icon==='club'?27:23;c.save();c.translate(-4,49);pixelItem(c,def.icon,0,0,size,p.item.defId);c.restore();}
    c.restore();
  };
  puppetPart(c,puppetImages.torso,0,torsoY,torsoW,torsoH);
  if(chest?.item)pixelItem(c,ITEM_MAP[chest.item.defId].icon,0,torsoY-5,27,chest.item.defId);
  for(let i=0;i<Math.min(hearts,5);i++)pixelItem(c,'heart',-10+(i%3)*10,torsoY+3+Math.floor(i/3)*10,12);
  if(!heads.length){pixelItem(c,'head',-5,-torsoH-32,17);}
  heads.forEach((p,i)=>{
    const spread=(i-(heads.length-1)/2)*Math.min(31,60/Math.max(1,heads.length-1));
    const hw=Math.min(53,42+heads.length*1.5), hh=hw;
    const hy=torsoY-torsoH*.5-19-(Math.floor(i/3)*12);
    puppetPart(c,puppetImages.head,spread,hy,hw,hh);
    if(p.item)pixelItem(c,ITEM_MAP[p.item.defId].icon,spread,hy-hh*.34,23,p.item.defId);
  });
  hands.forEach((_,i)=>drawArm(i));
  if(pose.hurt){c.globalAlpha=.12;rect(c,-torsoW/2,-torsoH-70,torsoW,torsoH+90,'#fff0c4');}
  c.restore(); return true;
}
export function monster(c: Pen, build: Build, x: number, y: number, scale=1, pose: Pose={}) {
  if(puppetMonster(c,build,x,y,scale,pose))return;
  const hands=build.parts.filter(p=>p.slot==='hand'),heads=build.parts.filter(p=>p.slot==='head'),feet=build.parts.filter(p=>p.slot==='foot');
  const undead=/Skeleton|Bone|Grave|Lich/i.test(build.name), rat=/Rat/i.test(build.name), ogre=/Ogre|Brute/i.test(build.name), ghost=/Wraith/i.test(build.name);
  const flesh=pose.enemy?(undead?'#c3b994':ghost?'#9e9fbb':ogre?'#b28469':'#a79772'):'#91a574', lit=pose.enemy?(undead?'#ece0b9':'#c1ad84'):'#bfd09a', shade=pose.enemy?'#72634f':'#596d52';
  c.save();c.translate(Math.round(x),Math.round(y));c.scale(scale*(pose.facing??1),scale);
  if(pose.dead!==undefined){const p=Math.min(1,pose.dead/.38);c.globalAlpha=.65;c.translate(0,4);c.scale(1,Math.max(.24,1-p));}
  const bob=pose.moving?Math.round(Math.sin((pose.walk??0)*.2)*2):Math.round(Math.sin((pose.time??0)*2)*.6);
  oval(c,0,0,24+Math.min(12,feet.length),5,'#0c0c11');
  c.translate(pose.hurt?-2:0,-bob);
  if(rat){
    rect(c,-35,-7,22,3,'#927379');block(c,-23,-22,35,20,shade,flesh);block(c,9,-21,19,15,flesh,lit);rect(c,23,-14,8,6,'#c18d86');rect(c,14,-27,7,9,'#927379');rect(c,20,-20,3,3,'#da6452');for(let i=0;i<4;i++)rect(c,-20+i*12,-4+(pose.moving?Math.sin((pose.walk??0)*.3+i)*2:0),5,6,lit);c.restore();return;
  }
  const wide=feet.length>=4||build.parts.length>=15?7:0;
  if(!feet.length){oval(c,0,-7,24,10,shade);oval(c,0,-10,21,9,flesh);}
  feet.forEach((p,i)=>{
    const fx=(i-(feet.length-1)/2)*Math.min(12,64/Math.max(1,feet.length));
    const stride=pose.moving?Math.round(Math.sin((pose.walk??0)*.22+i*Math.PI)*4):0;
    block(c,fx-3,-20,7,17,shade,flesh);rect(c,fx-4,-12,9,3,lit);
    block(c,fx-3+stride,-7,10,7,p.item?'#735647':flesh,p.item?'#b29a70':lit);
    if(p.item){rect(c,fx-3+stride,-4,12,3,'#b1afa0');rect(c,fx-2+stride,-7,7,2,ITEM_MAP[p.item.defId].tags.includes('Poison')?'#9ea952':'#b39165');}
  });
  hands.forEach((p,i)=>{
    const side=i%2===0?-1:1,tier=Math.floor(i/2), ax=side*(23+tier*8+wide), ay=-32-tier*11;
    const acting=p.item&&(pose.activeItems?.includes(p.item.uid)||pose.attacking&&!pose.activeItems);
    const attacking=acting?14:0, lift=p.item&&(!pose.windupItem||pose.windupItem===p.item.uid)?Math.round((pose.windup??0)*19):0;
    block(c,side<0?ax:-2,-44-tier*4,Math.abs(ax)+2,7,p.variant==='clockwork'?'#93816a':shade,flesh);
    block(c,ax-3+attacking,ay-7-lift,8,13,p.variant==='clockwork'?'#a6a39a':flesh,lit);
    rect(c,ax-4+attacking,ay+2-lift,10,6,flesh);rect(c,ax-1+attacking,ay-4-lift,2,7,ink);
    if(p.item){const def=ITEM_MAP[p.item.defId];const size=def.id==='enormous'?42:def.icon==='club'?30:24;c.save();c.translate(ax-12+attacking,ay-size+7-lift);if(side<0&&def.icon!=='shield')c.translate(0,4);pixelItem(c,def.icon,0,0,size,def.id);c.restore();}
  });
  block(c,-13-wide,-48,26+wide*2,29,flesh,lit);rect(c,-13-wide,-21,26+wide*2,7,'#54463e');rect(c,-10-wide,-18,8+wide,5,'#6c6250');rect(c,4,-18,8+wide,5,'#6c6250');
  if(undead){for(let i=0;i<4;i++)rect(c,-10,-43+i*5,20,2,shade);rect(c,-1,-44,3,26,lit);}else{rect(c,-1,-46,2,25,shade);for(let i=0;i<4;i++)rect(c,-3,-42+i*6,6,1,ink);}
  const chest=build.parts.find(p=>p.slot==='chest'&&p.item);if(chest?.item)pixelItem(c,ITEM_MAP[chest.item.defId].icon,-18,-52,36,chest.item.defId);
  for(let i=0;i<Math.min(5,count(build,'heart'));i++){rect(c,-8+i%3*6,-32+Math.floor(i/3)*6,4,4,'#b45c5e');rect(c,-8+i%3*6,-32+Math.floor(i/3)*6,2,2,'#e7987a');}
  if(!heads.length){rect(c,-6,-53,12,5,'#805453');rect(c,-2,-56,4,5,'#c9bea0');}
  heads.forEach((p,i)=>{
    const hx=(i-(heads.length-1)/2)*Math.min(19,74/heads.length), hy=-61-Math.round((1-Math.abs(i-(heads.length-1)/2)/Math.max(1,heads.length))*4);
    block(c,hx-4,-53,8,10,shade,flesh);
    block(c,hx-9,hy-8,p.variant==='serpent'?23:18,21,flesh,lit);
    rect(c,hx-10,hy-8,20,4,undead?lit:'#41483d');rect(c,hx-12,hy+2,3,5,'#a4a79b');rect(c,hx+9,hy+2,3,5,'#a4a79b');
    rect(c,hx-5,hy+2,4,3,ink);rect(c,hx+4,hy+2,4,3,ink);rect(c,hx+(pose.facing===-1?-5:6),hy+2,2,2,pose.enemy?'#ee9965':'#d6cf82');
    rect(c,hx-3,hy+10,8,2,ink);rect(c,hx-5,hy-3,12,1,shade);rect(c,hx-1,hy-5,1,5,ink);
    if(p.item)pixelItem(c,ITEM_MAP[p.item.defId].icon,hx-14,hy-24,28,p.item.defId);
  });
  if(pose.hurt){c.globalAlpha=.15;rect(c,-20-wide,-72,40+wide*2,65,'#fff0c4');}
  c.restore();
}
export function torch(c: Pen,x:number,y:number,time:number){
  c.save();c.globalAlpha=.055;oval(c,x,y+10,55,40,'#e99843',4);oval(c,x,y+10,36,27,'#ffc568',4);c.restore();
  block(c,x-3,y,6,17,'#63504a','#ae8059');rect(c,x-6,y-4,12,6,'#8e6c46');
  const flicker=Math.floor(time*8+x)%3;rect(c,x-5,y-13-flicker,10,11+flicker,'#c36b3e');rect(c,x-3,y-18+flicker,7,16-flicker,'#e6a14c');rect(c,x-1,y-12,4,10,'#ffe5a0');
}
export function room(c:Pen,floor=1){
  rect(c,0,0,640,400,'#100f16');oval(c,320,215,308,183,'#24232c',8);oval(c,320,220,294,170,'#34313b',8);
  // Uneven masonry wraps a single reusable circular chamber.
  for(let row=0;row<9;row++)for(let col=0;col<17;col++){
    const x=col*40+(row%2)*20-20,y=40+row*29,n=(row*37+col*13+floor)%7;
    if(Math.hypot((x+20-320)/301,(y-218)/179)>1)continue;
    block(c,x+1,y+1,37,25,['#35333b','#3b3741','#302e37','#413b43','#38343e','#343039','#3d3941'][n],n%2?'#514953':'#47424b');rect(c,x+4,y+21,31,3,'#24232b');
  }
  oval(c,320,250,290,140,'#17171e',4);oval(c,320,246,278,132,'#353038',4);
  c.save();c.beginPath();c.ellipse(320,246,278,132,0,0,Math.PI*2);c.clip();
  for(let row=0;row<20;row++)for(let col=0;col<24;col++){
    const x=col*32+(row%2)*16-32,y=105+row*17,n=(col*71+row*17+floor*3)%11;
    rect(c,x+1,y+1,30,15,n<3?'#3c363d':n<7?'#37323a':'#322e35');rect(c,x+2,y+1,28,1,'#49404a');if(n===2){rect(c,x+9,y+7,7,1,'#24232a');rect(c,x+15,y+8,1,4,'#24232a');}
  }
  // Worn summoning circle is floor decoration, not a gameplay obstacle.
  for(let i=0;i<64;i++){const a=i*Math.PI/32;rect(c,320+Math.cos(a)*82,247+Math.sin(a)*42,3,2,'#615154');}
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;rect(c,317+Math.cos(a)*92,245+Math.sin(a)*47,6,3,'#7c6559');}
  c.restore();
  // Stairway, arch and warm light in the next room.
  block(c,278,24,85,81,'#19171f','#6b5861');block(c,287,25,67,68,'#080c13');rect(c,292,20,57,9,'#4d424a');rect(c,298,14,45,8,'#65535b');
  for(let i=0;i<6;i++)block(c,288-i*2,50+i*9,65+i*4,8,i%2?'#736367':'#66565e','#968075');
  rect(c,283,20,7,75,'#80675f');rect(c,352,20,7,75,'#554650');
  for(const x of [102,512]){block(c,x,119,24,20,'#4c3b36','#886648');rect(c,x+3,123,18,2,'#a58156');rect(c,x+10,121,3,17,'#29252a');block(c,x+12,139,19,17,'#584135','#916b48');}
  // Bones, a discarded sword, rubble, and richer furnishings higher up.
  for(const [x,y] of [[91,301],[533,294],[177,340]]){rect(c,x,y,14,3,'#928a75');rect(c,x-2,y-2,4,6,'#b4aa8b');rect(c,x+12,y-2,4,6,'#b4aa8b');rect(c,x+5,y+7,7,2,'#665e5b');}
  for(let i=0;i<12;i++){const a=i*2.39+floor;rect(c,320+Math.cos(a)*255,248+Math.sin(a)*112,4+i%5,3+i%3,'#55505a');}
  if(floor>=20){block(c,448,93,46,32,'#382b2e','#765443');for(let i=0;i<8;i++)rect(c,451+i*5,96,3,22,['#827557','#765453','#636b63'][i%3]);rect(c,448,107,46,3,'#a27751');}
  if(floor>=40){block(c,188,112,49,20,'#59353e','#845a5d');rect(c,194,135,3,9,'#38272b');rect(c,228,135,3,9,'#38272b');pixelItem(c,'heart',206,97,16);}
  // Foreground lip anchors the room in the surrounding darkness.
  for(let i=0;i<14;i++){const x=73+i*36,y=353+Math.sin(i/13*Math.PI)*25;block(c,x,y,34,12,'#3a343e','#655461');}
}
export function roomLights(c:Pen,time:number){for(const [x,y] of [[152,108],[486,108],[52,235],[589,235]])torch(c,x,y,time);}
