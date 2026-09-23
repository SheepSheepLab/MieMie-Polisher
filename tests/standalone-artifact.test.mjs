import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM, VirtualConsole} from 'jsdom';
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));
const artifact = JSON.parse(await readFile(new URL('../build/MieMie-Polisher-Extension-' + pkg.version + '.json', import.meta.url)));
const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url)));
const assertTitle = f => assert.equal(f.h.document.querySelector('#meeme-translation .mm-tool-titles > strong').textContent, `${manifest.name} - ${manifest.version}`);
const tick = () => new Promise(resolve => setImmediate(resolve));

function environment() {
  const errors = [], vc = new VirtualConsole(); vc.on('jsdomError', error => errors.push(String(error))); vc.on('warn', error => errors.push(String(error)));
  const dom = new JSDOM('<!doctype html><body><form id="send_form"><textarea id="send_textarea"></textarea><button id="send_but"></button></form></body>', {url: 'https://fixture.invalid/', runScripts: 'outside-only', virtualConsole: vc});
  const h = dom.window, subscriptions = new Map(), outgoing = [];
  const fields = ['GENERATION_STARTED','GENERATION_ENDED','GENERATION_AFTER_COMMANDS','GENERATION_STOPPED','CHAT_CHANGED','CHAT_COMPLETION_SETTINGS_READY','MESSAGE_SWIPED','MESSAGE_EDITED','MESSAGE_DELETED','MESSAGE_UPDATED'];
  const context = {eventTypes: Object.fromEntries(fields.map(x => [x, x])), chat: [{is_user: false, is_system: false, mes: '<story_scene>测试原文</story_scene>', swipe_id: 0}], characterId: 0, characters: [{avatar:'fixture.png',name:'Development Fixture'}], chatId:'fixture-chat', groupId:null, saveChat: async () => {}, mainApi:'openai', stopGeneration() {}};
  const data = {config:{base:'https://api.fixture.invalid/v1',model:'fixture-model',maxTokens:8192,timeoutSeconds:300,protectedTags:''},cards:{'fixture.png':{mode:'polish',target:'简体中文',polishRules:'Fixture prompt',terms:'',sendOriginal:false,prePrompt:{text:'Fixture prefix',role:'system'},postPrompt:{text:'',role:'user'}}},library:[{id:'fixture-prompt',name:'Development Fixture',mode:'polish',data:{target:'简体中文',rules:'Fixture prompt'}}],backups:[]};
  let persisted = structuredClone(data);
  const originalFetch = async (_url, init = {}) => {outgoing.push(init); return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({translations:['测试润色结果']})}}]}), {status:200,headers:{'Content-Type':'application/json'}});};
  h.fetch = originalFetch; h.SillyTavern = {getContext: () => context};
  const frame = h.document.createElement('iframe'); h.document.body.appendChild(frame); const w = frame.contentWindow;
  Object.assign(w, {Response, Request, Headers, Blob, getVariables: scope => {assert.equal(scope.extension_id,'meeme_translation_v1'); return structuredClone(persisted);}, replaceVariables: (value,scope) => {assert.equal(scope.extension_id,'meeme_translation_v1'); persisted = structuredClone(value);},
    eventOn: (name,fn) => {const list=subscriptions.get(name)||new Set();list.add(fn);subscriptions.set(name,list);return {stop:()=>list.delete(fn)};},
    setChatMessages: async rows => {for(const row of rows) context.chat[row.message_id].mes=row.message;},
    fetch: originalFetch,
  });
  w.eval(artifact.content);
  const source = h.__MieMiePolisherSource;
  const el = name => h.document.querySelector('[data-' + name + ']');
  const eventCount = () => [...subscriptions.values()].reduce((sum,x)=>sum+x.size,0);
  const emit=async(name,...args)=>{for(const callback of [...(subscriptions.get(name)||[])])await callback(...args);};
  return {dom,h,w,source,context,errors,outgoing,el,eventCount,originalFetch,emit,data:()=>persisted};
}
function cooperativeHub(f) {
  let source, active, resolveDisposed;
  const whenDisposed = new Promise(resolve => {resolveDisposed=resolve;});
  let disposed = false;
  async function enable() {
    const cleanups=[], controller=new f.h.AbortController();
    const api={signal:controller.signal,onCleanup:fn=>cleanups.push(fn),guard:fn=>(...args)=>controller.signal.aborted?undefined:fn(...args),attachPanel:panel=>{panel.hidden=true;panel.inert=true;cleanups.push(()=>{panel.hidden=true;panel.inert=true;});},showPanel:()=>{const p=f.h.document.querySelector('#meeme-translation section');p.hidden=false;p.inert=false;return true;}};
    active={controller,cleanups,instance:source(api)}; await active.instance.activate();
  }
  async function disable() {const old=active;active=null;if(!old)return;old.controller.abort();await old.instance.deactivate();for(const fn of old.cleanups.reverse())await fn();}
  const hub={apiVersion:1,whenDisposed,open(){},extensions:{provide(_manifest,factory){source=factory;return{ok:true,ready:enable(),release:async()=>{if(!disposed)await disable();}};},open:async()=>active?.instance.open(),disable}};
  return {hub,start(){f.h.__MieMieHub=hub;f.h.dispatchEvent(new f.h.CustomEvent('miemie:hub-ready',{detail:hub}));},async stop(){disposed=true;const done=disable();delete f.h.__MieMieHub;f.h.dispatchEvent(new f.h.CustomEvent('miemie:hub-disposed',{detail:hub}));await done;resolveDisposed();}};
}

