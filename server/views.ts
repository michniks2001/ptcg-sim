import { E } from './engine';
import { conditionDetails } from './conditions';
import { catalogByFullName } from '../shared/decks';
import type { CardView, PlayerView, PokemonView } from '../shared/protocol';
export function cardView(c: any): CardView {
  return { energyKind: c instanceof E.EnergyCard ? c.energyType === E.EnergyType.BASIC ? 'basic' : 'special' : undefined, id: c.id, name: c.name, fullName: c.fullName, image: catalogByFullName.get(c.fullName)?.image || '/cards/unavailable.png', types: (Array.isArray(c.cardType) ? c.cardType : []).map((t: number) => E.CardType[t]), provides: (c.provides || []).map((t: number) => E.CardType[t]), weakness: (c.weakness || []).map((w: any) => ({type: E.CardType[w.type], value: w.value})), resistance: (c.resistance || []).map((w: any) => ({type: E.CardType[w.type], value: w.value})), retreat: c.retreat?.length, kind: c instanceof E.PokemonCard ? 'pokemon' : c instanceof E.EnergyCard ? 'energy' : 'trainer', hp: c.hp, stage: c.stage === E.Stage.BASIC ? 'Basic' : c.evolvesFrom ? `Evolves from ${c.evolvesFrom}` : undefined, text: c.text || '', attacks: (c.attacks || []).map((a: any) => ({ name: a.name, damage: a.damage, cost: a.cost.map((t: number) => E.CardType[t]), text: a.text })), powers: (c.powers || []).map((p: any) => ({ name: p.name, text: p.text })) };
}
export function attachments(list: any) {
  const stack = list.getPokemons();
  return [...new Set<any>([...list.cards,...list.tools])].filter((c:any) => !stack.includes(c)).map((c:any) => ({card:cardView(c),kind: c instanceof E.EnergyCard ? c.energyType === E.EnergyType.BASIC ? 'basic-energy' as const : 'special-energy' as const : list.tools.includes(c) ? 'tool' as const : 'attachment' as const}));
}
export function pokemonView(list: any, hide = false, historical = true): PokemonView {
  if (hide && list.isSecret) return { hidden: !!list.cards.length, damage: 0, energy: [], conditions: [] };
  const c = list.getPokemonCard();
  return { attachments: attachments(list), conditionDetails: conditionDetails(list,historical), card: c ? cardView(c) : undefined, damage: list.damage, attackBonus: list.cards.filter((c: any)=>c.name==='PlusPower').length*10, energy: list.cards.filter((c: any) => c instanceof E.EnergyCard).map(cardView), conditions: list.specialConditions.map((v: number) => E.SpecialCondition[v]) };
}
export function playerView(p: any, viewer: number, historical = true): PlayerView { return { stadium:p.stadium?.cards.map(cardView)||[], lostZone:p.lostzone?.cards.map(cardView)||[], usedGX:!!p.usedGX, usedVSTAR:!!p.usedVSTAR, id: p.id, name: p.name, active: pokemonView(p.active, p.id !== viewer,historical), bench: p.bench.map((b: any) => pokemonView(b, p.id !== viewer,historical)), hand: p.id === viewer ? p.hand.cards.map(cardView) : [], handCount: p.hand.cards.length, deckCount: p.deck.cards.length, prizes: p.prizes.filter((p: any) => p.cards.length).length, discard: p.discard.cards.map(cardView) }; }
export function words(s: string) { return s.replace(/^(LOG_|CHOOSE_|SETUP_)/, '').replaceAll('_', ' ').toLowerCase().replace(/^./, c => c.toUpperCase()); }
const logTemplates: Record<string, string> = {
  LOG_TURN: 'Turn {turn}', LOG_GAME_FINISHED_WINNER: '{name} wins the match.',
  LOG_PLAYER_DRAWS_CARD: '{name} draws a card.', LOG_PLAYER_ENDS_TURN: '{name} ends their turn.',
  LOG_PLAYER_ATTACHES_CARD: '{name} attaches {card} to {pokemon}.',
  LOG_PLAYER_EVOLVES_POKEMON: '{name} evolves {pokemon} into {card}.',
  LOG_PLAYER_FLIPS_HEADS: '{name} flips heads.', LOG_PLAYER_FLIPS_TAILS: '{name} flips tails.',
  LOG_PLAYER_PLAYS_BASIC_POKEMON: '{name} benches {card}.', LOG_PLAYER_PLAYS_ITEM: '{name} plays {card}.',
  LOG_PLAYER_USES_ATTACK: '{name} uses {attack}.', LOG_PLAYER_USES_ABILITY: '{name} uses {ability}.',
  LOG_PLAYER_HEALS_POKEMON: '{name} heals {healingAmount} damage from {pokemon}.',
  LOG_PLAYER_DEALS_DAMAGE: '{name} deals {damage} damage to {target}.',
  LOG_POKEMON_KO: '{name} is Knocked Out.', LOG_PLAYER_RETREATS: '{name} retreats {active} for {benched}.',
  LOG_PLAYER_SWITCHES_POKEMON_TO_ACTIVE: '{name} moves {card} to the Active spot.',
  LOG_PLAYER_DISCARDS_CARD_FROM_HAND: '{name} discards {card}.', LOG_PLAYER_DISCARDS_CARD: '{name} discards {card}.',
  LOG_PLAYER_NO_CARDS_IN_DECK: '{name} cannot draw: deck empty.', LOG_PLAYER_NO_ACTIVE_POKEMON: '{name} has no Pokémon left.',
  LOG_PLAYER_NO_PRIZE_CARD: '{name} has taken all their Prize cards.', LOG_SETUP_NO_BASIC_POKEMON: '{name} takes a mulligan.',
};
export function logView(log: any, viewerName: string): string {
  const p = log.params || {};
  if (log.message === 'LOG_PLAYER_PUTS_CARD_IN_HAND') return `${p.name} puts ${p.name === viewerName ? p.card : 'a card'} in their hand.`;
  // Generic engine choice/movement text can embed hidden card names. Publish
  // only the event, never its free-text parameters. Public plays have templates.
  if (log.message === 'LOG_PLAYER_CHOOSES') return `${p.name} completes a choice.`;
  const template = logTemplates[log.message];
  if (!template) return words(log.message);
  return template.replace(/\{(\w+)\}/g, (_, key) => String(p[key] ?? 'Pokémon'));
}
