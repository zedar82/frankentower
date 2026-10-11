import { launchBrowser, artifact, localUrl } from './browser-support.mjs';
import assert from 'node:assert/strict';
const browser = await launchBrowser();
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.log('Browser error:', m.text().slice(0, 250));
});
try {
  await page.goto(process.env.FRANKENTOWER_PLAYGROUND_URL ?? 'http://127.0.0.1:5174/');
  await page.locator('.main-header .save-status').waitFor({ timeout: 60000 });
  if (await page.locator('.starter-view').count())
    await page.getByRole('button', { name: /Heavy Club.*Choose/ }).click();
  await page.getByRole('button', { name: 'Equipment & satchel ↗' }).click();
  // Reuse this test's saved opening patient without discarding existing progress.
  assert.equal(
    await page.locator('.equipment-slot.filled').filter({ hasText: 'Heavy Club' }).count(),
    1,
    'Use an empty Playground test profile or this check’s Heavy Club patient.',
  );
  await page.getByRole('button', { name: 'Close dialog' }).click();
  const soundToggle = page.getByRole('button', { name: /^(Mute sound|Enable sound)$/ });
  await soundToggle.click();
  await soundToggle.click();
  await page.getByText('Cloud save', { exact: true }).waitFor({ timeout: 15000 });
  await page.getByRole('button', { name: 'To the arena →' }).waitFor();
  await page.getByText('Cloud save', { exact: true }).waitFor({ timeout: 30000 });
  await page.reload();
  await page.getByRole('button', { name: 'To the arena →' }).waitFor({ timeout: 30000 });
  assert.equal(await page.getByRole('dialog').count(), 0);
  await page.getByRole('button', { name: 'Equipment & satchel ↗' }).click();
  assert.equal(
    await page.locator('.equipment-slot.filled').filter({ hasText: 'Heavy Club' }).count(),
    1,
  );
  await page.getByRole('button', { name: 'Close dialog' }).click();
  assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight));
  const safeArea = await page.evaluate(() => {
    return Object.entries(window.RundotGameAPI.system.getSafeArea()).map(([side, amount]) => [
      amount,
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue(`--safe-${side}`)),
    ]);
  });
  assert.equal(safeArea.length, 4);
  for (const [reported, applied] of safeArea) assert.equal(applied, reported);
  await page.screenshot({ path: artifact('frankentower-playground.png'), fullPage: true });
  assert.deepEqual(errors, []);
  console.log(
    'PASS: RUN Playground initialization, identity, cloud write, reload, cloud read, safe area.',
  );
} catch (e) {
  await page.screenshot({ path: artifact('frankentower-playground-error.png'), fullPage: true });
  console.log('Page text:', (await page.locator('body').innerText()).slice(0, 2500));
  throw e;
} finally {
  await browser.close();
}
