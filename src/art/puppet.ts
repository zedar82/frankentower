import type { Build, Part } from '../game/types';
import { ITEM_MAP } from '../game/content';
import type { ArmMotion } from '../game/attack-motion';
import torsoUrl from './assets/torso-core.webp';
import socketUrl from './assets/torso.webp';
import headUrl from './assets/head.webp';
import armUrl from './assets/arm.webp';
import legUrl from './assets/leg.webp';

export interface Pose {
  time?: number; walk?: number; moving?: boolean; facing?: number;
  windup?: number; windupItem?: string; activeItems?: string[]; attacking?: boolean;
  swing?: number; itemSwings?: Record<string, number>; hurt?: boolean; dead?: number; enemy?: boolean;
  arms?: Record<string, ArmMotion>;
}
interface Point { x: number; y: number }
interface Frame extends Point { w: number; h: number }
interface Sprite { image: HTMLImageElement; crop: Frame; pivot: Point }
export interface Joint {
  index: number; root: Point; pin: Point; angle: number; w: number; h: number; side: number;
}
export interface Bounds { left: number; top: number; right: number; bottom: number; width: number; height: number }
export interface PuppetLayout { torso: Frame; arms: Joint[]; legs: Joint[]; heads: Joint[]; bounds: Bounds }
type GearPainter = (c: CanvasRenderingContext2D, name: string, x: number, y: number, size: number, variant?: string) => void;

// Coordinates refer to the painted joint buttons, not the centre of each PNG's transparent canvas.
function sprite(src: string, crop: Frame, pin: Point): Sprite {
  const image = new Image(); image.src = src;
  return { image, crop, pivot: { x: (pin.x-crop.x)/crop.w, y: (pin.y-crop.y)/crop.h } };
}
const art = {
  torso: sprite(torsoUrl, { x: 177, y: 77, w: 958, h: 1053 }, { x: 651, y: 139 }),
  tab: sprite(socketUrl, { x: 213, y: 204, w: 147, h: 137 }, { x: 273, y: 267 }),
  head: sprite(headUrl, { x: 7, y: 3, w: 1273, h: 1212 }, { x: 638, y: 1136 }),
  arm: sprite(armUrl, { x: 298, y: 35, w: 429, h: 1464 }, { x: 525, y: 180 }),
  leg: sprite(legUrl, { x: 278, y: 18, w: 470, h: 1497 }, { x: 516, y: 169 }),
};
const ratPartsUrl = new URL('./assets/rat-parts.png', import.meta.url).href;
const bonePartsUrl = new URL('./assets/bone-parts.png', import.meta.url).href;
const ratArt = {
  head: sprite(ratPartsUrl, { x: 20, y: 25, w: 620, h: 420 }, { x: 550, y: 300 }),
  torso: sprite(ratPartsUrl, { x: 700, y: 30, w: 836, h: 420 }, { x: 770, y: 200 }),
  arm: sprite(ratPartsUrl, { x: 270, y: 475, w: 350, h: 535 }, { x: 535, y: 495 }),
  leg: sprite(ratPartsUrl, { x: 850, y: 475, w: 385, h: 510 }, { x: 1100, y: 500 }),
};
const boneArt = {
  head: sprite(bonePartsUrl, { x: 120, y: 20, w: 470, h: 520 }, { x: 375, y: 450 }),
  torso: sprite(bonePartsUrl, { x: 690, y: 0, w: 495, h: 590 }, { x: 938, y: 45 }),
  arm: sprite(bonePartsUrl, { x: 265, y: 612, w: 225, h: 630 }, { x: 335, y: 650 }),
  leg: sprite(bonePartsUrl, { x: 820, y: 612, w: 290, h: 630 }, { x: 970, y: 650 }),
};
type AnatomyArt = typeof art;
function anatomyArt(variant:Part['variant']):AnatomyArt|typeof ratArt|typeof boneArt {
  return variant==='rat'?ratArt:variant==='bone'?boneArt:art;
}
function partArt(slot:Part['slot'],variant:Part['variant']):Sprite {
  const source=anatomyArt(variant);
  if(slot==='head')return source.head;
  if(slot==='hand')return source.arm;
  if(slot==='foot')return source.leg;
  return source.torso;
}
let silhouette: Uint8ClampedArray | undefined;
let revision=0;
export const puppetReady = Promise.all([...Object.values(art),...Object.values(ratArt),...Object.values(boneArt)].map(s=>s.image.decode())).then(()=>{
  const c=document.createElement('canvas'); c.width=art.torso.crop.w; c.height=art.torso.crop.h;
  const ctx=c.getContext('2d')!; const f=art.torso.crop;
  ctx.drawImage(art.torso.image,f.x,f.y,f.w,f.h,0,0,f.w,f.h);
  silhouette=ctx.getImageData(0,0,f.w,f.h).data; revision++;
}).catch(error=>{console.error('Could not load puppet art',error);});

