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
let silhouette: Uint8ClampedArray | undefined;
let revision=0;
export const puppetReady = Promise.all(Object.values(art).map(s=>s.image.decode())).then(()=>{
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
  const hands=parts(build,'hand').length, heads=parts(build,'head').length, feet=parts(build,'foot').length;
  const chests=parts(build,'chest').length, hearts=parts(build,'heart').length;
  const key=`${revision}/${hands}/${heads}/${feet}/${chests}/${hearts}`;
  const cached=layouts.get(build);if(cached?.key===key)return cached.layout;
  const rows=Math.max(1,Math.ceil(hands/2));
  const headW=heads===1?42:heads===2?38:heads===3?36:34, headGap=headW*.78;
  const width=Math.max(52,feet*15+12,Math.max(0,heads-1)*headGap/.66);
  const height=60+(rows-1)*16+Math.max(0,chests-1)*9+Math.max(0,hearts-3)*1.5;
  const torso:Frame={x:-width/2,y:(feet?-35:-2)-height,w:width,h:height};
  const arms:Joint[]=Array.from({length:hands},(_,i)=>{
    const side=i%2?-1:1, tier=Math.floor(i/2), progress=rows===1?0:tier/(rows-1);
    const v=.19+progress*.58;
    const root={x:torso.x+edge('x',v,side===1)*width,y:torso.y+v*height};
    const h=52;
    return {index:i,side,root,pin:{x:root.x+side*4,y:root.y},angle:-side*(1.06-progress*.16),h,w:h*art.arm.crop.w/art.arm.crop.h};
  });
  const legs:Joint[]=Array.from({length:feet},(_,i)=>{
    const x=(i-(feet-1)/2)*15;
    const root={x,y:torso.y+edge('y',(x-torso.x)/width,true)*height-1};
    const pin={x,y:root.y+3};
    // The painted hip button meets the socket, and the bottom of the boot meets the ground.
    const h=-pin.y/(1-art.leg.pivot.y);
    return {index:i,side:0,root,pin,angle:0,h,w:h*art.leg.crop.w/art.leg.crop.h};
  });
  const necks:Joint[]=Array.from({length:heads},(_,i)=>{
    const x=(i-(heads-1)/2)*headGap;
    const root=heads===1
      ? {x:torso.x+art.torso.pivot.x*width,y:torso.y+art.torso.pivot.y*height+1}
      : {x,y:torso.y+edge('y',(x-torso.x)/width,false)*height+4};
    const pin=heads===1?{...root}:{x,y:root.y-3};
    return {index:i,side:0,root,pin,angle:0,w:headW,h:headW*art.head.crop.h/art.head.crop.w};
  });
  let left=torso.x,right=torso.x+width,top=torso.y,bottom=feet?1:torso.y+height;
  function include(s:Sprite,j:Joint,angle:number){
    for(const u of [0,1])for(const v of [0,1]){
      const dx=(u-s.pivot.x)*j.w,dy=(v-s.pivot.y)*j.h;
      const x=j.pin.x+dx*Math.cos(angle)-dy*Math.sin(angle),y=j.pin.y+dx*Math.sin(angle)+dy*Math.cos(angle);
      left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
    }
  }
  for(const j of arms)for(const a of [j.angle,j.angle-.9,j.angle+.9,-1.85,1.85,0])include(art.arm,j,a);
  for(const j of legs)for(const a of [-.1,0,.1])include(art.leg,j,a);
  for(const j of necks)include(art.head,j,0);
  const bounds={left:left-7,right:right+7,top:top-7,bottom:bottom+7,width:right-left+14,height:bottom-top+14};
  const layout={torso,arms,legs,heads:necks,bounds};layouts.set(build,{key,layout});return layout;
}
export function puppetBounds(build:Build) { return puppetLayout(build).bounds; }
export function fitPuppet(build:Build,box:Frame,maxScale=Infinity) {
  const b=puppetBounds(build),scale=Math.min(maxScale,box.w/b.width,box.h/b.height);
  return {scale,x:box.x+box.w/2-(b.left+b.right)*scale/2,y:box.y+box.h/2-(b.top+b.bottom)*scale/2};
}
function drawAt(c:CanvasRenderingContext2D,s:Sprite,j:Joint,angle=0) {
  const f=s.crop;c.save();c.translate(j.pin.x,j.pin.y);c.rotate(angle);
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
  if(!silhouette||!Object.values(art).every(s=>s.image.complete&&s.image.naturalWidth))return false;
  const layout=puppetLayout(build),hands=parts(build,'hand'),feet=parts(build,'foot'),heads=parts(build,'head');
  c.save();c.translate(x,y);c.scale(scale,scale);c.imageSmoothingEnabled=true;
  c.fillStyle='#0c0c11';c.beginPath();c.ellipse(0,1,Math.max(20,layout.torso.w*.4),4,0,0,Math.PI*2);c.fill();
  if(pose.dead!==undefined){c.globalAlpha*=.65;c.scale(1,Math.max(.2,1-Math.min(1,pose.dead/.38)));}
  const bob=pose.moving?Math.sin((pose.walk??0)*.22)*1.1:Math.sin((pose.time??0)*2)*.4;
  c.translate(pose.hurt?-1:0,-bob);
  const f=art.torso.crop,b=layout.torso;
  c.drawImage(art.torso.image,f.x,f.y,f.w,f.h,b.x,b.y,b.w,b.h);
  for(const j of layout.legs){
    tab(c,j,-Math.PI/2);
    const angle=pose.moving?Math.sin((pose.walk??0)*.22+j.index*Math.PI)*.075:0;
    drawAt(c,art.leg,j,angle);
    if(feet[j.index].item){const item=feet[j.index].item!;const boot=sourcePoint(art.leg,j,{x:540,y:1280});c.save();c.translate(j.pin.x,j.pin.y);c.rotate(angle);gear(c,ITEM_MAP[item.defId].icon,boot.x-5,boot.y-5,10,item.defId);c.restore();}
  }
  for(const j of layout.arms){
    tab(c,j,j.side===-1?0:Math.PI);
    const p=hands[j.index],angle=armAngle(j,p,pose);drawAt(c,art.arm,j,angle);
    if(p.item){
      const def=ITEM_MAP[p.item.defId],grip=sourcePoint(art.arm,j,{x:514,y:1272});
      const size=def.id==='enormous'?30:def.icon==='club'?25:22;
      c.save();c.translate(j.pin.x,j.pin.y);c.rotate(angle);
      gear(c,def.icon,grip.x-size*.5,grip.y-size*(def.icon==='shield'?.5:.88),size,def.id);c.restore();
    }
  }
  const chest=build.parts.find(p=>p.slot==='chest'&&p.item);
  if(chest?.item)gear(c,ITEM_MAP[chest.item.defId].icon,-13,b.y+b.h*.32,26,chest.item.defId);
  const hearts=parts(build,'heart').length;
  for(let i=0;i<Math.min(hearts,6);i++)gear(c,'heart',(i-(Math.min(hearts,6)-1)/2)*9-5,b.y+b.h*.67,10);
  for(const j of layout.heads){
    if(layout.heads.length>1)tab(c,j,Math.PI/2);
    drawAt(c,art.head,j);
    const p=heads[j.index];if(p.item){const crown=sourcePoint(art.head,j,{x:645,y:250}),size=j.w*.53;gear(c,ITEM_MAP[p.item.defId].icon,j.pin.x+crown.x-size*.5,j.pin.y+crown.y-size*.5,size,p.item.defId);}
  }
  c.restore();return true;
}
