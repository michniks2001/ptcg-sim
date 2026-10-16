import { describe,it,expect } from 'vitest';
import { fixture } from './fixtures';
import { E } from '../server/engine';
import type { Match } from '../server/match';
function activate(m:Match,label:string){const a=m.view().actions.find(a=>a.label===label)!;expect(a).toBeTruthy();m.act(1,m.revision,a.id);}
function choose(m:Match,index=0){const p=m.view().prompt!;m.resolve(1,m.revision,p.id,[p.choices[index].key]);}
describe('persistent authoritative Ability sessions',()=>{
 it('moves damage repeatedly, changes direction, exits and reactivates without ending the turn',()=>{
   const m=fixture('damage-swap');activate(m,'Damage Swap');choose(m);
   expect(m.view().abilitySession?.label).toBe('Damage Swap');
   expect(m.state.players[0].active.damage).toBe(10);
   const p=m.view().prompt!;const reverse=p.choices.find(c=>c.fromTarget?.slot==='bench')!;
   m.resolve(1,m.revision,p.id,[reverse.key]);expect(m.state.players[0].active.damage).toBe(20);
   const turn=m.state.turn;m.finishAbility(1,m.revision);expect(m.view().abilitySession).toBeUndefined();expect(m.pending(1)).toBeUndefined();expect(m.state.turn).toBe(turn);
   activate(m,'Damage Swap');expect(m.view().abilitySession).toBeTruthy();
 });
 it('bulk moves through separate engine activations and stops before a KO',()=>{
   const m=fixture('damage-swap');const p=m.state.players[0];p.active.damage=70;(m as any).changed();activate(m,'Damage Swap');
   const v=m.view();const choice=v.prompt!.choices.find(c=>c.fromTarget?.slot==='active')!;
   m.moveCounters(1,v.revision,v.prompt!.id,choice.key,8);
   expect(p.active.damage).toBe(50);expect(p.bench[0].damage).toBe(20);expect(m.view().abilitySession?.message).toContain('2 of 8');expect(m.fault).toBeUndefined();
   expect(()=>m.moveCounters(1,v.revision,v.prompt!.id,choice.key,1)).toThrow('table changed');
 });
 it('rejects hostile bulk requests, wrong ownership and duplicate revisions',()=>{
   const m=fixture('damage-swap');activate(m,'Damage Swap');const v=m.view();
   for(const n of [0,-1,1.5,101,NaN])expect(()=>m.moveCounters(1,v.revision,v.prompt!.id,'0',n)).toThrow();
   expect(()=>m.finishAbility(2,m.revision)).toThrow();choose(m);expect(()=>m.resolve(1,v.revision,v.prompt!.id,['0'])).toThrow();
 });
 it('attaches repeatedly with Rain Dance, preserves normal attachment allowance and exits when exhausted',()=>{
   const m=fixture('rain-dance');activate(m,'Rain Dance');const turn=m.state.turn;
   for(let n=1;n<=3;n++){choose(m);expect(m.state.players[0].active.cards.filter((c:any)=>c.name==='Water Energy')).toHaveLength(n);expect(m.state.players[0].energyPlayedTurn).toBe(-1);}
   expect(m.view().abilitySession).toBeTruthy();m.finishAbility(1,m.revision);expect(m.state.turn).toBe(turn);expect(m.view().actions.some(a=>a.kind==='energy')).toBe(true);
 });
 it('moves actual Energy identities repeatedly and rejects stale source selections',()=>{
   const m=fixture('energy-trans');const ids=m.state.players[0].active.cards.slice(1).map((c:any)=>c.id);activate(m,'Energy Trans');
   const first=m.view();choose(m);expect(m.state.players[0].bench[0].cards[1].id).toBe(ids[0]);
   expect(()=>m.resolve(1,first.revision,first.prompt!.id,['0'])).toThrow('table changed');
   const v=m.view();const c=v.prompt!.choices.find(c=>c.fromTarget?.slot==='active')!;m.resolve(1,m.revision,v.prompt!.id,[c.key]);
   expect(m.state.players[0].bench[0].cards.slice(1).map((c:any)=>c.id)).toEqual(ids);m.finishAbility(1,m.revision);
 });
 it('never creates a session for a restricted Power and rejects disabled Powers',()=>{
   const m=fixture('damage-swap');m.state.players[0].active.specialConditions=[E.SpecialCondition.ASLEEP];(m as any).changed();expect(m.view().actions.some(a=>a.label==='Damage Swap')).toBe(false);
   expect(m.view().abilitySession).toBeUndefined();
 });
 it('does not bypass a mandatory interruption with Done',()=>{
   const m=fixture('damage-swap');activate(m,'Damage Swap');const p=m.pending(1);m.resolve(1,m.revision,p.id,null);activate(m,'Damage Swap');
   m.state.prompts=[];m.store.prompt(m.state,new E.ConfirmPrompt(1,'MANDATORY_TEST'),()=>{});(m as any).changed();
   expect(()=>m.finishAbility(1,m.revision)).toThrow('mandatory');expect(m.pending(1)).toBeTruthy();
 });
 for(const [name,label]of [['ice-dance','Ice Dance'],['super-cold','Super Cold'],['excited-turbo','Excited Turbo']])it(`reuses sessions with the real ${label} restrictions`,()=>{
   const m=fixture(name);activate(m,label);
   let p=m.view().prompt!;
   expect(p.choices.length).toBeGreaterThan(0);expect(p.choices.every(c=>c.card?.name===(name==='excited-turbo'?'Fire Energy':'Water Energy'))).toBe(true);
   if(name!=='super-cold')expect(p.choices.every(c=>c.boardTarget?.slot==='bench'&&c.boardTarget?.index!==1)).toBe(true);
   const destination=p.choices.find(c=>c.boardTarget?.slot==='bench'&&c.boardTarget.index===0)!;
   m.resolve(1,m.revision,p.id,[destination.key]);expect(m.view().abilitySession?.label).toBe(label);
   if(name!=='ice-dance'){expect(m.pending(1)).toBeUndefined();m.continueAbility(1,m.revision);}
   p=m.view().prompt!;m.resolve(1,m.revision,p.id,[p.choices.find(c=>c.boardTarget?.slot==='bench'&&c.boardTarget.index===0)!.key]);
   expect(m.state.players[0].bench[0].cards.filter((c:any)=>c instanceof E.EnergyCard)).toHaveLength(2);m.finishAbility(1,m.revision);expect(m.view().abilitySession).toBeUndefined();
 });
 it('emits one Ability callout per session and preserves attachment feedback',()=>{
   const m=fixture('rain-dance');activate(m,'Rain Dance');choose(m);choose(m);choose(m);
   expect(m.view().events?.filter(e=>e.kind==='ability'&&e.text.includes('Rain Dance'))).toHaveLength(1);
   expect(m.view().events?.filter(e=>e.kind==='attachment')).toHaveLength(3);
 });
 it('uses printed pre-2002 Poison restrictions for the three original repeatable Powers',()=>{
  for(const [name,label]of [['damage-swap','Damage Swap'],['rain-dance','Rain Dance'],['energy-trans','Energy Trans']])for(const historical of [true,false]){
   const m=fixture(name);m.state.rules.pre2002PowerConditions=historical;m.state.players[0].active.specialConditions=[E.SpecialCondition.POISONED];(m as any).changed();
   expect(m.view().actions.some(a=>a.label===label),`${label} historical=${historical}`).toBe(historical);
  }
 });
});
