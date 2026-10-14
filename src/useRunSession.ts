import { useRef, useState } from 'react';
import { equipped, stats } from './game/anatomy';
import { newRun } from './game/run';
import type { Save } from './game/types';
import { persist, telemetry } from './platform';

/** Owns mutable run/save state and the common persistence/analytics boundary. */
export function useRunSession(initialSave: Save, beforeUpdate?: () => void) {
  const saveRef = useRef(initialSave);
  const [, redraw] = useState(0);
  const save = saveRef.current;
  if (!save.run) save.run = newRun();
  const run = save.run;

  const refresh = () => redraw((revision) => revision + 1);
  const update = (event?: string) => {
    beforeUpdate?.();
    refresh();
    void persist(saveRef.current);
    if (event)
      telemetry(event, {
        floor: run.floor,
        seed: run.seed,
        gold: run.gold,
        items: equipped(run.build)
          .map((entry) => `${entry.item.defId}:${entry.item.level}`)
          .join(','),
        anatomy: run.build.parts.map((part) => `${part.slot}:${part.variant}`).join(','),
        efficiency: stats(run.build).efficiency,
      });
  };

  return { saveRef, save, run, refresh, update };
}
