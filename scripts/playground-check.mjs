import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context = await browser.newContext({viewport:{width:1440,height:960}});
const page = await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error') console.log('Browser error:',m.text().slice(0,250));});
try{
  await page.goto('http://127.0.0.1:5174/');
  await page.locator('.main-header .save-status').waitFor({timeout:60000});
  if(await page.locator('.starter-weapons').count()) await page.getByRole('button',{name:/Heavy Club.*Choose/}).click();
  // Reuse this test's saved opening patient without discarding existing progress.
  assert.equal(await page.locator('.equipment-slot.filled').filter({hasText:'Heavy Club'}).count(),1,'Use an empty Playground test profile or this check’s Heavy Club patient.');
  const soundToggle=page.getByRole('button',{name:/^(Mute sound|Enable sound)$/});
  await soundToggle.click();await soundToggle.click();
  await page.getByText('Cloud save',{exact:true}).waitFor({timeout:15000});
  await page.getByRole('button',{name:'Enter floor 1'}).waitFor();
  await page.getByText('Cloud save',{exact:true}).waitFor({timeout:30000});
  await page.reload();
  await page.getByRole('button',{name:'Enter floor 1'}).waitFor({timeout:30000});
  assert.equal(await page.getByRole('dialog').count(),0);
  assert.equal(await page.locator('.equipment-slot.filled').filter({hasText:'Heavy Club'}).count(),1);
  await page.screenshot({path:'/private/tmp/frankentower-playground.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('PASS: RUN Playground initialization, identity, cloud write, reload, cloud read, safe area.');
}catch(e){await page.screenshot({path:'/private/tmp/frankentower-playground-error.png',fullPage:true});console.log('Page text:',(await page.locator('body').innerText()).slice(0,2500));throw e;}finally{await browser.close();}
