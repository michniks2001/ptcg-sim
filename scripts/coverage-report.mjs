import { readFileSync,writeFileSync,existsSync } from 'node:fs';
import { createRequire } from 'node:module';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const E=createRequire(import.meta.url)('../.engine/engine.cjs');
const legacy=read('shared/catalog.json'),extra=read('shared/expanded-catalog.json'),catalog=[...legacy,...extra];
const metadata=read('data/printing-metadata.json'),official=new Map(metadata.cards.map(c=>[c.id,c]));
const cards=[...new Map(E.expansionSets.flatMap(s=>s.cards).map(c=>[c.fullName,c])).values()];
const tested=new Set(['Alakazam BS','Blastoise BS','Venusaur BS','Frosmoth SSH','Baxcalibur PAL','Oricorio ex M2','Wigglytuff JU','Scyther JU','Ditto FO','Ditto FO18','Gengar FO','Mankey JU','Clefable JU','Pokedex BS','Energy Removal BS','Professor Oak BS','Hitmonchan BS','Electabuzz BS','Computer Search BS','Bill BS','Potion BS','Switch BS','Double Colorless Energy BS']);
const inventory=catalog.map(c=>{
 const printing=official.get(c.officialPrintingId||c.cardId);
 return {applicationPrintingId:c.cardId,printingId:printing?.id||null,setId:printing?.setId||c.set,engineSetCode:c.set,expansion:printing?.expansion||c.expansion,releaseDate:printing?.releaseDate||null,collectorNumber:c.collectorNumber||String(c.number),name:c.name,executableIdentity:c.cardId==='base1-50'?null:c.fullName,cardType:c.kind,evolutionStage:c.stage||null,pokemonTypes:c.types,mechanics:c.mechanics||[],artwork:c.image,artworkAvailability:c.image==='/cards/unavailable.png'?'unavailable':c.image.startsWith('http')?'remote':'cached',officialPrintingMatched:!!printing,status:!c.playable?c.cardId==='base1-50'?'unavailable':'quarantined':tested.has(c.fullName)?'tested-representative':'implemented-unverified'};
});
writeFileSync('docs/card-inventory.json',JSON.stringify(inventory)+'\n');
const summary={engineRevision:'a8b6fe9075f982f7722e3c9ee2ce5e39cea1f1ca',comparedRevision:'e7a1c390ae077f01cdc251c98b1d83e576c4c228',discoveredModules:read('docs/twinleaf-inventory.json').modules.length,importedModules:E.expansionSets.length,registeredExecutableIdentities:cards.length,distinctEffectFunctions:new Set(cards.map(c=>c.reduceEffect)).size,catalogEntries:catalog.length,selectableEntries:catalog.filter(c=>c.playable).length,quarantinedEntries:inventory.filter(c=>c.status==='quarantined').length,conflictingOfficialPrintings:read('docs/card-registration-conflicts.json').length,missingKnownImplementation:['Gastly BS #50'],officialPrintingDatasetSize:metadata.cards.length,matchedOfficialPrintings:new Set(inventory.filter(c=>c.officialPrintingMatched).map(c=>c.printingId)).size,unmatchedExecutableMetadata:extra.filter(c=>!c.officialPrintingId).length,representativeTestedIdentities:inventory.filter(c=>c.status==='tested-representative').length,metadataRevision:metadata.revision};
writeFileSync('docs/card-coverage-summary.json',JSON.stringify(summary,null,2)+'\n');console.log(summary);
const results={};
for(const [name,file]of [['legacyAndLaboratory','/tmp/ptcg-m5-ai-games.json'],['worlds2024','/tmp/ptcg-m5-worlds2024-games.json']])if(existsSync(file))results[name]=read(file);
if(Object.keys(results).length)writeFileSync('docs/milestone-5-game-results.json',JSON.stringify(results,null,2)+'\n');
