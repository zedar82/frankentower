import { launchBrowser, artifact, localUrl } from './browser-support.mjs';
import assert from 'node:assert/strict';
const browser = await launchBrowser();
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(localUrl);
  await page.getByRole('dialog').waitFor();
  await page.evaluate(async () => {
    const { defaultSave, newRun } = await import('/src/game/run.ts');

    const save = defaultSave();
    save.run = newRun(8675309);
    save.settings.sound = false;
    localStorage.setItem('frankentower-save-v1', JSON.stringify(save));
  });
  await page.reload();
  await page.getByRole('button', { name: /Butcher’s Knife.*Choose/ }).click();
  await page.getByRole('button', { name: 'To the arena →' }).waitFor();
  await page.screenshot({ path: artifact('frankentower-desktop.png'), fullPage: true });
  const offers = await page.locator('.shop-card h3').allTextContents();
  console.log('Opening shop:', offers.join(', '));
  // Buy/equip, inspect, unequip, and equip again through real player controls.
  await page.locator('.buy-button').first().click();
  await page.locator('.equipment-slot.filled').last().click();
  await page.getByRole('button', { name: 'Move to tray' }).click();
  assert.ok((await page.locator('.tray-items button').count()) >= 1);
  await page.locator('.tray-items button').first().click();
  await page.locator('.equip-targets button').first().click();
  assert.equal(await page.getByRole('dialog').count(), 0);
  await page.getByRole('button', { name: 'Freeze stock', exact: true }).click();
  await page.waitForFunction(
    () => JSON.parse(localStorage.getItem('frankentower-save-v1')).run.shopFrozen,
  );
  const frozenOffers = await page.locator('.shop-card h3').allTextContents();
  await page.reload();
  assert.equal(
    await page
      .getByRole('button', { name: 'Unfreeze stock', exact: true })
      .getAttribute('aria-pressed'),
    'true',
  );
  await page.getByRole('button', { name: 'To the arena →' }).click();
  await page.getByRole('button', { name: '4×', exact: true }).click();
  await page.locator('.flow-card').waitFor({ timeout: 15000 });
  await page.locator('.flow-card').getByRole('button', { name: 'View battle log ↗' }).click();
  await page.getByRole('dialog').getByText('Equipment contribution').waitFor();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.locator('.flow-card').getByRole('button', { name: 'Continue →' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'To the arena →' }).waitFor();
  assert.deepEqual(await page.locator('.shop-card h3').allTextContents(), frozenOffers);
  await page.getByRole('button', { name: 'Unfreeze stock', exact: true }).click();
  // A later appointment exercises dynamic slots and equipment conversion.
  await page.evaluate(async () => {
    const { defaultSave, newRun, startRun } = await import('/src/game/run.ts');
    const { refreshStock } = await import('/src/game/shop.ts');
    const save = defaultSave();
    const run = newRun(8675309);
    startRun(run, 'knife');
    run.floor = 24;
    run.highest = 24;
    run.gold = 180;
    run.shopTier = 3;
    run.phase = 'result';
    refreshStock(run);
    // Scheduled surgery generates its own choices; this seed offers Octopod.
    run.rng = 1;
    save.run = run;
    save.settings.sound = false;
    localStorage.setItem('frankentower-save-v1', JSON.stringify(save));
  });
  await page.reload();
  await page.locator('.flow-card').getByRole('button', { name: 'Continue →' }).click();
  await page
    .locator('.procedure-card')
    .filter({ hasText: 'Octopod preparation' })
    .getByRole('button', { name: /Perform procedure/ })
    .click();
  assert.equal(
    await page
      .locator('.slot-group')
      .filter({ hasText: 'Feet' })
      .locator('.equipment-slot')
      .count(),
    6,
  );
  await page.getByRole('button', { name: 'Continue to supplies →' }).click();
  await page.screenshot({ path: artifact('frankentower-grafted.png'), fullPage: true });
  const mobile = await context.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.setViewportSize({ width: 390, height: 844 });
  mobile.on('pageerror', (error) => errors.push(error.message));
  await mobile.goto(localUrl);
  await mobile.getByRole('button', { name: 'To the arena →' }).waitFor();
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await mobile.getByRole('button', { name: 'To the arena →' }).scrollIntoViewIfNeeded();
  assert.ok(await mobile.getByRole('button', { name: 'To the arena →' }).isVisible());
  await mobile.waitForTimeout(250);
  await mobile.screenshot({ path: artifact('frankentower-mobile.png'), fullPage: true });
  await mobile.getByRole('button', { name: 'How to play' }).click();
  await mobile.getByRole('dialog').waitFor();
  await mobile.keyboard.press('Escape');
  assert.equal(await mobile.getByRole('dialog').count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    'PASS: onboarding, purchase/equip, combat, report, reload, surgery, desktop/mobile layout, dialogs.',
  );
} finally {
  await browser.close();
}
