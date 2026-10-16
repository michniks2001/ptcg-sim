import { describe,it,expect } from 'vitest';
import { E } from '../server/engine';
import { allCardPool, engineDeck, validateMatchOptions } from '../server/format';
import { allCatalog, catalog, catalogById, examples, importDeck, exportDeck, validateDeck } from '../shared/decks';
import { formatById, legalInFormat } from '../shared/formats';
import manifest from '../shared/set-manifest.json';
import conflicts from '../docs/card-registration-conflicts.json';
import { fixture } from './fixtures';
import { Match } from '../server/match';
const laboratory = formatById.get('engine-sandbox')!;
describe('expanded executable library and printing contracts',()=>{
 it('registers the audited set modules and preserves the original catalog',()=>{
   expect(manifest).toHaveLength(160);expect(catalog).toHaveLength(228);expect(allCatalog.length).toBeGreaterThan(13000);
   expect(new Set(allCatalog.map(c=>c.cardId)).size).toBe(allCatalog.length);
   expect(new Set(allCardPool.map(c=>c.fullName)).size).toBe(allCardPool.length);
   const manager=E.CardManager.getInstance();
   for(const c of allCatalog.filter(c=>c.playable)){const executable=manager.getCardByName(c.fullName);expect(executable,c.fullName).toBeTruthy();expect(executable.reduceEffect).toBeTypeOf('function');}
 });
 it('retains alternate identities, exact collector numbers and the missing Gastly',()=>{
   expect(catalogById.get('base1-50')?.playable).toBe(false);
   const bax=allCatalog.find(c=>c.fullName==='Baxcalibur PAL')!;expect(bax.officialPrintingId).toBe('sv2-60');expect(bax.image).toContain('/sv2/60.png');
   expect(bax.mechanics).not.toContain(null);expect(bax.releaseDate).toBe('2023-06-09');
   expect(allCatalog.some(c=>c.collectorNumber&&/\D/.test(c.collectorNumber))).toBe(true);
 });
 it('quarantines ambiguous official printings rather than choosing effects silently',()=>{
   expect(conflicts.length).toBeGreaterThan(0);
   const duplicate=allCatalog.find(c=>c.fullName==='Gardevoir DEX')!;expect(duplicate.playable).toBe(false);expect(duplicate.unavailableReason).toContain('multiple executable');
   expect(validateDeck({...examples[0],formatId:laboratory.id,cards:[{cardId:duplicate.cardId,quantity:4},{cardId:'base1-97',quantity:56}]}).join()).toContain('cannot be registered');
 });
 it('round trips new printing IDs and format identity without migrating v1 decks',()=>{
   const basic=allCatalog.find(c=>c.fullName==='Frigibax PAL1')!;
   const deck={...examples[0],formatId:laboratory.id,cards:[{cardId:basic.cardId,quantity:4},{cardId:'base1-102',quantity:56}]};
   expect(engineDeck(deck)).toHaveLength(60);expect(importDeck(exportDeck(deck),deck.id)).toEqual(deck);
   expect(importDeck(exportDeck(deck,true))).toEqual(deck);
   expect(validateDeck({...deck,formatId:'base-fossil-1999'}).join()).toContain('not legal');
 });
 it('checks special construction limits before submitting to Twinleaf',()=>{
   const radiant=allCatalog.find(c=>c.fullName==='Radiant Greninja ASR')!;
   expect(radiant.mechanics).toContain('RADIANT');
   expect(validateDeck({...examples[0],formatId:laboratory.id,cards:[{cardId:radiant.cardId,quantity:2},{cardId:'base1-102',quantity:58}]}).join()).toContain('Only one Radiant');
 });
});
describe('snapshot legality is independent of gameplay profiles',()=>{
 it('enforces legal sets, bans, explicit reprints and unavailable statuses',()=>{
   const c=catalogById.get('base3-2')!, f=formatById.get('base-1999')!;
   expect(legalInFormat(c,f)).toBe(false);expect(legalInFormat(c,formatById.get('base-fossil-1999')!)).toBe(true);
   expect(legalInFormat(c,{...f,legalSets:['FO'],bannedCards:[c.fullName]})).toBe(false);
   expect(legalInFormat(c,{...f,reprints:{[c.fullName]:'audited-equivalent'}})).toBe(true);
   expect(legalInFormat(c,{...f,status:'unavailable'})).toBe(false);
   expect(()=>validateMatchOptions({formatId:'worlds-2024'})).toThrow('AI');
 });
 it('limits Worlds 2024 marks, expansion cutoff and future releases reproducibly',()=>{
   const f=formatById.get('worlds-2024')!;
   expect(legalInFormat(allCatalog.find(c=>c.fullName==='Baxcalibur PAL')!,f)).toBe(true);
   expect(legalInFormat(allCatalog.find(c=>c.fullName==='Frosmoth SSH')!,f)).toBe(false);
   expect(legalInFormat(catalogById.get('base1-95')!,f)).toBe(true); // Switch: explicit equivalent, not name inference.
   expect(legalInFormat(catalogById.get('base1-94')!,f)).toBe(false); // Original Potion has different healing.
   expect(legalInFormat({...catalog[0],set:'TWM',regulationMark:'H',releaseDate:'2024-08-03'},f)).toBe(false);
   expect(legalInFormat({...catalog[0],set:'SCR',regulationMark:'H',releaseDate:'2024-09-13'},f)).toBe(false);
 });
 it('rejects mismatched deck formats and validates opponents in the selected pool',()=>{
   expect(()=>new Match({formatId:'base-1999',deck:examples[2]})).toThrow('does not match');
   expect(()=>new Match({formatId:'base-1999',opponent:'wigglytuff'})).toThrow('opponent');
   const m=new Match({formatId:'engine-sandbox',deck:{...examples[0],formatId:'engine-sandbox'}});expect(m.state.rules.firstTurnUseSupporter).toBe(false);
 });
 it('actually forbids modern turn-one attacks and Supporters while retaining Items',()=>{
   const m=fixture('interactions'),p=m.state.players[0];m.state.turn=1;m.state.rules=new E.Rules({attackFirstTurn:false,firstTurnUseSupporter:false});
   p.active.cards.push(E.CardManager.getInstance().getCardByName('Fire Energy BS'));
   const supporter=E.CardManager.getInstance().getCardByName("Professor's Research BRS");supporter.id=99999;p.hand.cards=[supporter,E.CardManager.getInstance().getCardByName('Bill BS')];(m as any).changed();
   expect(m.view().actions.some(a=>a.kind==='attack')).toBe(false);expect(m.view().actions.some(a=>a.label.includes('Research'))).toBe(false);
   const bill=m.view().actions.find(a=>a.label==='Play Bill')!;expect(bill).toBeTruthy();const size=p.hand.cards.length;m.act(1,m.revision,bill.id);expect(p.hand.cards.length).toBe(size+1);
 });
 it('projects public additional zones and once-per-game markers without exposing hidden cards',()=>{
   const m=fixture('interactions'),p=m.state.players[0];p.lostzone.cards=[E.CardManager.getInstance().getCardByName('Fire Energy BS')];p.usedGX=true;p.usedVSTAR=true;
   const v=m.view();expect(v.players[0].lostZone?.[0].name).toBe('Fire Energy');expect(v.players[0].usedGX).toBe(true);expect(v.players[0].usedVSTAR).toBe(true);expect(v.players[1].hand).toEqual([]);
 });
});
