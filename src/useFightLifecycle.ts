import type { MutableRefObject } from 'react';
import { sound } from './audio';
import { equipped } from './game/anatomy';
import { finishFight } from './game/run';
import type { Combat } from './game/combat';
import type { Save } from './game/types';
import { persist, telemetry } from './platform';

type Options = {
  combatRef: MutableRefObject<Combat | null>;
  saveRef: MutableRefObject<Save>;
  refresh(): void;
  invalidatePreview(): void;
  returnToShop(): void;
  setPaused(value: boolean): void;
  setFightError(message: string | null): void;
};

/** Owns the campaign boundary after a fight completes or fails to simulate. */
export function useFightLifecycle({
  combatRef,
  saveRef,
  refresh,
  invalidatePreview,
  returnToShop,
  setPaused,
  setFightError,
}: Options) {
  const onFailure = (message: string) => {
    const current = saveRef.current.run!;
    telemetry('simulation_failed', {
      seed: current.seed,
      floor: current.floor,
      message: message.slice(0, 256),
    });
    // The run still contains the pre-fight HP, inventory, and currency.
    current.phase = 'build';
    combatRef.current = null;
    invalidatePreview();
    setPaused(false);
    returnToShop();
    setFightError(message);
    void persist(saveRef.current);
    refresh();
  };

  const onComplete = (combat: Combat) => {
    const save = saveRef.current;
    const current = save.run!;
    current.lastReport = combat.completedReport(
      current.floor,
      current.seed ^ (current.floor * 15485863),
    );
    finishFight(current, combat.player.hp, combat.won, save);
    sound(combat.won ? 'win' : 'lose', save.settings.sound);
    telemetry('fight_complete', {
      floor: current.floor,
      won: combat.won,
      duration: combat.time,
      damage: combat.player.damage,
      healing: combat.player.healing,
      suppressed: combat.suppressed,
      equipment: equipped(current.build)
        .map((entry) => `${entry.item.defId}:${entry.item.level}`)
        .join(','),
      anatomy: current.build.parts.map((part) => `${part.slot}:${part.variant}`).join(','),
    });
    void persist(save);
    refresh();
  };

  return { onFailure, onComplete };
}
