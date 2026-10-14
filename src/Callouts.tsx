import { useEffect, useRef, useState } from 'react';
import type { GameplayEvent } from '../shared/protocol';
// A burst is presented together in engine order. New batches wait briefly, but
// rendering never delays a snapshot, a decision or the AI scheduler.
export function Callouts({events,onDone}:{events:GameplayEvent[];onDone:(ids:number[])=>void}) {
  const overlay=useRef<HTMLDivElement>(null);
  const [batch,setBatch]=useState<GameplayEvent[]>([]);
  useEffect(()=>{if(!events.length&&batch.length){setBatch([]);return;}if(!batch.length&&events.length)setBatch(events.slice(0,Math.max(1,Math.ceil(events.length/3))));},[events,batch]);
  useEffect(()=>{if(!batch.length)return;const timer=setTimeout(()=>{onDone(batch.map(e=>e.id));setBatch([]);},1800);return()=>clearTimeout(timer);},[batch,onDone]);
  useEffect(()=>{
    const node=overlay.current;if(!node||!batch.length)return;
    const show=()=>{if(node.isConnected){if(node.matches(':popover-open'))node.hidePopover();node.showPopover();}};
    show();
    // Native mandatory dialogs enter the top layer. Keep this noninteractive
    // feedback above them without making the battlefield inert or stealing focus.
    const observer=new MutationObserver(show);observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
    return()=>{observer.disconnect();if(node.matches(':popover-open'))node.hidePopover();};
  },[batch]);
  if(!batch.length)return null;
  return <div ref={overlay} popover="manual" className="game-callouts" role="status" aria-live="polite" aria-atomic="true" aria-label="Gameplay feedback">{batch.map(e=><div key={e.id} className={`game-callout ${e.kind}`} data-event-id={e.id}>{e.card&&<img src={e.card.image} alt="" onError={event=>{event.currentTarget.hidden=true;}}/>}{e.kind==='coin'&&<span className="flip-coin" aria-hidden="true">{e.result==='Heads'?'H':'T'}</span>}<span>{e.text}</span></div>)}</div>;
}
