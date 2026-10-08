import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const url=process.env.FRANKENTOWER_PREVIEW_URL;
if(!url)throw new Error('Set FRANKENTOWER_PREVIEW_URL to the private RUN share link.');
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--disable-http2']});
const page=await browser.newPage({viewport:{width:1440,height:960}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(url,{waitUntil:'domcontentloaded'});
  let game;
  for(let i=0;i<60;i++){
    for(const frame of page.frames())if(await frame.locator('.wordmark').count()){game=frame;break;}
    if(game)break;
    await page.waitForTimeout(800);
  }
  if(!game){console.log('Host text:',(await page.locator('body').innerText()).slice(0,2000));throw new Error('RUN did not expose the game frame within the startup window.');}
  await game.getByRole('button',{name:/Butcher’s Knife.*Choose/}).click();
  await game.getByRole('button',{name:'Enter floor 1'}).waitFor();
  await game.locator('.buy-button').first().click();
  await game.getByRole('button',{name:'Enter floor 1'}).click();
  await game.getByRole('button',{name:'4×',exact:true}).click();
  await game.getByRole('button',{name:'Continue to floor 2'}).waitFor({timeout:15000});
  await page.screenshot({path:'/private/tmp/frankentower-hosted.png',fullPage:true});
  assert.equal(await game.getByText('Cloud save',{exact:true}).count(),1);
  assert.equal(errors.filter(e=>e.includes('frankentower')||e.includes('Maximum call stack')).length,0);
  console.log('PASS: private RUN deployment boots, equipment purchase works, floor 1 resolves, cloud save is active.');
}catch(e){await page.screenshot({path:'/private/tmp/frankentower-hosted-error.png',fullPage:true});throw e;}finally{await browser.close();}
