import type { Build, Part } from '../game/types';
import type { Pose, Joint } from './puppet';

export type Anchor = [number, number];
export interface ModularAsset {
  id: string;
  image: string;
  width: number;
  height: number;
  anchors: { attachment: Anchor; grip?: Anchor; footwear?: Anchor; headgear?: Anchor; chest?: Anchor };
  interface?: string;
  interfaceSize?: number;
  equipmentRotation?: number;
  equipment: string[];
  receiving?: { neck: Anchor[]; shoulderLeft: Anchor[]; shoulderRight: Anchor[]; hip: Anchor[] };
}
export interface ModularSkin {
  assets: Record<string, ModularAsset & { bitmap: HTMLImageElement }>;
  parts: Record<string, string>;
  equipment: Record<string, string>;
}
export async function loadModularSkin(
  catalogue: ModularAsset[], base: string, parts: Record<string, string>, equipment: Record<string, string>,
): Promise<ModularSkin> {
  const assets: ModularSkin['assets'] = {};
  for (const asset of catalogue) {
    const bitmap = new Image();
    bitmap.src = new URL(asset.image, new URL(base, location.href)).href;
    await bitmap.decode();
    if (bitmap.naturalWidth !== asset.width || bitmap.naturalHeight !== asset.height)
      throw new Error(`Incorrect dimensions: ${asset.id}`);
    for (const [x, y] of Object.values(asset.anchors))
      if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > asset.width || y > asset.height)
        throw new Error(`Invalid anchor: ${asset.id}`);
    assets[asset.id] = { ...asset, bitmap };
  }
  for (const id of [...Object.values(parts), ...Object.values(equipment)])
    if (!assets[id]) throw new Error(`Missing modular asset: ${id}`);
  return { assets, parts, equipment };
}

// The optional skin path is called by the game's drawPuppet entry point. All points
// are authored offline; this path never scans images or infers equipment offsets.
export function drawModularPuppet(
  c: CanvasRenderingContext2D, build: Build, x: number, y: number, scale: number,
  pose: Pose, skin: ModularSkin, armAngle: (joint: Joint, part: Part, pose: Pose) => number,
) {
  const torsoPart = build.parts.find(p => p.slot === 'chest');
  const torso = torsoPart && skin.assets[skin.parts[torsoPart.uid]];
  if (!torso?.receiving) throw new Error('A modular torso needs receiving bands');
  const heads = build.parts.filter(p => p.slot === 'head');
  const arms = build.parts.filter(p => p.slot === 'hand');
  const legs = build.parts.filter(p => p.slot === 'foot');
  // Additional receiving space comes only from uniform torso scaling, never
  // different X/Y scaling, new anatomy, or a different image for the stress case.
  const growth = Math.max(1, heads.length / 2, legs.length / 4, Math.ceil(arms.length / 2) / 3);
  const point = (band: Anchor[], index: number, count: number): Anchor => {
    const t = count === 1 ? .5 : index / (count - 1);
    const a = band[0], b = band[band.length - 1];
    return [(a[0] + (b[0] - a[0]) * t - torso.width / 2) * growth,
      (a[1] + (b[1] - a[1]) * t - torso.height) * growth];
  };
  const commands: {part:Part;asset:ModularSkin['assets'][string];at:Anchor;angle:number;mirror:number;back:boolean}[] = [];
  for (const [i,p] of arms.entries()) {
    const side = i % 2 ? 1 : -1, tier = Math.floor(i / 2);
    const at = point(side < 0 ? torso.receiving.shoulderLeft : torso.receiving.shoulderRight,
      tier, Math.ceil((arms.length - (i % 2)) / 2));
    const root = {x:at[0],y:at[1]};
    const joint:Joint = {index:i,side,root,pin:root,angle:-side*.65,w:32,h:180};
    commands.push({part:p,asset:skin.assets[skin.parts[p.uid]],at,
      angle:armAngle(joint,p,pose) + (pose.moving ? Math.sin((pose.walk??0)*.22+i*Math.PI)*.09 : 0),
      mirror:side,back:i%2===0&&!p.item});
  }
  for (const [i,p] of legs.entries()) commands.push({part:p,asset:skin.assets[skin.parts[p.uid]],
    at:point(torso.receiving.hip,i,legs.length),angle:(legs.length > 1 ? (i / (legs.length - 1) - .5) * -.8 : 0) + (pose.moving?Math.sin((pose.walk??0)*.22+i*Math.PI)*.16:0),
    mirror:i<legs.length/2?-1:1,back:true});
  for (const [i,p] of heads.entries()) commands.push({part:p,asset:skin.assets[skin.parts[p.uid]],
    at:point(torso.receiving.neck,i,heads.length),angle:0,mirror:1,back:false});
  c.save(); c.translate(x,y); c.scale(scale,scale); c.imageSmoothingEnabled=true;
  const bob=pose.moving?Math.sin((pose.walk??0)*.22)*2:Math.sin((pose.time??0)*2)*.4;
  c.translate(pose.hurt?-1:0,-bob);
  const draw = (command:typeof commands[number]) => {
    const {asset,at,angle,mirror,part} = command;
    if(!asset) throw new Error(`No art for ${part.uid}`);
    c.save(); c.translate(...at); c.rotate(angle); c.scale(mirror,1);
    const [px,py]=asset.anchors.attachment;
    const gear=part.item && skin.assets[skin.equipment[part.item.uid]];
    const anchor=part.slot==='hand'?asset.anchors.grip:part.slot==='foot'?asset.anchors.footwear:asset.anchors.headgear;
    const drawGear=()=>{
      if(!gear) return;
      if(!anchor) throw new Error(`Missing equipment anchor on ${asset.id}`);
      const [gx,gy]=gear.anchors.attachment;
      c.save();
      c.translate(anchor[0]-px,anchor[1]-py);
      c.rotate(gear.equipmentRotation ?? 0);
      c.drawImage(gear.bitmap,-gx,-gy);
      c.restore();
    };
    // Hands/curls overlap the same weapon handle; shoes overlay the paw.
    if(part.slot==='hand') drawGear();
    c.drawImage(asset.bitmap,-px,-py);
    if(part.slot!=='hand') drawGear();
    c.restore();
  };
  commands.filter(command=>command.back).sort((a,b)=>Number(!!a.part.item)-Number(!!b.part.item)).forEach(draw);
  c.drawImage(torso.bitmap,-torso.width/2*growth,-torso.height*growth,torso.width*growth,torso.height*growth);
  commands.filter(command=>!command.back).forEach(draw);
  c.restore();
  return true;
}


