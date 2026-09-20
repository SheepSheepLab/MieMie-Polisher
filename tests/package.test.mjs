import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const read = name => readFile(new URL('../' + name, import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

test('machine package metadata locks exact ASCII bytes, content, manifest and repository', async () => {
  const pkg = JSON.parse(await read('package.json')), manifest = JSON.parse(await read('manifest.json'));
  const metadataBytes = await read('build/MieMie-Extension-update.json'), meta = JSON.parse(metadataBytes);
  assert.ok(metadataBytes.length < 65536);
  const bytes = await read('build/' + meta.asset.name), script = JSON.parse(bytes);
  assert.deepEqual(bytes, await read('build/咩咩润色工具-Extension-' + pkg.version + '.json'));
  assert.equal(meta.asset.name, 'MieMie-Polisher-Extension-' + pkg.version + '.json'); assert.equal(meta.asset.size, bytes.length); assert.equal(meta.asset.sha256, sha(bytes));
  assert.equal(meta.contentSha256, sha(script.content)); assert.deepEqual(meta.manifest, manifest);
  assert.equal(meta.format, 'tavern-helper-script'); assert.equal(meta.tag, 'v' + pkg.version); assert.equal(meta.productId, manifest.id); assert.equal(meta.scriptId, script.id);
  const marker = JSON.parse(script.content.split('\n')[0].replace('// MieMie-Extension-Build: ', ''));
  assert.deepEqual(marker, {schemaVersion: 1, productId: manifest.id, version: pkg.version, scriptId: script.id, repository: manifest.repository});
  assert.equal(manifest.author, 'SheepSheep'); assert.equal(manifest.license, 'GPL-3.0-or-later'); assert.deepEqual(manifest.hubApi, {min: 1, max: 1}); assert.equal(manifest.icon, 'assets/icon.png');
});
