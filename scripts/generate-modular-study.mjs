import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const base = process.env.FRANKENTOWER_LOCAL_URL ?? 'http://127.0.0.1:5174/';
const destination = process.env.FRANKENTOWER_ASSET_OUTPUT ?? 'public/grotesque/modular-v2';
const sourceSpec = JSON.parse(
  await readFile(new URL('./modular-v2-source-spec.json', import.meta.url), 'utf8'),
);
await mkdir(destination, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.FRANKENTOWER_BROWSER_EXECUTABLE ??
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
try {
  const page = await browser.newPage();
  await page.goto(base);
  const result = await page.evaluate(async ({ rasterScale, parts: specs }) => {
    const source = '/output/art-direction/modular-v2/sources/';
    const load = async (name) => {
      const i = new Image();
      i.src = `${source}${name}.png`;
      await i.decode();
      return i;
    };
    const files = {},
      contracts = {};
    const canvas = (w, h, density = 1) => {
      const c = document.createElement('canvas');
      c.width = w * density;
      c.height = h * density;
      const p = c.getContext('2d');
      p.setTransform(density, 0, 0, density, 0, 0);
      p.imageSmoothingEnabled = false;
      return [c, p];
    };
    const save = (name, c) => (files[name] = c.toDataURL('image/png').split(',')[1]);
    for (const {
      name,
      source = name,
      width: w,
      height: h,
      root,
      pin,
      end,
      target,
      crown,
    } of specs) {
      const sourceName = source;
      const image = await load(sourceName),
        [raw, r] = canvas(image.width, image.height);
      r.drawImage(image, 0, 0);
      const data = r.getImageData(0, 0, raw.width, raw.height).data;
      let left = raw.width,
        top = raw.height,
        right = 0,
        bottom = 0;
      for (let y = 0; y < raw.height; y++)
        for (let x = 0; x < raw.width; x++)
          if (data[(y * raw.width + x) * 4 + 3] > 128) {
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
      const a = [root[0] * image.width, root[1] * image.height];
      let scale,
        angle = 0;
      if (end) {
        const dx = end[0] * image.width - a[0],
          dy = end[1] * image.height - a[1];
        scale = Math.hypot(target[0] - pin[0], target[1] - pin[1]) / Math.hypot(dx, dy);
        angle = Math.atan2(target[1] - pin[1], target[0] - pin[0]) - Math.atan2(dy, dx);
      } else scale = Math.min(52 / (right - left + 1), 48 / (a[1] - top));
      const [c, p] = canvas(w, h, rasterScale);
      p.translate(...pin);
      p.rotate(angle);
      p.scale(scale, scale);
      p.drawImage(image, -a[0], -a[1]);
      save(name, c);
      const map = (point) => {
        const dx = point[0] * image.width - a[0],
          dy = point[1] * image.height - a[1];
        return {
          x: pin[0] + scale * (dx * Math.cos(angle) - dy * Math.sin(angle)),
          y: pin[1] + scale * (dx * Math.sin(angle) + dy * Math.cos(angle)),
        };
      };
      const output = p.getImageData(0, 0, c.width, c.height).data;
      let ol = c.width,
        ot = c.height,
        or = 0,
        ob = 0;
      for (let yy = 0; yy < c.height; yy++)
        for (let xx = 0; xx < c.width; xx++)
          if (output[(yy * c.width + xx) * 4 + 3] > 128) {
            ol = Math.min(ol, xx);
            ot = Math.min(ot, yy);
            or = Math.max(or, xx);
            ob = Math.max(ob, yy);
          }
      let outside = 0;
      for (let yy = 0; yy < raw.height; yy++)
        for (let xx = 0; xx < raw.width; xx++)
          if (data[(yy * raw.width + xx) * 4 + 3] > 128) {
            const v = map([xx / image.width, yy / image.height]);
            if (v.x < 0 || v.y < 0 || v.x >= w || v.y >= h) outside++;
          }
      if (outside > 100)
        throw new Error(`${name}: ${outside} source pixels exceed the registered frame`);
      contracts[name] = {
        width: w,
        height: h,
        rasterScale,
        root: { x: pin[0], y: pin[1] },
        bounds: {
          left: ol / rasterScale,
          top: ot / rasterScale,
          right: (or + 1) / rasterScale,
          bottom: (ob + 1) / rasterScale,
        },
        source: sourceName,
        sourceScale: scale,
        sourceRotation: angle,
        ...(end ? { end: { x: target[0], y: target[1] } } : {}),
        ...(name.startsWith('leg-') ? { ankle: { x: target[0], y: target[1] - 12 } } : {}),
        ...(crown ? { crown: map(crown) } : {}),
      };
    }
    for (const name of ['weapon-cleaver', 'gear-crown']) {
      const image = await load(name),
        [raw, r] = canvas(image.width, image.height);
      r.drawImage(image, 0, 0);
      const d = r.getImageData(0, 0, raw.width, raw.height).data;
      let left = raw.width,
        top = raw.height,
        right = 0,
        bottom = 0;
      for (let y = 0; y < raw.height; y++)
        for (let x = 0; x < raw.width; x++)
          if (d[(y * raw.width + x) * 4 + 3] > 128) {
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
      const isCrown = name === 'gear-crown',
        scale = (isCrown ? 44 : 70) / (isCrown ? right - left + 1 : bottom - top + 1),
        w = Math.ceil((right - left + 1) * scale),
        h = Math.ceil((bottom - top + 1) * scale),
        [c, p] = canvas(w, h, rasterScale);
      p.drawImage(image, left, top, right - left + 1, bottom - top + 1, 0, 0, w, h);
      save(name, c);
      contracts[name] = {
        width: w,
        height: h,
        rasterScale,
        root: isCrown
          ? { x: w / 2, y: h - 2 }
          : { x: (0.56 * image.width - left) * scale, y: (0.8 * image.height - top) * scale },
      };
    }
    for (const material of ['flesh', 'fur', 'bone', 'metal', 'scales']) {
      const image = await load(`material-${material}${material === 'flesh' ? '-v2' : ''}`),
        [tile, t] = canvas(64, 64, rasterScale);
      t.drawImage(image, 0, 0, 64, 64);
      save(`fill-${material}`, tile);
      contracts[`fill-${material}`] = { width: 64, height: 64, root: { x: 0, y: 0 }, rasterScale };
      const paint = (name, w, h, shape, outline) => {
        const [c, p] = canvas(w, h, rasterScale);
        const pattern = p.createPattern(tile, 'repeat');
        pattern.setTransform(new DOMMatrix().scale(1 / rasterScale));
        p.fillStyle = pattern;
        p.fill(shape);
        p.lineWidth = 2;
        p.strokeStyle = '#34152c';
        p.stroke(outline);
        save(`${name}-${material}`, c);
        contracts[`${name}-${material}`] = {
          width: w,
          height: h,
          root: { x: 0, y: 0 },
          rasterScale,
        };
      };
      for (const edge of ['top', 'bottom']) {
        const shape = new Path2D();
        shape.rect(0, 0, 24, 12);
        const line = new Path2D();
        line.moveTo(0, edge === 'top' ? 2 : 10);
        line.quadraticCurveTo(12, edge === 'top' ? 0 : 12, 24, edge === 'top' ? 2 : 10);
        paint(edge, 24, 12, shape, line);
      }
      for (const corner of ['shoulder', 'hip']) {
        const shape = new Path2D();
        shape.moveTo(16, 2);
        shape.quadraticCurveTo(2, 2, 2, 16);
        shape.lineTo(16, 16);
        shape.closePath();
        const line = new Path2D();
        line.moveTo(16, 2);
        line.quadraticCurveTo(2, 2, 2, 16);
        paint(corner, 16, 16, shape, line);
      }
      for (const steps of [0, 1, 2])
        for (const direction of ['in', 'out']) {
          const shift = steps * 8,
            w = 20 + shift,
            h = 48,
            start = direction === 'in' ? w - 2 : 18,
            end = direction === 'in' ? 18 : w - 2;
          const shape = new Path2D();
          shape.moveTo(0, 0);
          shape.lineTo(start, 0);
          shape.bezierCurveTo(start, 16, end, 32, end, h);
          shape.lineTo(0, h);
          shape.closePath();
          const line = new Path2D();
          line.moveTo(start, 0);
          line.bezierCurveTo(start, 16, end, 32, end, h);
          paint(`taper-${steps}-${direction}`, w, h, shape, line);
        }
      const shape = new Path2D();
      shape.rect(0, 0, 20, 24);
      const line = new Path2D();
      line.moveTo(18, 0);
      line.quadraticCurveTo(20, 12, 18, 24);
      paint('side', 20, 24, shape, line);
    }
    return { files, contracts };
  }, sourceSpec);
  for (const [name, data] of Object.entries(result.files))
    await writeFile(`${destination}/${name}.png`, Buffer.from(data, 'base64'));
  await writeFile(`${destination}/geometry.json`, JSON.stringify(result.contracts, null, 2) + '\n');
  console.log(
    `Registered ${Object.keys(result.files).length} sprites; contracts saved to ${destination}/geometry.json`,
  );
} finally {
  await browser.close();
}
