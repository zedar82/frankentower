import test from 'node:test';
import assert from 'node:assert/strict';
import { SaveWriter } from '../src/save-writer';

function harness(write: (text: string) => Promise<void>) {
  const timers = new Map<number, { callback: () => void; delay: number }>();
  const states: boolean[][] = [];
  let id = 0;
  const writer = new SaveWriter({
    write,
    status: (pending, failed) => states.push([pending, failed]),
    schedule: (callback, delay) => {
      timers.set(++id, { callback, delay });
      return id;
    },
    cancel: (handle) => {
      timers.delete(handle as number);
    },
  });
  return {
    writer,
    timers,
    states,
    fire: async () => {
      const [key, timer] = timers.entries().next().value!;
      timers.delete(key);
      timer.callback();
      await writer.flush();
    },
  };
}
test('a transient write failure retries the retained snapshot without another game action', async () => {
  const writes: string[] = [];
  let fail = true;
  const h = harness(async (text) => {
    writes.push(text);
    if (fail) throw new Error('offline');
  });
  await h.writer.enqueue('purchase');
  assert.equal(h.writer.hasPending, true);
  assert.deepEqual(h.states.at(-1), [true, true]);
  assert.equal([...h.timers.values()][0].delay, 1000);
  fail = false;
  await h.fire();
  assert.deepEqual(writes, ['purchase', 'purchase']);
  assert.equal(h.writer.hasPending, false);
  assert.deepEqual(h.states.at(-1), [false, false]);
  assert.equal(h.timers.size, 0);
});
test('rapid changes coalesce while preserving single-flight order and final acknowledged snapshot', async () => {
  const writes: string[] = [];
  let release!: () => void;
  const h = harness(async (text) => {
    writes.push(text);
    if (text === 'first')
      await new Promise<void>((resolve) => {
        release = resolve;
      });
  });
  const first = h.writer.enqueue('first');
  const second = h.writer.enqueue('second');
  const last = h.writer.enqueue('last');
  assert.deepEqual(writes, ['first']);
  release();
  await Promise.all([first, second, last]);
  assert.deepEqual(writes, ['first', 'last']);
  assert.equal(h.writer.hasPending, false);
});
test('a failing in-flight obsolete write cannot overwrite or discard the latest snapshot', async () => {
  const writes: string[] = [];
  let reject!: (e: Error) => void;
  const h = harness(async (text) => {
    writes.push(text);
    if (text === 'old')
      await new Promise<void>((_, no) => {
        reject = no;
      });
  });
  const old = h.writer.enqueue('old');
  const latest = h.writer.enqueue('new');
  reject(new Error('connection lost'));
  await Promise.all([old, latest]);
  assert.deepEqual(writes, ['old', 'new']);
  assert.equal(h.timers.size, 0);
  assert.equal(h.writer.hasPending, false);
});
test('retry backoff caps at 30 seconds and explicit retry cancels the scheduled retry', async () => {
  let fail = true;
  const h = harness(async () => {
    if (fail) throw new Error('offline');
  });
  await h.writer.enqueue('latest');
  const delays = [];
  for (let n = 0; n < 8; n++) {
    delays.push([...h.timers.values()][0].delay);
    await h.fire();
  }
  assert.deepEqual(delays, [1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000]);
  fail = false;
  await h.writer.flush();
  assert.equal(h.timers.size, 0);
  assert.equal(h.writer.hasPending, false);
});
