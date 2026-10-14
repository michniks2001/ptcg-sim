import { E } from './engine';
import type { EffectView, PlayerView } from '../shared/protocol';
// Display projections only. Presence/lifetime comes from the live engine state.
export function pokemonEffects(list: any): EffectView[] {
  const card=list.getPokemonCard(); if(!card)return [];
  const result:EffectView[]=[];
  const add=(id:string,name:string,description:string,duration?:string,source='Source not recorded by engine')=>result.push({id,name,description,duration,source,scope:card.name});
  const until='Through this Pokémon’s next turn. Switching or evolution removes this effect.';
  if(list.coinFlipCancelAttackNextTurn) add('attack-flip','Attack coin check',`Must flip ${list.coinFlipCancelAttackNextTurn} coin(s) to attack; any tails makes the attack do nothing.`,until);
  if(list.attackDamageReductionNextTurn) add('attack-reduction','Reduced attack damage',`Attacks do ${list.attackDamageReductionNextTurn} less damage before Weakness and Resistance.`,until);
  if(list.damageReductionNextTurn && !list.damageReductionNextTurnFilter) add('protection','Damage reduction',`Attack damage received is reduced by ${list.damageReductionNextTurn}.`,"Through the opponent’s next turn. Switching or evolution removes this effect.");
  for(const [field,name,description] of [
    ['cannotAttackNextTurn','Cannot attack','This Pokémon cannot attack.'],
    ['cannotRetreatNextTurn','Cannot retreat','This Pokémon cannot retreat.'],
    ['cannotEvolveNextTurn','Cannot evolve','Evolution from hand is blocked.'],
    ['cannotAttachEnergyFromHandNextTurn','Energy attachment blocked','Energy cannot be attached from hand.'],
    ['noAbilities','Powers suppressed','This Pokémon’s powers are disabled.'],
  ]) if(list[field])add(field,name,description,until);
  const filterText=(filter:any)=>filter?.maxDamage!==undefined?` when damage is ${filter.maxDamage} or less after Weakness and Resistance`:'';
  for(const [field,name,text] of [['preventDamageNextTurn','Damage protection','Prevents attack damage'],['preventEffectsOfAttacksNextTurn','Attack effect protection','Prevents effects of attacks (damage is separate)']]) {
    const filter=list[field]??list[`${field}Pending`];
    // Complex future filters require an audited description, never imply universal protection.
    if(filter && Object.keys(filter).every(k=>k==='maxDamage'))add(field,name,text+filterText(filter)+'.',list[field]?'Through the opponent’s turn; switching or evolution clears it.':'Armed for the opponent’s next turn; switching or evolution clears it.');
  }
  const boost=list.nextTurnAttackBaseDamage || list.nextTurnAttackBaseDamagePending;
  if(boost)add('base-damage',boost.setupAttackName,`${boost.attackName} has base damage ${boost.baseDamage} during the owner’s next turn.`,until,boost.sourceCardName);
  if(card.cannotUseAttackUntilLeavesPlay)add('once-in-play','Attack already used',`${card.cannotUseAttackUntilLeavesPlay} cannot be used again while this Pokémon stays in play, including on the Bench.`,'Until this Pokémon leaves play.',card.name);
  if(list.cannotUseAttacksNextTurn?.length)add('disabled-attacks','Attacks disabled',`${list.cannotUseAttacksNextTurn.join(', ')} cannot be used.`,until);
  if(list.blockedAttackNameNextTurn) add('blocked-attack','Attack blocked',`${list.blockedAttackNameNextTurn} cannot be used.`,until);
  for(const attached of list.cards) if(attached.name==='PlusPower')add(`plus:${attached.id}`,'PlusPower','Adds 10 damage to a damaging attack against the Defending Pokémon, after Weakness and Resistance.','Discarded at the end of the owner’s turn.',attached.name);
  // Defender's orphan marker is deliberately not advertised as protection.
  return result;
}

