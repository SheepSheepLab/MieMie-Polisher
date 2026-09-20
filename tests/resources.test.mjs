import test from 'node:test';
import assert from 'node:assert/strict';
import {createPolisherResources, installPolisherFetchHook} from '../resources.js';
function setup() {
  const controller = new AbortController(), cleanup = [];
  const api = {signal: controller.signal, onCleanup: fn => cleanup.push(fn), guard: fn => async (...args) => {try{return await fn(...args);}catch{return false;}}};
  return {controller, cleanup, resources: createPolisherResources(api, globalThis)};
}
test('disable settles an uncooperative request and clears every timer immediately', async () => {
  const {resources:r, controller} = setup();
  let ticks=0;
  r.interval(()=>ticks++,5);r.timeout(()=>ticks++,5);
  const pending=r.wait(new Promise(()=>{}));
  controller.abort();
  await assert.rejects(pending,/停用/);
  await new Promise(resolve=>setTimeout(resolve,20));assert.equal(ticks,0);
});
test('partial activation cleanup continues after one resource fails and is idempotent', async () => {
  const {resources:r}=setup();const calls=[];
  r.add(()=>calls.push(1));r.add(()=>{calls.push(2);throw Error('fixture');});r.add(()=>calls.push(3));
  const cleanup=r.dispose();await assert.rejects(cleanup,/清理/);assert.equal(r.dispose(),cleanup);assert.deepEqual(calls,[3,2,1]);
});
test('send guards remain synchronous, are removed, and retained callbacks become inert', () => {
  const {resources:r,controller}=setup();const target=new EventTarget();
  r.listen(target,'send',event=>event.preventDefault());
  const first=new Event('send',{cancelable:true});target.dispatchEvent(first);assert.equal(first.defaultPrevented,true);
  let calls=0;const callback=r.guard(()=>calls++);callback();controller.abort();callback();assert.equal(calls,1);
  const second=new Event('send',{cancelable:true});target.dispatchEvent(second);assert.equal(second.defaultPrevented,false);
});

test('retired fetch forwarder is inert while preserving a later peer wrapper', async () => {
  const calls=[];const host={fetch:async()=>{calls.push('original');return 'ok';}};
  const base=host.fetch;const remove=installPolisherFetchHook(host,async()=>{calls.push('tool');return base();});
  const forward=host.fetch;const peer=(...args)=>forward(...args);host.fetch=peer;
  await host.fetch();remove();assert.equal(host.fetch,peer);await host.fetch();
  assert.deepEqual(calls,['tool','original','original']);
});
