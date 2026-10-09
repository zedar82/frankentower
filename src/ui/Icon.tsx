import { useEffect, useRef, type CSSProperties } from 'react';
import { pixelItem } from '../art/pixel';
export function Icon({ name, size = 28, className = '', style }: { name: string; size?: number; className?: string; style?: CSSProperties }) {
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{const c=ref.current?.getContext('2d');if(!c)return;c.clearRect(0,0,32,32);pixelItem(c,name);},[name]);
  return <canvas ref={ref} width={32} height={32} aria-hidden="true" className={`pixel-icon ${className}`} style={{width:size,height:size,...style}}/>;
}
