import { launchBrowser, artifact } from './browser-support.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const supplied =
  process.env.FRANKENTOWER_PREVIEW_URL ??
  (process.env.FRANKENTOWER_PREVIEW_URL_FILE
    ? readFileSync(process.env.FRANKENTOWER_PREVIEW_URL_FILE, 'utf8').trim()
    : undefined);
if (!supplied)
  throw new Error(
    'Set FRANKENTOWER_PREVIEW_URL or FRANKENTOWER_PREVIEW_URL_FILE to the private RUN share link.',
  );
const url = new URL(supplied);
// Bypass the mobile app handoff, retaining the private share key.
if (url.hostname === 'w.run') {
  const [, , gameId, tag] = url.pathname.split('/');
  url.hostname = 'run.world';
  url.pathname = `/catalog/game/${gameId}`;
  url.searchParams.set('tag', tag);
}
if (url.searchParams.get('tag') !== 'private' || !url.searchParams.has('k'))
  throw new Error(
    'Hosted checks require a private catalog link with tag=private and its share key.',
  );
const browser = await launchBrowser();
// A fresh isolated context deliberately does not reuse the developer's real profile.
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
async function findGame() {
  for (let i = 0; i < 90; i++) {
    for (const frame of page.frames()) {
      if (frame === page.mainFrame() || !(await frame.locator('.main-header .save-status').count()))
        continue;
      const box = await (await frame.frameElement()).boundingBox();
      if (box && box.width > 0 && box.height > 0) return frame;
    }
    await page.waitForTimeout(800);
  }
  throw new Error(
    'RUN did not expose a visible game frame. Verify the private link and test-profile access.',
  );
}
try {
  await page.goto(url.href, { waitUntil: 'domcontentloaded' });
  let game = await findGame();
  if (!(await game.getByRole('button', { name: /Butcher’s Knife.*Choose/ }).count()))
    throw new Error('Test profile already has a run; refusing to overwrite it.');
  await game.getByRole('button', { name: /Butcher’s Knife.*Choose/ }).click();
  await game.getByRole('button', { name: 'To the arena →' }).waitFor();
  const boughtName = await game.locator('.shop-card h3').first().innerText();
  await game.locator('.buy-button').first().click();
  await game.getByText('Cloud save', { exact: true }).waitFor({ timeout: 30000 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  game = await findGame();
  await game.getByRole('button', { name: 'To the arena →' }).waitFor();
  assert.ok(
    (await game.locator('.equipment-slot.filled').allTextContents()).some((text) =>
      text.includes(boughtName),
    ),
    'purchased equipment must reload from cloud storage',
  );
  await game.getByRole('button', { name: 'To the arena →' }).click();
  await game.getByRole('button', { name: '4×', exact: true }).click();
  await game
    .locator('.flow-card')
    .getByRole('button', { name: 'Continue →' })
    .waitFor({ timeout: 30000 });
  await game.getByText('Cloud save', { exact: true }).waitFor({ timeout: 30000 });
  await page.screenshot({ path: artifact('frankentower-hosted.png'), fullPage: true });
  await game.locator('.flow-card').getByRole('button', { name: 'Continue →' }).click();
  await game.getByRole('button', { name: 'To the arena →' }).waitFor();
  await game.getByText('Cloud save', { exact: true }).waitFor({ timeout: 30000 });
  await page.reload({ waitUntil: 'domcontentloaded' });
  game = await findGame();
  await game.getByRole('button', { name: 'To the arena →' }).waitFor();
  await game.getByText('FLOOR 02', { exact: true }).waitFor();
  assert.ok(
    (await game.locator('.equipment-slot.filled').allTextContents()).some((text) =>
      text.includes(boughtName),
    ),
  );
  await game.getByRole('button', { name: 'To the arena →' }).click();
  await game.getByRole('button', { name: 'Pause combat', exact: true }).click();
  assert.ok(
    (await game.getByRole('button', { name: '4×', exact: true }).getAttribute('class')).includes(
      'active',
    ),
    'combat speed must reload from cloud storage',
  );
  assert.deepEqual(errors, []);
  console.log(
    'PASS: private hosted boot, purchase/cloud reload, combat, saved speed and floor-2/cloud reload in a disposable browser profile.',
  );
} catch (error) {
  await page
    .screenshot({ path: artifact('frankentower-hosted-error.png'), fullPage: true })
    .catch(() => {});
  // Frame URLs and page text can contain private keys or account information.
  console.log('Host frame count:', page.frames().length, 'browser error count:', errors.length);
  throw new Error(
    error instanceof Error
      ? error.message.replace(/https?:\/\/\S+/g, '[private URL]')
      : 'Hosted check failed.',
  );
} finally {
  await browser.close();
}
