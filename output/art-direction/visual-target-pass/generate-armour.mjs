import { readFile, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const jobs = JSON.parse(
  await readFile(process.argv[2] ?? 'output/art-direction/visual-target-pass/armour-prompts.json', 'utf8'),
);
for (const job of jobs) {
  try {
    await access(job.output);
    console.log('Keeping ' + job.id);
    continue;
  } catch {}
  await new Promise((resolve, reject) => {
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
        '--remove-background',
        '--remove-background-model',
        'birefnet',
        '--out',
        job.output,
      ],
      { stdio: 'inherit', windowsHide: true },
    );
    child.once('error', reject);
    child.once('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(job.id + ' exited ' + code)),
    );
  });
}
