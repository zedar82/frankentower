import { readFile, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const job = JSON.parse(
  await readFile('output/art-direction/ui-pass/run-timber-prompt.json', 'utf8'),
);
try {
  await access('public/ui/button-timber-v1.png');
  console.log('Keeping existing button-timber-v1; use a new version for retries.');
  process.exit(0);
} catch {}
const child = spawn(
  process.env.RUNDOT_EXECUTABLE ?? 'C:/Users/msn/AppData/Local/Programs/Rundot/rundot.exe',
  [
    'generate',
    'image',
    '--game-id',
    'mjkCVhrId815cvHaoaqj',
    '--model',
    job.model,
    '--prompt',
    job.prompt,
    '--reference-image',
    job.reference,
    '--aspect-ratio',
    '1:1',
    '--out',
    'public/ui/button-timber-v1.png',
  ],
  { stdio: 'inherit', windowsHide: true },
);
child.once('error', (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.once('exit', (code) => (process.exitCode = code ?? 1));
