import { chromium } from '@playwright/test';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{
  const page=await browser.newPage({viewport:{width:512,height:512},deviceScaleFactor:1});
  await page.goto(process.env.FRANKENTOWER_LOCAL_URL??'http://127.0.0.1:5173/');
  await page.evaluate(async()=>{
    const {human}=await import('/src/game/anatomy.ts');const {ITEM_MAP}=await import('/src/game/content.ts');const {monster,puppetReady,fitPuppet,room,roomLights,rect}=await import('/src/art/pixel.ts');await puppetReady;
    const b=human('Agnes');['hand','hand','hand','hand','head','head','foot','foot','foot','foot','heart','heart'].forEach((slot,i)=>b.parts.push({uid:`graft-${i}`,slot,variant:'living'}));
    ['maul','knife','shield','bonewand','dagger','stormwand','horns','hood','brain','runners','ironboots','plague','rabbit','heart','vampire'].forEach((id,i)=>{const p=b.parts.find(p=>p.slot===ITEM_MAP[id].slot&&!p.item);if(p)p.item={uid:`item-${i}`,defId:id,level:1};});
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;canvas.style.cssText='width:512px;height:512px;image-rendering:auto;display:block';
    document.body.replaceChildren(canvas);document.body.style.cssText='margin:0;background:#141219';
    const c=canvas.getContext('2d');c.setTransform(2,0,0,2,0,0);c.imageSmoothingEnabled=false;rect(c,0,0,256,256,'#141219');c.save();c.translate(-32,57);c.scale(.5,.5);room(c,60);roomLights(c,0);c.restore();
    const fit=fitPuppet(b,{x:8,y:49,w:240,h:184},1.5);monster(c,b,fit.x,fit.y,fit.scale);c.textAlign='center';c.font='bold 23px Georgia';c.fillStyle='#6e4447';c.fillText('FRANKENTOWER',130,28);c.fillStyle='#e4cba0';c.fillText('FRANKENTOWER',128,26);
    c.font='7px monospace';c.fillStyle='#afb984';c.fillText('A PRACTICAL GUIDE TO SELF-IMPROVEMENT',128,39);c.fillStyle='#e0ba83';c.font='bold 8px monospace';c.fillText('YOUR BODY IS YOUR INVENTORY.',128,248);
    rect(c,7,46,242,1,'#7b6052');rect(c,7,236,242,1,'#7b6052');
  });
  await page.screenshot({path:'public/thumbnail.jpg',type:'jpeg',quality:96});console.log('Rendered 512×512 thumbnail from the pixel dungeon and illustrated puppet.');
}finally{await browser.close();}
