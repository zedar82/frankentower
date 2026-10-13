import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

export function useDisplayMode() {
  const read = () => ({
    compact: innerWidth < 1100 || innerHeight < 620,
    short: innerHeight < 500,
  });
  const [mode, setMode] = useState(read);
  useLayoutEffect(() => {
    const update = () => setMode(read());
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return mode;
}

export function PageControls({
  page,
  total,
  onPage,
  label = 'Page',
  showLabel = true,
}: {
  page: number;
  total: number;
  onPage(page: number): void;
  label?: string;
  showLabel?: boolean;
}) {
  if (total <= 1) return null;
  return (
    <nav className="page-controls" aria-label={`${label} navigation`}>
      <button
        disabled={page <= 0}
        onClick={() => onPage(page - 1)}
        aria-label={`Previous ${label.toLowerCase()}`}
      >
        ←
      </button>
      <span aria-live="polite">
        {showLabel ? `${label} ` : ''}
        {page + 1} / {Math.max(1, total)}
      </span>
      <button
        disabled={page >= total - 1}
        onClick={() => onPage(page + 1)}
        aria-label={`Next ${label.toLowerCase()}`}
      >
        →
      </button>
    </nav>
  );
}

export function Tabs<T extends string>({
  value,
  values,
  onChange,
  label,
}: {
  value: T;
  values: readonly NoInfer<T>[];
  onChange(value: T): void;
  label: string;
}) {
  return (
    <nav className="view-tabs" aria-label={label}>
      {values.map((tab) => (
        <button key={tab} aria-pressed={value === tab} onClick={() => onChange(tab)}>
          {tab}
        </button>
      ))}
    </nav>
  );
}

export function PagedList<T>({
  items,
  render,
  empty = 'Nothing here yet.',
  rowHeight = 88,
  minWidth = 220,
  label = 'Page',
  page: requestedPage,
  onPage,
}: {
  items: readonly T[];
  render(item: T, index: number): ReactNode;
  empty?: string;
  rowHeight?: number;
  minWidth?: number;
  label?: string;
  page?: number;
  onPage?(page: number): void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [capacity, setCapacity] = useState(1);
  const [columns, setColumns] = useState(1);
  const [page, setPage] = useState(0);
  useLayoutEffect(() => {
    const measure = () => {
      if (!box.current) return;
      const cols = Math.max(1, Math.floor((box.current.clientWidth + 8) / (minWidth + 8)));
      setColumns(cols);
      setCapacity(Math.max(1, Math.floor((box.current.clientHeight + 8) / (rowHeight + 8))) * cols);
    };
    const observer = new ResizeObserver(measure);
    if (box.current) observer.observe(box.current);
    measure();
    return () => observer.disconnect();
  }, [minWidth, rowHeight]);
  const total = Math.max(1, Math.ceil(items.length / capacity));
  const active = Math.min(requestedPage ?? page, total - 1);
  return (
    <div className="paged-list">
      <div
        ref={box}
        className="paged-grid"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gridAutoRows: `${rowHeight}px`,
        }}
      >
        {items.length ? (
          items
            .slice(active * capacity, (active + 1) * capacity)
            .map((item, i) => render(item, active * capacity + i))
        ) : (
          <p className="empty-state">{empty}</p>
        )}
      </div>
      <PageControls page={active} total={total} onPage={onPage ?? setPage} label={label} />
    </div>
  );
}

// Measure real wrapped text in the available region; keep complete rules on explicit pages.
export function PagedText({ text, label = 'Details' }: { text: string; label?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const measure = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState([text]);
  const [page, setPage] = useState(0);
  useLayoutEffect(() => {
    const paginate = () => {
      const host = box.current,
        probe = measure.current;
      if (!host || !probe || !host.clientHeight || !host.clientWidth) return;
      const words = text.match(/\S+\s*/g) ?? [''];
      const result: string[] = [];
      let start = 0;
      while (start < words.length) {
        let low = start + 1,
          high = words.length,
          end = low;
        while (low <= high) {
          const middle = Math.floor((low + high) / 2);
          probe.textContent = words.slice(start, middle).join('');
          if (probe.offsetHeight <= host.clientHeight) {
            end = middle;
            low = middle + 1;
          } else high = middle - 1;
        }
        result.push(words.slice(start, end).join('').trim());
        start = end;
      }
      setPages(result.length ? result : ['']);
      probe.textContent = '';
    };
    const observer = new ResizeObserver(paginate);
    if (box.current) observer.observe(box.current);
    paginate();
    return () => observer.disconnect();
  }, [text]);
  const active = Math.min(page, pages.length - 1);
  return (
    <section className="paged-text" aria-label={label}>
      <div className="text-region" ref={box}>
        <div className="text-copy">{pages[active]}</div>
        <div ref={measure} className="text-copy text-measure" aria-hidden="true" />
      </div>
      <PageControls page={active} total={pages.length} onPage={setPage} label={label} />
    </section>
  );
}
