import { useState } from 'react';
import type { CardView, MulliganView, PromptView } from '../shared/protocol';
import { Card } from './Card';
import { CardPreview, GameDialog, Status, type Feedback } from './dialogs';
import './mulligans.css';

function RevealedHands({ hands, inspect }: { hands: MulliganView; inspect: (card: CardView) => void }) {
  return <div className="mulligan-hands">{(['opponent','own'] as const).map(side => hands[side].length > 0 && <section key={side} aria-label={side === 'own' ? 'Your mulligans' : 'Opponent mulligans'}>
    <h3>{side === 'own' ? 'Your mulligans' : 'Opponent mulligans'}</h3>
    <p className="muted">No eligible Basic Pokémon. These hands were shuffled back and redrawn.</p>
    {hands[side].map((hand,index) => <section className="mulligan-hand" key={index} aria-label={`${side === 'own' ? 'Your' : 'Opponent'} Mulligan ${index+1}`}>
      <h4>Mulligan {index+1}</h4><div className="mulligan-cards">{hand.map((card,i) => <Card key={`${card.id}:${i}`} card={card} onClick={()=>inspect(card)}/>)}</div>
    </section>)}
  </section>)}</div>;
}

export function MulliganDialog({ hands, prompt, submit, close, ...feedback }: Feedback & { hands: MulliganView; prompt?: PromptView; submit?: (keys: string[])=>void; close?: ()=>void }) {
  const draw = prompt?.mulliganDraw;
  const options = [...(draw?.options || [])].sort((a,b)=>a.count-b.count);
  const [key,setKey] = useState(draw?.defaultKey || '');
  const [inspected,setInspected] = useState<CardView>();
  const index = options.findIndex(option=>option.key===key);
  const choice = options[index];
  const disabled = feedback.busy || !feedback.connected;
  const count = hands.opponent.length;
  return <><GameDialog title={draw ? 'Opponent Mulligans' : 'Mulligan hands'} eyebrow="MATCH SETUP" close={draw ? undefined : close} footer={draw && <div className="mulligan-draw">
    <p>Opponent mulliganed <strong>{count} {count===1?'time':'times'}</strong>.{hands.own.length>0 && <> You mulliganed <strong>{hands.own.length} {hands.own.length===1?'time':'times'}</strong>.</>}</p>
    <div className="mulligan-draw-controls"><label htmlFor={`draw-${prompt!.id}`}>Additional cards to draw:</label><div className="mulligan-quantity">
      <button aria-label="Draw one fewer card" disabled={disabled || index<=0} onClick={()=>setKey(options[index-1].key)}>−</button>
      <select id={`draw-${prompt!.id}`} value={key} disabled={disabled} onChange={event=>setKey(event.target.value)}>{options.map(option=><option key={option.key} value={option.key}>{option.count}</option>)}</select>
      <button aria-label="Draw one more card" disabled={disabled || index<0 || index>=options.length-1} onClick={()=>setKey(options[index+1].key)}>+</button>
    </div><button className="primary" disabled={disabled || !choice} onClick={()=>choice && submit?.([choice.key])}>{choice?.count===0?'Continue Without Drawing':`Draw ${choice?.count ?? 0} ${choice?.count===1?'Card':'Cards'}`}</button></div>
    <Status {...feedback}/>
  </div>}>
    <RevealedHands hands={hands} inspect={setInspected}/>
  </GameDialog>{inspected && <GameDialog title={inspected.name} eyebrow="REVEALED MULLIGAN CARD" close={()=>setInspected(undefined)}><div className="mulligan-inspection"><CardPreview card={inspected}/></div></GameDialog>}</>;
}