// Follow the actual fabric silhouette when positioning a seam. Scaling the torso moves the seam and pin together.
function edge(axis:'x'|'y', t:number, end:boolean): number {
  const f=art.torso.crop;
  if(!silhouette) return axis==='x' ? (end?.86:.14) : (end?.98:.08);
  const fixed=Math.round(Math.max(0,Math.min(1,t))*(axis==='x'?f.h-1:f.w-1));
  const length=axis==='x'?f.w:f.h;
  for(let n=0;n<length;n++){
    const p=end?length-1-n:n, x=axis==='x'?p:fixed, y=axis==='y'?p:fixed;
    if(silhouette[(y*f.w+x)*4+3]>=96)return p/length;
  }
  return .5;
}
function parts(build:Build,slot:Part['slot']) { return build.parts.filter(p=>p.slot===slot); }
const layouts=new WeakMap<Build,{key:string;layout:PuppetLayout}>();
export function puppetLayout(build:Build):PuppetLayout {
  const handParts=parts(build,'hand'),headParts=parts(build,'head'),footParts=parts(build,'foot');
  const hands=handParts.length, heads=headParts.length, feet=footParts.length;
  const chestParts=parts(build,'chest'),chests=chestParts.length, hearts=parts(build,'heart').length;
  const bodyArt=partArt('chest',chestParts[0]?.variant??'living');
  const rat=parts(build,'chest').some(p=>p.variant==='rat');
  const key=`${revision}/${build.parts.map(p=>`${p.slot}:${p.variant}`).join(',')}`;
  const cached=layouts.get(build);if(cached?.key===key)return cached.layout;
  const rows=Math.max(1,Math.ceil(hands/2));
  const headW=heads===1?42:heads===2?38:heads===3?36:34, headGap=headW*.78;
  const width=Math.max(rat?70:52,feet*15+12,Math.max(0,heads-1)*headGap/.66);
  const height=(rat?44:60)+(rows-1)*16+Math.max(0,chests-1)*9+Math.max(0,hearts-3)*1.5;
  const torso:Frame={x:-width/2,y:(feet?(rat?-25:-35):-2)-height,w:width,h:height};
  const arms:Joint[]=Array.from({length:hands},(_,i)=>{
    const side=i%2?-1:1, tier=Math.floor(i/2), progress=rows===1?0:tier/(rows-1);
    const v=.19+progress*.58;
    const root={x:torso.x+edge('x',v,side===1)*width,y:torso.y+v*height};
    const s=partArt('hand',handParts[i].variant),h=52;
    return {index:i,side,root,pin:{x:root.x+side*4,y:root.y},angle:-side*(1.06-progress*.16),h,w:h*s.crop.w/s.crop.h};
  });
  const legs:Joint[]=Array.from({length:feet},(_,i)=>{
    const x=rat ? (i<2?-1:1)*(i%2===0?width*.29:width*.39) : (i-(feet-1)/2)*15;
    const root={x,y:torso.y+edge('y',(x-torso.x)/width,true)*height-1};
    const pin={x,y:root.y+3};
    // The painted hip button meets the socket, and the bottom of the boot meets the ground.
    const s=partArt('foot',footParts[i].variant),h=-pin.y/(1-s.pivot.y);
    return {index:i,side:0,root,pin,angle:0,h,w:h*s.crop.w/s.crop.h};
  });
  const necks:Joint[]=Array.from({length:heads},(_,i)=>{
    const s=partArt('head',headParts[i].variant);
    const x=(i-(heads-1)/2)*headGap;
    const root=heads===1
      ? {x:torso.x+bodyArt.pivot.x*width,y:torso.y+bodyArt.pivot.y*height+1}
      : {x,y:torso.y+edge('y',(x-torso.x)/width,false)*height+4};
    const pin=heads===1?{...root}:{x,y:root.y-3};
    return {index:i,side:0,root,pin,angle:0,w:headW,h:headW*s.crop.h/s.crop.w};
  });
  let left=torso.x,right=torso.x+width,top=torso.y,bottom=feet?1:torso.y+height;
  function include(s:Sprite,j:Joint,angle:number){
    for(const u of [0,1])for(const v of [0,1]){
      const dx=(u-s.pivot.x)*j.w,dy=(v-s.pivot.y)*j.h;
      const x=j.pin.x+dx*Math.cos(angle)-dy*Math.sin(angle),y=j.pin.y+dx*Math.sin(angle)+dy*Math.cos(angle);
      left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
    }
  }
  for(const j of arms)for(const a of [j.angle,j.angle-.9,j.angle+.9,-1.85,1.85,0])include(partArt('hand',handParts[j.index].variant),j,a);
  for(const j of legs)for(const a of [-.1,0,.1])include(partArt('foot',footParts[j.index].variant),j,a);
  for(const j of necks)include(partArt('head',headParts[j.index].variant),j,0);
  const bounds={left:left-7,right:right+7,top:top-7,bottom:bottom+7,width:right-left+14,height:bottom-top+14};
  const layout={torso,arms,legs,heads:necks,bounds};layouts.set(build,{key,layout});return layout;
}
export function puppetBounds(build:Build) { return puppetLayout(build).bounds; }
export function fitPuppet(build:Build,box:Frame,maxScale=Infinity) {
  const b=puppetBounds(build),scale=Math.min(maxScale,box.w/b.width,box.h/b.height);
  return {scale,x:box.x+box.w/2-(b.left+b.right)*scale/2,y:box.y+box.h/2-(b.top+b.bottom)*scale/2};
}
function materialFilter(variant:Part['variant'], enemy=false) {
  if(variant==='rat'||variant==='bone')return 'none';
  if(variant==='necrotic')return 'grayscale(1) sepia(.7) saturate(1.8) hue-rotate(345deg) brightness(1.24)';
  if(variant==='clockwork')return 'grayscale(1) sepia(.28) brightness(1.42) contrast(1.08)';
  if(variant==='serpent')return 'hue-rotate(27deg) saturate(1.25) brightness(.95)';
  if(variant==='ganglion')return 'hue-rotate(275deg) saturate(1.35) brightness(1.04)';
  return enemy ? 'sepia(.52) saturate(.82) brightness(.91)' : 'none';
}
function drawAt(c:CanvasRenderingContext2D,s:Sprite,j:Joint,angle=0,variant:Part['variant']='living',enemy=false) {
  const f=s.crop;c.save();c.translate(j.pin.x,j.pin.y);c.rotate(angle);
  c.filter=materialFilter(variant,enemy);
  c.drawImage(s.image,f.x,f.y,f.w,f.h,-s.pivot.x*j.w,-s.pivot.y*j.h,j.w,j.h);c.restore();
}
function tab(c:CanvasRenderingContext2D,j:Joint,angle:number) {
  // This is the original painted sewn tab, with its inner edge overlapping the tunic seam.
  drawAt(c,art.tab,{...j,w:15,h:14},angle);
}
function smooth(t:number) {t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);}
export function armAngle(j:Joint,p:Part,pose:Pose) {
  const motion=p.item&&pose.arms?.[p.item.uid];
  if(motion){
    const ready=j.angle+motion.facing*.9;
    const prepared=j.angle+motion.facing*.9*motion.drawback;
    const contact=-motion.facing*1.6;
    if(motion.strike!==undefined)return ready+(contact-ready)*smooth(motion.strike);
    if(motion.recovery!==undefined)return contact+(prepared-contact)*smooth(motion.recovery);
    return prepared;
  }
  let angle=j.angle;
  if(p.item&&pose.windupItem===p.item.uid)angle-=j.side*(pose.windup??0)*.75;
  const activated=p.item&&(pose.activeItems?.includes(p.item.uid)||pose.attacking&&!pose.activeItems);
  if(activated){
    const t=p.item&&pose.itemSwings?.[p.item.uid]!==undefined?pose.itemSwings[p.item.uid]:1-(pose.swing??.55);
    const strike=-(pose.facing??1)*1.6,start=j.angle-j.side*.5;
    angle=t<.45?start+(strike-start)*smooth(t/.45):strike+(j.angle-strike)*smooth((t-.45)/.55);
  }
  return angle;
}
function sourcePoint(s:Sprite,j:Joint,point:Point):Point {
  return {x:((point.x-s.crop.x)/s.crop.w-s.pivot.x)*j.w,y:((point.y-s.crop.y)/s.crop.h-s.pivot.y)*j.h};
}
export function drawPuppet(c:CanvasRenderingContext2D,build:Build,x:number,y:number,scale:number,pose:Pose,gear:GearPainter) {
  if(!silhouette||![...Object.values(art),...Object.values(ratArt),...Object.values(boneArt)].every(s=>s.image.complete&&s.image.naturalWidth))return false;
  const layout=puppetLayout(build),hands=parts(build,'hand'),feet=parts(build,'foot'),heads=parts(build,'head');
  const chest=build.parts.find(p=>p.slot==='chest'),heartParts=parts(build,'heart');
  c.save();c.translate(x,y);c.scale(scale,scale);c.imageSmoothingEnabled=true;
  c.fillStyle='#0c0c11';c.beginPath();c.ellipse(0,1,Math.max(20,layout.torso.w*.4),4,0,0,Math.PI*2);c.fill();
  if(pose.dead!==undefined){c.globalAlpha*=.65;c.scale(1,Math.max(.2,1-Math.min(1,pose.dead/.38)));}
  const bob=pose.moving?Math.sin((pose.walk??0)*.22)*1.1:Math.sin((pose.time??0)*2)*.4;
  c.translate(pose.hurt?-1:0,-bob);
  const torsoArt=partArt('chest',chest?.variant??'living'),f=torsoArt.crop,b=layout.torso;
  c.filter=materialFilter(chest?.variant??'living',!!pose.enemy);
  c.drawImage(torsoArt.image,f.x,f.y,f.w,f.h,b.x,b.y,b.w,b.h);
  c.filter='none';
  if(chest?.variant==='necrotic'){
    // A few pale ribs make the bone body read clearly at arena scale.
    c.fillStyle='#e4d7b7';
    for(let i=0;i<4;i++){
      const yy=b.y+b.h*(.38+i*.105), half=b.w*(.25-i*.025);
      c.fillRect(-half,yy,half*.72,Math.max(1,b.h*.022));c.fillRect(half*.28,yy,half*.72,Math.max(1,b.h*.022));
    }
    c.fillRect(-Math.max(1,b.w*.018),b.y+b.h*.34,Math.max(2,b.w*.036),b.h*.42);
  }
  for(const j of layout.legs){
    const p=feet[j.index],s=partArt('foot',p.variant);
    if(p.variant!=='rat'&&p.variant!=='bone')tab(c,j,-Math.PI/2);
    const angle=pose.moving?Math.sin((pose.walk??0)*.22+j.index*Math.PI)*.075:0;
    drawAt(c,s,j,angle,p.variant,!!pose.enemy);
    if(p.item){const boot=sourcePoint(s,j,p.variant==='rat'?{x:1180,y:930}:p.variant==='bone'?{x:1030,y:1205}:{x:540,y:1280});c.save();c.translate(j.pin.x,j.pin.y);c.rotate(angle);gear(c,ITEM_MAP[p.item.defId].icon,boot.x-5,boot.y-5,10,p.item.defId);c.restore();}
  }
  for(const j of layout.arms){
    const p=hands[j.index],s=partArt('hand',p.variant),angle=armAngle(j,p,pose);
    if(p.variant!=='rat'&&p.variant!=='bone')tab(c,j,j.side===-1?0:Math.PI);
    drawAt(c,s,j,angle,p.variant,!!pose.enemy);
    if(p.item){
      const def=ITEM_MAP[p.item.defId],grip=sourcePoint(s,j,p.variant==='rat'?{x:440,y:940}:p.variant==='bone'?{x:345,y:1195}:{x:514,y:1272});
      const size=def.id==='enormous'?30:def.icon==='club'?25:22;
      c.save();c.translate(j.pin.x,j.pin.y);c.rotate(angle);
      gear(c,def.icon,grip.x-size*.5,grip.y-size*(def.icon==='shield'?.5:.88),size,def.id);c.restore();
    }
  }
  const chestItem=build.parts.find(p=>p.slot==='chest'&&p.item);
  if(chestItem?.item)gear(c,ITEM_MAP[chestItem.item.defId].icon,-13,b.y+b.h*.32,26,chestItem.item.defId);
  for(let i=0;i<Math.min(heartParts.length,6);i++)gear(c,'heart',(i-(Math.min(heartParts.length,6)-1)/2)*9-5,b.y+b.h*.67,10);
  for(const j of layout.heads){
    const p=heads[j.index],s=partArt('head',p.variant);
    if(layout.heads.length>1&&p.variant!=='rat'&&p.variant!=='bone')tab(c,j,Math.PI/2);
    drawAt(c,s,j,0,p.variant,!!pose.enemy);
    if(p.item){const crown=sourcePoint(s,j,p.variant==='rat'?{x:300,y:115}:p.variant==='bone'?{x:350,y:100}:{x:645,y:250}),size=j.w*.53;gear(c,ITEM_MAP[p.item.defId].icon,j.pin.x+crown.x-size*.5,j.pin.y+crown.y-size*.5,size,p.item.defId);}
  }
  c.restore();return true;
}
