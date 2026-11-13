import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM, VirtualConsole} from 'jsdom';
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));
const artifact = JSON.parse(await readFile(new URL('../build/MieMie-Polisher-Extension-' + pkg.version + '.json', import.meta.url)));
const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url)));
const assertTitle = f => assert.equal(f.h.document.querySelector('#meeme-translation .mm-tool-titles > strong').textContent, `${manifest.name} ${manifest.version}`);
const tick = () => new Promise(resolve => setImmediate(resolve));
const modeTrigger = f => f.el('edit-mode').querySelector('[role=combobox]');
function chooseMode(f, mode) {
  modeTrigger(f).click();
  f.el('edit-mode').querySelector(`[data-mode-option=${mode}]`).click();
}

function environment() {
  const errors = [], vc = new VirtualConsole(); vc.on('jsdomError', error => errors.push(String(error))); vc.on('warn', error => errors.push(String(error)));
  const dom = new JSDOM('<!doctype html><body><form id="send_form"><textarea id="send_textarea"></textarea><button id="send_but"></button></form></body>', {url: 'https://fixture.invalid/', runScripts: 'outside-only', virtualConsole: vc});
  const h = dom.window, subscriptions = new Map(), outgoing = [];
  const fields = ['GENERATION_STARTED','GENERATION_ENDED','GENERATION_AFTER_COMMANDS','GENERATION_STOPPED','CHAT_CHANGED','CHAT_COMPLETION_SETTINGS_READY','MESSAGE_SWIPED','MESSAGE_EDITED','MESSAGE_DELETED','MESSAGE_UPDATED'];
  const context = {eventTypes: Object.fromEntries(fields.map(x => [x, x])), chat: [{is_user: false, is_system: false, mes: '<story_scene>测试原文</story_scene>', swipe_id: 0}], characterId: 0, characters: [{avatar:'fixture.png',name:'Development Fixture'}], chatId:'fixture-chat', groupId:null, saveChat: async () => {}, mainApi:'openai', stopGeneration() {}};
  const data = {config:{base:'https://api.fixture.invalid/v1',model:'fixture-model',maxTokens:8192,timeoutSeconds:300,protectedTags:''},cards:{'fixture.png':{mode:'polish',target:'简体中文',polishRules:'Fixture prompt',terms:'',sendOriginal:false,prePrompt:{text:'Fixture prefix',role:'system'},postPrompt:{text:'',role:'user'}}},library:[{id:'fixture-prompt',name:'Development Fixture',mode:'polish',data:{target:'简体中文',rules:'Fixture prompt'}}],backups:[]};
  let persisted = structuredClone(data);
  const success = () => new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({translations:['测试润色结果']})}}]}), {status:200,headers:{'Content-Type':'application/json'}});
  let reply = success;
  const originalFetch = async (_url, init = {}) => {outgoing.push(init);return reply();};
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
  return {dom,h,w,source,context,errors,outgoing,el,eventCount,originalFetch,emit,success,setReply:fn=>{reply=fn;},data:()=>persisted};
}
function cooperativeHub(f) {
  let source, active, resolveDisposed;
  const whenDisposed = new Promise(resolve => {resolveDisposed=resolve;});
  let disposed = false;
  async function enable() {
    const cleanups=[], controller=new f.h.AbortController();
    const api={signal:controller.signal,onCleanup:fn=>cleanups.push(fn),guard:fn=>(...args)=>controller.signal.aborted?undefined:fn(...args),attachPanel:panel=>{panel.hidden=true;panel.inert=true;cleanups.push(()=>{panel.hidden=true;panel.inert=true;});},showPanel:()=>{const p=f.h.document.querySelector('#meeme-translation section');p.hidden=false;p.inert=false;return true;},closePanel:()=>{const p=f.h.document.querySelector('#meeme-translation section');p.hidden=true;p.inert=true;return true;}};
    active={controller,cleanups,instance:source(api)}; await active.instance.activate();
  }
  async function disable() {const old=active;active=null;if(!old)return;old.controller.abort();await old.instance.deactivate();for(const fn of old.cleanups.reverse())await fn();}
  const hub={apiVersion:2,whenDisposed,open(){},extensions:{provide(_manifest,factory){source=factory;return{ok:true,ready:enable(),release:async()=>{if(!disposed)await disable();}};},open:async()=>active?.instance.open(),disable}};
  return {hub,start(){f.h.__MieMieHub=hub;f.h.dispatchEvent(new f.h.CustomEvent('miemie:hub-ready',{detail:hub}));},async stop(){disposed=true;const done=disable();delete f.h.__MieMieHub;f.h.dispatchEvent(new f.h.CustomEvent('miemie:hub-disposed',{detail:hub}));await done;resolveDisposed();}};
}

