import { launchBrowser, artifact, localUrl } from './browser-support.mjs';
import assert from 'node:assert/strict';

const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 3100 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(localUrl);
  await page.locator('.main-header').waitFor();
  const result = await page.evaluate(async () => {
    const { puppetReady, puppetLayout, fitPuppet, drawPuppet, armAngle } =
      await import('/src/art/puppet.ts');
    await puppetReady;
    const fixtures = [
      ['Starting puppet', 2, 2, 1, 'living'],
      ['Four arms / four legs', 4, 4, 2, 'living'],
      ['Eight arms / eight legs', 8, 8, 3, 'living'],
      ['Twelve arms / six heads', 12, 8, 6, 'living'],
      ['Three arms / one leg', 3, 1, 1, 'living'],
      ['Headless / armless body', 0, 4, 0, 'living'],
      ['Rat graft', 2, 4, 1, 'rat'],
      ['Bone graft', 2, 2, 1, 'bone'],
    ];
    const builds = fixtures.map(([name, hands, feet, heads, variant]) => ({
      name,
      parts: [
        'chest',
        'heart',
        ...Array(hands).fill('hand'),
        ...Array(feet).fill('foot'),
        ...Array(heads).fill('head'),
      ].map((slot, i) => ({
        uid: `${name}-${i}`,
        slot,
        variant,
        ...(slot === 'hand' ? { item: { uid: `weapon-${i}`, defId: 'knife', level: 1 } } : {}),
      })),
    }));
    const canvas = document.createElement('canvas');
    canvas.width = 1500;
    canvas.height = 3100;
    canvas.style.cssText = 'display:block;width:1500px;height:3100px;image-rendering:auto';
    document.body.replaceChildren(canvas);
    document.body.style.cssText = 'margin:0;background:#18161c';
    const c = canvas.getContext('2d');
    c.fillStyle = '#18161c';
    c.fillRect(0, 0, 1500, 3100);
    const failures = [];
    builds.forEach((build, row) => {
      const variant = build.parts[0].variant;
      const handParts = build.parts.filter((p) => p.slot === 'hand');
      const motion = (facing, drawback, strike) =>
        Object.fromEntries(
          handParts.map((p) => [
            p.item.uid,
            { facing, drawback, ...(strike === undefined ? {} : { strike }) },
          ]),
        );
      const poses = [1, -1].flatMap((facing) => [
        { time: 0, arms: motion(facing, 0.85) },
        { time: 0, moving: true, walk: 9.2, arms: motion(facing, 0.25) },
        { time: 0, arms: motion(facing, 1, 0.75) },
      ]);
      poses.forEach((pose, poseIndex) => {
        const column = poseIndex % 3;
        const box = { x: column * 500 + 20, y: row * 380 + 50, w: 460, h: 310 };
        const fit = fitPuppet(build, box, 2.4);
        if (poseIndex < 3) {
          c.fillStyle = '#28222b';
          c.fillRect(column * 500 + 8, row * 380 + 8, 484, 364);
          c.fillStyle = '#e4cba0';
          c.font = '18px Georgia';
          c.textAlign = 'center';
          c.fillText(
            `${build.name} · ${['draw back', 'walk', 'strike'][column]}`,
            column * 500 + 250,
            row * 380 + 35,
          );
          drawPuppet(c, build, fit.x, fit.y, fit.scale, pose, () => {});
        }
        // Verify actual painted pixels, independently of the dark gallery background or equipment.
        const test = document.createElement('canvas');
        test.width = 600;
        test.height = 600;
        const ctx = test.getContext('2d');
        const tf = fitPuppet(build, { x: 20, y: 20, w: 560, h: 560 }, 2.7),
          layout = puppetLayout(build);
        drawPuppet(ctx, build, tf.x, tf.y, tf.scale, pose, () => {});
        const pixels = ctx.getImageData(0, 0, 600, 600).data,
          connected = new Uint8Array(600 * 600),
          queue = new Int32Array(600 * 600);
        const bob = pose.moving ? Math.sin(pose.walk * 0.22) * 1.1 : 0;
        const pixel = (p) => ({
          x: Math.round(tf.x + p.x * tf.scale),
          y: Math.round(tf.y + (p.y - bob) * tf.scale),
        });
        const seed = pixel({ x: 0, y: layout.torso.y + layout.torso.h * 0.5 });
        let front = 0,
          back = 0;
        const start = seed.y * 600 + seed.x;
        queue[back++] = start;
        connected[start] = 1;
        while (front < back) {
          const n = queue[front++],
            x = n % 600,
            y = Math.floor(n / 600);
          for (const next of [
            x ? n - 1 : -1,
            x < 599 ? n + 1 : -1,
            y ? n - 600 : -1,
            y < 599 ? n + 600 : -1,
          ])
            if (next >= 0 && !connected[next] && pixels[next * 4 + 3] >= 80) {
              connected[next] = 1;
              queue[back++] = next;
            }
        }
        const check = (p, label) => {
          const q = pixel(p);
          if (q.x < 0 || q.y < 0 || q.x >= 600 || q.y >= 600 || !connected[q.y * 600 + q.x])
            failures.push(`${build.name} pose ${poseIndex}: ${label} is disconnected`);
        };
        // Donor limbs bend away from the human sleeve centreline. Check independently measured painted hand/foot landmarks.
        const donors = {
          rat: {
            arm: { dx: (400 - 535) / 350, dy: (860 - 495) / 535 },
            leg: { dx: (1180 - 1100) / 385, dy: (930 - 500) / 510 },
          },
          bone: {
            arm: { dx: (345 - 345) / 225, dy: (1195 - 650) / 630 },
            leg: { dx: (990 - 970) / 290, dy: (1140 - 650) / 630 },
          },
        };
        const landmark = (j, a, point) => ({
          x: j.pin.x + point.dx * j.w * Math.cos(a) - point.dy * j.h * Math.sin(a),
          y: j.pin.y + point.dx * j.w * Math.sin(a) + point.dy * j.h * Math.cos(a),
        });
        for (const j of layout.arms) {
          const a = armAngle(j, handParts[j.index], pose);
          check(j.pin, `arm ${j.index} pin`);
          const point = donors[variant]?.arm ?? { dx: 0, dy: 0.7 };
          check(landmark(j, a, point), `arm ${j.index} hand`);
        }
        for (const j of layout.legs) {
          const a = pose.moving ? Math.sin(pose.walk * 0.22 + j.index * Math.PI) * 0.075 : 0;
          check(j.pin, `leg ${j.index} pin`);
          check(landmark(j, a, donors[variant]?.leg ?? { dx: 0, dy: 0.72 }), `leg ${j.index} foot`);
        }
        for (const j of layout.heads) {
          check(j.pin, `head ${j.index} pin`);
          check({ x: j.pin.x, y: j.pin.y - j.h * 0.4 }, `head ${j.index} face`);
        }
      });
    });
    return { failures };
  });
  await page.screenshot({ path: artifact('frankentower-puppet-composition.png') });
  assert.deepEqual(result.failures, []);
  assert.deepEqual(errors, []);
  console.log(
    'PASS: all arm, hip and neck buttons, sleeves, boots and faces connect to the torso in eight anatomies, three animation poses and both attack directions.',
  );
} finally {
  await browser.close();
}
