// Usage: node scripts/vendor-base-fossil.mjs /path/to/pinned/ptcg-server/src
// Copies only the executable dependency closure, never upgrades the revision.
import { build } from 'esbuild';
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
const root = path.resolve(process.argv[2]);
const sets = ['set-base-set', 'set-base-set-energy', 'set-jungle', 'set-fossil'];
const result = await build({ stdin: { contents: sets.map(s => `export * from '${root}/sets/${s}';`).join('\n'), resolveDir: root }, bundle: true, packages: 'external', platform: 'node', write: false, metafile: true, plugins: [{ name: 'game-only-barrel', setup(b) { b.onResolve({ filter: /^\.\.\/\.\.$/ }, a => path.resolve(a.resolveDir, a.path) === root ? { path: path.join(root, 'game/index.ts') } : undefined); } }] });
let added = 0, compared = 0;
for (const file of Object.keys(result.metafile.inputs)) {
  if (file === '<stdin>') continue;
  const absolute = path.resolve(file);
  if (!absolute.startsWith(root + '/')) continue;
  const dest = path.join('vendor/twinleaf/src', path.relative(root, absolute));
  if (existsSync(dest)) { compared++; continue; }
  mkdirSync(path.dirname(dest), { recursive: true }); copyFileSync(absolute, dest); added++;
}
console.log({ added, alreadyVendored: compared });
