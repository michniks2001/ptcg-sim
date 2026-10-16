// Read-only upstream audit. Usage: node scripts/audit-cards.mjs /checkout/ptcg-server/src
// The report distinguishes source presence from executable/gameplay verification.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
const root = path.resolve(process.argv[2]);
const index = readFileSync(path.join(root, 'sets/index.ts'), 'utf8');
const modules = [...index.matchAll(/^export \* from '\.\/(.+)';/gm)].map(m => m[1]);
mkdirSync('.engine', { recursive: true });
const entry = modules.map((m, i) => `import * as s${i} from '${root}/sets/${m}';`).join('\n') +
  `\nexport const sets = [${modules.map((m,i)=>`{path:${JSON.stringify(m)},exports:s${i}}`).join(',')}];`;
await build({ packages: 'external', stdin: { contents: entry, resolveDir: root, loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', outfile: '.engine/audit.cjs', plugins: [{ name: 'game-only', setup(b) { b.onResolve({ filter: /^\.\.\/\.\.$/ }, a => path.resolve(a.resolveDir, a.path) === root ? { path: path.join(root, 'game/index.ts') } : undefined); } }] });
const { sets } = createRequire(import.meta.url)('../.engine/audit.cjs');
const inventory = sets.map(s => ({ module: s.path, sourceFiles: readdirSync(path.join(root, 'sets', s.path)).filter(f=>f.endsWith('.ts')).length, exports: Object.entries(s.exports).filter(([,v])=>Array.isArray(v)).map(([name,cards])=>({name,count:cards.length,cards:cards.map(c=>({setId:c.set,number:c.setNumber,name:c.name,executableIdentity:c.fullName,implementationClass:c.constructor.name,artwork:c.cardImage,implementationStatus:'implemented-unverified'}))})) }));
writeFileSync('docs/twinleaf-inventory.json', JSON.stringify({ revision: 'a8b6fe9075f982f7722e3c9ee2ce5e39cea1f1ca', modules: inventory }, null, 2)+'\n');
console.log({ modules: modules.length, instances: inventory.flatMap(s=>s.exports).reduce((n,e)=>n+e.count,0) });