test('complete built script works without Hub and retains original settings, hooks and API request behavior', async () => {
  const f=environment(); await f.source.ready;
  try {
    assert.equal(f.source.mode,'standalone');assertTitle(f);assert.equal(f.eventCount(),10);assert.notEqual(f.h.fetch,f.originalFetch);
    assert.equal(f.el('pre-text').value,'Fixture prefix');assert.equal(f.el('mode').textContent,'当前：润色模式');
    f.h.document.querySelector('[data-miemie-polisher-standalone]').click();await tick();assert.equal(f.h.document.querySelector('section').hidden,false);
    f.el('key').value='fixture-session-only-key';f.el('save-config').click();assert.equal(f.h.localStorage.getItem('meeme_translation_key_v1'),null);
    f.el('translate').click();for(let i=0;i<8;i++)await tick();
    assert.equal(f.outgoing.length,1);assert.equal(f.outgoing[0].headers.Authorization,'Bearer fixture-session-only-key');
    assert.match(f.context.chat[0].mes,/测试润色结果/);assert.equal(f.data().backups.length,1);
    assert.deepEqual(f.errors,[]);
  } finally {await f.source.dispose();assert.equal(f.eventCount(),0);assert.equal(f.h.fetch,f.originalFetch);f.dom.window.close();}
});

test('built script preserves memory-only saved key, unsaved API form, auto switch and historical data across both modes', async () => {
  const f=environment();await f.source.ready;
  try {
    f.el('key').value='fixture-private-page-key';f.el('save-config').click();f.el('key').value='fixture-unsaved-key';
    f.el('model').value='fixture-unsaved-model';f.el('auto').click();f.el('config').click();
    const originalData=structuredClone(f.data());
    for(let i=0;i<3;i++){
      const hub=cooperativeHub(f);hub.start();await f.source.settled();
      assert.equal(f.source.mode,'hub');assertTitle(f);assert.equal(f.el('key').value,'fixture-unsaved-key');assert.equal(f.el('model').value,'fixture-unsaved-model');assert.equal(f.el('auto').getAttribute('aria-pressed'),'true');assert.equal(f.el('config').getAttribute('aria-selected'),'true');assert.equal(f.eventCount(),10);
      assert.equal(f.h.document.querySelectorAll('#meeme-translation').length,1);assert.equal(f.h.document.querySelector('[data-miemie-polisher-standalone]'),null);
      await hub.stop();await f.source.settled();assert.equal(f.source.mode,'standalone');assertTitle(f);assert.equal(f.el('key').value,'fixture-unsaved-key');assert.equal(f.eventCount(),10);
    }
    // Business uses the saved page-only key, not the draft field, just as before.
    await f.emit('GENERATION_STARTED','normal');f.context.chat.push({is_user:false,is_system:false,mes:'<story_scene>Fixture new generation</story_scene>',swipe_id:0});await f.emit('GENERATION_ENDED');
    assert.equal(f.outgoing[0].headers.Authorization,'Bearer fixture-private-page-key');
    assert.equal(f.h.localStorage.getItem('meeme_translation_key_v1'),null);
    assert.deepEqual(f.data().config,originalData.config);assert.deepEqual(f.data().library,originalData.library);assert.deepEqual(f.data().cards,originalData.cards);assert.deepEqual(f.errors,[]);
    assert.equal(JSON.stringify(f.source).includes('fixture-private-page-key'),false);
  } finally {await f.source.dispose();assert.equal(f.eventCount(),0);assert.equal(f.h.fetch,f.originalFetch);assert.equal(f.h.__MieMiePolisherSource,undefined);f.dom.window.close();}
});
