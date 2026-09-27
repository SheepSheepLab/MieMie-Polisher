import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {JSDOM} from 'jsdom';
import {createPolisherNativeLauncher} from '../native-launcher.js';import {POLISHER_PRODUCT} from '../product-identity.js';
const styles=await readFile(new URL('../assets/native-launcher.css',import.meta.url),'utf8');
const tick=()=>new Promise(r=>setImmediate(r));
function fixture(t,{reduced=false}={}){
 const dom=new JSDOM('<body>',{url:'https://fixture.invalid'}),host=dom.window;host.matchMedia=()=>({matches:reduced});host.visualViewport=Object.assign(new host.EventTarget(),{width:390,height:780,offsetLeft:0,offsetTop:0});let opens=0;
 const make=()=>createPolisherNativeLauncher({host,styles,icon:'data:image/png;base64,AA==',open:()=>opens++}),native=make(),orb=native.getOrigin();orb.getBoundingClientRect=()=>({left:parseFloat(orb.style.left),top:parseFloat(orb.style.top),width:64,height:64});
 const panel=host.document.createElement('section');panel.hidden=true;panel.style.borderRadius='20px';panel.getBoundingClientRect=()=>({left:12,top:16,width:366,height:748});host.document.body.append(panel);
 const pointer=(type,x,y,pointerType='touch')=>{const event=new host.Event(type,{bubbles:true,cancelable:true});Object.assign(event,{pointerId:1,button:0,isPrimary:true,clientX:x,clientY:y,pointerType});orb.dispatchEvent(event);};
 t.after(()=>{native.dispose();dom.window.close();});return {host,native,orb,panel,pointer,make,get opens(){return opens;}};
}
test('Product UI identity preserves protocol manifest and names the native entry',async t=>{
 const f=fixture(t),m=JSON.parse(await readFile(new URL('../manifest.json',import.meta.url),'utf8'));assert.equal(m.id,'miemie.polisher');assert.equal(m.name,POLISHER_PRODUCT.name);assert.equal(m.contributes.launcher.title,POLISHER_PRODUCT.launcherName);assert.ok(Object.isFrozen(POLISHER_PRODUCT));assert.match(f.orb.getAttribute('aria-label'),new RegExp(POLISHER_PRODUCT.name));
});
for(const type of ['mouse','touch'])test(type+' drag docks, persists across modes, suppresses click and remains independent of Hub dock',async t=>{
 const f=fixture(t);f.host.localStorage.setItem('meeme_timeline_dock_v1','unchanged');const r=f.orb.getBoundingClientRect();f.pointer('pointerdown',r.left+5,r.top+5,type);f.pointer('pointermove',15,200,type);f.pointer('pointerup',15,200,type);
 f.orb.dispatchEvent(new f.host.MouseEvent('click',{detail:1}));await tick();assert.equal(f.opens,0);assert.equal(f.orb.style.left,'10px');const saved=JSON.parse(f.host.localStorage.getItem('miemie_polisher_dock_v1'));assert.equal(saved.side,'left');assert.equal(f.host.localStorage.getItem('meeme_timeline_dock_v1'),'unchanged');
 f.native.dispose();const next=f.make();assert.equal(next.getOrigin().style.left,'10px');assert.equal(parseFloat(next.getOrigin().style.top),parseFloat(f.orb.style.top));next.dispose();
});
test('tap and keyboard open; cancelled pointer does not move dock or reopen; cleanup removes entry',async t=>{
 const f=fixture(t),before=f.orb.style.top;f.pointer('pointerdown',200,300);f.pointer('pointermove',202,302);f.pointer('pointerup',202,302);f.orb.click();await tick();assert.equal(f.opens,1);
 f.pointer('pointerdown',200,300);f.pointer('pointermove',80,200);f.pointer('pointercancel',80,200);assert.equal(f.orb.style.top,before);f.orb.dispatchEvent(new f.host.MouseEvent('click',{detail:1}));await tick();assert.equal(f.opens,1);f.native.dispose();f.orb.click();await tick();assert.equal(f.opens,1);assert.equal(f.host.document.querySelector('[data-miemie-polisher-native]'),null);
});
test('Standalone morph uses the orb rect, deduplicates transitions and returns without destroying panel state',async t=>{
 const f=fixture(t),calls=[];f.host.Element.prototype.animate=function(frames,options){calls.push({el:this,frames,options});return {finished:Promise.resolve(),cancel(){}};};
 const a=f.native.show(f.panel),b=f.native.show(f.panel);assert.equal(a,b);await a;assert.equal(f.panel.hidden,false);assert.equal(f.panel.inert,false);assert.ok(calls.some(c=>c.el===f.panel&&c.frames[0].transform.startsWith('translate(')));assert.equal(f.host.document.querySelector('[data-polisher-surface-face]'),null);
 f.panel.dataset.businessState='kept';const closing=f.native.close(f.panel);assert.equal(closing,f.native.close(f.panel));await closing;assert.equal(f.panel.hidden,true);assert.equal(f.panel.dataset.businessState,'kept');assert.equal(f.orb.style.visibility,'');assert.match(calls.filter(c=>c.el===f.panel).at(-1).frames.at(-1).transform,/translate\(/);
});
test('rotation and disposal cancel active flights and remove every face; reduced motion preserves lifecycle',async t=>{
 const f=fixture(t),pending=[];f.host.Element.prototype.animate=function(){let finish;const finished=new Promise(r=>finish=r);const a={finished,cancel(){finish();}};pending.push(a);return a;};
 const opening=f.native.show(f.panel);await tick();assert.equal(f.panel.dataset.surfaceState,'opening');assert.equal(f.host.getComputedStyle(f.orb).visibility,'visible');assert.equal(f.host.document.querySelector('[data-polisher-surface-face]'),null);Object.assign(f.host.visualViewport,{width:780,height:390});f.host.dispatchEvent(new f.host.Event('orientationchange'));await opening;assert.equal(f.panel.inert,false);assert.equal(f.panel.style.height,'370px');
 const closing=f.native.close(f.panel);await tick();f.native.dispose();await closing;assert.equal(f.host.document.querySelector('[data-polisher-surface-face]'),null);assert.equal(f.panel.hidden,true);
 const g=fixture(t,{reduced:true});g.panel.animate=()=>{throw Error('motion disabled');};await g.native.show(g.panel);assert.equal(g.panel.hidden,false);await g.native.close(g.panel);assert.equal(g.panel.hidden,true);
});

for(const side of ['left','right'])test('Standalone '+side+' dock opens beside orb and clamps after viewport changes',async t=>{
 const f=fixture(t);Object.assign(f.host.visualViewport,{width:1440,height:1000});f.host.localStorage.setItem('miemie_polisher_dock_v1',JSON.stringify({side,ratio:.45}));f.native.dispose();const native=f.make(),orb=native.getOrigin();
 orb.getBoundingClientRect=()=>({left:parseFloat(orb.style.left),top:parseFloat(orb.style.top),width:64,height:64});
 await native.show(f.panel);const x=parseFloat(f.panel.style.left),width=parseFloat(f.panel.style.width),r=orb.getBoundingClientRect();
 assert.ok(side==='right'?x+width<r.left:x>r.left+r.width);assert.equal(f.panel.style.right,'auto');assert.equal(f.panel.style.bottom,'auto');assert.equal(f.panel.style.getPropertyValue('max-height'),'780px');assert.equal(f.panel.style.getPropertyPriority('max-height'),'important');
 Object.assign(f.host.visualViewport,{width:360,height:640,offsetLeft:4,offsetTop:20});f.host.dispatchEvent(new f.host.Event('resize'));
 assert.ok(parseFloat(f.panel.style.left)>=14);assert.ok(parseFloat(f.panel.style.left)+parseFloat(f.panel.style.width)<=354);assert.ok(parseFloat(f.panel.style.top)>=30);assert.ok(parseFloat(f.panel.style.top)+parseFloat(f.panel.style.height)<=650);assert.equal(f.panel.hidden,false);assert.equal(f.panel.dataset.surfaceState,'open');assert.equal(f.panel.style.getPropertyValue('max-height'),'620px');native.dispose();
});
test('native brand icon lands in the header after the orb morph with no residual face',async t=>{
 const f=fixture(t),header=f.host.document.createElement('img'),calls=[];header.dataset.toolIcon='polisher';header.src='data:image/png;base64,AA==';header.getBoundingClientRect=()=>({left:28,top:32,width:52,height:52});f.panel.append(header);
 f.host.Element.prototype.getBoundingClientRect=function(){return {left:121,top:316,width:148,height:148};};
 f.host.Element.prototype.animate=function(frames,options){calls.push({el:this,frames,options});return {finished:Promise.resolve(),cancel(){}};};
 await f.native.show(f.panel);const hero=calls.find(c=>c.el.hasAttribute('data-polisher-header-hero'));assert.ok(hero);assert.equal(hero.options.duration,760);assert.equal(hero.frames[1].offset,.16);assert.match(hero.frames.at(-1).transform,/scale\(/);assert.equal(header.style.visibility,'');assert.equal(f.host.document.querySelector('[data-polisher-header-hero]'),null);
 await f.native.close(f.panel);assert.equal(f.panel.hidden,true);
});

test('native splash is visible before morph finishes and is removed on resize',async t=>{
 const f=fixture(t),header=f.host.document.createElement('img');header.dataset.toolIcon='polisher';header.src='icon.png';f.panel.append(header);const pending=new Set();
 f.host.Element.prototype.animate=function(){let finish;const a={finished:new Promise(r=>finish=r),cancel(){finish();pending.delete(a);}};pending.add(a);return a;};
 const opening=f.native.show(f.panel);await tick();assert.ok(f.panel.querySelector('[data-polisher-header-hero]'));assert.equal(f.panel.querySelector('[data-polisher-surface-veil]').style.backdropFilter,'blur(14px)');assert.equal(f.panel.querySelector('[data-polisher-surface-face]'),null);assert.equal(header.style.visibility,'hidden');
 f.host.dispatchEvent(new f.host.Event('resize'));await opening;assert.equal(f.panel.querySelector('[data-polisher-surface-splash]'),null);assert.equal(header.style.visibility,'');assert.equal(f.panel.hidden,false);
});
for(const pointerType of ['mouse','touch'])test('open native panel follows '+pointerType+' drag and returns to current dock',async t=>{
 const f=fixture(t);Object.assign(f.host.visualViewport,{width:1440,height:1000});f.host.dispatchEvent(new f.host.Event('resize'));await f.native.show(f.panel);const before=f.panel.style.left,r=f.orb.getBoundingClientRect();
 f.pointer('pointerdown',r.left+4,r.top+4,pointerType);f.pointer('pointermove',25,280,pointerType);f.pointer('pointerup',25,280,pointerType);assert.notEqual(f.panel.style.left,before);assert.ok(parseFloat(f.panel.style.left)>parseFloat(f.orb.style.left)+64);assert.equal(f.panel.hidden,false);await f.native.close(f.panel);assert.equal(f.panel.hidden,true);
});

test('native orb remains visible during both flights and Shortcut active feedback never hides it',async t=>{
 const f=fixture(t),flights=[];
 f.panel.animate=(frames)=>{let finish;const a={frames,finished:new Promise(r=>finish=r),cancel(){finish();},finish(){finish();}};flights.push(a);return a;};
 const visible=()=>{assert.equal(f.host.getComputedStyle(f.orb).visibility,'visible');assert.notEqual(f.host.getComputedStyle(f.orb).display,'none');assert.equal(f.orb.hidden,false);};
 const opening=f.native.show(f.panel);await tick();visible();assert.equal(f.panel.dataset.surfaceState,'opening');assert.equal(flights[0].frames[0].opacity,0);assert.equal(f.host.document.querySelector('[data-polisher-surface-face]'),null);
 flights[0].finish();await opening;visible();assert.equal(f.panel.hidden,false);
 const closing=f.native.close(f.panel);await tick();visible();assert.equal(f.panel.dataset.surfaceState,'closing');assert.equal(flights[1].frames.at(-1).opacity,0);assert.match(flights[1].frames.at(-1).transform,/translate\(/);
 flights[1].finish();await closing;visible();assert.equal(f.panel.hidden,true);assert.equal(f.orb.hasAttribute('data-surface-active'),false);
 f.native.setActive(true);visible();assert.equal(f.orb.dataset.surfaceActive,'true');f.native.setActive(false);visible();assert.equal(f.orb.hasAttribute('data-surface-active'),false);
});

for(const reduced of [false,true])test('Standalone and delegated Shortcut use identical native frames, timing and geometry; reduced='+reduced,async t=>{
 const run=async delegated=>{
  const f=fixture(t,{reduced}),calls=[];Object.assign(f.host.visualViewport,{width:1200,height:800});
  const header=f.host.document.createElement('img');header.dataset.toolIcon='';header.src='icon.png';header.getBoundingClientRect=()=>({left:30,top:40,width:52,height:52});f.panel.append(header);
  f.host.Element.prototype.getBoundingClientRect=function(){return {left:120,top:310,width:148,height:148};};
  f.host.Element.prototype.animate=function(frames,options){calls.push({kind:this===f.panel?'panel':this.hasAttribute('data-polisher-header-hero')?'hero':'veil',frames,options});return {finished:Promise.resolve(),cancel(){}};};
  f.host.dispatchEvent(new f.host.Event('resize'));
  if(delegated){f.panel.hidden=false;f.panel.inert=true;f.panel.dataset.surfaceState='opening';await f.native.presentation.run(f.panel,true);assert.equal(f.panel.inert,true);assert.equal(f.panel.dataset.surfaceState,'opening');f.panel.inert=false;f.panel.dataset.surfaceState='open';}
  else await f.native.show(f.panel);
  const geometry=f.panel.style.cssText;
  const r=f.orb.getBoundingClientRect();f.pointer('pointerdown',r.left+5,r.top+5);f.pointer('pointermove',20,180);f.pointer('pointerup',20,180);const dragged=f.panel.style.cssText;
  Object.assign(f.host.visualViewport,{width:320,height:640});f.host.dispatchEvent(new f.host.Event('resize'));assert.equal(f.panel.style.maxHeight,'620px');assert.equal(f.panel.hidden,false);
  if(delegated){await f.native.presentation.run(f.panel,false);assert.equal(f.panel.hidden,false);f.native.presentation.release();f.panel.hidden=true;}
  else await f.native.close(f.panel);
  return {calls,geometry,dragged};
 };
 assert.deepEqual(await run(true),await run(false));
});

test('disposing a delegated native presentation cancels visuals without hiding the Hub-owned panel',async t=>{
 const f=fixture(t);f.panel.hidden=false;f.panel.dataset.surfaceState='opening';
 f.panel.animate=()=>{let finish;return {finished:new Promise(r=>finish=r),cancel(){finish();}};};
 const opening=f.native.presentation.run(f.panel,true);f.native.dispose();await opening;
 assert.equal(f.panel.hidden,false);assert.equal(f.panel.dataset.surfaceState,'opening');assert.equal(f.orb.isConnected,false);assert.equal(f.panel.querySelector('[data-polisher-surface-splash]'),null);
});
