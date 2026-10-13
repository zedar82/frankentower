import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.FRANKENTOWER_BROWSER_EXECUTABLE ??
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
try {
  const page = await browser.newPage();
  await page.route('**/step-candidate.png', (route) =>
    route.fulfill({ path: 'output/art-direction/visual-target-pass/sources/display-step-v2.png' }),
  );
  await page.goto(process.env.FRANKENTOWER_LOCAL_URL ?? 'http://127.0.0.1:5190/');
  const measurements = await page.evaluate(async () => {
    const image = new Image();
    image.src = '/step-candidate.png';
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let left = canvas.width,
      top = canvas.height,
      right = 0,
      bottom = 0,
      minAlpha = 255,
      maxAlpha = 0;
    for (let y = 0; y < canvas.height; y++)
      for (let x = 0; x < canvas.width; x++) {
        const a = pixels[(y * canvas.width + x) * 4 + 3];
        minAlpha = Math.min(minAlpha, a);
        maxAlpha = Math.max(maxAlpha, a);
        if (a > 8) {
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
      }
    return {
      width: image.width,
      height: image.height,
      alphaBounds: [left, top, right + 1, bottom + 1],
      minAlpha,
      maxAlpha,
    };
  });
  writeFileSync(
    'output/art-direction/visual-target-pass/display-step-v2-measurements.json',
    JSON.stringify(measurements, null, 2) + '\n',
  );
  console.log(measurements);
} finally {
  await browser.close();
}
