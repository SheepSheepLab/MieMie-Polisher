import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createPolisherDualMode} from '../launcher-adapter.js';

const manifest = {id: 'test.fixture', name: 'Development Fixture', apiVersion: 1};
const flush = () => new Promise(resolve => setImmediate(resolve));
function fixture(options = {}) {
  const dom = new JSDOM('<!doctype html><body></body>', {url: 'https://fixture.invalid/'}), host = dom.window;
  const frame = new host.EventTarget();
  const count = {active: 0, peak: 0, open: 0, activated: 0, deactivated: 0, cleaned: 0};
  const errors = [];
  const factory = api => {
    let live = false, panel;
    api.onCleanup(() => {count.cleaned++; panel?.remove();});
    return {
      activate() {
        live = true; count.active++; count.activated++; count.peak = Math.max(count.peak, count.active);
        panel = host.document.createElement('section'); const back = host.document.createElement('button'); back.className = 'mm-return'; panel.appendChild(back); host.document.body.appendChild(panel); api.attachPanel(panel);
      },
      open() {count.open++; if (options.openError) throw Error('test open failure'); return api.showPanel();},
      async deactivate() {if (live) {await options.deactivateDelay?.(); live = false; count.active--; count.deactivated++;}},
    };
  };
  const make = () => createPolisherDualMode({host, frame, manifest, factory, icon: 'data:image/png;base64,AA==', keepStandalone: options.keepStandalone, onError: e => errors.push(String(e))});
  return {dom, host, frame, count, errors, make};
}
// Test Adapter for the public provide/ready/release contract, independent of Hub source.
function hubFixture(f, options = {}) {
  let source, session, disposed = false, resolveDisposed;
  const ready = Promise.resolve();
  const whenDisposed = new Promise(resolve => {resolveDisposed = resolve;});
  async function disable() {
    const s = session; session = null;
    if (!s) return;
    s.controller.abort(); await s.instance.deactivate?.();
    for (const fn of s.cleanups.reverse()) await fn();
  }
  async function enable() {
    if (session || !source) return;
    const cleanups = [], controller = new AbortController();
    const api = {signal: controller.signal, onCleanup: fn => cleanups.push(fn), attachPanel: panel => {panel.hidden = true; cleanups.push(() => panel.remove());}, showPanel: () => true};
    session = {controller, cleanups, instance: source(api)}; await session.instance.activate?.();
  }
  const hub = {apiVersion: 1, ready, ...(options.legacy ? {} : {whenDisposed}), extensions: {
    provide(_m, factory) {assert.equal(source, undefined); source = factory; const ready = enable(); return {ok: true, ready, async release() {if (!disposed) {await disable(); source = undefined;}}};},
    async open() {if (!session) return {ok: false, error: 'disabled'}; try {await session.instance.open(); return {ok: true};} catch (e) {return {ok: false, error: e.message};}},
    disable, enable,
    async uninstall() {await disable();},
  }};
  return {
    hub, enable, disable,
    start() {f.host.__MieMieHub = hub; f.host.dispatchEvent(new f.host.CustomEvent('miemie:hub-ready', {detail: hub}));},
    stop() {disposed = true; const closing = disable(); delete f.host.__MieMieHub; f.host.dispatchEvent(new f.host.CustomEvent('miemie:hub-disposed', {detail: hub})); return closing.then(resolveDisposed);},
  };
}

test('standalone starts once, opens and closes original panel, and tears down', async () => {
  const f = fixture(), source = f.make(); await source.ready;
  assert.equal(source.mode, 'standalone'); assert.equal(f.count.active, 1);
  const button = f.host.document.querySelector('[data-miemie-polisher-standalone]'); button.click(); await flush();
  assert.equal(f.count.open, 1); assert.equal(f.host.document.querySelector('section').hidden, false);
  f.host.document.querySelector('.mm-return').click(); assert.equal(f.host.document.querySelector('section').hidden, true);
  await source.dispose(); assert.equal(f.count.active, 0); assert.equal(f.host.document.querySelector('section'), null); assert.equal(f.host.__MieMiePolisherSource, undefined); f.dom.window.close();
});

test('Hub first attaches directly without a standalone business instance', async () => {
  const f = fixture(), hub = hubFixture(f); hub.start(); const source = f.make(); await source.ready;
  assert.equal(source.mode, 'hub'); assert.equal(f.count.activated, 1); assert.equal(f.host.document.querySelector('[data-miemie-polisher-standalone]'), null);
  await hub.hub.extensions.open(); assert.equal(f.count.open, 1); await source.dispose(); assert.equal(f.count.active, 0); f.dom.window.close();
});

