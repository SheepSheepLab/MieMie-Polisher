import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';

const project = fileURLToPath(new URL('../', import.meta.url));
const read = file => readFile(path.join(project, file), 'utf8');
const pkg = JSON.parse(await read('package.json'));
if (typeof pkg.version !== 'string' || pkg.version !== pkg.version.trim() || !/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/.test(pkg.version)) {
  throw Error('MieMie 版本必须是无前导零的 MAJOR.MINOR.PATCH，不允许预发布或构建后缀。');
}
const manifestText = await read('manifest.json');
const polisherManifest = JSON.parse(manifestText);
if (pkg.version !== polisherManifest.version) throw Error('package.json 与 manifest.json 的 Polisher 版本必须一致。');
const extensionData = JSON.parse(await read('packaging/script-template.json'));
const polisherAssets = {
  icon: 'data:image/png;base64,' + (await readFile(path.join(project, 'assets/icon.png'))).toString('base64'),
  styles: await read('assets/theme.css'),
};
const polisherParts = [];
for (const file of ['resources.js', 'legacy-tool.js', 'polisher.js', 'launcher-adapter.js', 'entry.js']) polisherParts.push((await read(file)).replace(/^export /gm, ''));
const extensionContent = [
  '// MieMie-Extension-Build: ' + JSON.stringify({schemaVersion: 1, productId: polisherManifest.id, version: pkg.version, scriptId: extensionData.id, repository: polisherManifest.repository}),
  '// MieMie Polisher · 咩咩润色工具 Extension ' + polisherManifest.version,
  "(() => { 'use strict';",
  'const POLISHER_MANIFEST=' + JSON.stringify(polisherManifest) + ';',
  'const POLISHER_ASSETS=' + JSON.stringify(polisherAssets) + ';',
  ...polisherParts, '})();\n',
].join('\n');
new vm.Script(extensionContent, {filename: 'miemie-polisher.js'});
extensionData.name = polisherManifest.name + ' ' + polisherManifest.version;
extensionData.content = extensionContent;
const packageBytes = JSON.stringify(extensionData, null, 2) + '\n';
const assetName = 'MieMie-Polisher-Extension-' + pkg.version + '.json';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const updateMetadata = {schemaVersion: 1, format: 'tavern-helper-script', productId: polisherManifest.id,
  version: pkg.version, tag: 'v' + pkg.version, scriptId: extensionData.id, manifest: polisherManifest,
  asset: {name: assetName, size: Buffer.byteLength(packageBytes), sha256: sha256(packageBytes)},
  contentSha256: sha256(extensionContent),
};
await mkdir(path.join(project, 'build'), {recursive: true});
await writeFile(path.join(project, 'build/miemie-polisher.js'), extensionContent);
await writeFile(path.join(project, 'build/咩咩润色工具-Extension-' + polisherManifest.version + '.json'), packageBytes);
await writeFile(path.join(project, 'build/' + assetName), packageBytes);
await writeFile(path.join(project, 'build/manifest.json'), manifestText);
await writeFile(path.join(project, 'build/MieMie-Extension-update.json'), JSON.stringify(updateMetadata, null, 2) + '\n');
console.log('Built ' + extensionData.name + ' · ' + Buffer.byteLength(extensionContent) + ' bytes');
