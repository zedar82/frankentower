import { useEffect, useRef, type ReactNode } from 'react';
export function Modal({ title, onClose, children, wide = false }: { title: string; onClose?: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.focus();
    const keydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) { e.preventDefault(); onClose(); }
      if (e.key === 'Tab') {
        const nodes = [...(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, textarea, [tabindex="0"]') ?? [])];
        if (!nodes.length) { e.preventDefault(); return; }
        const current = nodes.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey && current <= 0) { e.preventDefault(); nodes[nodes.length-1].focus(); }
        else if (!e.shiftKey && (current === nodes.length-1 || current === -1)) { e.preventDefault(); nodes[0].focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [onClose]);
  return <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose?.(); }}><div ref={ref} className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}><div className="modal-heading"><span className="eyebrow">FRANKENTOWER / PATIENT SERVICES</span>{onClose && <button className="close-button" onClick={onClose} aria-label="Close dialog">×</button>}</div><h2>{title}</h2>{children}</div></div>;
}
