import { useEffect, useRef, type MutableRefObject } from 'react';
import { hostPaused } from './platform';
import type { Save } from './game/types';
import type { Combat } from './game/combat';
import { sound } from './audio';

type Options = {
  combatRef: MutableRefObject<Combat | null>;
  saveRef: MutableRefObject<Save>;
  paused: boolean;
  refresh(): void;
  onFailure(message: string): void;
  onComplete(combat: Combat): void;
};

/** Owns the fixed-step clock and consumes transient hit feedback during combat. */
export function useCombatSession(options: Options) {
  const latest = useRef(options);
  latest.current = options;

  useEffect(() => {
    let frame = 0,
      last = performance.now(),
      accumulator = 0,
      lastRender = 0,
      lastSound = 0,
      freezeUntil = 0,
      lastImpact = 0,
      lastFreeze = 0;
    let observed: Combat | null = null;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tick = (now: number) => {
      const currentOptions = latest.current;
      const delta = Math.min((now - last) / 1000, 0.15);
      last = now;
      const current = currentOptions.saveRef.current.run!,
        combat = currentOptions.combatRef.current;
      if (combat !== observed) {
        observed = combat;
        accumulator = 0;
        lastSound = 0;
        lastImpact = 0;
        freezeUntil = 0;
      }
      if (
        current.phase === 'combat' &&
        combat &&
        !currentOptions.paused &&
        !hostPaused() &&
        !document.hidden
      ) {
        if (now >= freezeUntil) accumulator += delta * currentOptions.saveRef.current.settings.speed;
        while (accumulator >= 0.05 && !combat.done) {
          try {
            combat.step(0.05);
          } catch (error) {
            currentOptions.onFailure(error instanceof Error ? error.message : 'Combat could not continue.');
            frame = requestAnimationFrame(tick);
            return;
          }
          accumulator -= 0.05;
        }
        const hits = combat.logs
          .slice(-24)
          .filter((entry) => entry.kind === 'damage' && entry.id > lastImpact && (entry.value ?? 0) > 0);
        if (hits.length) {
          const heavy = hits.some((entry) => entry.attack === 'heavy');
          if (combat.time - lastSound > 0.18) {
            sound(heavy ? 'heavy' : 'hit', currentOptions.saveRef.current.settings.sound);
            lastSound = combat.time;
          }
          if (
            !reducedMotion &&
            now - lastFreeze > 220 &&
            hits.some((entry) => entry.attack === 'heavy' && (entry.value ?? 0) >= 1200)
          ) {
            freezeUntil = now + 55;
            lastFreeze = now;
            accumulator = 0;
          }
          lastImpact = hits[hits.length - 1].id;
        }
        if (combat.failure) {
          currentOptions.onFailure(combat.failure);
          frame = requestAnimationFrame(tick);
          return;
        }
        if (combat.done) {
          accumulator = 0;
          currentOptions.onComplete(combat);
        } else if (now - lastRender > 70) {
          lastRender = now;
          currentOptions.refresh();
        }
      } else accumulator = 0;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
}
