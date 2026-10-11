import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const directory = 'output/art-direction/modular-v2/review';
await mkdir(directory, { recursive: true });
const base = process.env.FRANKENTOWER_LOCAL_URL ?? 'http://127.0.0.1:5174/';
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.FRANKENTOWER_BROWSER_EXECUTABLE ??
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
try {
  const page = await browser.newPage({
    viewport: { width: 1120, height: 1600 },
    reducedMotion: 'reduce',
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}art-study.html`);
  await page.locator('.gallery canvas').first().waitFor();
  await page.waitForTimeout(500);
  const results = await page.evaluate(async () => {
    const rooms = [...document.querySelectorAll('.gallery canvas')];
    const output = {};
    const board = document.createElement('canvas');
    board.width = 1920;
    board.height = 1460;
    const c = board.getContext('2d');
    c.fillStyle = '#111016';
    c.fillRect(0, 0, board.width, board.height);
    rooms.forEach((room, i) => {
      const x = (i % 3) * 640,
        y = Math.floor(i / 3) * 730;
      c.fillStyle = '#e5cca5';
      c.font = '22px Georgia';
      c.fillText(room.parentElement.querySelector('h2').textContent, x + 24, y + 34);
      c.drawImage(room, x, y + 50);
      output[`room-${i + 1}.png`] = room.toDataURL().split(',')[1];
    });
    output['dressing-room-board.png'] = board.toDataURL().split(',')[1];
    output['arena.png'] = document.querySelector('.arena-scene canvas').toDataURL().split(',')[1];
    const { drawPuppet, fitPuppet, puppetReady } = await import('/src/art/puppet.ts');
    const { pixelItem } = await import('/src/art/pixel.ts');
    const { studyCases, studyBuild } = await import('/src/art/study.tsx');
    await puppetReady;
    const assembly = document.createElement('canvas');
    assembly.width = 1800;
    assembly.height = 1200;
    const a = assembly.getContext('2d');
    a.fillStyle = '#17181e';
    a.fillRect(0, 0, 1800, 1200);
    studyCases.forEach((build, i) => {
      const x = (i % 3) * 600,
        y = Math.floor(i / 3) * 600;
      a.fillStyle = '#e5cca5';
      a.font = '22px Georgia';
      a.fillText(build.name, x + 20, y + 35);
      const f = fitPuppet(build, { x: x + 20, y: y + 60, w: 560, h: 500 }, 3);
      drawPuppet(a, build, f.x, f.y, f.scale, {}, pixelItem);
    });
    output['assembly-board.png'] = assembly.toDataURL().split(',')[1];
    const catalogue = document.createElement('canvas');
    catalogue.width = 1600;
    catalogue.height = 1000;
    const k = catalogue.getContext('2d');
    k.fillStyle = '#17181e';
    k.fillRect(0, 0, 1600, 1000);
    ['living', 'rat', 'serpent', 'bone', 'clockwork', 'ganglion', 'necrotic'].forEach(
      (variant, i) => {
        const build = {
          name: variant,
          parts: ['chest', 'heart', 'head', 'hand', 'hand', 'foot', 'foot'].map((slot, n) => ({
            uid: `${variant}-${n}`,
            slot,
            variant,
            ...(slot === 'hand'
              ? { item: { uid: `${variant}-weapon-${n}`, defId: 'knife', level: 1 } }
              : {}),
            ...(slot === 'head'
              ? { item: { uid: `${variant}-crown`, defId: 'horns', level: 1 } }
              : {}),
          })),
        };
        const x = (i % 4) * 400,
          y = Math.floor(i / 4) * 500;
        k.fillStyle = '#e5cca5';
        k.font = '22px Georgia';
        k.fillText(variant, x + 20, y + 35);
        const f = fitPuppet(build, { x: x + 10, y: y + 55, w: 380, h: 420 }, 3);
        drawPuppet(k, build, f.x, f.y, f.scale, {}, pixelItem);
      },
    );
    output['catalogue-board.png'] = catalogue.toDataURL().split(',')[1];
    const motion = document.createElement('canvas');
    motion.width = 1500;
    motion.height = 520;
    const m = motion.getContext('2d');
    m.fillStyle = '#17181e';
    m.fillRect(0, 0, 1500, 520);
    const build = studyBuild('Equipped three-arm motion', {
      heads: 2,
      arms: 3,
      legs: 2,
      fur: false,
      gear: true,
      alternate: false,
    });
    ['Idle', 'Drawback', 'Strike'].forEach((title, i) => {
      m.fillStyle = '#e5cca5';
      m.font = '22px Georgia';
      m.fillText(title, i * 500 + 25, 35);
      const f = fitPuppet(build, { x: i * 500 + 15, y: 55, w: 470, h: 450 }, 2.4);
      const arms = Object.fromEntries(
        build.parts
          .filter((p) => p.item && p.slot === 'hand')
          .map((p) => [
            p.item.uid,
            { facing: 1, drawback: i ? 1 : 0, ...(i === 2 ? { strike: 0.6 } : {}) },
          ]),
      );
      drawPuppet(m, build, f.x, f.y, f.scale, { arms }, pixelItem);
    });
    output['motion-board.png'] = motion.toDataURL().split(',')[1];
    return output;
  });
  for (const [name, data] of Object.entries(results))
    await writeFile(`${directory}/${name}`, Buffer.from(data, 'base64'));
  await page.screenshot({ path: `${directory}/review-page.png`, fullPage: true });
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Captured ${Object.keys(results).length} actual renderer images in ${directory}`);
} finally {
  await browser.close();
}
