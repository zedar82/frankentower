import { readFile, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const job = JSON.parse(
  await readFile('output/art-direction/visual-target-pass/display-step-v2-prompt.json', 'utf8'),
);
try {
  await access(job.output);
  console.log('Keeping existing candidate; use a new version for retries.');
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
    '3:2',
    '--remove-background',
    '--remove-background-model',
    'birefnet',
    '--out',
    job.output,
  ],
  { stdio: 'inherit', windowsHide: true },
);
child.once('error', (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.once('exit', (code) => {
  process.exitCode = code ?? 1;
});
