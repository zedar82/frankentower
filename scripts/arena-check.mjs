import { launchBrowser, artifact, localUrl } from './browser-support.mjs';
import assert from 'node:assert/strict';
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
try {
  await page.goto(localUrl);
  await page.locator('.main-header').waitFor();
  await page.evaluate(async () => {
    const { defaultSave, newRun, startRun } = await import('/src/game/run.ts');
    const { refreshStock } = await import('/src/game/shop.ts');
    const { ITEM_MAP } = await import('/src/game/content.ts');
    const { stats } = await import('/src/game/anatomy.ts');
    const save = defaultSave(),
      run = newRun(7581);
    startRun(run, 'club');
    run.build.parts.find((p) => p.item).item.defId = 'maul';
    run.floor = 39;
    run.highest = 38;
    run.gold = 94;
    run.shopTier = 3;
    run.build.name = 'Agnes';
    const slots = [
      'hand',
      'hand',
      'hand',
      'hand',
      'head',
      'foot',
      'foot',
      'foot',
      'foot',
      'foot',
      'foot',
      'heart',
      'heart',
    ];
    slots.forEach((slot, i) =>
      run.build.parts.push({ uid: `fixture-${i}`, slot, variant: 'living' }),
    );
    [
      'knife',
      'shield',
      'bonewand',
      'horns',
      'hood',
      'heart',
      'heart',
      'runners',
      'ironboots',
    ].forEach((id, i) => {
      const p = run.build.parts.find((p) => p.slot === ITEM_MAP[id].slot && !p.item);
      if (p) p.item = { uid: `fixture-item-${i}`, defId: id, level: 1 };
    });
    // Keep this movement/inspection fixture alive independently of screenshot latency.
    run.build.healthFactor = 20;
    run.build.powerFactor = 0.1;
    run.hp = stats(run.build).maxHp;
    refreshStock(run);
    save.run = run;
    save.settings.sound = false;
    save.settings.speed = 1;
    localStorage.setItem('frankentower-save-v1', JSON.stringify(save));
  });
  await page.reload();
  await page.getByRole('button', { name: 'To the arena →' }).waitFor();
  await page.screenshot({ path: artifact('frankentower-pixel-loadout.png'), fullPage: true });
  await page.getByRole('button', { name: 'To the arena →' }).click();
  const before = await page.locator('.actor-target').first().boundingBox();
  await page.waitForTimeout(1800);
  const after = await page.locator('.actor-target').first().boundingBox();
  assert.ok(
    Math.hypot(after.x - before.x, after.y - before.y) > 20,
    'fighters must physically move',
  );
  await page.screenshot({ path: artifact('frankentower-pixel-arena.png'), fullPage: true });
  await page.getByRole('button', { name: 'Pause combat', exact: true }).first().click();
  const time = await page.locator('.battle-clock').innerText();
  await page.waitForTimeout(300);
  assert.equal(await page.locator('.battle-clock').innerText(), time);
  await page.locator('.actor-target').last().click();
  await page.getByRole('dialog', { name: 'Build inspection' }).waitFor();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: artifact('frankentower-pixel-arena-mobile.png'), fullPage: true });
  assert.equal(
    await page.locator('.anatomy-panel').count(),
    0,
    'build panels leave the screen during combat',
  );
  await page.getByRole('button', { name: 'Resume combat', exact: true }).first().click();
  await page.waitForTimeout(600);
  assert.notEqual(await page.locator('.battle-clock').innerText(), time);
  assert.deepEqual(errors, []);
  console.log(
    'PASS: spatial movement, pixel arena, pause/resume, actor inspection, desktop/mobile composition, no browser errors.',
  );
} finally {
  await browser.close();
}