export function projectEffects(state:any, players:PlayerView[]): EffectView[] {
  if(state.phase===E.GamePhase.SETUP || state.phase===E.GamePhase.WAITING_FOR_PLAYERS)return [];
  for(const p of state.players) {const view=players.find(v=>v.id===p.id)!;[p.active,...p.bench].forEach((list:any,i:number)=>{const v=i?view.bench[i-1]:view.active;if(v.card)v.effects=pokemonEffects(list);});}
  const field:EffectView[]=[];
  for(const p of state.players){
    const locks=[['cannotPlayItemCards','Items'],['cannotPlaySupporterCards','Supporters'],['cannotPlayToolCards','Tools'],['cannotPlayStadiumCards','Stadiums'],['cannotPlayEnergyCards','Energy'],['cannotPlaySpecialEnergyCards','Special Energy'],['cannotPlayPokemonCards','Pokémon'],['cannotEvolvePokemonCards','Evolution cards']].filter(([flag])=>p[flag]).map(([,name])=>name);
    if(locks.length)field.push({id:`play-lock:${p.id}`,name:'Card play restriction',source:'Attack effect · source not recorded by engine',scope:`${p.name}’s side`,description:`Cannot play ${locks.join(', ')} from hand.`,duration:`Expires after ${p.playLocksTurnsRemaining} of this player’s end turns; switching does not remove it.`});

  }
  const candidates=state.players.flatMap((p:any)=>[p.active,...p.bench].map((list:any,i:number)=>({p,list,i,card:list.getPokemonCard()}))).filter((x:any)=>!x.list.isSecret && x.card && ['Toxic Gas','Prehistoric Power','Invisible Wall','Transparency','Strikes Back','Retreat Aid'].some(name=>x.card.powers?.some((power:any)=>power.name===name)));
  if(!candidates.length)return field;
  // Power checks can run card reducers. Probe an independent Store so reads never
  // change live cards, markers, prompts, randomness or turn state.
  const probe=new E.Store({onStateChange(){},gameSettings:state.gameSettings});
  probe.state=E.deepClone(Object.assign(new E.State(),state,{logs:[],prompts:[]}));
  for(const candidate of candidates){
    const owner=probe.state.players.find((p:any)=>p.id===candidate.p.id);
    const list=candidate.i===0?owner.active:owner.bench[candidate.i-1];
    const card=list.getPokemonCard();
    if(list.specialConditions.some((c:number)=>[E.SpecialCondition.ASLEEP,E.SpecialCondition.CONFUSED,E.SpecialCondition.PARALYZED].includes(c)))continue;
    for(const power of card.powers||[]){
      if(!['Toxic Gas','Prehistoric Power','Invisible Wall','Transparency','Strikes Back','Retreat Aid'].includes(power.name))continue;
      try { probe.reduceEffect(probe.state,new E.PowerEffect(owner,{name:power.name==='Toxic Gas'?'Toxic Gas':'test',powerType:E.PowerType.POKEMON_POWER,text:''},card)); } catch {continue;}
      const entry:EffectView={id:`power:${card.id}:${power.name}`,name:power.name,source:`${card.name} · ${owner.name}`,scope:card.name,description:power.text,duration:'While the source is in play and its Power is operational.'};
      if(power.name==='Transparency')entry.description='When an attack would deal positive damage to Haunter, flip a coin. Heads prevents that damage. Other attack-effect coverage is limited by the current card implementation.';
      const view=players.find(v=>v.id===owner.id)!;
      (candidate.i===0?view.active:view.bench[candidate.i-1]).effects!.push(entry);
      if(['Toxic Gas','Prehistoric Power','Retreat Aid'].includes(power.name)){
        const isGas=power.name==='Toxic Gas';
        entry.scope=power.name==='Retreat Aid'?`${owner.name}’s side`:'Both players · global restriction';
        // Dodrio's current reducer checks in-play presence, not Bench presence.
        if(power.name==='Retreat Aid')entry.description='The engine reduces this side’s Active Retreat Cost by one Colorless Energy while Dodrio is in play. Printed text specifies Benched Dodrio; this upstream discrepancy is retained.';
        field.push(entry);
        for(const affected of players) for(const pokemon of [affected.active,...affected.bench]){
          if(!pokemon.card||pokemon.card.id===card.id)continue;
          if(isGas&&pokemon.card.powers.some(p=>p.name!=='Toxic Gas'))pokemon.effects!.push({...entry,id:`suppressed:${card.id}`,name:'Pokémon Powers suppressed',scope:pokemon.card.name});
          if(power.name==='Prehistoric Power')pokemon.effects!.push({...entry,scope:pokemon.card.name});
        }
      }
    }
  }
  return field;
}
