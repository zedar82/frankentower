import { readFile, mkdir, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const directory = 'output/art-direction/run-generation-study/style-reference-v2';
const manifest = JSON.parse(await readFile(directory + '/prompts.json', 'utf8'));
await mkdir(directory + '/sources', { recursive: true });
let lastStarted = 0;
for (const job of manifest.jobs) {
  if (job.references.length !== 1) throw new Error('This study requires exactly one style reference.');
  const out = directory + '/sources/' + job.id + '.png';
  try { await access(out); console.log('Keeping existing ' + job.id); continue; } catch {}
  const delay = Math.max(0, 65000 - (Date.now() - lastStarted));
  if (delay) await new Promise(resolve => setTimeout(resolve, delay));
  lastStarted = Date.now();
  console.log('Generating ' + job.id + ' (quoted ' + job.credits + ' credits)');
  const args = ['generate', 'image', '--game-id', 'mjkCVhrId815cvHaoaqj',
    '--model', manifest.model, '--prompt', job.prompt, '--aspect-ratio', job.aspectRatio,
    '--reference-image', job.references[0], '--out', out];
  if (job.removeBackground) args.push('--remove-background', '--remove-background-model', manifest.backgroundRemoval);
  await new Promise((resolve, reject) => {
    const child = spawn('C:/Users/msn/AppData/Local/Programs/Rundot/rundot.exe', args, { stdio: 'inherit', windowsHide: true });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(job.id + ' failed: ' + code)));
  });
}
