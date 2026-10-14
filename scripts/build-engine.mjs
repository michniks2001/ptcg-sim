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
