import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import type { Item } from '../../game/types';

const ITEM_MIME = 'application/x-frankentower-item';

export function useItemDrag({
  enabled,
  canDrop,
  onDrop,
}: {
  enabled: boolean;
  canDrop: (item: Item, partUid?: string) => boolean;
  onDrop: (item: Item, partUid?: string) => void;
}) {
  const [dragged, setDragged] = useState<Item | null>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const suppressClickUntil = useRef(0);

  useEffect(() => {
    if (!enabled) {
      cleanup.current?.();
      setDragged(null);
    }
    return () => cleanup.current?.();
  }, [enabled]);

  const dragProps = (item: Item) => ({
    draggable: enabled,
    onClickCapture: (event: MouseEvent<HTMLElement>) => {
      if (performance.now() < suppressClickUntil.current) {
        event.preventDefault();
        event.stopPropagation();
        suppressClickUntil.current = 0;
      }
    },
    onDragStart: (event: DragEvent<HTMLElement>) => {
      event.dataTransfer.setData(ITEM_MIME, item.uid);
      event.dataTransfer.effectAllowed = 'move';
      setDragged(item);
    },
    onDragEnd: () => setDragged(null),
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === 'mouse' || !enabled) return;
      cleanup.current?.();
      const { clientX: x, clientY: y, pointerId } = event;
      let moving = false;
      const move = (event: globalThis.PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        if (!moving && Math.hypot(event.clientX - x, event.clientY - y) > 10) {
          moving = true;
          setDragged(item);
        }
        if (moving) event.preventDefault();
      };
      const stop = () => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', end);
        document.removeEventListener('pointercancel', cancel);
        cleanup.current = null;
      };
      const end = (event: globalThis.PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        stop();
        if (moving) {
          suppressClickUntil.current = performance.now() + 300;
          const target = document
            .elementFromPoint(event.clientX, event.clientY)
            ?.closest<HTMLElement>('[data-drop-target]');
          const partUid = target?.dataset.dropTarget || undefined;
          if (target && canDrop(item, partUid)) onDrop(item, partUid);
        }
        setDragged(null);
      };
      const cancel = (event: globalThis.PointerEvent) => {
        if (event.pointerId !== pointerId) return;
        stop();
        setDragged(null);
      };
      cleanup.current = stop;
      document.addEventListener('pointermove', move, { passive: false });
      document.addEventListener('pointerup', end);
      document.addEventListener('pointercancel', cancel);
    },
  });

  const dropProps = (partUid?: string) => ({
    'data-drop-target': partUid ?? '',
    onDragOver: (event: DragEvent<HTMLElement>) => {
      if (dragged && canDrop(dragged, partUid)) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }
    },
    onDrop: (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      if (
        dragged &&
        canDrop(dragged, partUid) &&
        event.dataTransfer.getData(ITEM_MIME) === dragged.uid
      )
        onDrop(dragged, partUid);
      setDragged(null);
    },
  });

  return { dragged, dragProps, dropProps };
}
