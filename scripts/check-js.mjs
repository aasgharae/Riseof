import { readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { spawnSync } from 'node:child_process';

const ignored = new Set(['node_modules', '.git']);
async function collect(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && ignored.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await collect(full));
    else if (extname(entry.name) === '.js' || extname(entry.name) === '.mjs') out.push(full);
  }
  return out;
}

const files = await collect(process.cwd());
let failed = 0;
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    failed++;
    process.stderr.write(`\nSyntax error: ${file}\n${result.stderr || result.stdout}`);
  }
}
if (failed) process.exitCode = 1;
else console.log(`JavaScript syntax check passed (${files.length} files).`);