test('complete built script works without Hub and retains original settings, hooks and API request behavior', async () => {
  const f=environment(); await f.source.ready;
  try {
    assert.equal(f.source.mode,'standalone');assertTitle(f);assert.equal(f.eventCount(),10);assert.notEqual(f.h.fetch,f.originalFetch);
    assert.equal(f.el('pre-text').value,'Fixture prefix');assert.equal(f.el('mode'),null);
    assert.match(f.el('translate').textContent,/润色/);
    f.h.document.querySelector('[data-miemie-polisher-standalone]').click();await tick();assert.equal(f.h.document.querySelector('section').hidden,false);
    f.el('key').value='fixture-session-only-key';f.el('save-config').click();assert.equal(f.h.localStorage.getItem('meeme_translation_key_v1'),null);
    f.el('translate').click();for(let i=0;i<8;i++)await tick();
    assert.equal(f.outgoing.length,1);assert.equal(f.outgoing[0].headers.Authorization,'Bearer fixture-session-only-key');
    assert.match(f.context.chat[0].mes,/测试润色结果/);assert.equal(f.data().backups.length,1);
    assert.deepEqual(f.errors,[]);
  } finally {await f.source.dispose();assert.equal(f.eventCount(),0);assert.equal(f.h.fetch,f.originalFetch);f.dom.window.close();}
});

test('reply progress is visible in chat with the panel closed and completes only after saving', async () => {
  const f=environment();await f.source.ready;
  const progress=f.h.document.querySelector('[data-mm-request-progress]');
  try {
    assert.equal(progress.hidden,true);
    assert.equal(progress.nextElementSibling.id,'send_form');
    const response=Promise.withResolvers(), save=Promise.withResolvers();
    f.setReply(()=>response.promise);
    f.context.saveChat=()=>save.promise;
    f.el('auto').click();
    await f.emit('GENERATION_STARTED','normal');
    f.context.chat.push({is_user:false,mes:'<story_scene>新回复</story_scene>',swipe_id:0});
    const run=f.emit('GENERATION_ENDED');
    assert.equal(f.h.document.querySelector('#meeme-translation section').hidden,true);
    assert.equal(progress.hidden,false);
    assert.equal(progress.dataset.mmProgressState,'waiting');
    response.resolve(f.success());
    await tick();
    assert.equal(progress.dataset.mmProgressState,'applying');
    save.resolve();await run;
    assert.equal(progress.dataset.mmProgressState,'done');
    assert.match(progress.textContent,/润色完成 · 已保存/);
    assert.equal(f.h.document.querySelector('.mt-footer .mm-request-progress').dataset.mmProgressState,'done');
    f.el('debug').click();
    assert.match(f.el('log').textContent,/测试润色结果/);
    assert.match(f.el('log').textContent,/已写回/);
  } finally {await f.source.dispose();assert.equal(progress.isConnected,false);f.dom.window.close();}
});

test('unified library restores the old selection, pins examples, and switches the request by selected template', async () => {
  const f=environment();await f.source.ready;
  try {
    const list=f.el('template-list'),examples=f.el('template-examples');
    assert.equal(list.children.length,1);
    assert.match(list.querySelector('[data-selected]').textContent,/Development Fixture/);
    assert.equal(f.data().cards['fixture.png'].selectedPromptId,'fixture-prompt');
    assert.deepEqual([...examples.children].map(row=>row.querySelector('strong').textContent),['翻译示例','润色示例']);
    assert.equal(examples.querySelector('[aria-keyshortcuts]'),null);
    examples.querySelector('[aria-label="选用：翻译示例"]').click();
    assert.match(f.el('translate').textContent,/翻译/);
    await f.el('translate').onclick();
    assert.match(JSON.parse(f.outgoing[0].body).messages[1].content,/你是文本翻译器/);
    examples.querySelector('[aria-label="查看：润色示例"]').click();
    assert.equal(f.el('template-editor').open,true);
    assert.equal(modeTrigger(f).disabled,true);
    assert.equal(f.el('edit-rules').readOnly,true);
    f.el('template-close').click();
    assert.equal(f.el('template-editor').open,false);
  } finally {await f.source.dispose();f.dom.window.close();}
});

