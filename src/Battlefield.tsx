import { useLayoutEffect, useRef, type ReactNode } from 'react';
import type { BoardTarget, CardView, EffectView, PlayerView, PokemonView } from '../shared/protocol';
import { Card } from './Card';
import { targetKey } from './targeting';
// Reuse the printed Energy orbs from the locally cached Base Set artwork.
const energyArt: Record<string,number> = {FIGHTING:97,FIRE:98,GRASS:99,LIGHTNING:100,PSYCHIC:101,WATER:102};
function EnergySymbol({card}:{card:CardView}) {
  // Crop the main illustration, keeping each Special Energy as one attachment.
  if(card.energyKind==='special') {
    const crop=card.name==='Double Colorless Energy'?'58 94 136 136':'25 50 190 190';
    return <svg className="energy-symbol" viewBox={crop} aria-hidden="true"><image href={card.image} width="240" height="330"/></svg>;
  }
  const printing=energyArt[card.provides?.[0] || ''];
  return printing ? <svg className="energy-symbol" viewBox="64 170 114 114" aria-hidden="true"><image href={`/cards/base1/${printing}.png`} width="240" height="330"/></svg> : <img src={card.image} alt=""/>;
}
export type BoardInteraction = { active:boolean; eligible:string[]; selectedTargets:string[]; click:(t:BoardTarget)=>void; disabled:boolean; sourceCardIds?:number[]; selectSourceCard?:(id:number)=>void };
export function Pokemon({ pokemon, onClick, inspect, effects, target, interaction, label }: { pokemon: PokemonView; onClick: () => void; inspect:(c:CardView)=>void; effects:(title:string,e:EffectView[])=>void; target:BoardTarget; interaction:BoardInteraction; label: string }) {
  const eligible=interaction.eligible.includes(targetKey(target));
  const selected=interaction.selectedTargets.includes(targetKey(target));
  const rotation=pokemon.conditions.includes('ASLEEP')?-90:pokemon.conditions.includes('PARALYZED')?90:pokemon.conditions.includes('CONFUSED')?180:0;
  const attachments=pokemon.attachments || pokemon.energy.map(card=>({card,kind:card.energyKind==='special'?'special-energy':'basic-energy'}));
  return <div data-target={targetKey(target)} data-empty={!pokemon.card} className={`pokemon-slot ${Math.abs(rotation)===90?'turned':''} ${eligible?'legal-target':''} ${selected?'target-selected':''}`}>
    {pokemon.card ? <><div className="pokemon-art"><div className="card-orientation" data-rotation={rotation} style={{transform:`rotate(${rotation}deg)`}}><Card card={pokemon.card} onClick={()=>interaction.active?interaction.click(target):onClick()} disabled={interaction.active&&(!eligible||interaction.disabled)} describedBy={interaction.active?'target-instructions':undefined}/></div>{eligible && <span className="target-mark" aria-hidden="true">{selected?'✓':'◎'}</span>}</div>
    <div className="pokemon-stats"><span>{Math.max(0,(pokemon.card.hp||0)-pokemon.damage)}/{pokemon.card.hp} HP</span></div>
    {pokemon.damage>0 && <span className="damage" aria-label={`${pokemon.damage} damage`}>{pokemon.damage}</span>}
    <div className="pokemon-details"><div className="pokemon-markers">{pokemon.conditions.map(condition=><button key={condition} disabled={interaction.active} className={`status-counter ${condition.toLowerCase()}`} aria-label={`Inspect ${condition.toLowerCase()} condition on ${pokemon.card!.name}`} title={condition} onClick={()=>effects(pokemon.card!.name+' · Conditions',pokemon.conditionDetails||[])}>{condition==='POISONED'?'☠':condition==='BURNED'?'🔥':condition==='ASLEEP'?'Zz':condition==='PARALYZED'?'ϟ':'↻'}</button>)}
    {!!pokemon.effects?.length && <button className="effect-badge" disabled={interaction.active} aria-label={`Inspect effects on ${pokemon.card.name}`} onClick={()=>effects(pokemon.card!.name+' · Effects',pokemon.effects!)}>!</button>}</div>
    <div className="attachments" aria-label={`Cards attached to ${pokemon.card.name}`}>{attachments.map(({card,kind})=><button key={card.id} className={`attachment ${interaction.sourceCardIds?.includes(card.id)?'legal-source':''} ${kind} energy-${card.provides?.[0]?.toLowerCase()}`} disabled={interaction.disabled || (interaction.active && !interaction.sourceCardIds?.includes(card.id))} title={card.name} aria-label={`Inspect attached ${card.name}${kind==='tool'?' · Pokémon Tool':kind==='attachment'?' · attached card':''}`} onClick={()=>interaction.sourceCardIds?.includes(card.id)?interaction.selectSourceCard?.(card.id):inspect(card)}>{(kind==='basic-energy'||kind==='special-energy')?<EnergySymbol card={card}/>:<><img src={card.image} alt="" onError={e=>{e.currentTarget.hidden=true;}}/><span>{kind==='tool'?'Tool':card.name}</span></>}</button>)}</div></div>
    </> : <div className="pokemon-art"><div className={`empty-slot ${pokemon.hidden?'card-back':''}`}>{pokemon.hidden?'★':label}</div></div>}
  </div>;
}
export function Side({ player, opponent, select, openPile, effects, interaction }: { player:PlayerView; opponent:boolean; select:(c:CardView|undefined,source:string)=>void; openPile:(p:PlayerView)=>void; effects:(title:string,e:EffectView[])=>void; interaction:BoardInteraction }) {
  const pokemon=(p:PokemonView,index:number,slot:'active'|'bench')=><Pokemon key={index} pokemon={p} label={slot==='active'?'Active':String(index+1).padStart(2,'0')} target={{playerId:player.id,slot,index}} interaction={interaction} effects={effects} inspect={c=>select(c,'attachment')} onClick={()=>select(p.card,opponent?'opponent':slot==='active'?'active':`bench:${index}`)}/>;
  // Twinleaf appends cards to discard; only this public array supplies its top card.
  const topDiscard=player.discard.at(-1);
  return <section className={`side ${opponent?'opponent':'human'}`} aria-label={opponent?'Opponent battlefield':'Your battlefield'}>
    <div className="seat-label"><span>{opponent?'OPPONENT':'YOU'}</span><strong>{player.name}</strong>{opponent&&<span>{player.handCount} in hand</span>}</div>
    {!!(player.stadium?.length||player.lostZone?.length||player.usedGX||player.usedVSTAR)&&<details className="public-zones"><summary>Public zones{player.usedGX?' · GX used':''}{player.usedVSTAR?' · VSTAR used':''}</summary>{player.stadium?.map(c=><button key={c.id} disabled={interaction.active} onClick={()=>select(c,'stadium')}>Stadium · {c.name}</button>)}{!!player.lostZone?.length&&<div>Lost Zone · {player.lostZone.length}{player.lostZone.map(c=><button key={c.id} disabled={interaction.active} onClick={()=>select(c,'lost-zone')}>{c.name}</button>)}</div>}</details>}
    <div className="active-area"><span className="zone-label">ACTIVE</span>{pokemon(player.active,0,'active')}</div>
    <div className="bench-area"><span className="zone-label">BENCH</span><div className="bench">{player.bench.map((p,i)=>pokemon(p,i,'bench'))}</div></div>
    <div className="prize-area" role="group" aria-label={`${opponent?'Opponent':'Your'} Prizes: ${player.prizes} remaining`}>
      <span className="zone-label">PRIZES · {player.prizes}</span>
      <div className="prizes">{Array.from({length:6},(_,i)=><div key={i} className={`prize ${i<player.prizes?'card-back':'taken'}`} aria-hidden="true">{i<player.prizes?'✦':''}</div>)}</div>
    </div>
    <div className="pile-area">
      <div className="deck-zone"><div className="deck card-back" role="img" aria-label={`${opponent?'Opponent':'Your'} Deck: ${player.deckCount} cards`}><span aria-hidden="true">✦</span><b>{player.deckCount}</b></div><span className="zone-label">DECK</span></div>
      <button disabled={interaction.active} className="discard" aria-label={`${opponent?'Opponent':'Your'} Discard Pile: ${player.discard.length} cards, inspect`} onClick={()=>openPile(player)}>
        <span className={`discard-stack ${topDiscard?'occupied':''}`}>
          {topDiscard&&<img key={topDiscard.id} src={topDiscard.image} alt={topDiscard.name} onError={e=>{e.currentTarget.hidden=true;}}/>}
          <span className="discard-fallback">{topDiscard?.name || 'Empty'}</span><b>{player.discard.length}</b>
        </span><span className="zone-label">DISCARD ↗</span>
      </button>
    </div>
  </section>;
}

/** A single scroll surface preserves the same zone relationships on every screen. */
export function Playmat({children}:{children:ReactNode}) {
  const ref=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{
    const mat=ref.current!;
    let width=-1;
    const center=()=>{
      if(width===mat.clientWidth)return;
      width=mat.clientWidth;
      mat.scrollLeft=Math.max(0,(mat.scrollWidth-mat.clientWidth)/2);
    };
    center();
    const observer=new ResizeObserver(center);observer.observe(mat);
    return()=>observer.disconnect();
  },[]);
  return <div ref={ref} className="playmat" role="region" aria-label="Playmat, scroll to explore all game zones" tabIndex={0}><div className="table-surface">{children}</div></div>;
}
