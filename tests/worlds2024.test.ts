import { it,expect,vi } from 'vitest';
import { E } from '../server/engine';
import { engineDeck,type OpponentId } from '../server/format';
import { Match } from '../server/match';
import { historicalDeck,historicalDeckLists } from '../shared/historical-decks';
import { chooseAdvancedAction,chooseAdvancedPrompt } from '../server/bot';
import { decodeSelection,promptSpec } from '../server/prompts';
import { writeFileSync } from 'node:fs';
it('validates the three distinct 2024 tournament lists without card-count substitutions',()=>{
 for(const d of historicalDeckLists)expect(engineDeck(historicalDeck(d.id))).toHaveLength(60);
});
it('completes representative 2024 games with actual engine setup, prompts, attacks and prizes',()=>{
 const results=[];
 try{for(const [index,list]of historicalDeckLists.entries()){
  let seed=901+index;vi.spyOn(Math,'random').mockImplementation(()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;});
  const m=new Match({formatId:'worlds-2024',deck:historicalDeck('iron-thorns-2024'),opponent:list.id as OpponentId});let decisions=0,lastTurn=-1,attacks=0;const used=new Map<string,number>();
  while(m.state.phase!==E.GamePhase.FINISHED&&decisions++<1600){
   expect(m.fault,`${list.id} turn ${m.state.turn}: ${m.diagnostics.slice(-5)}`).toBeUndefined();
   if(m.state.turn!==lastTurn){lastTurn=m.state.turn;used.clear();}
   if(m.pending(1)){
    const p=m.pending(1),v=m.view(),spec=promptSpec(p,m.state).view;let keys=chooseAdvancedPrompt(spec,v.players[0],v.players[1]);
    if(spec.type==='Choose energy')for(let mask=0;mask<2**Math.min(12,spec.choices.length);mask++){const candidate=spec.choices.filter((_,i)=>mask&(1<<i)).map(c=>c.key);try{decodeSelection(p,m.state,candidate);keys=candidate;break;}catch{}}
    m.resolve(1,m.revision,p.id,keys);
   }else if(!m.botStep()){
    const v=m.view(),a=chooseAdvancedAction(v.actions,v.players[0],v.players[1],used);expect(a,`${m.fault} ${m.diagnostics.slice(-5)}`).toBeTruthy();
    if(a!.kind==='attack')attacks++;const signature=`${a!.source}:${a!.label}:${a!.target||''}`;used.set(signature,(used.get(signature)||0)+1);m.act(1,m.revision,a!.id);
   }
   expect(m.view().players[1].hand).toEqual([]);
  }
  expect(m.fault).toBeUndefined();expect(m.state.phase).toBe(E.GamePhase.FINISHED);results.push({opponent:list.id,turns:m.state.turn,decisions,attacks,winner:m.state.winner});vi.restoreAllMocks();
 }}finally{vi.restoreAllMocks();}
 writeFileSync('/tmp/ptcg-m5-worlds2024-games.json',JSON.stringify(results,null,2));console.log('2024 complete games',JSON.stringify(results));
},240000);