test('editing a selected prompt preserves identity, updates its mode, and saves keyboard reordering', async () => {
  const f=environment();await f.source.ready;
  try {
    const list=f.el('template-list'), dialog=f.el('template-editor');
    const edit=name=>list.querySelector(`[aria-label="编辑：${name}"]`).click();
    const submit=()=>f.el('template-form').dispatchEvent(new f.h.Event('submit',{cancelable:true}));
    f.el('template-new').click();assert.equal(dialog.open,true);
    assert.equal(dialog.parentElement,f.el('template-layer'));
    assert.equal(f.el('template-layer').hidden,false);
    assert.equal(f.el('tab-content').closest('[inert]').className,'mt-body');
    assert.equal(f.h.document.querySelector('#send_form').closest('[inert]'),null);
    f.el('edit-name').value='对白润色';chooseMode(f,'polish');f.el('edit-rules').value='保留对白。';submit();
    const id=f.data().library.find(item=>item.name==='对白润色').id;
    list.querySelector('[aria-label="选用：对白润色"]').click();
    edit('对白润色');chooseMode(f,'translate');f.el('edit-target').value='English';submit();
    assert.equal(dialog.open,false);
    assert.equal(f.el('template-layer').hidden,true);
    assert.equal(f.el('tab-content').closest('[inert]'),null);
    assert.equal(f.data().cards['fixture.png'].selectedPromptId,id);
    assert.equal(f.data().library.find(item=>item.id===id).mode,'translate');
    assert.match(list.querySelector('[data-selected]').textContent,/翻译 · English/);
    edit('对白润色');chooseMode(f,'polish');submit();
    assert.match(list.querySelector('[data-selected]').textContent,/润色 · English/);
    edit('对白润色');f.el('edit-name').value='取消草稿';f.el('template-close').click();
    assert.equal(f.data().library.find(item=>item.id===id).name,'对白润色');
    const control=list.querySelector('[aria-label="选用：对白润色"]');
    control.dispatchEvent(new f.h.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));
    assert.equal(list.firstElementChild.dataset.promptId,id);
    control.dispatchEvent(new f.h.KeyboardEvent('keydown',{key:'ArrowDown',altKey:true,bubbles:true,cancelable:true}));
    assert.deepEqual([...list.children].map(row=>row.dataset.promptId),['fixture-prompt',id]);
    assert.deepEqual(f.data().library.filter(item=>!item.id.startsWith('meeme-builtin-')).map(item=>item.id),['fixture-prompt',id]);
    assert.equal(f.el('send-original').textContent,'发送原文：关闭');
    f.el('send-original').click();assert.equal(f.el('send-original').textContent,'发送原文：开启');
  } finally {await f.source.dispose();f.dom.window.close();}
});

