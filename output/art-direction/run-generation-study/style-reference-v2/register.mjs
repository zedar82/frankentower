import {chromium} from '@playwright/test';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const directory='output/art-direction/run-generation-study/style-reference-v2';
const manifest=JSON.parse(await readFile(directory+'/landmarks.json','utf8'));
await mkdir(directory+'/calibrated',{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try{
  const page=await browser.newPage();const geometry={};const diagnostics=[];
  for(const spec of manifest.parts){
    const data=await readFile(directory+'/sources/'+spec.id+'.png');
    const result=await page.evaluate(async({spec:t,url})=>{
      const image=new Image();image.src=url;await image.decode();
      const raw=document.createElement('canvas');raw.width=image.width;raw.height=image.height;
      const r=raw.getContext('2d');r.drawImage(image,0,0);const d=r.getImageData(0,0,raw.width,raw.height).data;
      let left=raw.width,right=0,top=raw.height,bottom=0;
      for(let y=0;y<raw.height;y++)for(let x=0;x<raw.width;x++)if(d[(y*raw.width+x)*4+3]>128){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
      const root=[t.root[0]*image.width,t.root[1]*image.height];
      let scale,rotation=0;
      if(t.end){
        const dx=t.end[0]*image.width-root[0],dy=t.end[1]*image.height-root[1];
        scale=Math.hypot(t.target[0]-t.pin[0],t.target[1]-t.pin[1])/Math.hypot(dx,dy);
        rotation=Math.atan2(t.target[1]-t.pin[1],t.target[0]-t.pin[0])-Math.atan2(dy,dx);
      }else scale=Math.min(t.paintedWidth/(right-left+1),48/(root[1]-top));
      const map=(x,y)=>({x:t.pin[0]+scale*((x-root[0])*Math.cos(rotation)-(y-root[1])*Math.sin(rotation)),y:t.pin[1]+scale*((x-root[0])*Math.sin(rotation)+(y-root[1])*Math.cos(rotation))});
      let outside=0,painted=0;for(let y=0;y<raw.height;y++)for(let x=0;x<raw.width;x++)if(d[(y*raw.width+x)*4+3]>128){painted++;const p=map(x,y);if(p.x<0||p.y<0||p.x>=t.width||p.y>=t.height)outside++;}
      const canvas=document.createElement('canvas');canvas.width=t.width*4;canvas.height=t.height*4;
      const c=canvas.getContext('2d');c.scale(4,4);c.translate(...t.pin);c.rotate(rotation);c.scale(scale,scale);c.imageSmoothingEnabled=false;c.drawImage(image,-root[0],-root[1]);
      return{png:canvas.toDataURL().split(',')[1],geometry:{width:t.width,height:t.height,rasterScale:4,root:{x:t.pin[0],y:t.pin[1]},...(t.end?{end:{x:t.target[0],y:t.target[1]}}:{}),...(t.crown?{crown:map(t.crown[0]*image.width,t.crown[1]*image.height)}:{})},
        diagnostic:{id:t.id,sourceScale:scale,sourceRotation:rotation,outsideFramePixels:outside,paintedPixels:painted,outsideFramePercent:100*outside/painted}};
    },{spec,url:'data:image/png;base64,'+data.toString('base64')});
    await writeFile(directory+'/calibrated/'+spec.replace+'.png',Buffer.from(result.png,'base64'));
    geometry[spec.replace]=result.geometry;diagnostics.push(result.diagnostic);
  }
  await writeFile(directory+'/calibrated/geometry.json',JSON.stringify(geometry,null,2));
  await writeFile(directory+'/calibrated/measurements.json',JSON.stringify(diagnostics,null,2));
  const paths=['public/grotesque/modular-v2/head-flesh.png',directory+'/registered/head-rat.png',directory+'/calibrated/head-rat.png'];
  const urls=await Promise.all(paths.map(async path=>'data:image/png;base64,'+(await readFile(path)).toString('base64')));
  const board=await page.evaluate(async urls=>{
    const c=document.createElement('canvas');c.width=840;c.height=300;const p=c.getContext('2d');
    p.fillStyle='#17181e';p.fillRect(0,0,c.width,c.height);p.fillStyle='#e5cca5';p.font='18px Georgia';
    const labels=['Existing head','RUN: coarse first draft','RUN: finer-detail retry'];
    for(let i=0;i<urls.length;i++){const image=new Image();image.src=urls[i];await image.decode();p.fillText(labels[i],i*280+12,24);p.imageSmoothingEnabled=false;p.drawImage(image,i*280+12,36,256,256);}
    return c.toDataURL().split(',')[1];
  },urls);
  await writeFile(directory+'/review/head-detail-comparison.png',Buffer.from(board,'base64'));
  console.log(JSON.stringify(diagnostics));
}finally{await browser.close();}
