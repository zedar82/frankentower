import { useEffect, useRef } from 'react';
import { count } from '../game/anatomy';
import type { Build } from '../game/types';
import { monster } from '../art/pixel';
export function Creature({ build, enemy = false, active = false, hurt = false, compact = false }: { build: Build; enemy?: boolean; active?: boolean; hurt?: boolean; compact?: boolean }) {
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{const c=ref.current?.getContext('2d');if(!c)return;c.clearRect(0,0,128,120);monster(c,build,64,111,1,{enemy,attacking:active,hurt});});
  return <canvas ref={ref} width={128} height={120} role="img" aria-label={`${build.name}: ${count(build,'head')} heads, ${count(build,'hand')} hands, ${count(build,'foot')} feet, ${count(build,'heart')} hearts`} className={`creature ${compact?'compact':''}`}/>;
}
