import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const files = process.argv.slice(2);
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.FRANKENTOWER_BROWSER_EXECUTABLE ??
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
try {
  const page = await browser.newPage();
  await page.goto(process.env.FRANKENTOWER_LOCAL_URL ?? 'http://127.0.0.1:5190/');
  const measurements = await page.evaluate(async (files) => {
    const result = {};
    for (const file of files) {
      const image = new Image();
      image.src = '/grotesque/items/' + file + '.png';
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let left = canvas.width,
        top = canvas.height,
        right = 0,
        bottom = 0,
        minAlpha = 255,
        maxAlpha = 0;
      for (let y = 0; y < canvas.height; y++)
        for (let x = 0; x < canvas.width; x++) {
          const alpha = data[(y * canvas.width + x) * 4 + 3];
          minAlpha = Math.min(minAlpha, alpha);
          maxAlpha = Math.max(maxAlpha, alpha);
          if (alpha > 8) {
            left = Math.min(left, x);
            top = Math.min(top, y);
            right = Math.max(right, x);
            bottom = Math.max(bottom, y);
          }
        }
      result[file] = {
        width: canvas.width,
        height: canvas.height,
        crop: [left, top, right - left + 1, bottom - top + 1],
        minAlpha,
        maxAlpha,
      };
    }
    return result;
  }, files);
  for (const [id, measurement] of Object.entries(measurements))
    writeFileSync(
      'output/art-direction/visual-target-pass/' + id + '-measurements.json',
      JSON.stringify(measurement, null, 2) + '\n',
    );
  console.log(measurements);
} finally {
  await browser.close();
}
