// Preparation follows the equipment clock; the forward stroke and recovery use seconds.
export const ARM_STRIKE_TIME = .12;
export const ARM_RECOVERY_TIME = .16;
export interface ArmMotion {
  drawback: number;
  facing: number;
  strike?: number;
  recovery?: number;
}
export const clampProgress = (value: number) => Math.max(0, Math.min(1, value));
export function drawbackProgress(remaining: number, cooldown: number, rate: number) {
  const preparation = cooldown - ARM_STRIKE_TIME * rate;
  return preparation > 0 ? clampProgress((cooldown - remaining) / preparation) : 1;
}
