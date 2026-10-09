export interface WriterOptions {
  write: (text: string) => Promise<void>;
  status: (pending: boolean, failed: boolean) => void;
  failed?: (error: unknown) => void;
  schedule?: (callback: () => void, delay: number) => unknown;
  cancel?: (handle: unknown) => void;
}
/** Single-flight writes, with the latest immutable snapshot retained until acknowledged. */
export class SaveWriter {
  private pending?: { text: string; revision: number };
  private revision = 0;
  private active?: Promise<void>;
  private timer?: unknown;
  private failures = 0;
  private readonly schedule;
  private readonly cancel;
  constructor(private options: WriterOptions) {
    this.schedule = options.schedule ?? ((cb: () => void, ms: number) => setTimeout(cb, ms));
    this.cancel =
      options.cancel ??
      ((handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  }
  get hasPending() {
    return !!this.pending;
  }
  enqueue(text: string) {
    this.pending = { text, revision: ++this.revision };
    this.options.status(true, false);
    return this.flush();
  }
  flush(): Promise<void> {
    if (this.timer !== undefined) {
      this.cancel(this.timer);
      this.timer = undefined;
    }
    if (this.active) return this.active;
    this.active = this.drain().finally(() => {
      this.active = undefined;
    });
    return this.active;
  }
  private async drain() {
    while (this.pending) {
      const snapshot = this.pending;
      try {
        await this.options.write(snapshot.text);
        this.failures = 0;
        if (this.pending?.revision === snapshot.revision) this.pending = undefined;
        this.options.status(!!this.pending, false);
      } catch (error) {
        this.options.failed?.(error);
        if (this.pending?.revision !== snapshot.revision) continue;
        this.options.status(true, true);
        const delay = Math.min(30_000, 1000 * 2 ** Math.min(this.failures++, 5));
        this.timer = this.schedule(() => {
          this.timer = undefined;
          void this.flush();
        }, delay);
        return;
      }
    }
  }
}
