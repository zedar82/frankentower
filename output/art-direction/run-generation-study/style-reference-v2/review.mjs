import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const directory = 'output/art-direction/run-generation-study/style-reference-v2';
const base = process.env.FRANKENTOWER_LOCAL_URL ?? 'http://127.0.0.1:5175/';
const calibrated=process.argv.includes('--registered');
const registrationFolder=calibrated?'calibrated':'registered';
const contracts = [
  { id:'head-toad', replace:'head-rat', square:64, frame:[0,0,64,64], envelope:[6,8,58,59], root:[32,56], crown:[32,10] },
  { id:'arm-crustacean', replace:'arm-lizard', square:112, frame:[8,0,96,112], envelope:[18,8,84,96], root:[32,20], end:[72,78] },
  { id:'leg-goat', replace:'leg-fur', square:72, frame:[20,0,32,72], envelope:[22,3,50,66], root:[36,10], end:[36,65] },
];
await mkdir(directory+'/registered',{recursive:true});
await mkdir(directory+'/review',{recursive:true});
const browser = await chromium.launch({ headless:true, executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  const page = await browser.newPage();
  const measurements=[];
  for (const contract of calibrated?[]:contracts) {
    const bytes = await readFile(directory+'/sources/'+contract.id+'.png');
    const result = await page.evaluate(async ({contract:t,url}) => {
      const image = new Image(); image.src=url; await image.decode();
      if (image.width!==image.height) throw new Error(t.id+': expected square source');
      const source=document.createElement('canvas'); source.width=image.width;source.height=image.height;
      const s=source.getContext('2d');s.drawImage(image,0,0);
      const pixels=s.getImageData(0,0,source.width,source.height).data;
      let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity,painted=0,outsideFrame=0,outsideEnvelope=0;
      for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++) {
        if(pixels[(y*source.width+x)*4+3]<=128)continue;
        painted++;const lx=x*t.square/source.width,ly=y*t.square/source.height;
        left=Math.min(left,lx);top=Math.min(top,ly);right=Math.max(right,lx);bottom=Math.max(bottom,ly);
        if(lx<t.frame[0]||ly<t.frame[1]||lx>=t.frame[0]+t.frame[2]||ly>=t.frame[1]+t.frame[3])outsideFrame++;
        if(lx<t.envelope[0]||ly<t.envelope[1]||lx>t.envelope[2]||ly>t.envelope[3])outsideEnvelope++;
      }
      const target=document.createElement('canvas');target.width=t.frame[2]*4;target.height=t.frame[3]*4;
      const c=target.getContext('2d');c.imageSmoothingEnabled=false;
      const ratio=source.width/t.square;
      c.drawImage(image,t.frame[0]*ratio,t.frame[1]*ratio,t.frame[2]*ratio,t.frame[3]*ratio,0,0,target.width,target.height);
      const alphaAt=([x,y]) => pixels[(Math.min(source.height-1,Math.round(y*ratio))*source.width+Math.min(source.width-1,Math.round(x*ratio)))*4+3];
      const overlay=document.createElement('canvas');overlay.width=overlay.height=512;
      const o=overlay.getContext('2d');o.fillStyle='#17181e';o.fillRect(0,0,512,512);
      o.imageSmoothingEnabled=false;o.drawImage(image,0,0,512,512);o.scale(512/t.square,512/t.square);
      o.strokeStyle='#65dbad';o.lineWidth=.35;o.strokeRect(t.envelope[0],t.envelope[1],t.envelope[2]-t.envelope[0],t.envelope[3]-t.envelope[1]);
      [t.root,t.end,t.crown].filter(Boolean).forEach(([x,y],i)=>{
        o.strokeStyle=['#ff7970','#68b9ff','#ffe78c'][i];o.lineWidth=.4;o.beginPath();o.arc(x,y,1.4,0,2*Math.PI);o.stroke();
        o.beginPath();o.moveTo(x-3,y);o.lineTo(x+3,y);o.moveTo(x,y-3);o.lineTo(x,y+3);o.stroke();
      });
      return {png:target.toDataURL().split(',')[1],overlay:overlay.toDataURL().split(',')[1],
        measurement:{id:t.id,sourceDimensions:[image.width,image.height],bounds:{left,top,right,bottom},paintedPixels:painted,
          outsideFramePixels:outsideFrame,outsideEnvelopePixels:outsideEnvelope,outsideEnvelopePercent:100*outsideEnvelope/painted,
          rootAlpha:alphaAt(t.root),...(t.end?{endAlpha:alphaAt(t.end)}:{}),...(t.crown?{crownAlpha:alphaAt(t.crown)}:{})}};
    }, {contract,url:'data:image/png;base64,'+bytes.toString('base64')});
    await writeFile(directory+'/registered/'+contract.replace+'.png',Buffer.from(result.png,'base64'));
    await writeFile(directory+'/review/'+contract.id+'-geometry.png',Buffer.from(result.overlay,'base64'));
    measurements.push(result.measurement);
  }
  if(!calibrated) {
    await writeFile(directory+'/measurements.json',JSON.stringify({registration:'Uniform source-square scaling, then canonical frame crop. No landmark correction or production asset changes.',measurements},null,2));
    console.log(JSON.stringify(measurements));
  }
  const errors=[];
  for (const replacement of [false,true]) {
    const context=await browser.newContext({viewport:{width:1280,height:1100},deviceScaleFactor:1,reducedMotion:'reduce'});
    if(replacement) {
      for(const t of contracts)await context.route('**/grotesque/modular-v2/'+t.replace+'.png',route=>route.fulfill({path:directory+'/'+registrationFolder+'/'+t.replace+'.png',contentType:'image/png'}));
      if(calibrated)await context.route('**/grotesque/modular-v2/geometry.json',async route=>{
        const geometry=JSON.parse(await readFile('public/grotesque/modular-v2/geometry.json','utf8'));
        const amendments=JSON.parse(await readFile(directory+'/calibrated/geometry.json','utf8'));
        for(const [name,value]of Object.entries(amendments))geometry[name]={...geometry[name],...value};
        await route.fulfill({body:JSON.stringify(geometry),contentType:'application/json'});
      });
    }
    const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
    await p.goto(base+'art-study.html');
    const output=await p.evaluate(async ()=>{
      const {drawPuppet,fitPuppet,puppetReady}=await import('/src/art/puppet.ts');
      const {pixelItem}=await import('/src/art/pixel.ts');await puppetReady;
      const make=(name,heads,arms,legs,gear)=>({
        name,healthFactor:8,powerFactor:.25,parts:[
          {uid:name+'-chest',slot:'chest',variant:'living'},
          {uid:name+'-heart',slot:'heart',variant:'living'},
          ...Array.from({length:heads},(_,i)=>({uid:name+'-head-'+i,slot:'head',variant:i%2?'living':'rat',
            ...(gear?{item:{uid:name+'-crown-'+i,defId:'horns',level:1}}:{})})),
          ...Array.from({length:arms},(_,i)=>({uid:name+'-arm-'+i,slot:'hand',variant:i%3===2?'living':'serpent',
            ...(gear?{item:{uid:name+'-weapon-'+i,defId:i%2?'knife':'shield',level:1}}:{})})),
          ...Array.from({length:legs},(_,i)=>({uid:name+'-leg-'+i,slot:'foot',variant:i%2?'bone':'rat'})),
        ]});
      const cases=[make('Balanced grafts',1,2,2,false),make('Two heads / three arms',2,3,3,true),make('Three heads / four arms',3,4,4,false)];
      const board=document.createElement('canvas');board.width=1440;board.height=970;
      const c=board.getContext('2d');c.fillStyle='#17181e';c.fillRect(0,0,1440,970);
      cases.forEach((b,i)=>{c.fillStyle='#e5cca5';c.font='20px Georgia';c.fillText(b.name,i*480+18,32);
        const f=fitPuppet(b,{x:i*480+14,y:50,w:452,h:560},3);drawPuppet(c,b,f.x,f.y,f.scale,{},pixelItem);
        c.fillText('Strike / same geometry',i*480+18,648);
        const a=fitPuppet(b,{x:i*480+14,y:666,w:452,h:288},1.4);
        const arms=Object.fromEntries(b.parts.filter(p=>p.item&&p.slot==='hand').map(p=>[p.item.uid,{facing:1,drawback:1,strike:.6}]));
        drawPuppet(c,b,a.x,a.y,a.scale,{arms},pixelItem);
      });
      // Mount the actual DressingRoom component with the same test build.
      const React=await import('/node_modules/.vite/deps/react.js');
      const rootModule=await import('/node_modules/.vite/deps/react-dom_client.js');
      const {createRoot}=rootModule.default??rootModule;
      const {DressingRoom}=await import('/src/ui/Arena.tsx');
      const host=document.createElement('div');host.id='run-study-room';
      host.style.cssText='width:480px;height:510px;';document.body.replaceChildren(host);
      createRoot(host).render((React.default??React).createElement(DressingRoom,{build:cases[1],floor:11}));
      return board.toDataURL().split(',')[1];
    });
    const prefix=replacement?(calibrated?'calibrated':'run'):'original';
    await writeFile(directory+'/review/'+prefix+'-assembly.png',Buffer.from(output,'base64'));
    await p.locator('#run-study-room canvas').waitFor();await p.waitForTimeout(300);
    await p.locator('#run-study-room canvas').screenshot({path:directory+'/review/'+prefix+'-dressing-room.png'});
    await context.close();
  }
  if(errors.length)throw new Error(errors.join('\n'));
  console.log('Captured real game renderer and DressingRoom; no browser errors.');
} finally {await browser.close();}
