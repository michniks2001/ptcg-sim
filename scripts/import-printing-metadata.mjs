// Reproducible metadata snapshot, not a runtime network dependency.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const root = path.resolve(process.argv[2]);
const sets = JSON.parse(readFileSync(path.join(root,'sets/en.json'),'utf8'));
const cards = readdirSync(path.join(root,'cards/en')).filter(f=>f.endsWith('.json')).flatMap(f=>{
  const set=sets.find(s=>s.id===f.slice(0,-5));
  if(!set)return [];
  return JSON.parse(readFileSync(path.join(root,'cards/en',f),'utf8')).map(c=>({
    id:c.id,name:c.name,number:c.number,setId:set.id,setCode:set.ptcgoCode||'',expansion:set.name,
    series:set.series,releaseDate:set.releaseDate.replaceAll('/','-'),image:c.images?.small,
    regulationMark:c.regulationMark||'',rarity:c.rarity||'',
  }));
});
writeFileSync('data/printing-metadata.json',JSON.stringify({source:'https://github.com/PokemonTCG/pokemon-tcg-data',revision:execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),cards})+'\n');
console.log({sets:sets.length,printings:cards.length});
