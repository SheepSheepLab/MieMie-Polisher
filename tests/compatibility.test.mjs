import {POLISHER_PRODUCT} from '../product-identity.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const read = name => readFile(new URL('../' + name, import.meta.url), 'utf8');
const pkg = JSON.parse(await read('package.json'));
const manifest = JSON.parse(await read('manifest.json'));
const source = await read('legacy-tool.js');
const built = JSON.parse(await read('build/咩咩润色工具-Extension-' + pkg.version + '.json'));

test('polishing and translation algorithms and default prompts match the toolbox baseline', async () => {
  const pure = source.slice(source.indexOf('const DEFAULT_RULES'), source.indexOf('  const host=window.parent'));
  assert.equal(pure, await read('tests/fixtures/toolbox-polisher-core.txt'));
});

test('original non-library controls and settings pages retain their markup', async () => {
  const start = source.indexOf('root.innerHTML=`');
  const markup = source.slice(start, source.indexOf('`;', start)).replace(/\$\{POLISHER_PRODUCT\.(\w+)\}/g,(_,key)=>POLISHER_PRODUCT[key]);
  const historical = (await read('tests/fixtures/toolbox-polisher-markup.html'))
    .replace('data-tool-icon="translation"', 'data-tool-icon="polisher"')
    .replace('data-open>🐑 正文翻译', 'data-open>🐑 咩咩润色');
  const unchanged = [
    /<header class="mt-head[\s\S]*?<\/header>/,
    /<button type="button" data-terms [\s\S]*?<\/nav>/,
    /<div class="mt-tab-page" data-terms-pane[\s\S]*?(?=  <footer class="mt-footer")/,
    /<footer class="mt-footer"[\s\S]*?<\/footer>/,
    /<button type="button" data-open>[^<]+<\/button>/,
  ];
  for (const pattern of unchanged) {
    const original = historical.match(pattern);
    assert.ok(original, String(pattern));
    assert.equal(markup.match(pattern)?.[0], original[0]);
  }
});

test('standalone artifact, manifest, version and permanent identities agree', async () => {
  assert.equal(pkg.version, manifest.version);
  assert.equal(manifest.id, 'miemie.polisher');
  assert.equal(manifest.name, '咩咩润色工具');
  assert.equal(manifest.contributes.launcher.title, '咩咩润色');
  assert.equal(built.id, '4dd658f1-9d4b-4f74-bba8-305c4ef2a9c8');
  assert.equal(built.name, '咩咩润色工具 ' + pkg.version);
  assert.equal(await read('build/manifest.json'), await read('manifest.json'));
  assert.ok(built.content.includes('const POLISHER_MANIFEST=' + JSON.stringify(manifest) + ';'));
  assert.ok(built.content.includes(source.replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '')));
  assert.equal(built.content.includes('miemie.translation'), false);
  assert.doesNotThrow(() => new vm.Script(built.content));
  await read(manifest.entry);
  assert.ok((await readFile(new URL('../' + manifest.icon, import.meta.url))).length > 0);
});

test('historical settings and key storage names remain unchanged', () => {
  assert.ok(source.includes("extension_id:'meeme_translation_v1'"));
  assert.ok(source.includes("KEY_STORE='meeme_translation_key_v1'"));
  for (const name of ['__meemeTranslation01', 'meeme-translation', 'meeme-builtin-translation']) assert.ok(source.includes(name), name);
});
