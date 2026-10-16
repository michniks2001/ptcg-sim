import { it,expect,vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { Match } from '../server/match';
import { E } from '../server/engine';
import { chooseAdvancedAction,chooseAdvancedPrompt } from '../server/bot';
import { decodeSelection,promptSpec } from '../server/prompts';
import { examples } from '../shared/decks';
it('completes games against all three Base–Fossil archetypes and the modern laboratory profile',()=>{
 const results=[];
 try {
  for(const [index,opponent]of (['haymaker','rain-dance','wigglytuff'] as const).entries()) {
   let seed=73+index;vi.spyOn(Math,'random').mockImplementation(()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;});
   for(const formatId of ['base-fossil-1999','engine-sandbox']){
    const m=new Match({formatId,deck:{...examples[2],formatId},opponent});let decisions=0,lastTurn=-1;const used=new Map<string,number>();
    while(m.state.phase!==E.GamePhase.FINISHED&&decisions++<1800){
     expect(m.fault).toBeUndefined();if(lastTurn!==m.state.turn){lastTurn=m.state.turn;used.clear();}
     const pending=m.pending(1);
     if(pending){
      const v=m.view(),p=promptSpec(pending,m.state).view;let keys=chooseAdvancedPrompt(p,v.players[0],v.players[1]);
      if(p.type==='Choose energy'){
       let found=false;
       for(let mask=0;mask<2**Math.min(p.choices.length,12);mask++){const candidate=p.choices.filter((_,i)=>mask&(1<<i)).map(c=>c.key);try{decodeSelection(pending,m.state,candidate);keys=candidate;found=true;break;}catch{}}
       expect(found).toBe(true);
      }
      m.resolve(1,m.revision,p.id,keys);
     }else if(!m.botStep()){
      const v=m.view(),a=chooseAdvancedAction(v.actions,v.players[0],v.players[1],used);expect(a).toBeTruthy();
      const signature=`${a!.source}:${a!.label}:${a!.target||''}`;used.set(signature,(used.get(signature)||0)+1);m.act(1,m.revision,a!.id);
     }
     expect(m.view().players[1].hand).toEqual([]);
    }
    expect(m.fault).toBeUndefined();expect(m.state.phase).toBe(E.GamePhase.FINISHED);
    results.push({formatId,opponent,turn:m.state.turn,decisions,winner:m.state.winner});
   }
   vi.restoreAllMocks();
  }
 }finally{vi.restoreAllMocks();}
 writeFileSync('/tmp/ptcg-m5-ai-games.json',JSON.stringify(results,null,2));console.log('Milestone 5 complete games',JSON.stringify(results));
},180000);
