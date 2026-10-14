import { useEffect, useState } from 'react';
import type { Phase } from '../game/types';

export type RunScreen = 'log' | 'lab' | 'shop' | null;
const resultPhases: Phase[] = ['result', 'checkpoint', 'dead', 'retired', 'complete'];
export function initialRunScreen(phase: Phase | undefined): RunScreen {
  if (phase && resultPhases.includes(phase)) return 'log';
  return phase === 'build' ? 'shop' : null;
}

/** Owns the primary screen flow; game-rule transitions stay in the run modules. */
export function useRunNavigation(phase: Phase, floor: number, initialPhase?: Phase) {
  const [screen, setScreen] = useState<RunScreen>(() => initialRunScreen(initialPhase));

  useEffect(() => {
    if (resultPhases.includes(phase)) setScreen('log');
    else if (phase === 'combat') setScreen(null);
    else if (phase === 'build') setScreen((current) => current ?? 'shop');
  }, [phase, floor]);

  return {
    screen,
    enterCombat: () => setScreen(null),
    enterNextFloor: (nextFloor: number) => setScreen(nextFloor % 5 === 0 ? 'lab' : 'shop'),
    finishClinic: () => setScreen('shop'),
    resetForNewRun: () => setScreen(null),
    returnToShop: () => setScreen('shop'),
  };
}
