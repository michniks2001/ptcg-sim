// Run against the exact audited pin. Existing vendored files (including patches)
// are deliberately preserved. Generated imports stay outside frontend code.
import { build } from 'esbuild';
import { readFileSync, existsSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const root = path.resolve(process.argv[2]);
const inventory = JSON.parse(readFileSync('docs/twinleaf-inventory.json', 'utf8'));
const sets = inventory.modules.filter(s => !['set-test', 'set-game-boy-exclusives'].includes(s.module));
const result = await build({ stdin: { contents: sets.map(s=>`export * from '${root}/sets/${s.module}';`).join('\n'), resolveDir: root }, bundle:true, packages:'external', platform:'node', write:false, metafile:true, plugins:[{name:'game-only',setup(b){b.onResolve({filter:/^\.\.\/\.\.$/},a=>path.resolve(a.resolveDir,a.path)===root?{path:path.join(root,'game/index.ts')}:undefined);}}] });
let added=0;
for(const file of Object.keys(result.metafile.inputs)){
  const absolute=path.resolve(file);
  if(!absolute.startsWith(root+'/'))continue;
  const dest=path.join('vendor/twinleaf/src',path.relative(root,absolute));
  if(existsSync(dest))continue;
  mkdirSync(path.dirname(dest),{recursive:true});copyFileSync(absolute,dest);added++;
}
writeFileSync('scripts/card-sets.ts', sets.map((s,i)=>`import * as s${i} from '../vendor/twinleaf/src/sets/${s.module}';`).join('\n')+'\nexport const expansionSets = [\n'+sets.map((s,i)=>`  { module: ${JSON.stringify(s.module)}, cards: Object.values(s${i}).filter(Array.isArray).flat() },`).join('\n')+'\n];\n');
console.log({added,modules:sets.length});
