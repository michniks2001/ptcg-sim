import type { GameplayEvent } from '../shared/protocol';
type FeedbackEvent=GameplayEvent & { attachmentCount?:number };
export function enqueueFeedback(current:GameplayEvent[],fresh:GameplayEvent[]):GameplayEvent[] {
 const result:FeedbackEvent[]=[...current];
 for(const event of fresh){
  const last=result.at(-1);
  if(event.kind==='attachment' && last?.kind==='attachment' && event.target?.playerId===last.target?.playerId){
   const count=(last.attachmentCount||1)+1;result.pop();result.push({...event,attachmentCount:count,text:`${count} attachment changes · ${event.text}`});
  }else result.push(event);
 }
 return result.slice(-256);
}