test('the shared library can be managed from the home screen and from a group without changing active role preferences', async () => {
  const f=environment();await f.source.ready;
  f.h.document.querySelector('[data-miemie-polisher-standalone]').click();await tick();
  const key='fixture.png', list=f.el('template-list');
  const submit=()=>f.el('template-form').dispatchEvent(new f.h.Event('submit',{cancelable:true}));
  try {
    const roleBefore=structuredClone(f.data().cards[key]);
    Object.assign(f.context,{characterId:null,chatId:null,chat:[]});await f.emit('CHAT_CHANGED');
    assert.equal(list.querySelector('[data-selected]'),null);
    f.el('template-new').click();f.el('edit-name').value='首页新建';
    const trigger=modeTrigger(f), dialog=f.el('template-editor');
    const keypress=key=>trigger.dispatchEvent(new f.h.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
    assert.equal(f.el('edit-mode').querySelector('select'),null);
    keypress('ArrowDown');assert.equal(trigger.getAttribute('aria-expanded'),'true');
    keypress('ArrowDown');assert.equal(trigger.getAttribute('aria-activedescendant'),'mt-mode-polish');
    keypress('Escape');assert.equal(trigger.getAttribute('aria-expanded'),'false');assert.equal(dialog.open,true);
    keypress('ArrowDown');keypress('End');keypress('Enter');
    assert.match(trigger.textContent,/润色模式/);submit();
    const id=f.data().library.find(item=>item.name==='首页新建').id;
    const control=list.querySelector('[aria-label="选用：首页新建"]');
    control.click();assert.equal(list.querySelector('[data-selected]'),null);
    control.dispatchEvent(new f.h.KeyboardEvent('keydown',{key:'ArrowDown',altKey:true,bubbles:true,cancelable:true}));
    assert.equal(list.lastElementChild.dataset.promptId,id);

    Object.assign(f.context,{groupId:'fixture-group',chatId:'group-chat'});await f.emit('CHAT_CHANGED');
    list.querySelector('[aria-label="编辑：首页新建"]').click();
    f.el('edit-name').value='群聊编辑';chooseMode(f,'translate');submit();
    assert.equal(f.data().library.find(item=>item.id===id).mode,'translate');
    list.querySelector('[aria-label="编辑：群聊编辑"]').click();
    f.el('template-delete').click();f.el('template-delete').click();
    assert.ok(!f.data().library.some(item=>item.id===id));
    assert.deepEqual(f.data().cards,{[key]:roleBefore});
  } finally {await f.source.dispose();f.dom.window.close();}
});

test('old prompt files still import into the unified list and removing an active entry clears only its selection', async () => {
  const f=environment();await f.source.ready;
  try {
    const file=f.el('template-file'),list=f.el('template-list');
    const value={format:'meeme-prompt',version:1,name:'旧版导入条目',target:'繁體中文',mode:'translate',rules:'保留语气。'};
    Object.defineProperty(file,'files',{value:[{size:200,text:async()=>JSON.stringify(value)}]});
    await file.onchange();
    list.querySelector('[aria-label="选用：旧版导入条目"]').click();
    const active=f.data().cards['fixture.png'].selectedPromptId;
    assert.match(list.querySelector('[data-selected]').textContent,/翻译 · 繁體中文/);
    list.querySelector('[aria-label="编辑：旧版导入条目"]').click();
    f.el('template-delete').click();assert.ok(f.data().library.some(item=>item.id===active));
    f.el('template-delete').click();assert.ok(!f.data().library.some(item=>item.id===active));
    assert.equal(f.data().cards['fixture.png'].selectedPromptId,null);
    assert.equal(f.data().cards['fixture.png'].selections.polish,'fixture-prompt');
    assert.equal(f.el('template-examples').children.length,2);
  } finally {await f.source.dispose();f.dom.window.close();}
});

test('cancellation, late results and provider errors stay distinct in the built progress UI', async () => {
  const f=environment();await f.source.ready;
  const progress=f.h.document.querySelector('[data-mm-request-progress]');
  try {
    const reply=Promise.withResolvers();f.setReply(()=>reply.promise);
    const run=f.el('translate').onclick();
    assert.equal(progress.dataset.mmProgressState,'waiting');
    await f.el('translate').onclick();await run;
    assert.equal(progress.dataset.mmProgressState,'cancelled');
    reply.resolve(f.success());await tick();
    assert.equal(progress.dataset.mmProgressState,'cancelled');
    assert.match(f.context.chat[0].mes,/测试原文/);

    f.setReply(()=>new Response('provider error',{status:503}));
    await f.el('translate').onclick();
    assert.equal(progress.dataset.mmProgressState,'failed');
    assert.match(progress.textContent,/润色失败/);
    f.context.chatId='other-chat';await f.emit('CHAT_CHANGED');
    assert.equal(progress.hidden,true);
  } finally {await f.source.dispose();f.dom.window.close();}
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


test('actual standalone build overrides legacy percentage max-height across narrow resize without closing',async()=>{
 const f=environment();await f.source.ready;
 try{
  f.h.document.querySelector('[data-miemie-polisher-standalone]').click();await tick();
  const panel=f.h.document.querySelector('#meeme-translation section');
  panel.style.setProperty('max-height','calc(100% - 52px)');
  for(const width of [1200,390,320,800]){
   f.h.innerWidth=width;f.h.innerHeight=720;f.h.dispatchEvent(new f.h.Event('resize'));await tick();
   assert.equal(panel.hidden,false);assert.equal(panel.dataset.surfaceState,'open');
   assert.equal(panel.style.getPropertyValue('max-height'),'700px');assert.equal(panel.style.getPropertyPriority('max-height'),'important');
   assert.ok(parseFloat(panel.style.width)<=width-20);
  }
  assert.deepEqual(f.errors,[]);
 }finally{await f.source.dispose();f.dom.window.close();}
});
