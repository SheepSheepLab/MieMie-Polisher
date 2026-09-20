import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const project = fileURLToPath(new URL('../', import.meta.url));
const read = file => readFile(path.join(project, file), 'utf8');
const pkg = JSON.parse(await read('package.json'));
if (typeof pkg.version !== 'string' || pkg.version !== pkg.version.trim() || !/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/.test(pkg.version)) {
  throw Error('MieMie 版本必须是无前导零的 MAJOR.MINOR.PATCH，不允许预发布或构建后缀。');
}
const manifestText = await read('manifest.json');
const polisherManifest = JSON.parse(manifestText);
if (pkg.version !== polisherManifest.version) throw Error('package.json 与 manifest.json 的 Polisher 版本必须一致。');
const polisherAssets = {
  icon: 'data:image/png;base64,' + (await readFile(path.join(project, 'assets/icon.png'))).toString('base64'),
  styles: await read('assets/theme.css'),
};
const polisherParts = [];
for (const file of ['resources.js', 'legacy-tool.js', 'polisher.js', 'entry.js']) polisherParts.push((await read(file)).replace(/^export /gm, ''));
const extensionContent = [
  '// MieMie Polisher · 咩咩润色工具 Extension ' + polisherManifest.version,
  "(() => { 'use strict';",
  'const POLISHER_MANIFEST=' + JSON.stringify(polisherManifest) + ';',
  'const POLISHER_ASSETS=' + JSON.stringify(polisherAssets) + ';',
  ...polisherParts, '})();\n',
].join('\n');
new vm.Script(extensionContent, {filename: 'miemie-polisher.js'});
const extensionData = JSON.parse(await read('packaging/script-template.json'));
extensionData.name = polisherManifest.name + ' ' + polisherManifest.version;
extensionData.content = extensionContent;
await mkdir(path.join(project, 'build'), {recursive: true});
await writeFile(path.join(project, 'build/miemie-polisher.js'), extensionContent);
await writeFile(path.join(project, 'build/咩咩润色工具-Extension-' + polisherManifest.version + '.json'), JSON.stringify(extensionData, null, 2) + '\n');
await writeFile(path.join(project, 'build/manifest.json'), manifestText);
console.log('Built ' + extensionData.name + ' · ' + Buffer.byteLength(extensionContent) + ' bytes');
