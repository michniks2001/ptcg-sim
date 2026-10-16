import { build } from 'esbuild';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
mkdirSync('.engine', { recursive: true });
const root = path.resolve('vendor/twinleaf/src');
const result = await build({ entryPoints: ['scripts/engine-entry.ts'], bundle: true, platform: 'node', format: 'cjs', outfile: '.engine/engine.cjs', metafile: true, logLevel: 'warning', plugins: [{ name: 'game-only-barrel', setup(b) { b.onResolve({ filter: /^\.\.\/\.\.$/ }, a => path.resolve(a.resolveDir, a.path) === root ? { path: path.join(root, 'game/index.ts') } : undefined); } }] });
writeFileSync('.engine/meta.json', JSON.stringify(result.metafile, null, 2));
const E = createRequire(import.meta.url)('../.engine/engine.cjs');
const cards = [...E.setBaseSet, ...E.setBaseSetEnergy, ...E.setJungle, ...E.setFossil];
const sets = { BS: ['base1', 'Base Set', 102], JU: ['base2', 'Jungle', 64], FO: ['base3', 'Fossil', 62] };
const catalog = cards.map(c => ({
  playable: true, cardId: `${sets[c.set][0]}-${c.setNumber}`, name: c.name, fullName: c.fullName,
  expansion: sets[c.set][1], set: c.set, number: Number(c.setNumber),
  image: `/cards/${sets[c.set][0]}/${c.setNumber}.png`,
  kind: c instanceof E.PokemonCard ? 'pokemon' : c instanceof E.EnergyCard ? 'energy' : 'trainer',
  basicEnergy: c instanceof E.EnergyCard && c.energyType === E.EnergyType.BASIC,
  setupEligible: c instanceof E.PokemonCard && c.stage === E.Stage.BASIC,
  stage: c instanceof E.PokemonCard ? ({[E.Stage.BASIC]: 'Basic', [E.Stage.STAGE_1]: 'Stage 1', [E.Stage.STAGE_2]: 'Stage 2'})[c.stage] || E.Stage[c.stage] : undefined,
  types: (Array.isArray(c.cardType) ? c.cardType : c.cardType === undefined ? [] : [c.cardType]).map(t => E.CardType[t]), hp: c.hp,
  text: c.text || '', attacks: (c.attacks || []).map(a => ({ name: a.name, damage: a.damage, cost: a.cost.map(t => E.CardType[t]), text: a.text })),
  powers: (c.powers || []).map(p => ({ name: p.name, text: p.text })),
})).sort((a,b) => a.cardId.split('-')[0].localeCompare(b.cardId.split('-')[0]) || a.number-b.number);
const missing = JSON.parse(readFileSync('data/base-gastly.json', 'utf8'));
catalog.push({ cardId: 'base1-50', name: missing.name, fullName: 'Gastly BS', expansion: 'Base Set', set: 'BS', number: 50, image: '/cards/base1/50.png', kind: 'pokemon', basicEnergy: false, setupEligible: true, stage: 'Basic', types: ['PSYCHIC'], hp: Number(missing.hp), text: '', attacks: missing.attacks.map(a => ({name: a.name, damage: Number(a.damage) || 0, cost: a.cost.map(t => t.toUpperCase()), text: a.text})), powers: [], playable: false, unavailableReason: 'Base Set Gastly #50 has no executable definition in the pinned Twinleaf revision.' });
if (catalog.length !== 228 || new Set(catalog.map(c => c.cardId)).size !== 228 || new Set(catalog.map(c=>c.fullName)).size !== 228) throw Error('Incomplete or duplicate Base–Fossil catalog');
writeFileSync('shared/catalog.json', JSON.stringify(catalog, null, 2) + '\n');
// Preserve all existing printing IDs. Additional engine identities use an
// independent namespace rather than guessing an external artwork identifier.
const baseNames = new Set(catalog.map(c=>c.fullName));
const expanded = new Map();
const printingMetadata = JSON.parse(readFileSync('data/printing-metadata.json','utf8'));
const normalize = s => s.normalize('NFKD').replace(/[^a-z0-9]/gi,'').toLowerCase();
const printingIndex = new Map();
for (const p of printingMetadata.cards) {
  const key = `${p.setCode}:${p.number}:${normalize(p.name)}`;
  printingIndex.set(key, [...(printingIndex.get(key)||[]),p]);
}
const conflicts = [];
const setManifest = [];
for (const set of E.expansionSets) {
  const expansion = set.module.split('/').at(-1).replace(/^set-/, '').split('-').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ');
  setManifest.push({ module: set.module, expansion, codes: [...new Set(set.cards.map(c=>c.set))], registeredInstances: set.cards.length });
  for (const c of set.cards) {
    if (baseNames.has(c.fullName)) continue;
    if (expanded.has(c.fullName)) { conflicts.push({ fullName:c.fullName, module:set.module, reason:'Duplicate executable identity; first definition retained, duplicate not registered.' }); continue; }
    const matches = printingIndex.get(`${c.set}:${c.setNumber}:${normalize(c.name)}`)||[];
    const printing = matches.length===1 ? matches[0] : undefined;
    expanded.set(c.fullName, {
      cardId: `twinleaf:${encodeURIComponent(c.fullName)}`, fullName:c.fullName, name:c.name,
      expansion, set:c.set, collectorNumber:String(c.setNumber), number:Number(c.setNumber)||0,
      image:printing?.image||'/cards/unavailable.png', artworkStatus:printing?.image?'remote':'unavailable', releaseDate:printing?.releaseDate||null,
      officialPrintingId:printing?.id, series:printing?.series, rarity:printing?.rarity,
      module:set.module, regulationMark:printing?.regulationMark || (c.regulationMark||'').toUpperCase(), mechanics:(c.tags||[]).map(t=>Object.entries(E.CardTag).find(([,value])=>value===t)?.[0]||String(t)),
      trainerSubtype:c instanceof E.TrainerCard ? E.TrainerType[c.trainerType] : undefined,
      implementationStatus:'implemented-unverified', implementationClass:c.constructor.name,
      playable:true, kind:c instanceof E.PokemonCard?'pokemon':c instanceof E.EnergyCard?'energy':'trainer',
      basicEnergy:c instanceof E.EnergyCard && c.energyType===E.EnergyType.BASIC,
      setupEligible:c instanceof E.PokemonCard && c.stage===E.Stage.BASIC,
      stage:c instanceof E.PokemonCard ? ({[E.Stage.BASIC]:'Basic',[E.Stage.STAGE_1]:'Stage 1',[E.Stage.STAGE_2]:'Stage 2'})[c.stage]||E.Stage[c.stage] : undefined,
      types:(Array.isArray(c.cardType)?c.cardType:[]).map(t=>E.CardType[t]), hp:c.hp, text:c.text||'',
      attacks:(c.attacks||[]).map(a=>({name:a.name,damage:a.damage,cost:a.cost.map(t=>E.CardType[t]),text:a.text})),
      powers:(c.powers||[]).map(p=>({name:p.name,text:p.text})),
    });
  }
}
const printingGroups = new Map();
for(const card of expanded.values()) if(card.officialPrintingId)printingGroups.set(card.officialPrintingId,[...(printingGroups.get(card.officialPrintingId)||[]),card]);
for(const [printingId,cards] of printingGroups)if(cards.length>1){
  for(const card of cards){card.playable=false;card.implementationStatus='incompatible-ambiguous-printing';card.unavailableReason='Upstream exports multiple executable definitions for this printing; effects have not been reconciled.';}
  conflicts.push({printingId,identities:cards.map(c=>c.fullName),reason:'Conflicting executable identities for the same official printing. All quarantined from decks pending effect review.'});
}
writeFileSync('shared/expanded-catalog.json',JSON.stringify([...expanded.values()])+'\n');
writeFileSync('shared/set-manifest.json',JSON.stringify(setManifest,null,2)+'\n');
writeFileSync('docs/card-registration-conflicts.json',JSON.stringify(conflicts,null,2)+'\n');
const executablePrintings = new Map([...catalog.filter(c=>c.playable).map(c=>[c.cardId,c.fullName]), ...[...expanded.values()].filter(c=>c.officialPrintingId&&c.playable).map(c=>[c.officialPrintingId,c.fullName])]);
writeFileSync('docs/printing-inventory.json',JSON.stringify({metadataSource:printingMetadata.source,metadataRevision:printingMetadata.revision,printings:printingMetadata.cards.map(p=>({...p,executableIdentity:executablePrintings.get(p.id)||null,status:executablePrintings.has(p.id)&&p.id!=='base1-50'?'implemented-unverified':'unavailable'}))})+'\n');
console.log(`Card registry: ${catalog.length} original printings + ${expanded.size} additional identities; ${setManifest.length} modules; ${conflicts.length} duplicate exports.`);
