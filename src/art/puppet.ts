import type { Build, Part } from '../game/types';
import type { ArmMotion } from '../game/attack-motion';
import { modularReady, modularLayout, drawModularPuppet } from './modular-puppet';

export interface Pose {
  time?: number;
  walk?: number;
  moving?: boolean;
  facing?: number;
  attacking?: boolean;
  hurt?: boolean;
  dead?: number;
  enemy?: boolean;
  arms?: Record<string, ArmMotion>;
}
interface Point {
  x: number;
  y: number;
}
interface Frame extends Point {
  w: number;
  h: number;
}
export interface Joint {
  index: number;
  root: Point;
  pin: Point;
  angle: number;
  w: number;
  h: number;
  side: number;
}
export interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}
export interface PuppetLayout {
  torso: Frame;
  /** Organ equipment centers in torso-local coordinates. */
  organs: Point[];
  arms: Joint[];
  legs: Joint[];
  heads: Joint[];
  bounds: Bounds;
}
type GearPainter = (
  c: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  size: number,
  variant?: string,
) => void;

export const puppetReady = modularReady;
export const puppetLayout = modularLayout;
export function puppetBounds(build: Build, resting = false) {
  return puppetLayout(build, resting).bounds;
}
export function fitPuppet(build: Build, box: Frame, maxScale = Infinity) {
  const b = puppetBounds(build),
    scale = Math.min(maxScale, box.w / b.width, box.h / b.height);
  return {
    scale,
    x: box.x + box.w / 2 - ((b.left + b.right) * scale) / 2,
    y: box.y + box.h / 2 - ((b.top + b.bottom) * scale) / 2,
  };
}
function smooth(t: number) {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
}
// The combat engine owns phases and damage timing; artwork only consumes its pose.
export function armAngle(j: Joint, p: Part, pose: Pose) {
  const motion = p.item && pose.arms?.[p.item.uid];
  if (motion) {
    const ready = j.angle + motion.facing * 0.9;
    const prepared = j.angle + motion.facing * 0.9 * motion.drawback;
    const contact = -motion.facing * 1.6;
    if (motion.strike !== undefined) return ready + (contact - ready) * smooth(motion.strike);
    if (motion.recovery !== undefined)
      return contact + (prepared - contact) * smooth(motion.recovery);
    return prepared;
  }
  return p.item && pose.attacking ? -(pose.facing ?? 1) * 0.9 : j.angle;
}
export function drawPuppet(
  c: CanvasRenderingContext2D,
  build: Build,
  x: number,
  y: number,
  scale: number,
  pose: Pose,
  gear: GearPainter,
) {
  return drawModularPuppet(c, build, x, y, scale, pose, gear, armAngle);
}
