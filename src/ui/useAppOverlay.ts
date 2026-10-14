import { useState } from 'react';
import type { Build, Item, Slot } from '../game/types';

export type ModalName = 'help' | 'hall' | 'catalogue' | 'report' | 'new' | 'settings';
type OverlayState =
  | { kind: 'modal'; name: ModalName }
  | { kind: 'item'; item: Item }
  | { kind: 'equipment'; slot?: Slot; item?: Item; view?: 'Slots' | 'Satchel' }
  | { kind: 'build'; build: Build }
  | { kind: 'fight-error'; message: string }
  | null;

/** Application overlays are exclusive; each overlay owns its own local subviews. */
export function useAppOverlay() {
  const [overlay, setOverlay] = useState<OverlayState>(null);
  return {
    overlay,
    modal: overlay?.kind === 'modal' ? overlay.name : null,
    selected: overlay?.kind === 'item' ? overlay.item : null,
    equipment: overlay?.kind === 'equipment' ? overlay : null,
    inspected: overlay?.kind === 'build' ? overlay.build : null,
    fightError: overlay?.kind === 'fight-error' ? overlay.message : null,
    setModal: (name: ModalName | null) =>
      setOverlay(name ? { kind: 'modal', name } : null),
    setSelected: (item: Item | null) => setOverlay(item ? { kind: 'item', item } : null),
    setEquipment: (equipment: { slot?: Slot; item?: Item; view?: 'Slots' | 'Satchel' } | null) =>
      setOverlay(equipment ? { kind: 'equipment', ...equipment } : null),
    setInspected: (build: Build | null) => setOverlay(build ? { kind: 'build', build } : null),
    setFightError: (message: string | null) =>
      setOverlay(message ? { kind: 'fight-error', message } : null),
    closeOverlay: () => setOverlay(null),
  };
}
