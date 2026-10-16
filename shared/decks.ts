import data from './catalog.json';
import { formatById, legalInFormat } from './formats';
import type { CardView } from './protocol';
export type CatalogCard = Omit<CardView, 'id'> & CatalogCardMetadata & { cardId: string; expansion: string; set: string; number: number; basicEnergy: boolean; setupEligible: boolean; types: string[]; playable: boolean; unavailableReason?: string };
export const catalog = data as CatalogCard[];
export const allCatalog = [...catalog];
export const catalogById = new Map(allCatalog.map(c => [c.cardId, c]));
export const catalogByFullName = new Map(allCatalog.map(c=>[c.fullName,c]));
export function registerCatalog(entries: CatalogCard[]) {
  for(const c of entries) if(!catalogById.has(c.cardId)) { allCatalog.push(c); catalogById.set(c.cardId,c); catalogByFullName.set(c.fullName,c); }
}
export interface CatalogCardMetadata { collectorNumber?:string; module?:string; series?:string; regulationMark?:string; releaseDate?:string|null; mechanics?:string[]; trainerSubtype?:string; officialPrintingId?:string; }
// Retain schema v1: printing IDs and format IDs already have independent fields.
export const FORMAT_ID = 'base-fossil-1999';
export const FORMAT_LABEL = 'Base–Fossil (1999)';
export interface DeckEntry { cardId: string; quantity: number }
export interface Deck { version: 1; id: string; name: string; formatId: string; cards: DeckEntry[] }
export function parseDeck(value: unknown): Deck {
  if (!value || typeof value !== 'object') throw Error('Deck must be an object.');
  const d = value as Deck;
  if (d.version !== 1) throw Error('Unsupported deck schema version; expected 1.');
  if (typeof d.id !== 'string' || !d.id.length || d.id.length > 100 || typeof d.name !== 'string' || !d.name.trim() || d.name.length > 100) throw Error('Deck ID and name must be nonempty strings (up to 100 characters).');
  if (typeof d.formatId !== 'string' || d.formatId.length > 100) throw Error('Invalid format identifier.');
  if (!Array.isArray(d.cards) || d.cards.length > 60) throw Error('Deck cards must be a list of up to 60 distinct printings.');
  const seen = new Set<string>();
  for (const e of d.cards) {
    if (!e || typeof e.cardId !== 'string' || e.cardId.length > 240 || !Number.isInteger(e.quantity) || e.quantity < 1 || e.quantity > 60) throw Error('Each card needs a printing ID and a whole quantity from 1 to 60.');
    if (seen.has(e.cardId)) throw Error(`Duplicate printing entry: ${e.cardId}. Combine its quantities.`);
    seen.add(e.cardId);
  }
  return { version: 1, id: d.id, name: d.name.trim(), formatId: d.formatId, cards: d.cards.map(e => ({cardId: e.cardId, quantity: e.quantity})) };
}
export function validateDeck(value: unknown): string[] {
  let d: Deck; try { d = parseDeck(value); } catch(e) { return [(e as Error).message]; }
  const errors: string[] = [], names = new Map<string, number>();
  const format = formatById.get(d.formatId);
  if (!format || format.status === 'unavailable') errors.push('Unknown format or unavailable rules profile.');
  const total = d.cards.reduce((n,e) => n+e.quantity,0);
  if (total !== 60) errors.push(`Deck contains ${total} cards; 60 required.`);
  let basic = false;
  for (const e of d.cards) {
    const c = catalogById.get(e.cardId);
    if (!c) { errors.push(`Card ${e.cardId} is not legal in Base–Fossil.`); continue; }
    if (format && !legalInFormat(c,format)) errors.push(`${c.name} (${c.set}) is not legal in ${format.label}.`);
    if (!c.playable) errors.push(`${c.name}: card cannot be registered or used by the installed engine. ${c.unavailableReason || ''}`);
    basic ||= c.setupEligible && c.playable;
    if (!c.basicEnergy) names.set(c.name, (names.get(c.name) || 0)+e.quantity);
  }
  for (const [name,count] of names) if(count>(format?.copyLimit||4)) errors.push(`More than four copies of ${name} (${count}).`);
  if(format) for(const [identity,limit] of Object.entries(format.restrictedCards)) {
    const count=d.cards.filter(e=>catalogById.get(e.cardId)?.fullName===identity).reduce((n,e)=>n+e.quantity,0);
    if(count>limit)errors.push(`${identity} is restricted to ${limit}.`);
  }
  for(const [tag,label] of [['ACE_SPEC','ACE SPEC'],['RADIANT','Radiant Pokémon'],['STAR','Pokémon Star']]) {
    const count=d.cards.filter(e=>catalogById.get(e.cardId)?.mechanics?.includes(tag)).reduce((n,e)=>n+e.quantity,0);
    if(count>1)errors.push(`Only one ${label} is allowed per deck.`);
  }
  const prismNames=new Map<string,number>();
  for(const e of d.cards){const c=catalogById.get(e.cardId);if(c?.mechanics?.includes('PRISM_STAR'))prismNames.set(c.name,(prismNames.get(c.name)||0)+e.quantity);}
  for(const [name,count]of prismNames)if(count>1)errors.push(`Only one Prism Star ${name} is allowed.`);
  if (!basic) errors.push('Deck does not contain a Basic Pokémon eligible for initial setup.');
  return errors;
}
export function exportDeck(d: Deck, json = false): string {
  return json ? JSON.stringify(d, null, 2) : `# ${d.name}\n# Format: ${formatById.get(d.formatId)?.label||d.formatId}\n# Format-ID: ${d.formatId}\n` + d.cards.map(e => { const c = catalogById.get(e.cardId); return `${e.quantity} ${c?.name || 'Unknown'} ${c?.set || '?'} ${(c as CatalogCard & CatalogCardMetadata)?.collectorNumber || c?.number || '?'} [${e.cardId}]`; }).join('\n');
}
export function importDeck(text: string, id: string = crypto.randomUUID()): Deck {
  if (text.length > 100000) throw Error('Deck list is too large.');
  if (text.trim().startsWith('{')) return parseDeck(JSON.parse(text));
  const entries = new Map<string, number>(); let name = 'Imported deck', formatId = FORMAT_ID;
  const lines = text.split(/\r?\n/);
  for (let i=0;i<lines.length;i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith('#')) { if(line.startsWith('# Format-ID: '))formatId=line.slice(13).trim(); if (i===0) name=line.slice(1).trim().slice(0,100) || name; continue; }
    if (/^(Pokémon|Pokemon|Trainer|Energy|Total Cards)\s*[:—-]/i.test(line)) continue;
    const m = /^(\d+)x?\s+(.+?)(?:\s+\[([^\]]+)\])?$/.exec(line);
    if (!m) throw Error(`Line ${i+1}: expected quantity, card name, set and number.`);
    let matches: CatalogCard[];
    if (m[3]) matches = allCatalog.filter(c => c.cardId===m[3]);
    else {
      const printing = /^(.*?)\s+([A-Z0-9-]+)\s+([A-Z0-9]+)$/i.exec(m[2]);
      matches = allCatalog.filter(c => printing ? c.name.toLowerCase()===printing[1].toLowerCase() && (c.set.toLowerCase()===printing[2].toLowerCase() || c.cardId.split('-')[0]===printing[2].toLowerCase()) && String((c as CatalogCard & CatalogCardMetadata).collectorNumber||c.number).toLowerCase()===printing[3].toLowerCase() : c.name.toLowerCase()===m[2].toLowerCase());
    }
    if(matches.length!==1) throw Error(`Line ${i+1}: ${matches.length ? 'Ambiguous printing' : 'Unknown card'}: ${m[2]}. Include BS/JU/FO and card number.`);
    entries.set(matches[0].cardId, (entries.get(matches[0].cardId)||0)+Number(m[1]));
  }
  if (!entries.size) throw Error('The deck list contains no cards.');
  return parseDeck({version:1,id,name,formatId,cards:[...entries].map(([cardId,quantity])=>({cardId,quantity}))});
}
function example(id: string, name: string, list: [string,number][]): Deck {
  return {version:1,id:`example-${id}`,name,formatId:FORMAT_ID,cards:list.map(([fullName,quantity])=>{const c=catalog.find(c=>c.fullName===fullName);if(!c)throw Error(fullName);return{cardId:c.cardId,quantity};})};
}
const practice = (basic:string, evolution:string, energy:string): [string,number][] => [[`${basic} BS`,4],[`${evolution} BS`,4],['Rattata BS',4],['Raticate BS',4],["Farfetch'd BS",4],['Bill BS',4],['Potion BS',4],['Switch BS',2],['Computer Search BS',2],[`${energy} Energy BS`,28]];
export const examples: Deck[] = [
  example('ember','Ember · Beginner',practice('Charmander','Charmeleon','Fire')),
  example('low-kick','Low Kick · Practice',practice('Machop','Machoke','Fighting')),
  example('haymaker','Haymaker', [['Hitmonchan BS',4],['Electabuzz BS',4],['Scyther JU',3],['Professor Oak BS',4],['PlusPower BS',4],['Energy Removal BS',4],['Bill BS',3],['Gust of Wind BS',3],['Scoop Up BS',3],['Energy Retrieval BS',3],['Item Finder BS',3],['Super Energy Removal BS',3],['Computer Search BS',2],['Fighting Energy BS',7],['Lightning Energy BS',6],['Double Colorless Energy BS',4]]),
  example('rain-dance','Rain Dance · Blastoise', [['Squirtle BS',4],['Wartortle BS',3],['Blastoise BS',3],['Articuno FO',3],['Lapras FO',2],['Bill BS',4],['Professor Oak BS',3],['Computer Search BS',2],['Pokémon Breeder BS',3],['Switch BS',2],['Gust of Wind BS',2],['Energy Retrieval BS',2],['Water Energy BS',27]]),
  example('wigglytuff','Wigglytuff · Do the Wave', [['Jigglypuff JU',4],['Wigglytuff JU',4],['Scyther JU',4],['Magmar FO',4],['Bill BS',4],['Professor Oak BS',3],['Computer Search BS',2],['PlusPower BS',4],['Gust of Wind BS',3],['Energy Removal BS',4],['Switch BS',2],['Double Colorless Energy BS',4],['Fire Energy BS',18]]),
];
