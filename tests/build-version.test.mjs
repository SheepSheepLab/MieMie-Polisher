import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, copyFile, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const run = promisify(execFile);

test('build rejects suffixes, leading zeroes, malformed and non-string product versions before reading assets', async () => {
  const project = await mkdtemp(path.join(tmpdir(), 'miemie-polisher-version-'));
  try {
    await mkdir(path.join(project, 'tools'));
    await copyFile(new URL('../tools/build.mjs', import.meta.url), path.join(project, 'tools/build.mjs'));
    const invalid = ['1.0.1-hub.2', '1.0.1-alpha.1', '1.0.1-beta.1', '1.0.1-build.1', '1.0.1+build.1', '01.0.1', '1.00.1', '1.0.01', '1.0', '1.0.1.0', 'v1.0.1', ' 1.0.1', '1.0.1\n', 1, null, ['1.0.1']];
    for (const version of invalid) {
      await writeFile(path.join(project, 'package.json'), JSON.stringify({version}));
      await assert.rejects(run(process.execPath, [path.join(project, 'tools/build.mjs')]), error => {
        assert.match(error.stderr, /MieMie 版本必须是无前导零的 MAJOR\.MINOR\.PATCH/);
        assert.doesNotMatch(error.stderr, /ENOENT/);
        return true;
      }, JSON.stringify(version));
    }
  } finally {
    await rm(project, {recursive: true, force: true});
  }
});
