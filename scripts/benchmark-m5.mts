import { performance } from 'node:perf_hooks';
// Dynamic import measures the cold server/registry module boundary.
import { writeFileSync } from 'node:fs';
const started=performance.now();
const { Match }=await import('../server/match');
const { allCatalog,validateDeck,examples }=await import('../shared/decks');
const imported=performance.now();
const {fixture}=await import('../tests/fixtures');
const actions=fixture('rain-dance'),damage=fixture('damage-swap');
damage.act(1,damage.revision,damage.view().actions.find(a=>a.label==='Damage Swap')!.id);
const samples=(count:number,fn:()=>unknown)=>{const values=[];for(let i=0;i<count;i++){const t=performance.now();fn();values.push(performance.now()-t);}values.sort((a,b)=>a-b);return {medianMs:values[Math.floor(values.length/2)],p95Ms:values[Math.floor(values.length*.95)]};};
const result={
 importAndRegistryMs:imported-started,
 catalogEntries:allCatalog.length,
 search:samples(100,()=>allCatalog.filter(c=>c.name.toLowerCase().includes('water'))),
 validation:samples(100,()=>validateDeck(examples[2])),
 initialMatch:samples(10,()=>new Match({opponent:'haymaker'})),
 legalActionRefresh:samples(50,()=>{(actions as any).changed();actions.view();}),
 repeatedCounter:samples(50,()=>{const p=damage.view().prompt!;damage.resolve(1,damage.revision,p.id,[p.choices[0].key]);}),
};
writeFileSync('docs/milestone-5-performance.json',JSON.stringify(result,null,2)+'\n');
console.log(result);
