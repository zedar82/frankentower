import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try {
  const page=await browser.newPage({viewport:{width:1500,height:2300}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.FRANKENTOWER_LOCAL_URL??'http://127.0.0.1:5173/');
  await page.locator('.main-header').waitFor();
  const result=await page.evaluate(async()=>{
    const {puppetReady,puppetLayout,fitPuppet,drawPuppet,armAngle}=await import('/src/art/puppet.ts');
    await puppetReady;
    const fixtures=[['Starting puppet',2,2,1],['Four arms / four legs',4,4,2],['Eight arms / eight legs',8,8,3],['Twelve arms / six heads',12,8,6],['Three arms / one leg',3,1,1],['Headless / armless body',0,4,0]];
    const builds=fixtures.map(([name,hands,feet,heads])=>({name,parts:['chest','heart',...Array(hands).fill('hand'),...Array(feet).fill('foot'),...Array(heads).fill('head')].map((slot,i)=>({uid:`${name}-${i}`,slot,variant:'living',...(slot==='hand'?{item:{uid:`weapon-${i}`,defId:'knife',level:1}}:{})}))}));
    const canvas=document.createElement('canvas');canvas.width=1500;canvas.height=2300;canvas.style.cssText='display:block;width:1500px;height:2300px;image-rendering:auto';
    document.body.replaceChildren(canvas);document.body.style.cssText='margin:0;background:#18161c';
    const c=canvas.getContext('2d');c.fillStyle='#18161c';c.fillRect(0,0,1500,2300);
    const failures=[];
    builds.forEach((build,row)=>{
      const handParts=build.parts.filter(p=>p.slot==='hand');
      const poses=[{time:0},{time:0,moving:true,walk:9.2},{time:0,activeItems:handParts.map(p=>p.item.uid),itemSwings:Object.fromEntries(handParts.map(p=>[p.item.uid,.23])),facing:1}];
      poses.forEach((pose,column)=>{
        const box={x:column*500+20,y:row*380+50,w:460,h:310};
        const fit=fitPuppet(build,box,2.4);
        c.fillStyle='#28222b';c.fillRect(column*500+8,row*380+8,484,364);
        c.fillStyle='#e4cba0';c.font='18px Georgia';c.textAlign='center';c.fillText(`${build.name} · ${['idle','walk','strike'][column]}`,column*500+250,row*380+35);
        drawPuppet(c,build,fit.x,fit.y,fit.scale,pose,()=>{});
        // Verify actual painted pixels, independently of the dark gallery background or equipment.
        const test=document.createElement('canvas');test.width=600;test.height=600;const ctx=test.getContext('2d');
        const tf=fitPuppet(build,{x:20,y:20,w:560,h:560},2.7),layout=puppetLayout(build);
        drawPuppet(ctx,build,tf.x,tf.y,tf.scale,pose,()=>{});
        const pixels=ctx.getImageData(0,0,600,600).data,connected=new Uint8Array(600*600),queue=new Int32Array(600*600);
        const bob=pose.moving?Math.sin(pose.walk*.22)*1.1:0;
        const pixel=(p)=>({x:Math.round(tf.x+p.x*tf.scale),y:Math.round(tf.y+(p.y-bob)*tf.scale)});
        const seed=pixel({x:0,y:layout.torso.y+layout.torso.h*.5});
        let front=0,back=0;const start=seed.y*600+seed.x;queue[back++]=start;connected[start]=1;
        while(front<back){const n=queue[front++],x=n%600,y=Math.floor(n/600);for(const next of [x? n-1:-1,x<599?n+1:-1,y?n-600:-1,y<599?n+600:-1])if(next>=0&&!connected[next]&&pixels[next*4+3]>=80){connected[next]=1;queue[back++]=next;}}
        const check=(p,label)=>{const q=pixel(p);if(q.x<0||q.y<0||q.x>=600||q.y>=600||!connected[q.y*600+q.x])failures.push(`${build.name} ${['idle','walk','strike'][column]}: ${label} is disconnected`);};
        for(const j of layout.arms){const a=armAngle(j,handParts[j.index],pose);check(j.pin,`arm ${j.index} pin`);check({x:j.pin.x-Math.sin(a)*j.h*.7,y:j.pin.y+Math.cos(a)*j.h*.7},`arm ${j.index} sleeve`);}
        for(const j of layout.legs){const a=pose.moving?Math.sin(pose.walk*.22+j.index*Math.PI)*.075:0;check(j.pin,`leg ${j.index} pin`);check({x:j.pin.x-Math.sin(a)*j.h*.72,y:j.pin.y+Math.cos(a)*j.h*.72},`leg ${j.index} boot`);}
        for(const j of layout.heads){check(j.pin,`head ${j.index} pin`);check({x:j.pin.x,y:j.pin.y-j.h*.4},`head ${j.index} face`);}
      });
    });
    return {failures};
  });
  await page.screenshot({path:'/private/tmp/frankentower-puppet-composition.png'});
  assert.deepEqual(result.failures,[]);assert.deepEqual(errors,[]);
  console.log('PASS: all arm, hip and neck buttons, sleeves, boots and faces connect to the torso in six anatomies and three animation poses.');
} finally { await browser.close(); }
