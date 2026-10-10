import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage();
 for(const id of ['skeleton-head','tentacle-arm','human-arm','dog-leg','torso','maul','boot']){
 const data=await fs.readFile(`output/art-direction/experiment-02/${process.argv[2]??"a"}/originals/${id}.png`);
 const result=await page.evaluate(async data=>{const im=new Image();im.src=data;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d');ctx.drawImage(im,0,0);const p=ctx.getImageData(0,0,c.width,c.height).data;let x0=c.width,y0=c.height,x1=0,y1=0,low=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const a=p[(y*c.width+x)*4+3];if(a>0&&a<96)low++;if(a>=96){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}}return{width:c.width,height:c.height,bounds:[x0,y0,x1,y1],lowAlpha:low};},`data:image/png;base64,${data.toString('base64')}`);
 console.log(id,JSON.stringify(result));
 }
}finally{await browser.close();}

