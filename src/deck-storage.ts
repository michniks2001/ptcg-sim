import { parseDeck, type Deck } from '../shared/decks';
export const DECK_STORAGE_KEY = 'practice-table.decks.v1';
export function loadDecks(): Deck[] {
  const raw = localStorage.getItem(DECK_STORAGE_KEY);
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value)) throw Error('Saved deck storage is not a list. Export or repair browser storage before saving.');
  return value.map(parseDeck);
}
export function saveDecks(decks: Deck[]) { localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(decks.map(parseDeck))); }
