import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { ActionView, CardView, PlayerView, PromptView } from '../shared/protocol';
import { Card } from './Card';

export type Feedback = { busy: boolean; connected: boolean; error: string };

export function GameDialog({ title, eyebrow, close, children, footer }: { title: string; eyebrow: string; close?: () => void; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    heading.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
      else document.querySelector<HTMLElement>('.table-heading h1')?.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={ref} className="game-dialog" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); close?.(); }} onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const controls = Array.from(ref.current!.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')).filter(el => el.getClientRects().length > 0);
      const first = controls[0], last = controls.at(-1);
      if (!first) { event.preventDefault(); heading.current?.focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === heading.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }}>
    <div className="dialog-header"><div><div className="eyebrow">{eyebrow}</div><h2 id={titleId} ref={heading} tabIndex={-1}>{title}</h2></div>{close && <button onClick={close} aria-label="Close dialog">Close ×</button>}</div>
    <div className="dialog-body">{children}</div>
    {footer && <div className="dialog-footer">{footer}</div>}
  </dialog>;
}

export function CardPreview({ card }: { card: CardView }) {
  const [failed, setFailed] = useState(false);
  return <div className={`card-preview ${card.kind}`}>
    {!failed ? <img loading="lazy" decoding="async" src={card.image} alt={`${card.name} card`} onError={() => setFailed(true)} /> : <div className="preview-fallback"><h3>{card.name}</h3><p>{card.stage || card.kind}{card.hp ? ` · ${card.hp} HP` : ''}</p><p>{card.text}</p>{card.attacks.map(a => <p key={a.name}><b>{a.name} · {a.damage}</b><br />{a.cost.join(' / ')}<br />{a.text}</p>)}{card.powers.map(p => <p key={p.name}><b>{p.name}</b><br />{p.text}</p>)}</div>}
  </div>;
}

export function Status({ busy, connected, error }: Feedback) {
  return <>{error && <p className="dialog-error" role="alert">{error}</p>}{!connected ? <p className="dialog-status" role="status">Connection lost. Your choice is saved here. Reconnecting to the server…</p> : busy ? <p className="dialog-status" role="status">Waiting for the table…</p> : null}</>;
}

export function actionLabel(action: ActionView, card: CardView) {
  if (action.kind === 'attack') return `Attack: ${action.label}`;
  if (action.kind === 'ability') return `Use Ability: ${action.label}`;
  if (action.kind === 'evolve') return 'Evolve Pokémon';
  if (action.kind === 'play' && card.kind === 'trainer') return 'Play Trainer';
  return action.group;
}

export function CardActionDialog({ card, source, actions, act, target, close, ...feedback }: Feedback & { card: CardView; source: string; actions: ActionView[]; act: (action: ActionView) => void; target?: (actions: ActionView[], card: CardView) => void; close: () => void }) {
  const [group, setGroup] = useState<string>();
  const [details, setDetails] = useState(false);
  const disabled = feedback.busy || !feedback.connected;
  const groups = [...new Set(actions.map(a => actionLabel(a, card)))];
  const targets = actions.filter(a => actionLabel(a, card) === group);
  return <GameDialog title={card.name} eyebrow={source.startsWith('hand:') ? 'YOUR HAND' : source === 'opponent' ? 'OPPONENT · PUBLIC CARD' : source === 'discard' ? 'PUBLIC DISCARD' : 'YOUR BATTLEFIELD'} close={feedback.busy ? undefined : close}>
    <div className="card-action-layout"><CardPreview card={card} /><section className="card-actions" aria-label="Available actions">
      <p className="card-meta">{card.stage || card.kind}{card.hp ? ` · ${card.hp} HP` : ''}</p>
      <h3>{group ? `${group} · Choose a target` : 'Available actions'}</h3>
      <div className="action-menu">{group ? <>{targets.map(a => <button className="primary" key={a.id} disabled={disabled} onClick={() => act(a)}>{a.target || a.label}</button>)}<button disabled={feedback.busy} onClick={() => setGroup(undefined)}>← Back to actions</button></> : groups.map(g => <button className="primary" key={g} disabled={disabled} onClick={() => { const options = actions.filter(a => actionLabel(a, card) === g); if (target && options.every(a => a.boardTarget) && options.every(a => a.kind !== 'play')) target(options, card); else if (options.some(a => a.target)) setGroup(g); else act(options[0]); }}>{g}</button>)}</div>
      {!actions.length && <p className="muted">No available actions. You can still inspect this card.</p>}
      <Status {...feedback} />
      <button className="view-card" aria-expanded={details} onClick={() => setDetails(!details)}>{details ? 'Hide card text' : 'View Card text'}</button>
      {details && <div className="card-text"><p>{card.text}</p>{card.attacks.map(a => <p key={a.name}><b>{a.name} · {a.damage || '—'}</b><br /><small>{a.cost.join(' / ')}{a.text && ` — ${a.text}`}</small></p>)}{card.powers.map(p => <p key={p.name}><b>{p.name}</b><br />{p.text}</p>)}</div>}
    </section></div>
  </GameDialog>;
}

