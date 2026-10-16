import { useEffect, useState } from 'react';
import type { ActionView, BoardTarget, CardView, MatchView, PromptChoice } from '../shared/protocol';
import { GameDialog, CardPreview } from './dialogs';
export const targetKey = (t: BoardTarget) => `${t.playerId}:${t.slot}:${t.index}`;
export function useBattlefieldTargeting(match: MatchView | undefined, disabled: boolean, act: (a: ActionView) => void, submit: (keys: string[] | null) => void, done?: () => void, bulk?: (key: string, count: number) => void, continueAbility?:()=>void) {
  const [counterCount, setCounterCount] = useState(1);
  const [optional, setOptional] = useState<{revision: number; actions: ActionView[]; text: string}>();
  const [step, setStep] = useState<{id: number; source?: string; keys: string[]; gallery?: boolean}>({id: -1, keys: []});
  const prompt = match?.prompt;
  const visible = (t?: BoardTarget) => t && !!(t.slot === 'active' ? match?.players.find(p=>p.id===t.playerId)?.active.card : match?.players.find(p=>p.id===t.playerId)?.bench[t.index]?.card);
  const inline = !!prompt?.battlefield && !!prompt.choices.length && prompt.choices.every(c => visible(c.boardTarget) && (!c.fromTarget || visible(c.fromTarget))) && (prompt.battlefield === 'pokemon' || prompt.min <= 1);
  const current = step.id === prompt?.id ? step : {id:prompt?.id ?? -1,keys:[]};
  const activePrompt = inline && !current.gallery ? prompt : undefined;
  const pending = optional?.revision === match?.revision && !prompt ? optional : undefined;
  const sourceKey = (c: PromptChoice) => prompt?.battlefield === 'damage' ? targetKey(c.fromTarget!) : String(c.card!.id);
  const needsSource = activePrompt && activePrompt.battlefield !== 'pokemon' && !current.source;
  const attachmentPicker = !!needsSource && activePrompt.battlefield === 'attachment';
  const targeting = !!pending || !!activePrompt;
  const chooseSource = (source: string) => setStep({id:prompt!.id,keys:[],source});
  const choices = activePrompt?.choices.filter(c => !current.source || sourceKey(c) === current.source) || [];
  const eligible = pending ? pending.actions.map(a=>targetKey(a.boardTarget!)) : choices.map(c=>targetKey(needsSource && activePrompt?.battlefield === 'damage' ? c.fromTarget! : c.boardTarget!));
  const instruction = pending?.text || (needsSource ? activePrompt?.battlefield === 'damage' ? 'Choose a Pokémon to move damage from.' : 'Choose an Energy card, then its destination.' : activePrompt?.battlefield === 'attachment' ? `Choose a Pokémon for ${choices[0]?.card?.name || 'this attachment'}.` : activePrompt?.battlefield === 'damage' ? 'Choose a Pokémon to receive 10 damage.' : activePrompt?.message || '');
  const changeKey = `${pending?.text || ''}:${activePrompt?.id || ''}:${current.source || ''}`;
  useEffect(() => {
    if (targeting && !attachmentPicker) {
      const frame = requestAnimationFrame(()=>{
        const target=document.querySelector<HTMLButtonElement>('.legal-target .card');
        target?.focus({preventScroll:true});
        // Keep the selected Pokémon visible inside the compact field without moving the hand.
        target?.closest('.pokemon-slot')?.scrollIntoView({block:'nearest',inline:'nearest'});
      });
      return ()=>cancelAnimationFrame(frame);
    }
  }, [targeting, attachmentPicker, changeKey]);
  const cancelOptional = () => setOptional(undefined);
  useEffect(()=>{
    if(!activePrompt)return;
    const listener=(e:KeyboardEvent)=>{if(e.key!=='Escape'||disabled)return;if(current.source)setStep({id:activePrompt.id,keys:[]});else if(activePrompt.cancel)submit(null);};
    window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener);
  },[activePrompt?.id,current.source,disabled]);
  useEffect(()=>{ if (!pending) return; const listener=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!disabled)cancelOptional();}; window.addEventListener('keydown',listener);return()=>window.removeEventListener('keydown',listener); },[pending,disabled]);
  const click = (t: BoardTarget) => {
    if (disabled || !eligible.includes(targetKey(t))) return;
    if (pending) { const a=pending.actions.find(a=>targetKey(a.boardTarget!)===targetKey(t)); if(a)act(a); return; }
    if (!activePrompt) return;
    if (needsSource && activePrompt.battlefield === 'damage') { chooseSource(targetKey(t)); return; }
    const choice = choices.find(c=>targetKey(c.boardTarget!)===targetKey(t));
    if(!choice)return;
    if (activePrompt.battlefield === 'damage' && match?.abilitySession && counterCount > 1 && bulk) bulk(choice.key, counterCount);
    else if(activePrompt.max===1 || activePrompt.battlefield!=='pokemon')submit([choice.key]);
    else setStep({...current,id:activePrompt.id,keys:current.keys.includes(choice.key)?current.keys.filter(k=>k!==choice.key):current.keys.length<activePrompt.max?[...current.keys,choice.key]:current.keys});
  };
  return {
    sourceCardIds: match?.abilitySession && attachmentPicker ? [...new Set(choices.map(c=>c.card!.id))] : [],
    selectSourceCard: (id:number) => { if (!disabled && attachmentPicker && choices.some(c=>c.card?.id===id)) chooseSource(String(id)); },
    active:targeting, inline:!!activePrompt, eligible:attachmentPicker?[]:eligible, click,
    selectedTargets:choices.filter(c=>current.keys.includes(c.key)).map(c=>targetKey(c.boardTarget!)),
    begin:(actions:ActionView[],card:CardView)=> {setOptional({revision:match!.revision,actions,text:actions[0].kind==='energy'?`Choose a Pokémon to attach ${card.name}.`:actions[0].kind==='retreat'?'Choose a Benched Pokémon to retreat to.':`Choose a Pokémon for ${card.name}.`});},
    reset:()=>{setOptional(undefined);setStep({id:-1,keys:[]});},
    controls:(targeting || match?.abilitySession) && <div className={`target-bar ${match?.abilitySession?'ability-mode':''}`} role="region" aria-label="Battlefield targeting"><p id="target-instructions" role="status">{disabled?'Waiting for the table…':instruction || match?.abilitySession?.message}</p>
      {instruction && match?.abilitySession?.message && <small>{match.abilitySession.message}</small>}
      {match?.abilitySession && <><strong>{match.abilitySession.label} mode</strong><button disabled={disabled || (!!prompt && (!prompt.cancel || prompt.battlefield !== match.abilitySession.mode))} onClick={done}>Done</button></>}
      {match?.abilitySession && !prompt && <button disabled={disabled} onClick={continueAbility}>Continue</button>}
      {match?.abilitySession?.mode === 'damage' && <label>Counters to move <input aria-label="Counters to move" type="number" min="1" max="100" value={counterCount} disabled={disabled} onChange={e=>setCounterCount(Math.max(1,Math.min(100,Number(e.target.value)||1)))}/></label>}
      {pending && <button disabled={disabled} onClick={cancelOptional}>Cancel targeting</button>}
      {activePrompt && <>{current.source && <button disabled={disabled} onClick={()=>setStep({id:activePrompt.id,keys:[]})}>Change source</button>}
        {activePrompt.battlefield==='pokemon' && activePrompt.max>1 && <button disabled={disabled||current.keys.length<activePrompt.min} onClick={()=>submit(current.keys)}>Confirm {current.keys.length} selected</button>}
        {activePrompt.min===0 && !match?.abilitySession && <button disabled={disabled} onClick={()=>submit([])}>Choose none</button>}
        {activePrompt.cancel && !match?.abilitySession && <button disabled={disabled} onClick={()=>submit(null)}>Cancel action</button>}
        {activePrompt.battlefield==='attachment' && activePrompt.max>1 && <button disabled={disabled} onClick={()=>setStep({...current,id:activePrompt.id,gallery:true})}>Select multiple transfers</button>}
      </>}
    </div>,
    picker:attachmentPicker && !match?.abilitySession && <GameDialog title="Choose attached or hand Energy" eyebrow="YOUR DECISION"><div className="selection-gallery">{choices.filter((c,i,all)=>all.findIndex(x=>sourceKey(x)===sourceKey(c))===i).map(c=><button className="selection-option" key={c.card!.id} disabled={disabled} onClick={()=>chooseSource(sourceKey(c))} aria-label={`${c.card!.name}${c.fromTarget?` from ${c.label.split(' → ')[0].split(': ').slice(1).join(': ')}`:''}`}><CardPreview card={c.card!}/><span>{c.card!.name}{c.fromTarget && ` · ${c.label.split(' → ')[0].split(': ').slice(1).join(': ')}`}</span></button>)}</div>{activePrompt.cancel && <button disabled={disabled} onClick={()=>submit(null)}>Cancel action</button>}</GameDialog>
  };
}
