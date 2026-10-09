import { useEffect, useRef } from 'react';
import { count } from '../game/anatomy';
import type { Build } from '../game/types';
import { monster, fitPuppet, puppetReady } from '../art/pixel';
export function Creature({ build, enemy = false, active = false, hurt = false, compact = false }: { build: Build; enemy?: boolean; active?: boolean; hurt?: boolean; compact?: boolean }) {
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{let mounted=true;const draw=()=>{if(!mounted)return;const c=ref.current?.getContext('2d');if(!c)return;c.setTransform(2,0,0,2,0,0);c.clearRect(0,0,144,160);const fit=fitPuppet(build,{x:5,y:5,w:134,h:150},1);monster(c,build,fit.x,fit.y,fit.scale,{enemy,attacking:active,hurt});};draw();puppetReady.then(draw);return()=>{mounted=false;};});
  return <canvas ref={ref} width={288} height={320} role="img" aria-label={`${build.name}: ${count(build,'head')} heads, ${count(build,'hand')} hands, ${count(build,'foot')} feet, ${count(build,'heart')} hearts`} className={`creature ${compact?'compact':''}`}/>;
}
