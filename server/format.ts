import { E } from './engine';
import { catalogById, examples, FORMAT_ID, FORMAT_LABEL, parseDeck, validateDeck, registerCatalog, type Deck, type CatalogCard } from '../shared/decks';
import expandedCatalog from '../shared/expanded-catalog.json';
import { formatDefinitions, formatById, rulesProfiles } from '../shared/formats';
export const cardPool = [...E.setBaseSet, ...E.setBaseSetEnergy, ...E.setJungle, ...E.setFossil];
registerCatalog(expandedCatalog as CatalogCard[]);
const manager = E.CardManager.getInstance();
export const allCardPool = [...new Map([...cardPool,...E.expansionSets.flatMap((s:any)=>s.cards)].map((c:any)=>[c.fullName,c])).values()] as any[];
// Original patched definitions always take precedence over additional exports.
for (const c of [...cardPool,...allCardPool]) if (!manager.isCardDefined(c.fullName)) manager.defineCard(c);
export const historicalRules = rulesProfiles['wotc-1999'];
export const format = { id: FORMAT_ID, label: FORMAT_LABEL, engineFormat: E.Format.RETRO, legalCards: new Set(cardPool.map(c => c.fullName)), rules: historicalRules };
export const formats = new Map(formatDefinitions.filter(f=>f.status!=='unavailable').map(f=>[f.id,{...f,engineFormat:f.rulesProfile==='wotc-1999'?E.Format.RETRO:E.Format.UNLIMITED,rules:rulesProfiles[f.rulesProfile]}]));
export function engineDeck(value: unknown): string[] {
  const errors = validateDeck(value); if(errors.length) throw Error(errors.join('\n'));
  const d = parseDeck(value);
  const names = d.cards.flatMap(e => { const name = catalogById.get(e.cardId)!.fullName; if (!manager.isCardDefined(name)) throw Error(`Card cannot be registered or used by the installed engine: ${e.cardId}`); return Array(e.quantity).fill(name) as string[]; });
  if (!new E.DeckAnalyser(names).isValid(formats.get(d.formatId)!.engineFormat)) throw Error('Twinleaf rejected this deck.');
  return names;
}
export const decks = { ember: engineDeck(examples[0]), lowKick: engineDeck(examples[1]), haymaker: engineDeck(examples[2]), rainDance: engineDeck(examples[3]), wigglytuff: engineDeck(examples[4]) };
export type OpponentId = 'practice' | 'haymaker' | 'rain-dance' | 'wigglytuff' | 'iron-thorns-2024' | 'roaring-moon-2024' | 'miraidon-2024';
export interface MatchOptions { formatId?: string; deck?: Deck; opponent?: OpponentId }
export function validateMatchOptions(value: unknown): MatchOptions {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid match configuration.');
  const v = value as MatchOptions;
  if (v.formatId !== undefined && !formats.has(v.formatId)) throw Error('Unknown format.');
  if (v.opponent !== undefined && !['practice','haymaker','rain-dance','wigglytuff','iron-thorns-2024','roaring-moon-2024','miraidon-2024'].includes(v.opponent)) throw Error('Unknown AI opponent.');
  const selected = formatById.get(v.formatId || v.deck?.formatId || FORMAT_ID);
  if (!selected || selected.status==='unavailable') throw Error('Format is unavailable.');
  if (!selected.aiDecks.includes(v.opponent||'practice')) throw Error('No validated AI deck for that opponent in this format.');
  if (v.deck && v.deck.formatId !== selected.id) throw Error('Deck format does not match the selected match format.');
  if (v.deck !== undefined) engineDeck(v.deck);
  return { formatId: v.formatId, deck: v.deck ? parseDeck(v.deck) : undefined, opponent: v.opponent };
}
