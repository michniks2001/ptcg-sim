import { afterEach, describe, expect, it, vi } from 'vitest';
import { fixture } from './fixtures';
import { E } from '../server/engine';
import type { Match } from '../server/match';

const refresh=(m:Match)=>(m as any).changed();
function retreat(m:Match) {
  const offer=m.view().actions.find(a=>a.kind==='retreat');expect(offer).toBeTruthy();
  m.act(1,m.revision,offer!.id);
}
function pay(m:Match,names:string[]) {
  const p=m.view().prompt!;
  m.resolve(1,m.revision,p.id,names.map(name=>p.choices.find(c=>c.card?.name===name)!.key));
}
afterEach(()=>vi.restoreAllMocks());

describe('historical retreat Energy choices',()=>{
  it.each(['retreat-identical','retreat-exact'])('waits for the player to choose an actual attached card: %s',name=>{
    const m=fixture(name);const [p]=m.state.players;const original=[...p.active.cards];
    retreat(m);const view=m.view().prompt!;
    expect(view.type).toBe('Choose energy');expect(view.paymentInOrder).toBe(true);expect(view.payment).toEqual(['COLORLESS']);
    expect(p.active.cards).toEqual(original);expect(p.discard.cards).toEqual([]);
    const chosen=view.choices.at(-1)!;m.resolve(1,m.revision,view.id,[chosen.key]);
    expect(p.active.getPokemonCard().name).toBe('Rattata');expect(p.discard.cards.map((c:any)=>c.id)).toEqual([chosen.card!.id]);
    expect(p.bench[0].cards.map((c:any)=>c.id)).toEqual(original.filter(c=>c.id!==chosen.card!.id).map(c=>c.id));
  });
  it.each(['Fire Energy','Water Energy','Double Colorless Energy'])('lets the player choose %s for a one-Energy retreat',name=>{
    const m=fixture('retreat-special');retreat(m);pay(m,[name]);
    expect(m.view().players[0].discard.map(c=>c.name)).toEqual([name]);
    expect(m.view().players[0].bench[0].energy).toHaveLength(2);
    expect(m.view().players[0].active.card?.name).toBe('Rattata');
  });
  it.each([['Double Colorless Energy'],['Fire Energy','Water Energy'],['Fire Energy','Double Colorless Energy']])('pays two Energy in legal order: %j',(...names)=>{
    const m=fixture('retreat-order');retreat(m);pay(m,names);
    expect(m.view().players[0].discard.map(c=>c.name)).toEqual(names);
    expect(m.view().players[0].active.card?.name).toBe('Rattata');
    expect(m.view().players[0].bench[0].energy).toHaveLength(3-names.length);
  });
  it('rejects unpaid costs and cards selected after the cost has already been met',()=>{
    const m=fixture('retreat-order');retreat(m);const before=m.view();
    for(const names of [[],['Fire Energy'],['Double Colorless Energy','Fire Energy'],['Fire Energy','Water Energy','Double Colorless Energy']]) {
      expect(()=>pay(m,names)).toThrow(/engine rejected/);
      expect(m.revision).toBe(before.revision);expect(m.view().players).toEqual(before.players);
    }
    pay(m,['Water Energy','Double Colorless Energy']);
    expect(m.view().players[0].discard.map(c=>c.name)).toEqual(['Water Energy','Double Colorless Energy']);
  });
  it('cancels an unpaid retreat without moving cards or consuming the retreat',()=>{
    const m=fixture('retreat-identical');const before=m.view().players;
    retreat(m);const prompt=m.view().prompt!;expect(prompt.cancel).toBe(true);
    m.resolve(1,m.revision,prompt.id,null);expect(m.view().players).toEqual(before);expect(m.view().prompt).toBeUndefined();
    retreat(m);expect(m.view().prompt?.type).toBe('Choose energy');
  });
  it('rejects forged, duplicate, stale and other-player payments without extra discards',()=>{
    const m=fixture('retreat-identical');retreat(m);const v=m.view();const id=v.prompt!.id;
    expect(()=>m.resolve(2,v.revision,id,['0'])).toThrow(/belongs/);
    for(const keys of [['999'],['0','0']])expect(()=>m.resolve(1,v.revision,id,keys)).toThrow();
    expect(m.view().players).toEqual(v.players);
    m.resolve(1,v.revision,id,['1']);expect(()=>m.resolve(1,v.revision,id,['1'])).toThrow(/changed/);
    expect(()=>m.resolve(1,m.revision,id,['1'])).toThrow(/stale/);
    expect(m.view().players[0].discard).toHaveLength(1);
  });
  it('keeps free retreats prompt-free and uses actual retreat-cost modifiers',()=>{
    const m=fixture('retreat-exact');const p=m.state.players[0];
    p.bench[1].cards=[E.CardManager.getInstance().getCardByName('Dodrio JU')];refresh(m);
    retreat(m);expect(m.view().prompt).toBeUndefined();expect(m.view().players[0].discard).toEqual([]);expect(m.view().players[0].active.card?.name).toBe('Rattata');
  });
  it.each(['ASLEEP','PARALYZED','NO_ENERGY','NO_BENCH'])('still rejects prohibited retreats: %s',block=>{
    const m=fixture('retreat-identical');const p=m.state.players[0];
    if(block==='NO_ENERGY')p.active.cards=p.active.cards.slice(0,1);
    else if(block==='NO_BENCH')p.bench.forEach((b:any)=>b.cards=[]);
    else p.active.specialConditions=[E.SpecialCondition[block]];
    refresh(m);expect(m.view().actions.some(a=>a.kind==='retreat')).toBe(false);
  });
  it('discards the chosen cards before a failed historical Confusion flip',()=>{
    const m=fixture('retreat-order');const p=m.state.players[0];p.active.specialConditions=[E.SpecialCondition.CONFUSED];refresh(m);
    const cursor=m.view().events!.at(-1)?.id || 0;retreat(m);
    expect(m.view().events!.filter(e=>e.id>cursor&&e.kind==='coin')).toEqual([]);
    vi.spyOn(Math,'random').mockReturnValue(0.99);pay(m,['Fire Energy','Water Energy']);
    expect(p.active.getPokemonCard().name).toBe('Hitmonchan');expect(p.active.specialConditions).toContain(E.SpecialCondition.CONFUSED);
    expect(m.view().players[0].discard.map(c=>c.name)).toEqual(['Fire Energy','Water Energy']);
    expect(m.view().players[0].active.energy.map(c=>c.name)).toEqual(['Double Colorless Energy']);
    expect(m.view().actions.some(a=>a.kind==='retreat')).toBe(false);
  });
  it('preserves default engine behavior and non-retreat Energy prompt validation',()=>{
    expect(new E.Rules().historicalRetreatPayment).toBe(false);
    const m=fixture('retreat-identical');m.state.rules.historicalRetreatPayment=false;refresh(m);retreat(m);
    expect(m.view().prompt).toBeUndefined();expect(m.view().players[0].discard).toHaveLength(1);
    const c=fixture('retreat-order');const p=c.state.players[0];const energy=new E.CheckProvidedEnergyEffect(p);c.store.reduceEffect(c.state,energy);
    const prompt=new E.ChooseEnergyPrompt(1,'CHOOSE_ENERGY_TO_DISCARD',energy.energyMap,[E.CardType.COLORLESS,E.CardType.COLORLESS]);
    expect(prompt.options.payInOrder).toBe(false);
    expect(prompt.validate([energy.energyMap[1],energy.energyMap[0]])).toBe(false);
  });
});
