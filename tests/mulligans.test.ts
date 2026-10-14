import { describe, expect, it } from 'vitest';
import { E } from '../server/engine';
import { promptSpec } from '../server/prompts';
import { MulliganReveals } from '../server/mulligans';
import { mulliganSetup } from './mulligan-fixtures';

function finishSetup(match: ReturnType<typeof mulliganSetup>['match']) {
  for(let n=0;n<20 && match.state.turn===0;n++) {
    const p=match.pending(1)||match.pending(2);
    expect(p).toBeTruthy();
    const view=promptSpec(p,match.state).view;
    expect(view.mulliganDraw).toBeUndefined();
    expect(p).not.toBeInstanceOf(E.ShowMulliganPrompt);
    // Additional Bench placement is a genuine optional decision, never an acknowledgement.
    expect(view.type).toBe('Choose cards');expect(view.min).toBe(0);
    match.resolve(p.playerId,match.revision,p.id,[]);
  }
  expect(match.state.turn).toBe(1);expect(match.fault).toBeUndefined();
}

describe('authoritative mulligan presentation',()=>{
  it.each([[9,1],[69,2],[453,3],[369,4]])('seed %i preserves %i separate real revealed hands', (seed,count)=>{
    const {match,revealed}=mulliganSetup(seed);
    const view=match.view();
    expect(view.mulligans?.own).toEqual([]);expect(view.mulligans?.opponent).toHaveLength(count);
    expect(view.mulligans?.opponent).toEqual(revealed.find(r=>r.viewer===1&&r.message==='SETUP_OPPONENT_NO_BASIC')!.hands);
    for(const hand of view.mulligans!.opponent){expect(hand).toHaveLength(7);expect(hand.some(c=>c.stage==='Basic')).toBe(false);}
    expect(view.prompt?.displayCards).toBeUndefined();
    expect(view.prompt?.mulliganDraw?.options.map(c=>c.count)).toEqual(Array.from({length:count*2+1},(_,i)=>count*2-i));
    expect(match.pending(1)).toBeInstanceOf(E.SelectPrompt);
    expect(match.state.prompts.filter((p:any)=>p instanceof E.ShowMulliganPrompt&&p.result===undefined)).toHaveLength(0);
    expect(view.players[1].hand).toEqual([]);expect(view.players[1]).not.toHaveProperty('deck');
    expect(JSON.stringify(view)).not.toContain('cardNames');expect(JSON.stringify(view)).not.toContain('deckOrder');
    expect(match.view().mulligans).toEqual(view.mulligans);
  });
  it.each([0,1,2,3,4])('chooses %i cards once through the actual setup draw and proceeds',count=>{
    const {match}=mulliganSetup(69);const v=match.view();const p=match.state.players[0];
    const before=p.hand.cards.map((c:any)=>c.id), deck=p.deck.cards.map((c:any)=>c.id);
    const choice=v.prompt!.mulliganDraw!.options.find(c=>c.count===count)!;
    match.resolve(1,v.revision,v.prompt!.id,[choice.key]);
    const opening=match.state.turn===1 && match.state.activePlayer===0?1:0;
    expect(p.hand.cards.map((c:any)=>c.id)).toEqual([...before,...deck.slice(0,count+opening)]);
    expect(p.deck.cards.map((c:any)=>c.id)).toEqual(deck.slice(count+opening));
    expect(()=>match.resolve(1,v.revision,v.prompt!.id,[choice.key])).toThrow(/changed/);
    expect(()=>match.resolve(1,match.revision,v.prompt!.id,[choice.key])).toThrow(/stale/);
    finishSetup(match);
    expect(match.view().prompt?.mulliganDraw).toBeUndefined();
  });
  it('rejects forged, excessive, duplicate, canceled and wrong-owner submissions without drawing',()=>{
    const {match}=mulliganSetup(9);const v=match.view();const before=JSON.stringify(v.players);
    for(const keys of [['99'],['0','1'],['0','0'],[],null,2])expect(()=>match.resolve(1,v.revision,v.prompt!.id,keys)).toThrow();
    expect(()=>match.resolve(2,v.revision,v.prompt!.id,['0'])).toThrow(/belongs/);
    expect(match.revision).toBe(v.revision);expect(JSON.stringify(match.view().players)).toBe(before);
    expect(match.view().prompt).toEqual(v.prompt);
  });
  it('projects the configured rule multiplier without a frontend assumption',()=>{
    const {match}=mulliganSetup(69,1);
    expect(match.view().prompt?.mulliganDraw?.options.map(c=>c.count)).toEqual([2,1,0]);
  });
  it('keeps own mulligans separate and assigns compensation to the opponent',()=>{
    const {match}=mulliganSetup(3);expect(match.view().mulligans?.own).toHaveLength(1);expect(match.view().mulligans?.opponent).toHaveLength(0);
    expect(match.view().prompt).toBeUndefined();expect(match.view(2).mulligans?.opponent).toEqual(match.view().mulligans?.own);
    const v=match.view(2);expect(v.prompt?.mulliganDraw?.options.map(c=>c.count)).toEqual([2,1,0]);
    match.resolve(2,v.revision,v.prompt!.id,[v.prompt!.mulliganDraw!.defaultKey]);finishSetup(match);
  });
  it('does not award compensation or stop for acknowledgements when simultaneous mulligans cancel out',()=>{
    const {match}=mulliganSetup(33);expect(match.view().mulligans?.own).toHaveLength(1);expect(match.view().mulligans?.opponent).toHaveLength(1);expect(match.state.turn).toBe(1);expect(match.view().prompt).toBeUndefined();
  });
  it('compensates only excess mulligans when both players mulligan',()=>{
    const {match}=mulliganSetup(34);expect(match.view().mulligans?.own).toHaveLength(2);expect(match.view().mulligans?.opponent).toHaveLength(1);
    expect(match.view(2).prompt?.mulliganDraw?.options.map(c=>c.count)).toEqual([2,1,0]);
  });
  it('only stores disclosures authorized for that viewer and never auto-acknowledges unrelated prompts',()=>{
    const {match}=mulliganSetup(9);const reveals=new MulliganReveals();const cards=match.state.players[0].hand.cards;
    expect(reveals.record(new E.ShowMulliganPrompt(1,'SETUP_PLAYER_NO_BASIC',[cards]),match.state)).toBe(true);
    expect(reveals.view(2)).toBeUndefined();
    expect(reveals.record(new E.ShowMulliganPrompt(2,'UNRECOGNIZED',[cards]),match.state)).toBe(false);
    expect(reveals.record(new E.SelectPrompt(1,'WANT_TO_DRAW_CARDS',['Draw 2 card(s)']),match.state)).toBe(false);
    expect(reveals.record(new E.ShowCardsPrompt(1,'REVEAL',[cards[0]]),match.state)).toBe(false);
  });
});
