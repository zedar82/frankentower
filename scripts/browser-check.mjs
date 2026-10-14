import { launchBrowser, artifact, localUrl } from './browser-support.mjs';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const browserZoom = Number(process.env.FRANKENTOWER_BROWSER_ZOOM ?? 1);
assert.ok(Number.isFinite(browserZoom) && browserZoom > 0, 'browser zoom must be positive');
const browser = browserZoom === 1 ? await launchBrowser() : undefined;
let zoomContext;
const physicalSize = ({ width, height }) => ({
  width: Math.round(width * browserZoom),
  height: Math.round(height * browserZoom),
});
async function resizeViewport(page, size) {
  await page.setViewportSize(physicalSize(size));
  const actual = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  assert.ok(Math.abs(actual.width - size.width) <= 1 && Math.abs(actual.height - size.height) <= 1);
}
async function openUtility(page, name) {
  const control = page.getByRole('button', { name, exact: true });
  if (!(await control.isVisible()))
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name, exact: true }).click();
}
try {
  const options = {
    viewport: physicalSize({ width: 1440, height: 1080 }),
    reducedMotion: 'reduce',
  };
  const context = browser
    ? await browser.newContext(options)
    : (zoomContext = await chromium.launchPersistentContext('', {
        ...options,
        headless: true,
        ...(process.env.FRANKENTOWER_BROWSER_EXECUTABLE
          ? { executablePath: process.env.FRANKENTOWER_BROWSER_EXECUTABLE }
          : {}),
      }));
  if (browserZoom !== 1) {
    // Chrome requires a persistent profile for its settings page. The temporary
    // profile is isolated from the developer's browser and removed on close.
    const settings = await context.newPage();
    await settings.goto('chrome://settings/appearance');
    await settings.evaluate(
      (zoom) => new Promise((resolve) => chrome.settingsPrivate.setDefaultZoom(zoom, resolve)),
      browserZoom,
    );
    await settings.close();
    console.log(`Actual Chrome browser zoom: ${browserZoom * 100}%`);
  }
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
  await page
    .locator('.equipment-category.socket-hand:visible, .short-equipment-summary:visible')
    .click();
  await page.locator('.equipment-slot.filled').last().click();
  await page.getByRole('button', { name: 'Move to satchel' }).click();
  assert.ok((await page.locator('.tray-items button').count()) >= 1);
  await page.locator('.tray-items button').first().click();
  await page.locator('.equipment-slot:not(.filled)').first().click();
  await page.getByRole('button', { name: 'Close dialog' }).click();
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
  await page.getByLabel('Battle report', { exact: true }).selectOption('Contribution');
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
  await page.getByLabel('Available procedures').selectOption({ label: 'Octopod preparation' });
  await page.getByRole('button', { name: /Perform procedure/ }).click();
  await page.getByRole('button', { name: 'Manage equipment' }).click();
  await page.getByLabel('Equipment category').selectOption('foot');
  assert.equal(await page.locator('.equipment-slot').count(), 6);
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Continue to supplies →' }).click();
  await page.screenshot({ path: artifact('frankentower-grafted.png'), fullPage: true });
  const mobile = await context.newPage();
  await resizeViewport(mobile, { width: 390, height: 844 });
  mobile.on('pageerror', (error) => errors.push(error.message));
  await mobile.goto(localUrl);
  await mobile.getByRole('button', { name: 'To the arena →' }).waitFor();
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollHeight <= innerHeight));
  assert.ok(await mobile.getByRole('button', { name: 'To the arena →' }).isVisible());
  await mobile.waitForTimeout(250);
  await mobile.screenshot({ path: artifact('frankentower-mobile.png'), fullPage: true });
  await openUtility(mobile, 'How to play');
  await mobile.getByRole('dialog').waitFor();
  await mobile.keyboard.press('Escape');
  assert.equal(await mobile.getByRole('dialog').count(), 0);
  // The UI contract covers every core workspace, including short landscape and large anatomy.
  async function fits(label) {
    await mobile.waitForTimeout(100);
    const failures = await mobile.evaluate(() => {
      const root =
        document.querySelector('[role="dialog"]') ?? document.querySelector('.app-shell');
      const issues = [];
      if (
        document.documentElement.scrollWidth > innerWidth + 2 ||
        document.documentElement.scrollHeight > innerHeight + 2
      )
        issues.push('document scrolls');
      for (const element of [root, ...root.querySelectorAll('*')]) {
        if (
          !element.clientHeight ||
          getComputedStyle(element).visibility === 'hidden' ||
          element.closest('.text-measure, .combat-transcript')
        )
          continue;
        if (
          element.scrollHeight > element.clientHeight + 2 ||
          element.scrollWidth > element.clientWidth + 2
        )
          issues.push(
            `${element.className || element.tagName}: content exceeds ${element.clientWidth}x${element.clientHeight}`,
          );
        if (element.matches('button, select, a')) {
          const rect = element.getBoundingClientRect();
          if (element.matches('button, select') && (rect.width < 42 || rect.height < 42))
            issues.push(
              `${element.getAttribute('aria-label') || element.textContent}: touch target ${rect.width}x${rect.height} below 44px allowance`,
            );
          if (
            rect.bottom > innerHeight + 2 ||
            rect.right > innerWidth + 2 ||
            rect.top < -2 ||
            rect.left < -2
          )
            issues.push(`${element.textContent}: outside viewport`);
        }
      }
      for (const card of root.querySelectorAll('.shop-card, .workshop-scene')) {
        const fields = [...card.children]
          .filter((e) => e.clientHeight)
          .map((e) => ({
            name: e.className,
            rect: e.getBoundingClientRect(),
          }));
        for (let i = 0; i < fields.length; i++)
          for (let j = i + 1; j < fields.length; j++) {
            const a = fields[i].rect,
              b = fields[j].rect;
            if (
              Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 &&
              Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2
            )
              issues.push(`${fields[i].name} overlaps ${fields[j].name}`);
          }
      }
      return issues;
    });
    if (failures.length) await mobile.screenshot({ path: artifact('ui-contract-failure.png') });
    assert.deepEqual(failures, [], label);
  }
  async function fixture(kind) {
    await mobile.evaluate(async (kind) => {
      const { defaultSave, newRun, startRun } = await import('/src/game/run.ts');
      const { stats } = await import('/src/game/anatomy.ts');
      const { ITEMS } = await import('/src/game/content.ts');
      const { describeItemRules } = await import('/src/game/descriptions.ts');
      const save = defaultSave(),
        run = newRun(8675309);
      if (kind !== 'start') startRun(run, 'knife');
      run.gold = 180;
      if (kind === 'extreme' || kind === 'headless') {
        for (const [slot, amount] of [
          ['head', 6],
          ['hand', 40],
          ['foot', 24],
          ['heart', 6],
        ])
          for (let i = 0; i < amount; i++)
            run.build.parts.push({
              uid: `extra-${slot}-${i}`,
              slot,
              variant: ['living', 'rat', 'bone', 'clockwork'][i % 4],
            });
        run.stash = Array.from({ length: 8 }, (_, i) => ({
          uid: `bag-${i}`,
          defId: 'knife',
          level: i < 2 ? 2 : 1,
        }));
        run.build.parts.find((p) => p.item).item.level = 2;
        const longest = [...ITEMS].sort(
          (a, b) => describeItemRules(b, 3).length - describeItemRules(a, 3).length,
        )[0];
        run.offers[0] = { uid: 'long-offer', defId: longest.id, level: 3 };
        run.offers[1] = { uid: 'full-bag-purchase', defId: 'knife', level: 1 };
        if (kind === 'headless') {
          run.build.parts = run.build.parts.filter((part) => part.slot !== 'head');
          run.build.parts.find((part) => part.slot === 'heart').variant = 'ganglion';
        }
        run.hp = stats(run.build).maxHp;
      }
      if (kind === 'blocked') {
        run.stash = Array.from({ length: 8 }, (_, i) => ({
          uid: `full-${i}`,
          defId: 'knife',
          level: 1,
        }));
        run.build.parts
          .filter((part) => part.slot === 'hand')
          .forEach((part, i) => {
            part.item = { uid: `occupied-hand-${i}`, defId: 'knife', level: 1 };
          });
        run.offers = Array.from({ length: 4 }, (_, i) => ({
          uid: `blocked-offer-${i}`,
          defId: 'knife',
          level: 1,
        }));
      }
      if (kind === 'surgery') {
        run.floor = 24;
        run.highest = 24;
        run.phase = 'result';
        run.rng = 1;
      }
      if (['dead', 'complete', 'checkpoint', 'retired'].includes(kind)) {
        run.floor = kind === 'complete' ? 100 : 20;
        run.highest = run.floor;
        run.phase = kind;
        run.lastReport = {
          floor: run.floor,
          seed: run.seed,
          outcome: kind === 'dead' ? 'defeat' : 'victory',
          duration: 1,
          patient: {
            build: structuredClone(run.build),
            hp: run.hp,
            maxHp: stats(run.build).maxHp,
            mana: stats(run.build).maxMana,
            maxMana: stats(run.build).maxMana,
            damage: 0,
            healing: 0,
          },
          enemies: [],
          contributions: [],
          suppressed: 0,
          transcript: [],
          transcriptTruncated: false,
        };
      }
      save.run = run;
      save.settings.sound = false;
      save.records = Array.from({ length: 12 }, (_, i) => ({
        name: 'Patient ' + i,
        floor: 20,
        build: structuredClone(run.build),
        reason: 'Retired',
      }));
      save.achievements = ['Mostly Armless', 'Hop to It', 'Headless Horseman', 'Well-Heeled'];
      localStorage.setItem('frankentower-save-v1', JSON.stringify(save));
    }, kind);
    await mobile.reload();
  }
  for (const [width, height] of [
    [360, 640],
    [390, 844],
    [390, 796], // Private host chrome leaves a shorter portrait game frame.
    [360, 750],
    [360, 700], // Equipment rail must yield before it overlaps the satchel.
    [844, 390],
    [844, 342], // RUN web toolbar reduces the landscape game frame.
    [1280, 720],
    [1440, 900],
    [768, 1024],
    [1024, 576],
    [320, 568],
  ]) {
    await resizeViewport(mobile, { width, height });
    await fixture('start');
    await fits(`start ${width}x${height}`);
    const visualReview = (width === 390 && height === 844) || (width === 1440 && height === 900);
    if (visualReview) await mobile.screenshot({ path: artifact(`start-${width}x${height}.png`) });
    if (!(await mobile.getByRole('button', { name: /Butcher.*Knife.*Choose/ }).count()))
      await mobile.getByRole('button', { name: 'Next page', exact: true }).click();
    await mobile.getByRole('button', { name: /Butcher.*Knife.*Choose/ }).click();
    await fits(`shop ${width}x${height}`);
    if (visualReview) await mobile.screenshot({ path: artifact(`shop-${width}x${height}.png`) });
    assert.equal(await mobile.locator('.shop-creature:visible').count(), 1);
    assert.equal(await mobile.locator('.offer-position:visible').count(), 4);
    const sceneHeight = await mobile.locator('.workshop-scene').evaluate((e) => e.clientHeight);
    assert.equal(
      await mobile.locator('.equipment-category:visible').count(),
      width <= 680 && (height < 700 || sceneHeight <= 326) ? 0 : 5,
    );
    assert.equal(await mobile.locator('.satchel-cells > span').count(), 8);
    await mobile.getByRole('button', { name: 'Effect icon guide', exact: true }).click();
    await fits(`effect icon guide ${width}x${height}`);
    const nextIconPage = mobile.getByRole('button', { name: 'Next icon guide page', exact: true });
    while ((await nextIconPage.count()) && (await nextIconPage.isEnabled())) {
      await nextIconPage.click();
      await fits(`effect icon guide page ${width}x${height}`);
    }
    await mobile.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await mobile.getByRole('button', { name: 'Patient services', exact: true }).click();
    await fits(`services ${width}x${height}`);
    await mobile.getByRole('button', { name: 'Close dialog' }).click();
    await mobile.locator('.buy-button:visible').first().click();
    await fits(`purchased stock position ${width}x${height}`);
    await fixture('blocked');
    await fits(`full satchel purchase reason ${width}x${height}`);
    if (width === 844 && height === 342)
      await mobile.screenshot({ path: artifact('ui-blocked-stock-landscape.png') });
    assert.equal(await mobile.locator('.buy-button:visible').first().isEnabled(), false);
    await mobile.locator('.card-info:visible').first().click();
    await fits(`blocked item inspection ${width}x${height}`);
    await mobile.getByRole('button', { name: 'Buy into slot…', exact: true }).click();
    await fits(`blocked equipment destinations ${width}x${height}`);
    if (width === 844 && height === 342)
      await mobile.screenshot({ path: artifact('ui-blocked-equipment-landscape.png') });
    await mobile.getByRole('button', { name: 'Close dialog' }).click();
    await fixture('extreme');
    await fits(`extreme shop ${width}x${height}`);
    await mobile
      .locator('.equipment-category.socket-hand:visible, .short-equipment-summary:visible')
      .click();
    await fits(`equipment ${width}x${height}`);
    if (visualReview)
      await mobile.screenshot({ path: artifact(`equipment-${width}x${height}.png`) });
    await mobile.getByRole('button', { name: /Next hands page/ }).click();
    await fits(`extra hand slots ${width}x${height}`);
    await mobile.getByLabel('Equipment category').selectOption('head');
    await fits(`extra heads ${width}x${height}`);
    await mobile.getByLabel('Equipment category').selectOption('hand');
    while (await mobile.getByRole('button', { name: /Previous hands page/ }).isEnabled())
      await mobile.getByRole('button', { name: /Previous hands page/ }).click();
    await mobile.locator('.equipment-slot.filled').first().click();
    await fits(`equipped item ${width}x${height}`);
    for (const section of ['Signature', 'About', 'Rules']) {
      await mobile.getByRole('button', { name: section, exact: true }).click();
      await fits(`item ${section} ${width}x${height}`);
    }
    await mobile.getByRole('button', { name: 'Close dialog' }).click();
    await fixture('headless');
    await fits(`headless ${width}x${height}`);
    for (const name of ['How to play', 'Hall of Shame', 'Settings']) {
      await openUtility(mobile, name);
      await fits(`${name} ${width}x${height}`);
      if (visualReview && name === 'How to play')
        await mobile.screenshot({ path: artifact(`help-${width}x${height}.png`) });
      if (name === 'Hall of Shame') {
        await mobile.getByRole('button', { name: 'Patients', exact: true }).click();
        await fits(`history ${width}x${height}`);
        await mobile.locator('.record-entry').first().click();
        await fits(`build ${width}x${height}`);
        for (const section of ['Equipment', 'Abilities', 'Anatomy']) {
          await mobile.getByRole('button', { name: section, exact: true }).click();
          await fits(`build ${section} ${width}x${height}`);
        }
      }
      await mobile.getByRole('button', { name: 'Close dialog' }).click();
    }
    await mobile.getByRole('button', { name: 'Patient services', exact: true }).click();
    while (!(await mobile.getByRole('button', { name: 'Equipment index →' }).count()))
      await mobile.getByRole('button', { name: 'Next services page', exact: true }).click();
    await mobile.getByRole('button', { name: 'Equipment index →' }).click();
    await fits(`catalogue ${width}x${height}`);
    await mobile.locator('.catalogue-item').first().click();
    await fits(`catalogue item ${width}x${height}`);
    await mobile.getByRole('button', { name: 'Close dialog' }).click();
    await fixture('surgery');
    await mobile
      .locator('.flow-card')
      .getByRole('button', { name: /Continue/ })
      .click();
    await fits(`surgery ${width}x${height}`);
    if ((width === 390 && height === 844) || (width === 1440 && height === 900))
      await mobile.screenshot({ path: artifact(`surgery-${width}x${height}.png`) });
    for (const section of ['Procedure', 'Changes']) {
      await mobile
        .locator('.procedure-review-actions')
        .getByRole('button', { name: section, exact: true })
        .click();
      await fits(`surgery ${section} ${width}x${height}`);
      await mobile.getByRole('button', { name: 'Close dialog', exact: true }).click();
    }
    await mobile.getByRole('button', { name: 'Proposed', exact: true }).click();
    await fits(`proposed anatomy ${width}x${height}`);
    for (const kind of ['dead', 'complete', 'retired', 'checkpoint']) {
      await fixture(kind);
      await fits(`${kind} outcome ${width}x${height}`);
      if (visualReview)
        await mobile.screenshot({ path: artifact(`${kind}-${width}x${height}.png`) });
    }
    await mobile.locator('.flow-card').getByRole('button', { name: 'View battle log ↗' }).click();
    await fits(`report ${width}x${height}`);
    for (const section of ['Contribution', 'Patient', 'Enemies', 'Transcript']) {
      await mobile.getByLabel('Battle report', { exact: true }).selectOption(section);
      await fits(`report ${section} ${width}x${height}`);
    }
    await mobile.screenshot({ path: artifact(`ui-contract-${width}x${height}.png`) });
    await mobile.getByRole('button', { name: 'Close dialog' }).click();
  }
  await resizeViewport(mobile, { width: 360, height: 640 });
  await fixture('extreme');
  await mobile.getByRole('button', { name: /Buy Butcher.*Knife/ }).click();
  await mobile.waitForFunction(
    () => JSON.parse(localStorage.getItem('frankentower-save-v1')).run.purchases === 1,
  );
  assert.equal(
    await mobile.evaluate(
      () => JSON.parse(localStorage.getItem('frankentower-save-v1')).run.stash.length,
    ),
    8,
  );
  await mobile
    .locator('.equipment-category.socket-hand:visible, .short-equipment-summary:visible')
    .click();
  await mobile.locator('.equipment-slot.filled').first().click();
  await mobile.getByRole('button', { name: /Combine.*Lv3/ }).click();
  await mobile.getByRole('button', { name: 'Satchel', exact: true }).click();
  await mobile.locator('.tray-items button').first().click();
  await mobile.getByRole('button', { name: 'Inspect', exact: true }).click();
  await mobile.getByRole('button', { name: /Sell for/ }).click();
  await mobile.waitForFunction(
    () => JSON.parse(localStorage.getItem('frankentower-save-v1')).run.stash.length === 6,
  );
  await fits('tap-only combine and sell');
  // Every word remains reachable through text pages, including a level-three signature.
  await mobile.getByRole('button', { name: 'Close dialog' }).click();
  await fixture('extreme');
  const expected = await mobile.evaluate(async () => {
    const { ITEM_MAP } = await import('/src/game/content.ts');
    const { describeItemRules, describeSignature } = await import('/src/game/descriptions.ts');
    const offer = JSON.parse(localStorage.getItem('frankentower-save-v1')).run.offers[0];
    const def = ITEM_MAP[offer.defId];
    return {
      name: def.name,
      rules: describeItemRules(def, offer.level),
      signature: describeSignature(def),
    };
  });
  await mobile.getByRole('button', { name: 'Inspect ' + expected.name, exact: true }).click();
  async function completeText(label) {
    const chunks = [];
    const next = mobile.getByRole('button', { name: `Next ${label.toLowerCase()}`, exact: true });
    do {
      await fits(`${label} text page`);
      chunks.push(
        await mobile
          .getByRole('dialog')
          .locator('.paged-text .text-copy:not(.text-measure)')
          .innerText(),
      );
      if (!(await next.count()) || !(await next.isEnabled())) break;
      await next.click();
    } while (chunks.length < 200);
    return chunks.join(' ').replace(/\s+/g, ' ').trim();
  }
  const normalize = (value) => value.replace(/\s+/g, ' ').trim();
  assert.ok((await completeText('Rules')).startsWith(normalize(expected.rules)));
  await mobile.getByRole('button', { name: 'Signature', exact: true }).click();
  assert.ok((await completeText('Signature')).endsWith(normalize(expected.signature)));
  await mobile.getByRole('button', { name: 'Close dialog' }).click();
  // Safe-area changes and rotation must preserve task, slot page, selection and saved state.
  await mobile
    .locator('.equipment-category.socket-hand:visible, .short-equipment-summary:visible')
    .click();
  await mobile.getByRole('button', { name: 'Next hands page', exact: true }).click();
  const unchanged = await mobile.evaluate(() => localStorage.getItem('frankentower-save-v1'));
  await mobile.evaluate(() => {
    for (const [side, amount] of Object.entries({ top: 24, right: 10, bottom: 20, left: 10 }))
      document.documentElement.style.setProperty(`--safe-${side}`, `${amount}px`);
  });
  await fits('portrait safe areas');
  const firstSlot = await mobile.locator('.equipment-slot').first().getAttribute('aria-label');
  await resizeViewport(mobile, { width: 844, height: 390 });
  await fits('rotated equipment safe areas');
  await resizeViewport(mobile, { width: 360, height: 640 });
  await fits('returned portrait safe areas');
  assert.equal(
    await mobile.locator('.equipment-slot').first().getAttribute('aria-label'),
    firstSlot,
  );
  assert.equal(
    await mobile.evaluate(() => localStorage.getItem('frankentower-save-v1')),
    unchanged,
  );
  // Focus stays in the expanded workspace; Escape returns to its opener.
  for (let i = 0; i < 30; i++) {
    await mobile.keyboard.press('Tab');
    assert.ok(await mobile.evaluate(() => !!document.activeElement.closest('[role="dialog"]')));
  }
  await mobile.keyboard.press('Escape');
  assert.equal(await mobile.getByRole('dialog').count(), 0);
  assert.equal(
    await mobile.evaluate(() =>
      document.activeElement.matches('.equipment-category.socket-hand, .short-equipment-summary'),
    ),
    true,
  );
  await fits('shop safe areas');
  // A responsive replacement for an opener must receive focus after rotation.
  await mobile.locator('.short-equipment-summary:visible').click();
  await resizeViewport(mobile, { width: 1440, height: 900 });
  await mobile.keyboard.press('Escape');
  assert.equal(
    await mobile.evaluate(() => document.activeElement.matches('.equipment-category.socket-hand')),
    true,
  );
  await mobile.locator('.equipment-category.socket-hand:visible').click();
  await resizeViewport(mobile, { width: 360, height: 640 });
  await mobile.keyboard.press('Escape');
  assert.equal(
    await mobile.evaluate(() => document.activeElement.matches('.short-equipment-summary')),
    true,
  );
  await mobile.getByRole('button', { name: 'Patient services', exact: true }).click();
  while (
    !(await mobile
      .getByRole('dialog')
      .getByRole('button', { name: 'Freeze stock', exact: true })
      .count())
  )
    await mobile.getByRole('button', { name: 'Next services page', exact: true }).click();
  await mobile
    .getByRole('dialog')
    .getByRole('button', { name: 'Freeze stock', exact: true })
    .click();
  await mobile.waitForFunction(
    () => JSON.parse(localStorage.getItem('frankentower-save-v1')).run.shopFrozen,
  );
  await fits('freeze through paged services');
  await mobile.getByRole('button', { name: 'Close dialog' }).click();
  await mobile.evaluate(() => {
    for (const side of ['top', 'right', 'bottom', 'left'])
      document.documentElement.style.setProperty(`--safe-${side}`, '0px');
  });
  await resizeViewport(mobile, { width: 1280, height: 720 });
  await fits('desktop after phone rotation');
  const footerHitTargets = await mobile.locator('.screen-actions button').evaluateAll((buttons) =>
    buttons.map((button) => {
      const rect = button.getBoundingClientRect();
      return button.contains(
        document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2),
      );
    }),
  );
  assert.ok(footerHitTargets.every(Boolean), 'rotated shop footer must receive pointer input');
  assert.deepEqual(errors, []);
  console.log(
    'PASS: onboarding, purchase/equip, combat, report, reload, surgery, desktop/mobile layout, dialogs.',
  );
} finally {
  await zoomContext?.close();
  await browser?.close();
}
