import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
const origin='http://127.0.0.1:45001', artifacts=`.artifacts/roadmap-gallery-${Date.now()}`;
test('roadmap landing empty, published, search and error states remain usable at mobile and desktop sizes', {timeout:90000}, async t=>{
 await mkdir(artifacts,{recursive:true});
 const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','45001'],{stdio:'ignore'});t.after(()=>server.kill());
 for(let i=0;i<60;i++){try{if((await fetch(origin)).ok)break;}catch{/* Preview is still starting. */}await new Promise(r=>setTimeout(r,100));}
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});t.after(()=>browser.close());
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 let mode='empty';const errors=[];const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());if(u.origin!==origin)return route.abort();if(!u.pathname.startsWith('/api/'))return route.continue();
  if(u.pathname==='/api/brackets')return route.fulfill({status:mode==='error'?503:200,json:mode==='error'?{ok:false,message:'Temporarily unavailable.'}:{ok:true,items:mode==='empty'?[]:[{id:'one',slug:'cartoons',title:"90's Cartoons",season:'Animation showdown',intro:'Saturday morning legends. One unforgettable showdown.',feature:null,cover:null},{id:'two',slug:'screen',title:'Big screen rivalries',season:'At the movies',intro:'Follow the audience favorites all the way to the final.',feature:null,cover:null}]}});
  return route.fulfill({json:{ok:true,authenticated:false,account:null,items:[],enabled:false}});
 });
 await page.goto(origin+'/abootnothing/roadmap');await page.waitForURL('**/polls/abootnothing/brackets');
 if(await page.getByRole('button',{name:'Reject non-essential',exact:true}).count())await page.getByRole('button',{name:'Reject non-essential',exact:true}).click();
 await page.getByRole('heading',{name:'The rivalries start here.',exact:true}).waitFor();
 for(const width of [1440,768,390]){await page.setViewportSize({width,height:1000});await page.waitForTimeout(150);await page.evaluate(()=>scrollTo(0,0));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>[e.tagName,e.className,e.getBoundingClientRect().right]).slice(0,12))));await page.screenshot({path:`${artifacts}/empty-${width}.png`,fullPage:true});}
 assert.equal(await page.locator('.season-path__trophy').evaluate(e=>getComputedStyle(e).animationName),'none');
 mode='published';await page.reload();await page.locator('.season-card').first().waitFor();assert.equal(await page.locator('.season-card').count(),2);
 await page.getByLabel('Find a season',{exact:true}).fill('cartoon');assert.equal(await page.locator('.season-card').count(),1);
 await page.getByLabel('Find a season',{exact:true}).fill('no such season');await page.getByRole('heading',{name:'No matching seasons.',exact:true}).waitFor();await page.getByRole('button',{name:'Clear search',exact:true}).click();assert.equal(await page.locator('.season-card').count(),2);
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.waitForTimeout(150);await page.evaluate(()=>scrollTo(0,0));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`${artifacts}/published-${width}.png`,fullPage:true});}
 const card=page.locator('.season-card').first();await page.keyboard.press("Tab");await card.focus();assert.equal(await card.evaluate(e=>getComputedStyle(e).outlineStyle),'solid');await card.click({position:{x:20,y:30}});await page.waitForURL('**/brackets/cartoons');
 mode='error';await page.goto(origin+'/polls/abootnothing/brackets');await page.getByRole('button',{name:'Retry',exact:true}).waitFor();mode='empty';await page.getByRole('button',{name:'Retry',exact:true}).click();await page.getByRole('heading',{name:'The rivalries start here.',exact:true}).waitFor();
 assert.deepEqual(errors,[]);console.log(artifacts);
});
