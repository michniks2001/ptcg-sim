import { it,expect,vi,afterEach } from 'vitest';
import { E } from '../server/engine';
import { fixture } from './fixtures';
import { rulesProfiles } from '../shared/formats';
afterEach(()=>vi.restoreAllMocks());
let id=200000;
const card=(name:string)=>{const c=E.CardManager.getInstance().getCardByName(name);if(!c)throw Error(name);c.id=id++;return c;};
for(const [name,profile] of Object.entries(rulesProfiles)) {
 it(`${name}: real first-turn attack, Item and Supporter behavior`,()=>{
  const m=fixture('interactions'),p=m.state.players[0];m.state.rules=new E.Rules(profile);m.state.turn=1;
  p.active.cards=[card('Hitmonchan BS'),card('Fighting Energy BS')];
  p.hand.cards=[card('Bill BS'),card("Professor's Research BRS")];(m as any).changed();
  const actions=m.view().actions;expect(actions.some(a=>a.kind==='attack')).toBe(profile.attackFirstTurn);
  expect(actions.some(a=>a.label==='Play Bill')).toBe(profile.firstTurnUseTrainer!==false);
  expect(actions.some(a=>a.label.includes('Research'))).toBe(profile.firstTurnUseSupporter && profile.firstTurnUseTrainer!==false);
  if(profile.firstTurnUseSupporter && profile.firstTurnUseTrainer!==false){
   const action=actions.find(a=>a.label.includes('Research'))!;m.act(1,m.revision,action.id);expect(p.supporterTurn).toBe(1);
   p.hand.cards.push(card("Professor's Research BRS"));(m as any).changed();expect(m.view().actions.some(a=>a.label.includes('Research'))).toBe(false);
  }
 });
 it(`${name}: real opening draw behavior through the turn reducer`,()=>{
  const m=fixture('interactions'),p=m.state.players[0];m.state.rules=new E.Rules(profile);m.state.turn=0;m.state.activePlayer=1;(m as any).changed();
  const before=p.hand.cards.length;const end=m.offers(2).find(o=>o.view.kind==='end')!;m.act(2,m.revision,end.view.id);
  expect(m.state.turn).toBe(1);expect(p.hand.cards.length-before).toBe(profile.firstTurnDrawCard?1:0);
 });
}
it('permits historical repeated/same-name Stadium replacement and rejects it under modern rules',()=>{
 for(const historical of [true,false]){
  const m=fixture('interactions'),p=m.state.players[0];m.state.rules=new E.Rules(historical?rulesProfiles['wotc-1999']:rulesProfiles['modern-2020']);
  p.hand.cards=[card('Artazon PAL'),card('Artazon PAL')];(m as any).changed();const a=m.view().actions.find(a=>a.label.includes('Artazon'))!;expect(a).toBeTruthy();m.act(1,m.revision,a.id);
  expect(m.view().actions.some(a=>a.label.includes('Artazon'))).toBe(historical);if(historical){m.act(1,m.revision,m.view().actions.find(a=>a.label.includes('Artazon'))!.id);expect(p.discard.cards.some((c:any)=>c.name==='Artazon')).toBe(true);}
 }
});
it('resolves pre-Sun & Moon Burn without modern recovery or automatic damage on heads',()=>{
 for(const legacyBurn of [true,false]){
  const m=fixture('interactions'),p=m.state.players[0];m.state.rules=new E.Rules({legacyBurn});p.active.specialConditions=[E.SpecialCondition.BURNED];vi.spyOn(Math,'random').mockReturnValue(0);(m as any).changed();
  m.act(1,m.revision,m.view().actions.find(a=>a.kind==='end')!.id);
  expect(p.active.damage).toBe(legacyBurn?0:20);expect(p.active.specialConditions.includes(E.SpecialCondition.BURNED)).toBe(legacyBurn);vi.restoreAllMocks();
 }
});
