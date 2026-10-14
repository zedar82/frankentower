import assert from 'node:assert/strict';
import { launchBrowser, localUrl, artifact } from './browser-support.mjs';
const browser = await launchBrowser();
let page;
try {
  page = await browser.newPage();
  const unexpected = [];
  page.on('pageerror', (error) => {
    if (!error.message.includes('injected')) unexpected.push(error.message);
  });
  await page.goto(localUrl);
  await page.locator('.main-header').waitFor();
  // Corrupt data must remain untouched until the player explicitly confirms reset.
  await page.evaluate(() => localStorage.setItem('frankentower-save-v1', '{broken'));
  await page.reload();
  await page.getByText('These patient records are damaged.', { exact: false }).waitFor();
  await page.getByRole('button', { name: 'Reconnect' }).click();
  await page.getByRole('button', { name: 'Reset damaged records…' }).waitFor();
  assert.equal(await page.evaluate(() => localStorage.getItem('frankentower-save-v1')), '{broken');
  await page.getByRole('button', { name: 'Reset damaged records…' }).click();
  // Recovery and destructive confirmation remain bounded at the same core UI sizes.
  for (const [width, height] of [
    [360, 640],
    [844, 390],
    [844, 342],
    [320, 568],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(100);
    const overflow = await page.evaluate(() => {
      const root = document.querySelector('.boot-screen');
      return [root, ...root.querySelectorAll('*')]
        .filter(
          (element) =>
            element.clientHeight > 0 &&
            !element.closest('.text-measure') &&
            (element.scrollHeight > element.clientHeight + 2 ||
              element.scrollWidth > element.clientWidth + 2),
        )
        .map((element) => element.className || element.tagName);
    });
    assert.deepEqual(overflow, [], `recovery confirmation ${width}x${height}`);
    assert.ok(
      await page
        .getByRole('heading', { name: 'Permanently delete all patient records?' })
        .isVisible(),
    );
    assert.ok(await page.getByRole('button', { name: 'Confirm permanent reset' }).isVisible());
    assert.equal(
      await page.evaluate(() => localStorage.getItem('frankentower-save-v1')),
      '{broken',
    );
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole('button', { name: 'Keep records' }).click();
  assert.equal(await page.evaluate(() => localStorage.getItem('frankentower-save-v1')), '{broken');
  await page.getByRole('button', { name: 'Reset damaged records…' }).click();
  await page.getByRole('button', { name: 'Confirm permanent reset' }).click();
  await page.getByRole('button', { name: /Butcher’s Knife.*Choose/ }).click();
  await page.getByRole('button', { name: 'To the arena →' }).waitFor();
  await page.getByText('Local save', { exact: true }).waitFor();
  // Fault injection is confined to this development-only browser context.
  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    window.failedWrites = 2;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'frankentower-save-v1' && window.failedWrites-- > 0)
        throw new Error('injected storage failure');
      return write.call(this, key, value);
    };
  });
  const old = await page.evaluate(() => JSON.parse(localStorage.getItem('frankentower-save-v1')));
  await page.locator('.buy-button').first().click();
  await page.getByText('Unsaved progress · retrying', { exact: true }).waitFor();
  assert.deepEqual(
    await page.evaluate(() => JSON.parse(localStorage.getItem('frankentower-save-v1'))),
    old,
  );
  // Newer actions replace pending snapshots; automatic retry must retain both changes.
  await page.getByRole('button', { name: 'Mute sound', exact: true }).click();
  await page.getByText('Local save', { exact: true }).waitFor({ timeout: 10000 });
  const purchased = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('frankentower-save-v1')),
  );
  assert.equal(purchased.run.purchases, old.run.purchases + 1);
  assert.equal(purchased.settings.sound, false);
  // A failed write can also be retried manually without buying anything else.
  await page.evaluate(() => {
    window.failedWrites = 1;
  });
  await page.getByRole('button', { name: 'Enable sound', exact: true }).click();
  await page.getByText('Unsaved progress · retrying', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Retry save', exact: true }).click();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByText('Local save', { exact: true }).waitFor();
  await page.reload();
  await page.getByRole('button', { name: 'To the arena →' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Mute sound', exact: true }).count(), 1);
  // A budget failure and an exception must both preserve the pre-fight state.
  for (const mode of ['budget', 'exception']) {
    const before = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('frankentower-save-v1')),
    );
    await page.evaluate(async (mode) => {
      const { Combat } = await import('/src/game/combat.ts');
      Combat.prototype.step = function () {
        if (mode === 'exception') throw new Error('injected combat exception');
        this.failure = 'injected simulation budget exceeded';
        this.done = true;
      };
    }, mode);
    await page.getByRole('button', { name: 'To the arena →' }).click();
    await page.getByRole('dialog', { name: 'Combat interrupted' }).waitFor();
    await page.getByText('Local save', { exact: true }).waitFor();
    const after = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('frankentower-save-v1')),
    );
    assert.equal(after.run.phase, 'build');
    assert.equal(after.run.hp, before.run.hp);
    assert.equal(after.run.gold, before.run.gold);
    assert.deepEqual(after.run.build, before.run.build);
    assert.deepEqual(after.records, before.records);
    assert.equal(after.run.victories, before.run.victories);
    await page.getByRole('button', { name: 'Return to the shop' }).click();
    await page.reload();
    await page.getByRole('button', { name: 'To the arena →' }).waitFor();
  }
  // Persisted combat intentionally resumes from its pre-fight health/seed.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('frankentower-save-v1'));
    s.run.phase = 'combat';
    localStorage.setItem('frankentower-save-v1', JSON.stringify(s));
  });
  await page.reload();
  await page.getByRole('button', { name: 'To the arena →' }).waitFor();
  await page.getByRole('button', { name: 'To the arena →' }).click();
  await page.getByRole('button', { name: 'Pause combat', exact: true }).click();
  await page.getByText('Local save', { exact: true }).waitFor();
  const beforeCrash = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('frankentower-save-v1')),
  );
  await page.evaluate(() =>
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('injected runtime crash') })),
  );
  await page.getByRole('heading', { name: 'Your appointment was interrupted.' }).waitFor();
  assert.deepEqual(
    await page.evaluate(() => JSON.parse(localStorage.getItem('frankentower-save-v1'))),
    beforeCrash,
  );
  await page.screenshot({ path: artifact('frankentower-recovery.png') });
  await page.getByRole('button', { name: 'Reconnect' }).click();
  await page.getByRole('button', { name: 'To the arena →' }).waitFor();
  await page.evaluate(() => {
    void Promise.reject(new Error('injected asynchronous crash'));
  });
  await page.getByRole('heading', { name: 'Your appointment was interrupted.' }).waitFor();
  await page.getByRole('button', { name: 'Reconnect' }).click();
  await page.getByRole('button', { name: 'To the arena →' }).waitFor();
  // Force an actual React render failure, rather than only exercising the global handler.
  await page.evaluate(async () => {
    const { ITEM_MAP } = await import('/src/game/content.ts');
    Object.defineProperty(ITEM_MAP.knife, 'stats', {
      get() {
        throw new Error('injected render crash');
      },
    });
  });
  await page.getByRole('button', { name: /^(Mute|Enable) sound$/ }).click();
  await page.getByRole('heading', { name: 'Your appointment was interrupted.' }).waitFor();
  await page.getByRole('button', { name: 'Reconnect' }).click();
  await page.getByRole('button', { name: 'To the arena →' }).waitFor();
  await page.evaluate(async () => {
    const { ITEM_MAP } = await import('/src/game/content.ts');
    Object.defineProperty(ITEM_MAP.knife, 'stats', {
      get() {
        throw null;
      },
    });
  });
  await page.getByRole('button', { name: /^(Mute|Enable) sound$/ }).click();
  await page.getByRole('heading', { name: 'Your appointment was interrupted.' }).waitFor();
  await page.getByRole('button', { name: 'Reconnect' }).click();
  await page.getByRole('button', { name: 'To the arena →' }).waitFor();
  // An ordinary player death must complete through the same lifecycle and save
  // a truthful report, rather than being handled as a simulation failure.
  await page.evaluate(async () => {
    const { Combat } = await import('/src/game/combat.ts');
    Combat.prototype.step = function () {
      this.player.hp = 0;
      this.done = true;
      this.won = false;
      this.outcome = 'defeat';
    };
  });
  const beforeDefeat = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('frankentower-save-v1')),
  );
  await page.getByRole('button', { name: /To the arena/ }).click();
  await page.getByText('PATIENT LOST', { exact: true }).waitFor();
  const defeated = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('frankentower-save-v1')),
  );
  assert.equal(defeated.run.phase, 'dead');
  assert.equal(defeated.run.hp, 0);
  assert.equal(defeated.run.lastReport.outcome, 'defeat');
  assert.equal(defeated.records.length, beforeDefeat.records.length + 1);
  await page.getByRole('button', { name: /View battle log/ }).click();
  await page.getByText('Patient died', { exact: false }).waitFor();
  assert.deepEqual(unexpected, []);
  console.log(
    'PASS: corrupt-save recovery, automatic/manual write retry, coalescing, pre-fight replay, budget/exception recovery, ordinary defeat completion, runtime/promise/render crashes.',
  );
} catch (error) {
  await page?.screenshot({ path: artifact('reliability-error.png') });
  console.log((await page?.locator('body').innerText())?.slice(0, 2500));
  throw error;
} finally {
  await browser.close();
}
