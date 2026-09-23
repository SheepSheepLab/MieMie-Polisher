import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source = (await readFile(new URL('../polisher.js', import.meta.url), 'utf8')).replace(/^export /gm, '');

function setup(aborted = false) {
  const calls = [], host = {}, resources = {dispose: () => {calls.push('dispose');}};
  const title = {textContent: ''};
  const panel = {querySelector: selector => {assert.equal(selector, '.mm-tool-titles > strong'); return title;}}, assets = {icon: 'fixture-icon'};
  const api = {signal: {aborted}, attachPanel: (value, presentation) => {assert.equal(value, panel); assert.equal(presentation.icon, assets.icon); calls.push('attach');}, showPanel: () => {calls.push('show'); return true;}};
  // Test double for the documented Extension API, not a copy/import of Hub Runtime.
  const factory = vm.runInNewContext(source + '\ncreatePolisherExtension;', {
    window: {parent: host}, POLISHER_ASSETS: assets, POLISHER_MANIFEST: {name: 'Fixture Polisher', version: '9.8.7'},
    createPolisherResources(actualAPI, actualHost) {assert.equal(actualAPI, api); assert.equal(actualHost, host); return resources;},
    mountPolisherTool(actualAPI, actualResources, actualAssets) {assert.equal(actualAPI, api); assert.equal(actualResources, resources); assert.equal(actualAssets, assets); calls.push('mount'); return {panel};},
  });
  return {instance: factory(api), calls, title};
}

test('factory mounts, opens and disposes through the Extension API contract', () => {
  const {instance, calls, title} = setup();
  instance.activate();
  assert.equal(title.textContent, 'Fixture Polisher - 9.8.7');
  assert.equal(instance.open(), true);
  instance.deactivate();
  assert.deepEqual(calls, ['mount', 'attach', 'show', 'dispose']);
});

test('cancelled activation does not mount a panel', () => {
  const {instance, calls} = setup(true);
  instance.activate();
  assert.deepEqual(calls, []);
});
