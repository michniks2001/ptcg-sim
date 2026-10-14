import { E } from './engine';
import { catalogById, examples, FORMAT_ID, FORMAT_LABEL, parseDeck, validateDeck, type Deck } from '../shared/decks';
export const cardPool = [...E.setBaseSet, ...E.setBaseSetEnergy, ...E.setJungle, ...E.setFossil];
const manager = E.CardManager.getInstance();
for (const c of cardPool) if (!manager.isCardDefined(c.fullName)) manager.defineCard(c);
export const historicalRules = { firstTurnDrawCard: true, firstTurnUseSupporter: true, attackFirstTurn: true, unlimitedRetreat: true, historicalConfusion: true, historicalRetreatPayment: true, mulliganDrawMultiplier: 2, setupCoinAfterSelection: true };
export const format = { id: FORMAT_ID, label: FORMAT_LABEL, engineFormat: E.Format.RETRO, legalCards: new Set(cardPool.map(c => c.fullName)), rules: historicalRules };
export const formats = new Map([[format.id, format]]);
export function engineDeck(value: unknown): string[] {
  const errors = validateDeck(value); if(errors.length) throw Error(errors.join('\n'));
  const d = parseDeck(value);
  const names = d.cards.flatMap(e => { const name = catalogById.get(e.cardId)!.fullName; if (!manager.isCardDefined(name)) throw Error(`Card cannot be registered or used by the installed engine: ${e.cardId}`); return Array(e.quantity).fill(name) as string[]; });
  if (!new E.DeckAnalyser(names).isValid(format.engineFormat)) throw Error('Twinleaf rejected this deck.');
  return names;
}
export const decks = { ember: engineDeck(examples[0]), lowKick: engineDeck(examples[1]), haymaker: engineDeck(examples[2]), rainDance: engineDeck(examples[3]), wigglytuff: engineDeck(examples[4]) };
export interface MatchOptions { formatId?: string; deck?: Deck; opponent?: 'practice' | 'haymaker' }
export function validateMatchOptions(value: unknown): MatchOptions {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid match configuration.');
  const v = value as MatchOptions;
  if (v.formatId !== undefined && !formats.has(v.formatId)) throw Error('Unknown format.');
  if (v.opponent !== undefined && v.opponent !== 'practice' && v.opponent !== 'haymaker') throw Error('Unknown AI opponent.');
  if (v.deck !== undefined) engineDeck(v.deck);
  return { formatId: v.formatId, deck: v.deck ? parseDeck(v.deck) : undefined, opponent: v.opponent };
}
