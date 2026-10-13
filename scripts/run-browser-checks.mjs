import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { resolve } from 'node:path';
const server = createServer();
await new Promise((yes, no) => {
  server.once('error', no);
  server.listen(0, '127.0.0.1', yes);
});
const port = server.address().port;
await new Promise((yes) => server.close(yes));
const url = `http://127.0.0.1:${port}/`;
const checkTimeout = Number(process.env.FRANKENTOWER_CHECK_TIMEOUT_MS ?? 120000);
if (!Number.isFinite(checkTimeout) || checkTimeout <= 0) throw new Error('Invalid check timeout');
const vite = spawn(
  process.execPath,
  [
    resolve('node_modules/vite/bin/vite.js'),
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
    '--strictPort',
    '--mode',
    'offline',
  ],
  { stdio: ['ignore', 'pipe', 'pipe'] },
);
let output = '';
let exited = false;
vite.stdout.on('data', (data) => {
  output = (output + data).slice(-8000);
});
vite.stderr.on('data', (data) => {
  output = (output + data).slice(-8000);
});
vite.once('exit', () => {
  exited = true;
});
vite.once('error', (error) => {
  output += error.message;
  exited = true;
});
let child;
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (exited) throw new Error(`Vite exited during startup: ${output}`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      ready = response.ok;
    } catch {}
    if (ready) break;
    await delay(200);
  }
  if (!ready) throw new Error(`Vite did not become ready: ${output}`);
  for (const check of process.env.FRANKENTOWER_CHECKS?.split(',') ?? [
    'browser',
    'arena',
    'puppet',
    'reliability',
  ]) {
    console.log(`Running ${check} check`);
    await new Promise((yes, no) => {
      child = spawn(process.execPath, [`scripts/${check}-check.mjs`], {
        stdio: 'inherit',
        env: { ...process.env, FRANKENTOWER_LOCAL_URL: url },
      });
      const timeout = setTimeout(() => {
        child.kill();
        no(new Error(`${check} check timed out`));
      }, checkTimeout);
      child.once('error', (error) => {
        clearTimeout(timeout);
        no(error);
      });
      child.once('exit', (code) => {
        clearTimeout(timeout);
        code === 0 ? yes() : no(new Error(`${check} check exited ${code}`));
      });
    });
  }
} finally {
  child?.kill();
  vite.kill();
}
