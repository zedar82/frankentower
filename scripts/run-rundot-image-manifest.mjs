import { access, mkdir, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';

const DEFAULT_GAME_ID = 'mjkCVhrId815cvHaoaqj';
const DEFAULT_MANIFEST =
  'output/art-direction/visual-target-pass/alcove-prompt.json';

function validateJob(job, index) {
  const label = typeof job?.id === 'string' && job.id ? job.id : `job ${index + 1}`;
  const errors = [];
  if (!job || typeof job !== 'object' || Array.isArray(job)) {
    throw new Error(`Invalid RUN image manifest: ${label} must be an object.`);
  }
  if (typeof job.id !== 'string' || !job.id.trim()) errors.push('id must be a non-empty string');
  if (typeof job.model !== 'string' || !job.model.trim())
    errors.push('model must be a non-empty string');
  if (typeof job.prompt !== 'string' || !job.prompt.trim())
    errors.push('prompt must be a non-empty string');
  if (typeof job.output !== 'string' || !job.output.trim())
    errors.push('output must be a non-empty path');
  if (job.reference !== undefined && (typeof job.reference !== 'string' || !job.reference.trim()))
    errors.push('reference must be a non-empty path when supplied');
  if (job.aspectRatio !== undefined && !/^\d+:\d+$/.test(job.aspectRatio))
    errors.push('aspectRatio must use a ratio such as 1:1 or 3:2');
  if (job.removeBackground !== undefined && typeof job.removeBackground !== 'boolean')
    errors.push('removeBackground must be boolean');
  if (job.removeBackground && typeof job.backgroundRemoval !== 'string')
    errors.push('backgroundRemoval is required when removeBackground is true');
  if (job.quotedCredits !== undefined && (!Number.isFinite(job.quotedCredits) || job.quotedCredits < 0))
    errors.push('quotedCredits must be a non-negative number');
  if (errors.length) throw new Error(`Invalid RUN image manifest ${label}: ${errors.join('; ')}.`);
  return job;
}

function jobsFrom(manifest) {
  const jobs = Array.isArray(manifest) ? manifest : Array.isArray(manifest?.jobs) ? manifest.jobs : [manifest];
  if (jobs.length === 0) throw new Error('Invalid RUN image manifest: no jobs found.');
  const validated = jobs.map(validateJob);
  const outputs = validated.map((job) => resolve(job.output));
  if (new Set(outputs).size !== outputs.length)
    throw new Error('Invalid RUN image manifest: output paths must be unique.');
  return validated;
}

async function runJob(job) {
  const output = resolve(job.output);
  try {
    await access(output);
    console.log(`Keeping existing ${job.id}; use a new version for retries.`);
    return;
  } catch {}

  await mkdir(dirname(output), { recursive: true });
  const args = [
    'generate',
    'image',
    '--game-id',
    process.env.FRANKENTOWER_RUN_GAME_ID ?? DEFAULT_GAME_ID,
    '--model',
    job.model,
    '--prompt',
    job.prompt,
  ];
  if (job.reference) args.push('--reference-image', job.reference);
  args.push('--aspect-ratio', job.aspectRatio ?? '1:1');
  if (job.removeBackground)
    args.push('--remove-background', '--remove-background-model', job.backgroundRemoval);
  args.push('--out', job.output);

  const executable = process.env.RUNDOT_EXECUTABLE ?? 'rundot';
  await new Promise((resolveJob, rejectJob) => {
    const child = spawn(executable, args, { stdio: 'inherit', windowsHide: true });
    child.once('error', rejectJob);
    child.once('exit', (code) =>
      code === 0 ? resolveJob() : rejectJob(new Error(`${job.id} exited with code ${code ?? 1}.`)),
    );
  });
}

export async function runRundotImageManifest(path = DEFAULT_MANIFEST, { validateOnly = false } = {}) {
  const manifest = JSON.parse(await readFile(path, 'utf8'));
  const jobs = jobsFrom(manifest);
  if (validateOnly) {
    console.log(`Validated ${jobs.length} RUN image job${jobs.length === 1 ? '' : 's'} in ${path}.`);
    return;
  }
  for (const job of jobs) await runJob(job);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const validateOnly = process.argv.includes('--validate-only');
  const manifest = process.argv.slice(2).find((arg) => arg !== '--validate-only') ?? DEFAULT_MANIFEST;
  runRundotImageManifest(manifest, { validateOnly }).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
