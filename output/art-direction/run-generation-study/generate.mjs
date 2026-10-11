import { readFile, mkdir, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const directory = 'output/art-direction/run-generation-study';
const manifest = JSON.parse(await readFile(directory + '/prompts.json', 'utf8'));
await mkdir(directory + '/sources', { recursive: true });
for (const job of manifest.jobs) {
  const out = directory + '/sources/' + job.id + '.png';
  try { await access(out); console.log('Keeping existing ' + job.id); continue; } catch {}
  // RUN limits generation starts; give successive requests room to finish.
  await new Promise(resolve => setTimeout(resolve, 30000));
  console.log('Generating ' + job.id + ' (quoted ' + job.credits + ' credits)');
  const args = ['generate', 'image', '--game-id', 'mjkCVhrId815cvHaoaqj',
    '--model', manifest.model, '--prompt', job.prompt, '--aspect-ratio', job.aspectRatio,
    '--out', out];
  for (const reference of job.references) args.push('--reference-image', reference);
  if (job.removeBackground) args.push('--remove-background', '--remove-background-model', manifest.backgroundRemoval);
  await new Promise((resolve, reject) => {
    const child = spawn('C:/Users/msn/AppData/Local/Programs/Rundot/rundot.exe', args, { stdio: 'inherit', windowsHide: true });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(job.id + ' failed: ' + code)));
  });
}