test('Polisher first gets collected and repeated Hub restarts never overlap business instances', async () => {
  const f = fixture(), source = f.make(); await source.ready;
  for (let i = 0; i < 5; i++) {
    const hub = hubFixture(f); hub.start(); await source.settled();
    assert.equal(source.mode, 'hub'); assert.equal(f.count.active, 1); assert.equal(f.host.document.querySelectorAll('section').length, 1); assert.equal(f.host.document.querySelector('[data-miemie-polisher-standalone]'), null);
    await hub.stop(); await source.settled();
    assert.equal(source.mode, 'standalone'); assert.equal(f.host.document.querySelectorAll('[data-miemie-polisher-standalone]').length, 1);
  }
  assert.equal(f.count.peak, 1); assert.deepEqual(f.errors, []); await source.dispose(); assert.equal(f.count.cleaned, f.count.activated); f.dom.window.close();
});

test('Hub disable and Runtime uninstall never resurrect standalone while Hub remains', async () => {
  const f = fixture(), hub = hubFixture(f); hub.start(); const source = f.make(); await source.ready;
  await hub.disable(); await source.settled(); assert.equal(f.count.active, 0); assert.equal(source.mode, 'hub');
  f.host.dispatchEvent(new f.host.CustomEvent('miemie:hub-ready', {detail: hub.hub})); await source.settled(); assert.equal(f.count.active, 0);
  await hub.enable(); assert.equal(f.count.active, 1); await hub.hub.extensions.uninstall(); assert.equal(f.count.active, 0);
  assert.equal(f.host.document.querySelector('[data-miemie-polisher-standalone]'), null);
  await hub.stop(); await source.settled(); assert.equal(f.count.active, 1); await source.dispose(); f.dom.window.close();
});

test('legacy Hub disposed event waits for asynchronous deactivate and final cleanup', async () => {
  let finish; let delay = false;
  const f = fixture({deactivateDelay: () => delay ? new Promise(resolve => {finish = resolve;}) : undefined});
  const hub = hubFixture(f, {legacy: true}); hub.start(); const source = f.make(); await source.ready;
  delay = true; const stopping = hub.stop(); await flush(); assert.equal(f.count.active, 1); assert.equal(f.count.activated, 1);
  finish(); delay = false; await stopping; await source.settled(); assert.equal(f.count.peak, 1); assert.equal(f.count.activated, 2);
  await source.dispose(); f.dom.window.close();
});

test('keepStandalone retains only launcher and delegates to Hub; open errors do not stop business', async () => {
  const f = fixture({keepStandalone: true, openError: true}), hub = hubFixture(f); hub.start(); const source = f.make(); await source.ready;
  assert.equal(f.count.active, 1); f.host.document.querySelector('[data-miemie-polisher-standalone]').click(); await flush();
  assert.equal(f.count.open, 1); assert.equal(f.count.active, 1); assert.equal(f.errors.length, 1);
  await hub.disable(); f.host.document.querySelector('[data-miemie-polisher-standalone]').click(); await flush(); assert.equal(f.count.active, 0);
  await source.dispose(); f.dom.window.close();
});

test('duplicate scripts fail without changing existing instance or third party launchers', async () => {
  const f = fixture(); const thirdParty = f.host.document.createElement('button'); thirdParty.id = 'untouched'; f.host.document.body.appendChild(thirdParty);
  const source = f.make(); await source.ready; const duplicate = f.make(); await duplicate.ready;
  assert.equal(f.count.active, 1); assert.equal(f.errors.length, 1); assert.equal(thirdParty.isConnected, true);
  await duplicate.dispose(); assert.equal(f.count.active, 1); await source.dispose(); assert.equal(thirdParty.isConnected, true); f.dom.window.close();
});

test('source reload waits for previous teardown before replacing a disposed marker', async () => {
  let finish, delay = false;
  const f = fixture({deactivateDelay: () => delay ? new Promise(resolve => {finish = resolve;}) : undefined});
  const old = f.make(); await old.ready; delay = true;
  const stopping = old.dispose(); const next = f.make(); await flush(); assert.equal(f.count.activated, 1);
  finish(); delay = false; await stopping; await next.ready;
  assert.equal(f.count.peak, 1); assert.equal(f.host.__MieMiePolisherSource, next); assert.equal(next.mode, 'standalone');
  await next.dispose(); f.dom.window.close();
});

test('unload removes event listeners so later Hub events cannot recreate DOM', async () => {
  const f = fixture(), source = f.make(); await source.ready;
  f.frame.dispatchEvent(new f.host.Event('pagehide')); await source.settled();
  const hub = hubFixture(f); hub.start(); f.host.dispatchEvent(new f.host.CustomEvent('miemie:hub-disposed', {detail: hub.hub})); await flush();
  assert.equal(f.count.active, 0); assert.equal(f.count.activated, 1); assert.equal(f.host.document.querySelector('[data-miemie-polisher-standalone]'), null); f.dom.window.close();
});
