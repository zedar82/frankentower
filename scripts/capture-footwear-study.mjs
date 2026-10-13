import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
const destination = 'output/art-direction/visual-target-pass/review';
mkdirSync(destination, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.FRANKENTOWER_BROWSER_EXECUTABLE ??
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
try {
  const page = await browser.newPage();
  await page.goto(process.env.FRANKENTOWER_LOCAL_URL ?? 'http://127.0.0.1:5190/');
  for (const walking of [false, true]) {
    const png = await page.evaluate(async (walking) => {
      const { drawPuppet, puppetReady } = await import('/src/art/puppet.ts');
      await puppetReady;
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 900;
      const c = canvas.getContext('2d');
      c.fillStyle = '#151519';
      c.fillRect(0, 0, 1200, 900);
      const variants = ['living', 'rat', 'serpent', 'bone', 'clockwork', 'ganglion'];
      variants.forEach((variant, index) => {
        const x = (index % 3) * 400,
          y = Math.floor(index / 3) * 450;
        c.fillStyle = '#e4d5b9';
        c.font = '20px Georgia';
        c.fillText(variant + (walking ? ' / walking' : ' / idle'), x + 20, y + 30);
        const build = {
          name: variant,
          parts: ['chest', 'heart', 'head', 'foot', 'foot', 'foot', 'foot'].map((slot, i) => ({
            uid: variant + i,
            slot,
            variant: slot === 'foot' ? variant : 'living',
            ...(slot === 'foot' && i > 3
              ? {
                  item: {
                    uid: 'gear' + i,
                    defId: ['runners', 'bloodboots', 'ironboots'][i - 4],
                    level: 1,
                  },
                }
              : {}),
          })),
        };
        drawPuppet(
          c,
          build,
          x + 200,
          y + 412,
          1.8,
          { time: 0, moving: walking, walk: 7 },
          () => {},
        );
        c.fillStyle = '#e4d5b9';
        c.font = '13px Georgia';
        ['bare', 'runner', 'leather', 'iron'].forEach((label, i) =>
          c.fillText(label, x + 107 + i * 50, y + 436),
        );
      });
      return canvas.toDataURL('image/png').split(',')[1];
    }, walking);
    writeFileSync(
      destination + '/footwear-' + (walking ? 'walking' : 'materials') + '.png',
      Buffer.from(png, 'base64'),
    );
  }
  const png = await page.evaluate(async () => {
    const { drawPuppet, puppetReady } = await import('/src/art/puppet.ts');
    await puppetReady;
    const canvas = document.createElement('canvas');
    canvas.width = 1100;
    canvas.height = 500;
    const c = canvas.getContext('2d');
    c.fillStyle = '#151519';
    c.fillRect(0, 0, 1100, 500);
    const ids = [
      'runners',
      'bloodboots',
      'venomboots',
      'ironboots',
      'spurs',
      'bloodrunner',
      'plague',
      'rabbit',
      'octoboot',
      'dance',
    ];
    const variants = ['living', 'rat', 'serpent', 'bone', 'clockwork', 'ganglion'];
    const build = {
      name: 'all footwear',
      parts: [
        { uid: 'chest', slot: 'chest', variant: 'living' },
        { uid: 'head', slot: 'head', variant: 'living' },
        ...ids.map((defId, i) => ({
          uid: 'foot' + i,
          slot: 'foot',
          variant: variants[i % 6],
          item: { uid: 'item' + i, defId, level: 1 },
        })),
      ],
    };
    c.fillStyle = '#e4d5b9';
    c.font = '20px Georgia';
    c.fillText('All ten current foot items / mixed materials', 25, 30);
    drawPuppet(c, build, 550, 440, 2, { time: 0 }, () => {});
    c.font = '12px Georgia';
    c.textAlign = 'center';
    ids.forEach((id, i) => c.fillText(id, 298 + i * 56, 475 + (i % 2) * 16));
    return canvas.toDataURL('image/png').split(',')[1];
  });
  writeFileSync(destination + '/footwear-all-items.png', Buffer.from(png, 'base64'));
} finally {
  await browser.close();
}
