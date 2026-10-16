import { mulliganSetup } from './mulligan-fixtures';
import { Match } from '../server/match';
import type { MatchOptions } from '../server/format';
import { E } from '../server/engine';
import { chooseAction, choosePrompt } from '../server/bot';

export function fixture(name: string, options: MatchOptions = {}) {
  if (!name) return new Match(options);
  if (name.startsWith('mulligan-')) return mulliganSetup(Number(name.slice(9))).match;
  let seed = 123;
  const random = Math.random;
  Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  let m: Match;
  try {
    m = new Match();
    for (let i = 0; i < 100 && m.state.turn === 0; i++) {
      const view = m.view();
      if (view.prompt) m.resolve(1, m.revision, view.prompt.id, choosePrompt(view.prompt));
      else if (!m.botStep()) { const a = chooseAction(view.actions, view.players[0]); if (a) m.act(1, m.revision, a.id); }
    }
  } finally { Math.random = random; }
  if (!m.state.turn) throw Error('Fixture setup did not finish');
  m.state.activePlayer = 0; m.state.turn = 5; m.state.phase = E.GamePhase.PLAYER_TURN; m.state.prompts = [];
  const [p, q] = m.state.players;
  let id = 1000;
  const card = (name: string) => { const c = E.CardManager.getInstance().getCardByName(name.includes(' JU') || name.includes(' FO') ? name : `${name} BS`); c.id = id++; return c; };
  for (const player of [p, q]) {
    player.active = new E.PokemonCardList(); player.bench = Array.from({ length: 5 }, () => new E.PokemonCardList());
    player.hand.cards = []; player.discard.cards = []; player.energyPlayedTurn = -1; player.retreatedTurn = -1;
    player.active.pokemonPlayedTurn = 1; player.bench[0].pokemonPlayedTurn = 1;
    player.deck.cards = Array.from({ length: 18 }, (_, i) => card(i % 3 === 0 ? 'Bill' : player === p ? 'Fire Energy' : 'Fighting Energy'));
    player.prizes.forEach((prize: any) => { prize.cards = [card(player === p ? 'Fire Energy' : 'Fighting Energy')]; });
  }
  p.active.cards = [card('Charmander')]; q.active.cards = [card('Machop')];
  p.bench[0].cards = [card('Rattata')]; q.bench[0].cards = [card('Rattata')];
  p.hand.cards = ['Charmander', 'Fire Energy', 'Computer Search', 'Fire Energy', 'Fire Energy', 'Charmeleon', 'Switch'].map(card);
  if (name === 'prize') { p.active.cards.push(card('Fire Energy')); q.active.damage = 40; }
  if (name === 'replacement') {
    p.active.damage = 40; q.active.cards.push(card('Fighting Energy')); m.state.activePlayer = 1;
  }
  if (name === 'rain-dance') { p.active.cards = [card('Blastoise')]; p.hand.cards = [card('Water Energy'),card('Water Energy'),card('Water Energy'),card('Fire Energy')]; }
  if (['ice-dance','super-cold','excited-turbo'].includes(name)) {
    const other=(fullName:string)=>{const c=E.CardManager.getInstance().getCardByName(fullName);if(!c)throw Error(fullName);c.id=id++;return c;};
    p.active.cards=[other(name==='ice-dance'?'Frosmoth SSH':name==='super-cold'?'Baxcalibur PAL':'Oricorio ex M2')];
    p.bench[0].cards=[card(name==='excited-turbo'?'Charmander':'Squirtle')];
    p.bench[1].cards=[card(name==='excited-turbo'?'Squirtle':'Charmander')];
    p.hand.cards=[card(name==='excited-turbo'?'Fire Energy':'Water Energy'),card(name==='excited-turbo'?'Fire Energy':'Water Energy'),card('Double Colorless Energy')];
    if(name==='excited-turbo') {
      const mega=E.CardManager.getInstance().getAllCards().find((c:any)=>c.tags.includes(E.CardTag.POKEMON_SV_MEGA)&&c.tags.includes(E.CardTag.POKEMON_ex)&&c.cardType?.includes(E.CardType.FIRE));
      if(!mega)throw Error('No Fire Mega Evolution Pokémon ex implementation.');
      p.bench[2].cards=[other(mega.fullName)];
    }
    m.state.rules=new E.Rules({firstTurnUseSupporter:false});
  }
  if (name === 'gust') p.hand.cards = [card('Gust of Wind')];
  if (name === 'energy-trans') { p.active.cards=[card('Venusaur'),card('Grass Energy'),card('Grass Energy')]; p.hand.cards=[]; }
  if (name === 'damage-swap') { p.active.cards=[card('Alakazam')]; p.active.damage=20; p.hand.cards=[]; }
  if (name === 'effects') { p.active.cards=[card('Scyther JU'),card('Grass Energy'),card('Double Colorless Energy')]; p.hand.cards=[card('PlusPower'),card('Switch')]; p.bench[1].cards=[card('Aerodactyl FO')]; }
  if (name === 'gas') { p.active.cards=[card('Aerodactyl FO')]; q.bench[1].cards=[card('Muk FO')]; }
  if (name === 'coin') { p.active.cards=[card('Doduo'),card('Double Colorless Energy')]; p.hand.cards=[card('Bill')]; q.active.cards=[card('Chansey')]; }
  if (name.startsWith('conditions')) {
    p.active.cards=[card('Charmander'),card('Fire Energy'),card('Double Colorless Energy'),card('PlusPower')];
    p.active.damage=20;p.active.specialConditions=[E.SpecialCondition.POISONED,E.SpecialCondition[name.split('-')[1] || 'ASLEEP']];
    p.bench[1].cards=[card('Charmander')];p.bench[2].cards=[card('Charmander')];p.bench[3].cards=[card('Charmander')];p.bench[4].cards=[card('Charmander')];
  }
  // Playable engine states arranged to exercise spatial layout, not fake action results.
  if(name.startsWith('layout-')) {
    const count=Number(name.split('-')[1]) || 5;
    const names=['Rattata','Pikachu','Squirtle','Bulbasaur','Scyther JU'];
    for(const player of [p,q]) {
      player.bench.forEach((b:any,i:number)=>{b.cards=i<count?[card(names[i])]:[];b.pokemonPlayedTurn=1;});
      player.discard.cards=[card('Bill'),card(player===p?'Fire Energy':'Fighting Energy')];
    }
    p.active.cards.push(card('Fire Energy'),card('Fire Energy'),card('Double Colorless Energy'));
    q.active.cards.push(card('Fighting Energy'));
    if(name==='layout-5-status')p.active.specialConditions=[E.SpecialCondition.POISONED,E.SpecialCondition.ASLEEP];
    if(name==='layout-finish') {
      q.active.damage=40;
      p.prizes.slice(1).forEach((prize:any)=>{prize.cards=[];});
    }
    if(name==='layout-replacement') {p.active.damage=40;m.state.activePlayer=1;}
  }
  // Display-only fixture: real engine CardList/TrainerCard metadata, never registered
  // as a legal Base–Fossil card and never claimed to implement Tool gameplay.
  if (name === 'display-fixture') {
    const tool=new E.TrainerCard();tool.id=id++;tool.name='Tool display fixture';tool.fullName='Tool display fixture';tool.trainerType=E.TrainerType.TOOL;tool.text='Display-only fixture; no gameplay effect.';
    p.active.cards.push(card('Fire Energy'),card('Double Colorless Energy'));p.active.tools=[tool];
    p.active.specialConditions=[E.SpecialCondition.BURNED,E.SpecialCondition.POISONED,E.SpecialCondition.CONFUSED];p.active.damage=10;
  }
  if (name === 'retreat-identical') p.active.cards.push(card('Fire Energy'),card('Fire Energy'),card('Fire Energy'));
  if (name === 'retreat-exact') p.active.cards.push(card('Fire Energy'));
  if (name === 'retreat-special') p.active.cards.push(card('Double Colorless Energy'),card('Fire Energy'),card('Water Energy'));
  if (name === 'retreat-order') p.active.cards=[card('Hitmonchan'),card('Double Colorless Energy'),card('Fire Energy'),card('Water Energy')];
  if (name === 'payment') p.active.cards.push(card('Fire Energy'), card('Fighting Energy')); 
  // Multi-prize presentation uses the real engine prompt and decoder; the pool has no multi-prize Pokémon.
  if (name === 'multi-prize') m.store.prompt(m.state, new E.ChoosePrizePrompt(1, 'CHOOSE_PRIZE_CARD', { count: 2 }), () => {});
  if (name === 'optional-search') m.store.prompt(m.state, new E.ChooseCardsPrompt(p, 'CHOOSE_CARD_TO_HAND', p.deck, {}, { min: 0, max: 1, allowCancel: true }), () => {});
  (m as any).changed();
  return m;
}
