import { runRundotImageManifest } from '../../../scripts/run-rundot-image-manifest.mjs';

runRundotImageManifest(
  process.argv[2] ?? 'output/art-direction/visual-target-pass/display-step-v2-prompt.json',
).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
