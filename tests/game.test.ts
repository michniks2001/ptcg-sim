import { describe, it, expect, vi, afterEach } from 'vitest';
import { E } from '../server/engine';
import { Match } from '../server/match';
import { chooseAction, choosePrompt } from '../server/bot';
import { decodeSelection, promptSpec } from '../server/prompts';
import { logView } from '../server/views';
import { cardPool, decks, format } from '../server/format';
function seed(value: number) { let s = value; vi.spyOn(Math, 'random').mockImplementation(() => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }); }
afterEach(() => vi.restoreAllMocks());
export function answer(m: Match, id: number) {
  const p = m.pending(id), v = promptSpec(p, m.state).view;
  let keys = choosePrompt(v);
  if (v.type === 'Choose energy') {
    for (let mask = 0; mask < 2 ** Math.min(v.choices.length, 12); mask++) {
      const candidate = v.choices.filter((_, i) => mask & (1 << i)).map(c => c.key);
      try { decodeSelection(p, m.state, candidate); keys = candidate; break; } catch {}
    }
  }
  m.resolve(id, m.revision, p.id, keys);
}
function step(m: Match) {
  if (m.pending(1)) answer(m, 1);
  else if (!m.botStep()) {
    const v = m.view(); const a = chooseAction(v.actions, v.players[0]);
    if (!a) throw Error(`Stuck at ${m.state.turn}: ${m.fault} ${JSON.stringify(m.state.prompts.map((p: any) => [p.type, p.playerId, p.result !== undefined]))}`);
    m.act(1, m.revision, a.id);
  }
}
function setup(m: Match) { for (let i = 0; i < 100 && m.state.turn === 0; i++) step(m); expect(m.state.turn).toBe(1); }
function fixture() {
  seed(123); const m = new Match(); setup(m);
  // Test-only arrange real engine instances in a stable turn; no fixture API is exposed.
  m.state.activePlayer = 0; m.state.turn = 5; m.state.phase = E.GamePhase.PLAYER_TURN; m.state.prompts = [];
  const [p, q] = m.state.players;
  for (const player of [p, q]) { player.active = new E.PokemonCardList(); player.bench = Array.from({ length: 5 }, () => new E.PokemonCardList()); player.hand.cards = []; player.energyPlayedTurn = -1; player.retreatedTurn = -1; }
  let id = 1000;
  const card = (name: string) => { const c = E.CardManager.getInstance().getCardByName(`${name} BS`); c.id = id++; return c; };
  p.active.cards = [card('Charmander')]; p.active.pokemonPlayedTurn = 1;
  q.active.cards = [card('Machop')]; q.active.pokemonPlayedTurn = 1;
  p.bench[0].cards = [card('Rattata')]; p.bench[0].pokemonPlayedTurn = 1;
  q.bench[0].cards = [card('Rattata')]; q.bench[0].pokemonPlayedTurn = 1;
  // New view revision/offer cache after fixture arrangement.
  (m as any).changed();
  return { m, p, q, card, refresh: () => (m as any).changed() };
}
function play(m: Match, kind: string, source?: string, label?: string) { const a = m.view().actions.find(a => a.kind === kind && (!source || a.source === source) && (!label || a.label === label)); expect(a, `Missing ${kind} ${label || ''}`).toBeTruthy(); m.act(1, m.revision, a!.id); }
describe('Twinleaf integration', () => {
  it('registers legal sixty-card decks with separate format rules', () => { for (const d of Object.values(decks)) { expect(d).toHaveLength(60); expect(new E.DeckAnalyser(d).isValid(format.engineFormat)).toBe(true); expect(d.every(c => format.legalCards.has(c))).toBe(true); } expect(cardPool.length).toBe(227); });
  it('keeps setup and every hidden zone out of the human DTO', () => { seed(44); const m = new Match(); const view = m.view(); expect(view.players[1].hand).toEqual([]); expect(view).not.toHaveProperty('cardNames'); expect(view.players[1]).not.toHaveProperty('deck'); expect(view.players[0]).not.toHaveProperty('deck'); expect(view.prompt?.id).toBe(m.pending(1)?.id); const raw = JSON.stringify(view); expect(raw).not.toContain('deckOrder'); expect(raw).not.toContain('perspectivePlayerId'); });
  it('rejects ownership, duplicate, stale and malformed decisions without consuming the prompt', () => { seed(44); const m = new Match(); const p = m.pending(1); expect(p).toBeTruthy(); const before = m.revision; expect(() => m.resolve(1, before, -12, [])).toThrow(); expect(() => m.resolve(2, before, p.id, ['0'])).toThrow(); expect(() => m.resolve(1, before, p.id, ['0', '0'])).toThrow(); expect(() => m.resolve(1, before, p.id, ['9999'])).toThrow(); expect(() => m.resolve(1, before - 1, p.id, ['0'])).toThrow(); expect(m.pending(1)).toBe(p); expect(m.revision).toBe(before); });
  it('attaches once, refuses a second attachment and rejects raw illegal engine actions', () => { const { m, p, card, refresh } = fixture(); p.hand.cards = [card('Fire Energy'), card('Fire Energy')]; refresh(); play(m, 'energy'); expect(p.active.cards.filter((c: any) => c instanceof E.EnergyCard)).toHaveLength(1); expect(m.view().actions.filter(a => a.kind === 'energy')).toHaveLength(0); expect(() => m.store.dispatch(new E.PlayCardAction(1, 0, { player: E.PlayerType.BOTTOM_PLAYER, slot: E.SlotType.ACTIVE, index: 0 }))).toThrow(); expect(() => m.act(1, m.revision, 'made-up')).toThrow(); });
  it('evolves via engine timing and resolves Bill and Potion', () => { const { m, p, card, refresh } = fixture(); p.hand.cards = [card('Charmeleon'), card('Bill'), card('Potion')]; p.active.damage = 30; refresh(); play(m, 'evolve'); expect(p.active.getPokemonCard().name).toBe('Charmeleon'); const count = p.hand.cards.length; play(m, 'play', `hand:${p.hand.cards.find((c: any) => c.name === 'Bill').id}`); expect(p.hand.cards.length).toBe(count + 1); play(m, 'play', `hand:${p.hand.cards.find((c: any) => c.name === 'Potion').id}`); expect(m.view().prompt?.type).toBe('Choose pokemon'); answer(m, 1); expect(p.active.damage).toBe(10); expect(p.discard.cards.some((c: any) => c.name === 'Potion')).toBe(true); });
  it('resolves Computer Search discard + deck selection and shuffles', () => { const { m, p, card, refresh } = fixture(); p.hand.cards = [card('Computer Search'), card('Fire Energy'), card('Fire Energy')]; refresh(); play(m, 'play'); expect(m.view().prompt?.min).toBe(2); answer(m, 1); expect(m.view().prompt?.message).toContain('Card to hand'); answer(m, 1); expect(m.pending(1)).toBeUndefined(); expect(p.hand.cards).toHaveLength(1); expect(p.discard.cards.filter((c: any) => c.id >= 1000)).toHaveLength(3); });
  it('pays attack Energy, applies damage, takes a prize and replaces a knocked-out Active', () => { const { m, p, q, card, refresh } = fixture(); p.active.cards.push(card('Fire Energy'), card('Fire Energy')); q.active.damage = 20; refresh(); play(m, 'attack', undefined, 'Ember'); if (m.pending(1)?.type === 'Choose energy') answer(m, 1); for (let n = 0; n < 10 && (m.pending(1) || m.pending(2)); n++) { if (m.pending(1)) answer(m, 1); else m.botStep(); } expect(q.discard.cards.some((c: any) => c.name === 'Machop')).toBe(true); expect(q.active.getPokemonCard().name).toBe('Rattata'); expect(p.prizes.filter((c: any) => c.cards.length)).toHaveLength(5); expect(p.active.cards.filter((c: any) => c instanceof E.EnergyCard)).toHaveLength(1); });
  it('handles last-prize victory and deck-out victory', () => { const { m, p, q, card, refresh } = fixture(); p.active.cards.push(card('Fire Energy')); q.active.damage = 40; p.prizes.slice(1).forEach((l: any) => { l.cards = []; }); refresh(); play(m, 'attack', undefined, 'Scratch'); for (let i = 0; i < 10 && m.state.phase !== E.GamePhase.FINISHED; i++) step(m); expect(m.view().winner).toBe(0); const other = fixture(); other.q.deck.cards = []; other.refresh(); play(other.m, 'end'); expect(other.m.view().winner).toBe(0); });
  it('does not mutate live card instances while probing actions', () => { const { m, p, card, refresh } = fixture(); p.active.cards.push(card('Fire Energy')); p.hand.cards = [card('Computer Search'), card('Bill'), card('Switch')]; refresh(); const before = JSON.stringify(m.state); m.view(); expect(JSON.stringify(m.state)).toBe(before); });
  it('redacts opponent search results and generic hidden-card log text', () => {
    const secret = 'PRIVATE_CARD_SENTINEL';
    for (const message of ['LOG_PLAYER_PUTS_CARD_IN_HAND', 'LOG_PLAYER_CHOOSES', 'LOG_CARD_MOVED']) {
      expect(logView({ message, params: { name: 'AI · Low Kick', card: secret, string: secret } }, 'You · Ember')).not.toContain(secret);
    }
    expect(logView({ message: 'LOG_PLAYER_PUTS_CARD_IN_HAND', params: { name: 'You · Ember', card: secret } }, 'You · Ember')).toContain(secret);
  });
  it('restricts Switch choices to the owner’s Bench and pays legal retreat costs', () => {
    const { m, p, card, refresh } = fixture(); p.hand.cards = [card('Switch')]; refresh();
    play(m, 'play'); expect(m.view().prompt!.choices).toHaveLength(1);
    expect(m.view().prompt!.choices[0].label).toContain('You · Ember');
    expect(() => m.resolve(1, m.revision, m.pending(1).id, null)).toThrow(); answer(m, 1);
    expect(p.active.getPokemonCard().name).toBe('Rattata');
    // Rattata retreats freely under its real printed cost.
    play(m, 'retreat'); expect(p.active.getPokemonCard().name).toBe('Charmander');
    expect(m.view().actions.some(a => a.kind === 'retreat')).toBe(false);
  });
  it('offers no unaffordable attacks or same-turn evolutions', () => {
    const { m, p, card, refresh } = fixture(); p.active.pokemonPlayedTurn = m.state.turn; p.hand.cards = [card('Charmeleon')]; refresh();
    expect(m.view().actions.filter(a => a.kind === 'attack' || a.kind === 'evolve')).toEqual([]);
    expect(() => m.store.dispatch(new E.AttackAction(1, 'Ember'))).toThrow();
  });
  it('ends a bot turn at the action safeguard without looping', () => {
    const { m, refresh } = fixture(); m.state.activePlayer = 1; refresh();
    (m as any).botTurn = m.state.turn; (m as any).botActions = 80;
    expect(m.botStep()).toBe(true); expect(m.state.activePlayer).toBe(0); expect(m.fault).toBeUndefined();
    expect(m.diagnostics.join(' ')).toContain('safeguard');
  });
  it('records a server-generated coin result for Farfetch’d', () => {
    const { m, p, card, refresh } = fixture(); p.active.cards = [card("Farfetch'd"), card('Fire Energy')]; refresh();
    play(m, 'attack', undefined, 'Leek Slap');
    expect(m.state.logs.some((l: any) => l.message === 'LOG_PLAYER_FLIPS_HEADS' || l.message === 'LOG_PLAYER_FLIPS_TAILS')).toBe(true);
    expect(m.state.prompts.some((p: any) => p.type === 'Coin flip' && p.result === undefined)).toBe(false);
  });
  it('plays complete games with both seats using the public action/prompt contract', () => {
    const stats: any[] = [];
    for (const value of [12, 25, 37, 49, 65, 81]) {
      seed(value); const m = new Match(); let decisions = 0; const turns = new Set<string>();
      while (m.state.phase !== E.GamePhase.FINISHED && decisions++ < 1600) { if (m.state.turn) turns.add(`${m.state.activePlayer}:${m.state.turn}`); step(m); expect(m.fault).toBeUndefined(); expect(m.view().players[1].hand).toEqual([]); }
      expect(m.state.phase, `seed ${value}`).toBe(E.GamePhase.FINISHED);
      stats.push({ seed: value, turns: m.state.turn, decisions, winner: m.state.winner });
    }
    expect(stats.filter(s => s.turns >= 6).length).toBeGreaterThanOrEqual(3);
    console.log('Full-game evidence:', JSON.stringify(stats));
  }, 120000);
});
