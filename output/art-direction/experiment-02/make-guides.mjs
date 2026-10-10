import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
const root = new URL('./', import.meta.url);
const spec = JSON.parse(await fs.readFile(new URL('geometry.json', root), 'utf8'));
const browser = await chromium.launch({ headless: true });
try {
 const page = await browser.newPage({ viewport:{width:512,height:512},deviceScaleFactor:1 });
 for (const [name,g] of Object.entries(spec.guides)) {
  const [x,y,w,h]=g.bounds;
  const marks=Object.entries(g.anchors).map(([key,[ax,ay]])=>`<circle cx="${ax}" cy="${ay}" r="${key==='grip'?10:key==='footwear'?24:16}" fill="none" stroke="${key==='attachment'?'#d13657':'#007d91'}" stroke-width="2"/><path d="M${ax-5} ${ay}h10 M${ax} ${ay-5}v10" stroke="#222"/><text x="${ax+28}" y="${ay+4}" font-size="12">${key} (${ax},${ay})</text>`).join('');
  const regions=Object.entries(g.regions??{}).map(([key,[rx,ry,rw,rh]])=>`<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="none" stroke="#007d91" stroke-dasharray="3 3"/><text x="${rx}" y="${ry-5}" font-size="10">${key} band</text>`).join('');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="#f4f1e9"/><g font-family="sans-serif" fill="#25252b"><text x="24" y="32" font-size="20">${name.toUpperCase()} / modular-v1</text><path d="M256 48V360" stroke="#aaa" stroke-dasharray="4 4"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="#d6d7d7" stroke="#777" stroke-dasharray="6 4"/>${regions}${marks}<text x="24" y="390" font-size="13">Grey: approximate envelope, not prescribed anatomy.</text><text x="24" y="412" font-size="13">Red: primary pivot. Cyan: equipment / receiving bands.</text><text x="24" y="434" font-size="13">Upright / near-frontal / +X right / +Y down</text><text x="24" y="456" font-size="13">512 units / neck, shoulder, hip: 32 / grip: 20</text><text x="24" y="478" font-size="13">Footwear: 48 / no sockets painted on torso</text></g></svg>`;
  await fs.writeFile(new URL(`guides/${name}.svg`,root),svg);
  await page.setContent(`<style>body{margin:0}</style>${svg}`);
  await page.screenshot({path:fileURLToPath(new URL(`guides/${name}.png`,root))});
 }
} finally { await browser.close(); }
