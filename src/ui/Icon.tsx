import { useEffect, useRef, type CSSProperties } from 'react';
import { pixelItem } from '../art/pixel';
import { prepareCanvas } from '../art/canvas';
import { subscribeAssets } from '../art/asset-loader';
export function Icon({
  name,
  size = 28,
  className = '',
  style,
  variant = '',
}: {
  name: string;
  size?: number;
  className?: string;
  style?: CSSProperties;
  variant?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let active = true;
    let frame = 0;
    const draw = () => {
      if (!active || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const element = ref.current,
          c = element?.getContext('2d');
        if (!c || !element) return;
        prepareCanvas(c, 32, 32);
        c.clearRect(0, 0, 32, 32);
        pixelItem(c, name, 0, 0, 32, variant);
      });
    };
    const unsubscribe = subscribeAssets(draw);
    const element = ref.current;
    const observer = element ? new ResizeObserver(draw) : undefined;
    if (element) observer?.observe(element);
    window.addEventListener('resize', draw);
    draw();
    return () => {
      active = false;
      if (frame) cancelAnimationFrame(frame);
      unsubscribe();
      observer?.disconnect();
      window.removeEventListener('resize', draw);
    };
  }, [name, variant, size]);
  return (
    <canvas
      ref={ref}
      width={32}
      height={32}
      aria-hidden="true"
      className={`pixel-icon ${className}`}
      style={{ width: size, height: size, ...style }}
    />
  );
}
