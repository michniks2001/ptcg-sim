import { attachments, cardView } from './views';
import type { BoardTarget, CardView, GameplayEvent } from '../shared/protocol';
type EventInput=Omit<GameplayEvent,'id'>;
function publicAttachments(state:any) {
  const result=new Map<string,{card:any;pokemon:any;target:BoardTarget}>();
  for(const p of state.players) [p.active,...p.bench].forEach((list:any,i:number)=>{
    if(list.isSecret || !list.getPokemonCard())return;
    for(const attachment of attachments(list))result.set(`${list.getPokemonCard().id}:${attachment.card.id}`,{card:attachment.card,pokemon:list.getPokemonCard(),target:{playerId:p.id,slot:i===0?'active':'bench',index:i===0?0:i-1}});
  });
  return result;
}
// Observes the live adapter Store only. Speculative action/effect probes never use
// this wrapper. Failed dispatches publish nothing; all randomness stays in Arbiter.
export class GameplayEvents {
  private sequence=0;
  private playedTrainers = new Map<number,CardView>();
  private recent:GameplayEvent[]=[];
  private pending:EventInput[]=[];
  constructor(private store:any) {
    const log=store.log.bind(store);
    store.log=(state:any,message:string,params:any={},client=0)=>{
      log(state,message,params,client);
      if(client)return;
      const actor=state.players.find((p:any)=>p.name===params.name);
      if(message==='LOG_PLAYER_FLIPS_HEADS'||message==='LOG_PLAYER_FLIPS_TAILS'){
        const result=message==='LOG_PLAYER_FLIPS_HEADS'?'Heads':'Tails';
        this.pending.push({kind:'coin',text:`${params.name} · ${result}`,result});
      }else if(message==='LOG_PLAYER_USES_ATTACK'){
        const card=actor?.active.getPokemonCard();
        this.pending.push({kind:'attack',text:`${card?.name||params.name} used ${params.attack}!`,card:card?cardView(card):undefined,target:actor?{playerId:actor.id,slot:'active',index:0}:undefined});
      }else if(message==='LOG_PLAYER_PLAYS_ITEM'){
        const card=this.playedTrainers.get(actor?.id);
        this.pending.push({kind:'trainer',text:`${params.card} — Trainer played`,card:card?.name===params.card?card:undefined});
      }
    };
  }
  dispatch(action:any) {
    const before=publicAttachments(this.store.state);this.pending=[];
    const previousTrainer=this.playedTrainers.get(action.id);
    if(action.type==='PLAY_CARD_ACTION'){
      const card=this.store.state.players.find((p:any)=>p.id===action.id)?.hand.cards[action.handIndex];
      if(card && cardView(card).kind==='trainer')this.playedTrainers.set(action.id,cardView(card));
    }
    try{
      this.store.dispatch(action);
      for(const [key,entry] of publicAttachments(this.store.state)) if(!before.has(key)){
        // Evolution changes the top Pokémon identity but is not an attachment.
        const alreadyAttached=[...before.values()].some(b=>b.card.id===entry.card.id&&b.target.playerId===entry.target.playerId&&b.target.slot===entry.target.slot&&b.target.index===entry.target.index);
        if(!alreadyAttached)this.pending.push({kind:'attachment',text:`${entry.card.name} attached to ${entry.pokemon.name}`,card:entry.card,target:entry.target});
      }
      this.recent.push(...this.pending.map(e=>({...e,id:++this.sequence})));
      this.recent=this.recent.slice(-256);
    } catch(error){
      if(action.type==='PLAY_CARD_ACTION'){if(previousTrainer)this.playedTrainers.set(action.id,previousTrainer);else this.playedTrainers.delete(action.id);}
      throw error;
    } finally {this.pending=[];}
  }
  view(){return this.recent;}
}
