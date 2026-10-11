import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const directory = 'output/art-direction/run-generation-study/guides';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  const page = await browser.newPage();
  const templates = [
    { id: 'head-rat', size:64, frame:[0,0,64,64], envelope:[6,8,52,51], pins:[[32,56],[32,12]] },
    { id: 'arm-lizard', size:112, frame:[8,0,96,112], envelope:[18,8,66,88], pins:[[32,20],[72,78]] },
    { id: 'leg-fur', size:72, frame:[20,0,32,72], envelope:[22,3,28,63], pins:[[36,10],[36,65]] },
  ];
  for (const template of templates) {
    const data = await page.evaluate(t => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1024;
      const c = canvas.getContext('2d');
      c.scale(1024/t.size,1024/t.size);
      c.fillStyle='#ffffff'; c.fillRect(0,0,t.size,t.size);
      c.fillStyle='#e8e4e0'; c.fillRect(...t.frame);
      c.strokeStyle='#888888'; c.lineWidth=.3; c.strokeRect(...t.frame);
      c.strokeStyle='#168266'; c.lineWidth=.5; c.setLineDash([2,1]); c.strokeRect(...t.envelope);
      c.setLineDash([]);
      t.pins.forEach(([x,y], i) => {
        c.strokeStyle=i?'#276ac4':'#cc2c52'; c.lineWidth=.5;
        c.beginPath();c.arc(x,y,2,0,Math.PI*2);c.stroke();
        c.beginPath();c.moveTo(x-4,y);c.lineTo(x+4,y);c.moveTo(x,y-4);c.lineTo(x,y+4);c.stroke();
      });
      return canvas.toDataURL().split(',')[1];
    },template);
    await writeFile(directory+'/'+template.id+'.png',Buffer.from(data,'base64'));
  }
} finally { await browser.close(); }
