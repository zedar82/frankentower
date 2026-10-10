import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { pixelItem } from '../art/pixel';
import { itemArtReady } from '../art/item-assets';
export function Icon({ name, size = 28, className = '', style, variant = '' }: { name: string; size?: number; className?: string; style?: CSSProperties; variant?: string }) {
  const ref=useRef<HTMLCanvasElement>(null);
  const [assetsReady, setAssetsReady] = useState(false);
  useEffect(()=>{let active=true;itemArtReady.then(()=>{if(active)setAssetsReady(true);}).catch(()=>{});return()=>{active=false;};},[]);
  useEffect(()=>{const c=ref.current?.getContext('2d');if(!c)return;c.clearRect(0,0,32,32);pixelItem(c,name,0,0,32,variant);},[name,variant,assetsReady]);
  return <canvas ref={ref} width={32} height={32} aria-hidden="true" className={`pixel-icon ${className}`} style={{width:size,height:size,...style}}/>;
}
