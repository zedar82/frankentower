import { runRundotImageManifest } from '../../../scripts/run-rundot-image-manifest.mjs';

runRundotImageManifest(
  process.argv[2] ?? 'output/art-direction/ui-pass/run-timber-prompt.json',
).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
