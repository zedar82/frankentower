import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const style=process.argv[2]??'a',root='output/art-direction/experiment-02';
const catalogue=JSON.parse(await fs.readFile(`${root}/${style}/catalogue.json`,'utf8'));
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1400,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5173/');
 await page.evaluate(async({catalogue,style})=>{
  const {drawPuppet,puppetReady}=await import('/src/art/puppet.ts');
  const {loadModularSkin}=await import('/src/art/modular.ts');
  const {room}=await import('/src/art/pixel.ts');
  await puppetReady;
  const base=`/output/art-direction/experiment-02/${style}/`;
  const make=(heads=2,arms=3,legs=4,weaponArm=0,bootLeg=0)=>{
   const parts=[{uid:'torso',slot:'chest',variant:'living'},...Array.from({length:heads},(_,i)=>({uid:`head${i}`,slot:'head',variant:'bone'})),...Array.from({length:arms},(_,i)=>({uid:`arm${i}`,slot:'hand',variant:'living',...(i===weaponArm?{item:{uid:'maul',defId:'enormous',level:1}}:{})})),...Array.from({length:legs},(_,i)=>({uid:`leg${i}`,slot:'foot',variant:'living',...(i===bootLeg?{item:{uid:'boot',defId:'blade_boot',level:1}}:{})}))];
   return{name:'Modular acceptance fixture',parts};
  };
  const build=make();
  const maps=b=>Object.fromEntries(b.parts.map(p=>[p.uid,p.slot==='chest'?'torso':p.slot==='head'?'skeleton-head':p.slot==='foot'?'dog-leg':(p.uid==='arm2'||(b.parts.filter(p=>p.slot==='hand').length>3&&Number(p.uid.slice(3))%2===1))?'tentacle-arm':'human-arm']));
  const skin=await loadModularSkin(catalogue,base,maps(build),{maul:'maul',boot:'boot'});
  const canvas=document.createElement('canvas');document.body.replaceChildren(canvas);document.body.style.cssText='margin:0;background:#18161c';
  const c=canvas.getContext('2d');
  const setup=(w,h)=>{canvas.width=w;canvas.height=h;c.fillStyle='#211f29';c.fillRect(0,0,w,h);c.fillStyle='#efdfc2';c.font='18px sans-serif';};
  const draw=(b,x,y,s,pose={})=>drawPuppet(c,b,x,y,s,{...pose,skin:{...skin,parts:maps(b)}},()=>{throw new Error('Unexpected legacy gear painter');});
  const phase=(kind,t)=>kind==='walk'?{moving:true,walk:t*55,time:t}:kind==='attack'?{time:t,arms:{maul:{facing:1,drawback:1,strike:t%1<.55?(t%1)/.55:undefined,recovery:t%1>=.55?((t%1)-.55)/.45:undefined}}}:{};
  const bounds=(b,pose={})=>{const tmp=document.createElement('canvas');tmp.width=2400;tmp.height=2400;const ctx=tmp.getContext('2d');drawPuppet(ctx,b,1200,1200,1,{...pose,skin:{...skin,parts:maps(b)}},()=>{});const px=ctx.getImageData(0,0,2400,2400).data;let l=2400,r=0,t=2400,bt=0;for(let y=0;y<2400;y++)for(let x=0;x<2400;x++)if(px[(y*2400+x)*4+3]>32){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);bt=Math.max(bt,y);}return{left:l-1200,right:r-1200,top:t-1200,bottom:bt-1200,width:r-l+1,height:bt-t+1};};
  const fitted=(b,box,pose={},given)=>{const bb=given??bounds(b,pose);const s=Math.min(box.w/bb.width,box.h/bb.height);draw(b,box.x+box.w/2-(bb.left+bb.right)/2*s,box.y+box.h/2-(bb.top+bb.bottom)/2*s,s,pose);};
  const baseBounds=bounds(build);
  const counts={};const originalDraw=c.drawImage.bind(c);c.drawImage=(im,...args)=>{const a=Object.values(skin.assets).find(a=>a.bitmap===im);if(a)counts[a.id]=(counts[a.id]??0)+1;return originalDraw(im,...args);};setup(900,700);draw(build,450,400,.7);c.drawImage=originalDraw;
  window.lab={canvas,c,setup,draw,fitted,phase,build,make,maps,skin,bounds,baseBounds,counts,room,catalogue};
 },{catalogue,style});
 const save=async name=>{const data=await page.evaluate(()=>window.lab.canvas.toDataURL('image/png').split(',')[1]);await fs.writeFile(`${root}/${style}/${name}.png`,Buffer.from(data,'base64'));};
 for(const overlay of [false,true]){
 await page.evaluate(overlay=>{const {setup,c,skin,catalogue}=window.lab;setup(1400,760);c.fillText(overlay?'Measured pivots and interface regions':'Independent prepared catalogue',24,30);catalogue.slice(0,7).forEach((a,i)=>{const col=i%4,row=Math.floor(i/4),x=col*350,y=row*360+45;const s=Math.min(310/a.width,280/a.height),ox=x+175-a.width*s/2,oy=y+145-a.height*s/2;c.drawImage(skin.assets[a.id].bitmap,ox,oy,a.width*s,a.height*s);c.fillStyle='#efdfc2';c.fillText(a.id,x+20,y+315);if(overlay){for(const [key,p]of Object.entries(a.anchors)){c.strokeStyle=key==='attachment'?'#ff557a':'#50e9e9';c.lineWidth=2;c.beginPath();c.arc(ox+p[0]*s,oy+p[1]*s,key==='attachment'?(a.interfaceSize??32)*s/2:5,0,Math.PI*2);c.stroke();}for(const points of Object.values(a.receiving??{})){c.strokeStyle='#50e9e9';c.beginPath();points.forEach(([px,py],j)=>j?c.lineTo(ox+px*s,oy+py*s):c.moveTo(ox+px*s,oy+py*s));c.stroke();}}});},overlay);
 await save(overlay?'technical-overlay':'catalogue');
 }
 for(const kind of ['neutral','walk','attack']){
 await page.evaluate(kind=>{const{setup,c,fitted,build,phase}=window.lab;setup(900,700);c.fillText(`${kind} / actual drawPuppet output`,24,30);fitted(build,{x:50,y:60,w:800,h:600},phase(kind,.3));},kind);await save(kind);
 }
 await page.evaluate(()=>{const{setup,c,make,fitted}=window.lab;setup(1400,780);const cases=[[make(2,3,4,0,0),'Human grip / dog boot'],[make(2,3,4,2,1),'Tentacle grip / mirrored dog boot']];cases.forEach(([b,label],i)=>{c.fillText(label,i*700+24,30);fitted(b,{x:i*700+30,y:70,w:640,h:650},{arms:{maul:{facing:1,drawback:1,strike:.55}},moving:true,walk:10});});});await save('equipment-compatibility');
 await page.evaluate(()=>{const{setup,c,make,fitted}=window.lab;setup(1100,900);c.fillText('Stress / six heads, twelve mixed arms, eight dog legs',24,30);const b=make(6,12,8);const old=window.lab.maps;window.lab.skin.parts=old(b);fitted(b,{x:40,y:60,w:1020,h:800});});await save('stress');
 await page.evaluate(()=>{const{setup,c,room,draw,build,baseBounds}=window.lab;setup(1280,800);c.save();c.scale(2,2);room(c,1);c.restore();[64,128,256].forEach((h,i)=>{const s=h/baseBounds.height,x=220+i*380,y=520-baseBounds.bottom*s;draw(build,x,y,s);c.fillStyle='#f8e9c5';c.font='20px sans-serif';c.fillText(`${h} px`,x-30,565);});});await save('gameplay');
 for(const kind of ['walk','attack']){
 const video=await page.evaluate(async kind=>{const{setup,canvas,c,build,draw,phase}=window.lab;setup(900,700);const stream=canvas.captureStream(30),chunks=[];const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9'});recorder.ondataavailable=e=>chunks.push(e.data);const done=new Promise(resolve=>recorder.onstop=resolve);recorder.start();for(let i=0;i<60;i++){c.fillStyle='#211f29';c.fillRect(0,0,900,700);c.fillStyle='#efdfc2';c.font='18px sans-serif';c.fillText(`${kind} / actual renderer`,24,30);draw(build,450,350,.68,phase(kind,i/30));await new Promise(r=>setTimeout(r,33));}recorder.stop();await done;stream.getTracks().forEach(t=>t.stop());return Array.from(new Uint8Array(await new Blob(chunks,{type:'video/webm'}).arrayBuffer()));},kind);
 await fs.writeFile(`${root}/${style}/${kind}.webm`,Buffer.from(video));
 }

 if(catalogue.some(a=>a.id==='torso-02')) {
  await page.evaluate(()=>{
   const {setup,c,draw,build,skin}=window.lab;
   setup(1400,850);c.fillText('Independent reproducibility samples / replacement assembly',24,30);
   ['skeleton-head-02','skeletal-arm','torso-02'].forEach((id,i)=>{const a=skin.assets[id],s=Math.min(300/a.width,330/a.height);c.drawImage(a.bitmap,30+i*350,70,a.width*s,a.height*s);c.fillText(id,30+i*350,430);});
   const original={...skin.assets};
   skin.assets['skeleton-head']=skin.assets['skeleton-head-02'];skin.assets['human-arm']=skin.assets['skeletal-arm'];skin.assets.torso=skin.assets['torso-02'];
   draw(build,1130,470,.65,{moving:true,walk:10});
   skin.assets=original;
  });
  await save('reproducibility');
 }
 const anchorChecks=await page.evaluate(()=>{
  const {setup,c,draw,make,phase,skin}=window.lab;setup(900,700);
  let worst=0,samples=0;
  for(const arm of [0,2])for(const boot of [0,1])for(let frame=0;frame<24;frame++){
   const records=[];const original=c.drawImage.bind(c);
   c.drawImage=(bitmap,...args)=>{
    const asset=Object.values(skin.assets).find(a=>a.bitmap===bitmap);
    if(asset){const matrix=c.getTransform();const anchors=Object.fromEntries(Object.entries(asset.anchors).map(([key,[ax,ay]])=>{const p=new DOMPoint(ax+args[0],ay+args[1]).matrixTransform(matrix);return[key,[p.x,p.y]];}));records.push({id:asset.id,anchors});}
    return original(bitmap,...args);
   };
   draw(make(2,3,4,arm,boot),450,350,.5,{...phase('attack',frame/24),moving:true,walk:frame*2});c.drawImage=original;
   for(const [id,anchor,host]of [['maul','grip',arm===0?'human-arm':'tentacle-arm'],['boot','footwear','dog-leg']]){
    const gear=records.find(r=>r.id===id).anchors.attachment;
    const distances=records.filter(r=>r.id===host).map(r=>Math.hypot(r.anchors[anchor][0]-gear[0],r.anchors[anchor][1]-gear[1]));
    worst=Math.max(worst,Math.min(...distances));samples++;
   }
  }
  return{samples,worstErrorPixels:worst};
 });
 if(anchorChecks.worstErrorPixels>0.001)throw new Error('Equipment anchor drift');
 const results=await page.evaluate(()=>({counts:window.lab.counts,neutralBounds:window.lab.baseBounds,renderer:'src/art/puppet.ts drawPuppet -> metadata skin',status:'captured; visual acceptance pending'}));

 const expected={'skeleton-head':2,'human-arm':2,'tentacle-arm':1,'dog-leg':4,torso:1,maul:1,boot:1};for(const[id,n]of Object.entries(expected))if(results.counts[id]!==n)throw new Error(`${id}: expected ${n}, saw ${results.counts[id]}`);
 if(errors.length)throw new Error(errors.join('\n'));
 await fs.writeFile(`${root}/${style}/validation.json`,JSON.stringify({...results,anchorChecks,errors},null,2));
 console.log(style,JSON.stringify(results));
}finally{await browser.close();}