function promptTitle(prompt: PromptView) {
  if (prompt.message === 'Choose starting Pokémon' && prompt.min === 0) return 'Add Pokémon to your Bench';
  if (prompt.type === 'Choose prize') return 'Choose your Prize cards';
  if (prompt.context === 'deck') return 'Search your deck';
  if (prompt.context === 'discard') return 'Choose cards to discard';
  if (prompt.type === 'Choose energy') return 'Choose Energy payment';
  if (prompt.type === 'Choose pokemon') return prompt.message.toLowerCase().includes('active') ? 'Choose your Active Pokémon' : 'Choose a Pokémon';
  return prompt.message;
}

export function SelectionDialog({ prompt, submit, ...feedback }: Feedback & { prompt: PromptView; submit: (keys: string[] | null) => void }) {
  const [keys, setKeys] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const disabled = feedback.busy || !feedback.connected;
  const prize = prompt.type === 'Choose prize' || prompt.choices.some(c=>c.label.startsWith('Face-down card'));
  const starting = prompt.message === 'Choose starting Pokémon';
  const extraBench = starting && prompt.min === 0;
  const toggle = (key: string) => setKeys(current => current.includes(key) ? current.filter(k => k !== key) : prompt.max === 1 ? [key] : current.length < prompt.max ? [...current, key] : current);
  const valid = keys.length >= prompt.min && keys.length <= prompt.max;
  const counter = prompt.paymentInOrder ? `${keys.length} card${keys.length===1?'':'s'} selected · Retreat cost: ${prompt.payment?.length} Energy` : prompt.payment ? `${keys.length} Energy selected` : `${keys.length} selected · ${Math.max(0, prompt.min - keys.length)} required remaining`;
  return <GameDialog title={promptTitle(prompt)} eyebrow="YOUR DECISION" footer={<><span className="selection-count" role="status">{counter}</span><button className="primary" disabled={disabled || !valid} onClick={() => submit(keys)}>{keys.length === 0 && prompt.min === 0 && !prompt.payment ? 'Confirm without selecting' : 'Confirm choice'}</button>{prompt.cancel && <button disabled={disabled} onClick={() => submit(null)}>Cancel action</button>}</>}>
    <section className="selection-panel" aria-label="Required choice">
      <p className="selection-instructions">{prompt.ordered ? 'Select every card in order, top card first. Click a selected card to remove it from the order.' : extraBench ? 'You may add Basic Pokémon from your hand to the Bench, or continue without selecting.' : starting ? 'Select your Active first, then any Benched Pokémon. Numbers show the order.' : prompt.paymentInOrder ? 'Select attached Energy in discard order until the retreat cost is paid. Numbers show the order; do not add more cards after paying the cost.' : prompt.payment ? `Pay ${prompt.payment.join(' / ')}. The engine validates the selected Energy.` : `Choose ${prompt.min === prompt.max ? prompt.min : `${prompt.min}–${prompt.max}`}${prize ? ' face-down Prize cards' : ''}.`}{prompt.min === 0 && !prompt.payment && !extraBench && ' You may confirm without selecting a card.'}</p>
      {!starting && <p className="muted">{prize ? 'Prize cards stay face down until the server awards them.' : prompt.message}</p>}
      <Status {...feedback} />
      {prompt.displayCards && <div className="selection-gallery revealed-cards">{prompt.displayCards.map((card, i) => <div key={i}><CardPreview card={card} /><span>{card.name}</span></div>)}</div>}
      {prompt.choices.length > 12 && !prize && <label className="selection-filter">Find a card<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Filter eligible cards by name" /></label>}
      <div className={`selection-gallery ${prize ? 'prize-gallery' : ''}`}>{prompt.choices.filter(c => c.label.toLowerCase().includes(query.toLowerCase())).map(c => {
        const chosen = keys.includes(c.key);
        return <button key={c.key} type="button" className={`selection-option ${chosen ? 'chosen' : ''} ${prize ? 'prize-option' : ''}`} aria-label={c.label} aria-pressed={chosen} disabled={disabled || (!chosen && prompt.max !== 1 && keys.length >= prompt.max)} onClick={() => toggle(c.key)}>
          {prize ? <span className="prize-back card-back" aria-hidden="true">✦</span> : c.card ? <CardPreview card={c.card} /> : null}
          <span className="choice-label">{c.label}</span>{chosen && <b className="selection-number">{starting && !extraBench && keys.indexOf(c.key) === 0 ? 'A' : keys.indexOf(c.key) + 1}</b>}
        </button>;
      })}</div>
      {prompt.choices.length > 0 && !prompt.choices.some(c => c.label.toLowerCase().includes(query.toLowerCase())) && <p>No matching cards. Clear the filter to see all eligible choices.</p>}
    </section>
  </GameDialog>;
}

export function DiscardPileDialog({ player, close, select }: { player: PlayerView; close: () => void; select: (card: CardView) => void }) {
  return <GameDialog title={`${player.name} · Discard`} eyebrow="PUBLIC CARDS" close={close}><div className="discard-gallery">{player.discard.map((card, i) => <div key={i}><Card card={card} onClick={() => select(card)} /><span>{card.name}</span></div>)}{!player.discard.length && <p>No discarded cards yet.</p>}</div></GameDialog>;
}
