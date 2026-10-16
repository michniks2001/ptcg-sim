import { E } from './engine';
import type { ActionView } from '../shared/protocol';
export interface Offer { view: ActionView; action: any; }
export function legalOffers(state: any, playerId: number): Offer[] {
  if (state.phase !== E.GamePhase.PLAYER_TURN || state.players[state.activePlayer]?.id !== playerId || state.prompts.some((p: any) => p.result === undefined)) return [];
  const p = state.players.find((p: any) => p.id === playerId);
  const candidates: Omit<Offer, 'view'>[] & any[] = [];
  const add = (action: any, source: string, label: string, group: string, kind: ActionView['kind'], target?: string, damage?: number) => candidates.push({ action, view: { id: '', source, label, group, kind, target, damage } });
  const targets = [{ list: p.active, slot: E.SlotType.ACTIVE, index: 0 }, ...p.bench.map((list: any, index: number) => ({ list, slot: E.SlotType.BENCH, index }))];
  p.hand.cards.forEach((c: any, index: number) => {
    const source = `hand:${c.id}`;
    if (c instanceof E.TrainerCard) {
      if(c.trainerType === E.TrainerType.TOOL) {
        for(const owner of state.players) {
          if(owner.id!==p.id&&!c.attachesToOpponentsPokemon)continue;
          [owner.active,...owner.bench].forEach((list:any,i:number)=>{
            if(!list.getPokemonCard())return;
            add(new E.PlayCardAction(p.id,index,{player:owner.id===p.id?E.PlayerType.BOTTOM_PLAYER:E.PlayerType.TOP_PLAYER,slot:i===0?E.SlotType.ACTIVE:E.SlotType.BENCH,index:i===0?0:i-1}),source,`Play ${c.name}`,'Attach Tool','play',`${owner.name} · ${list.getPokemonCard().name}`);
          });
        }
      } else add(new E.PlayCardAction(p.id, index, { player: E.PlayerType.ANY, slot: E.SlotType.BOARD, index: 0 }), source, `Play ${c.name}`, 'Play', 'play');
    }
    else for (const t of targets) {
      // Candidate structure only; the engine determines legality, energy costs,
      // evolution timing and all effect restrictions on an independent clone.
      const basic = c instanceof E.PokemonCard && c.stage === E.Stage.BASIC;
      if (basic && (t.slot !== E.SlotType.BENCH || t.list.cards.length)) continue;
      if (!basic && !t.list.cards.length) continue;
      const target = `${t.slot === E.SlotType.ACTIVE ? 'Active' : `Bench ${t.index + 1}`}${t.list.getPokemonCard() ? ` · ${t.list.getPokemonCard().name}` : ''}`;
      const kind = c instanceof E.EnergyCard ? 'energy' : basic ? 'play' : 'evolve';
      const group = kind === 'energy' ? 'Attach Energy' : basic ? 'Play to Bench' : 'Evolve';
      add(new E.PlayCardAction(p.id, index, { player: E.PlayerType.BOTTOM_PLAYER, slot: t.slot, index: t.index }), source, group, group, kind, target);
    }
  });
  const attacks = [...(p.active.getPokemonCard()?.attacks || [])];
  try {
    const probe = new E.Store({onStateChange(){},gameSettings:state.gameSettings});
    probe.state = E.deepClone(Object.assign(new E.State(),state,{logs:[],prompts:[]}));
    const check = new E.CheckPokemonAttacksEffect(probe.state.players.find((x:any)=>x.id===playerId));
    probe.reduceEffect(probe.state,check);
    for(const attack of check.attacks)if(!attacks.some(a=>a.name===attack.name))attacks.push(attack);
  } catch { /* Engine may suppress extra attacks. Ordinary candidates still probe below. */ }
  for (const a of attacks) add(new E.AttackAction(p.id, a.name), 'active', a.name, 'Attack', 'attack', undefined, a.damage);
  const stadium = E.StateUtils.getStadiumCard(state);
  if(stadium && typeof stadium.useStadium === 'function') add(new E.UseStadiumAction(p.id),'stadium',`Use ${stadium.name}`,'Use Stadium','ability');
  for (const t of targets) {
    let powers=t.list.getPokemonCard()?.powers || [];
    if(t.list.tools.length && t.list.getPokemonCard())try{
      const probe=new E.Store({onStateChange(){},gameSettings:state.gameSettings});probe.state=E.deepClone(Object.assign(new E.State(),state,{logs:[],prompts:[]}));
      const actor=probe.state.players.find((x:any)=>x.id===playerId), list=t.slot===E.SlotType.ACTIVE?actor.active:actor.bench[t.index];
      const check=new E.CheckPokemonPowersEffect(actor,list.getPokemonCard());probe.reduceEffect(probe.state,check);powers=check.powers;
    }catch{powers=[];}
    for (const power of powers) if (power.useWhenInPlay) add(new E.UseAbilityAction(p.id, power.name, { player: E.PlayerType.BOTTOM_PLAYER, slot: t.slot, index: t.index }), t.slot === E.SlotType.ACTIVE ? 'active' : `bench:${t.index}`, power.name, 'Use Ability', 'ability');
  }
  p.bench.forEach((b: any, index: number) => { if (b.cards.length) add(new E.RetreatAction(p.id, index), 'active', 'Retreat', 'Retreat', 'retreat', `Bench ${index + 1} · ${b.getPokemonCard().name}`); });
  add(new E.PassTurnAction(p.id), 'turn', 'End turn', 'End turn', 'end');
  const offers: Offer[] = [];
  for (const candidate of candidates) {
    try {
      const probe = new E.Store({ onStateChange() {}, gameSettings: state.gameSettings });
      // Unlike upstream Simulator, do not share mutable Card instances with live state.
      // Resolved prompts retain old object graphs; neither history nor log text
      // participates in rules. Exclude them from speculative clones.
      probe.state = E.deepClone(Object.assign(new E.State(), state, { logs: [], prompts: [] }));
      if (candidate.action instanceof E.AttackAction) {
        const actor = probe.state.players.find((x: any)=>x.id===playerId);
        const attacks = new E.CheckPokemonAttacksEffect(actor);
        probe.reduceEffect(probe.state,attacks);
        const attack = [...(actor.active.getPokemonCard()?.attacks || []), ...attacks.attacks].find((a: any)=>a.name===candidate.action.name);
        if (!attack) continue;
        const cost = new E.CheckAttackCostEffect(actor,attack);
        const energy = new E.CheckProvidedEnergyEffect(actor);
        probe.reduceEffect(probe.state,cost); probe.reduceEffect(probe.state,energy);
        // Status coin prompts can suspend dispatch before its Energy check.
        if (!E.StateUtils.checkEnoughEnergy(energy.energyMap,cost.cost)) continue;
      }
      probe.dispatch(candidate.action);
      // Power validation runs after an animation acknowledgement upstream.
      // Drain only these acknowledgements, never a player's choice or a coin flip.
      for (let n=0;n<20;n++) {
        const wait = probe.state.prompts.find((p:any)=>p instanceof E.WaitPrompt && p.result===undefined);
        if (!wait) break;
        probe.dispatch(new E.ResolvePromptAction(wait.id,null));
        if (n===19) throw Error('Probe exceeded animation acknowledgement limit');
      }
      const action = candidate.action;
      const location = action instanceof E.RetreatAction ? { slot: E.SlotType.BENCH, index: action.benchIndex } : action.target;
      if (candidate.view.target && location && [E.SlotType.ACTIVE, E.SlotType.BENCH].includes(location.slot)) candidate.view.boardTarget = { playerId: location.player===E.PlayerType.TOP_PLAYER?state.players.find((x:any)=>x.id!==playerId).id:playerId, slot: location.slot === E.SlotType.ACTIVE ? 'active' : 'bench', index: location.index };
      offers.push({ action: candidate.action, view: { ...candidate.view, id: String(offers.length) } });
    } catch { /* Not an engine-legal candidate. */ }
  }
  return offers;
}
