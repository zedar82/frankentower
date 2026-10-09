import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const url=process.env.FRANKENTOWER_PREVIEW_URL;
if(!url)throw new Error('Set FRANKENTOWER_PREVIEW_URL to the private RUN share link.');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--disable-http2']});
const page=await browser.newPage({viewport:{width:1440,height:960}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
async function findGame(){
  for(let i=0;i<60;i++){
    for(const frame of page.frames()){
      if(frame===page.mainFrame()||!await frame.locator('.main-header .save-status').count())continue;
      const box=await (await frame.frameElement()).boundingBox();
      if(box&&box.width>0&&box.height>0)return frame;
    }
    await page.waitForTimeout(800);
  }
  throw new Error('RUN did not expose a visible game frame within the startup window.');
}
try{
  await page.goto(url,{waitUntil:'domcontentloaded'});
  let game=await findGame();
  await game.getByRole('button',{name:/Butcher’s Knife.*Choose/}).click();
  await game.getByRole('button',{name:'Enter floor 1'}).waitFor();
  await game.locator('.buy-button').first().click();
  await game.getByRole('button',{name:'Enter floor 1'}).click();
  await game.getByRole('button',{name:'4×',exact:true}).click();
  await game.getByRole('button',{name:'Continue to floor 2'}).waitFor({timeout:15000});
  await page.screenshot({path:'/private/tmp/frankentower-hosted.png',fullPage:true});
  await game.getByText('Cloud save',{exact:true}).waitFor({timeout:30000});
  await game.getByRole('button',{name:'Continue to floor 2'}).click();
  await game.getByRole('button',{name:'Enter floor 2'}).waitFor();
  await game.getByText('Cloud save',{exact:true}).waitFor({timeout:30000});
  await page.reload({waitUntil:'domcontentloaded'});
  game=await findGame();
  await game.getByRole('button',{name:'Enter floor 2'}).waitFor();
  assert.equal(errors.filter(e=>e.includes('frankentower')||e.includes('Maximum call stack')).length,0);
  console.log('PASS: private RUN deployment boots, equipment purchase works, floor 1 resolves, cloud save restores floor 2 after reload.');
}catch(e){
  await page.screenshot({path:'/private/tmp/frankentower-hosted-error.png',fullPage:true});
  console.log('Browser errors:',errors);
  console.log('Host frames:',await page.locator('iframe').evaluateAll(nodes=>nodes.map(n=>({title:n.title,src:n.src,rect:n.getBoundingClientRect().toJSON(),display:getComputedStyle(n).display,visibility:getComputedStyle(n).visibility}))));
  for(const frame of page.frames())if(frame===page.mainFrame()||frame.url().includes('.h5-apps.')) console.log('Frame:',frame.url(),(await frame.locator('body').innerText().catch(()=>'' )).slice(0,2000));
  throw e;
}finally{await browser.close();}
