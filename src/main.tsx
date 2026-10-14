import { MulliganDialog } from './Mulligans';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { io } from 'socket.io-client';
import type { ActionView, CardView, MatchView, PlayerView, EffectView, GameplayEvent, Reply } from '../shared/protocol';
import './style.css';
import './battlefield.css';
import { Card } from './Card';
import { DeckBuilder } from './DeckBuilder';
import { loadDecks, saveDecks } from './deck-storage';
import { examples, FORMAT_ID, FORMAT_LABEL, validateDeck, type Deck } from '../shared/decks';
import { Callouts } from './Callouts';
import { Playmat, Side } from './Battlefield';
import { useBattlefieldTargeting } from './targeting';
import { GameDialog, CardActionDialog, SelectionDialog, DiscardPileDialog } from './dialogs';
const socket = io({ autoConnect: false });
function App() {
  const [page,setPage] = useState<'home'|'builder'|'table'>('home');
  const [storageError,setStorageError] = useState('');
  const [saved,setSaved] = useState<Deck[]>([]);
  const [deckId,setDeckId] = useState(examples[0].id);
  const [opponent,setOpponent] = useState<'practice'|'haymaker'>('practice');
  useEffect(()=>{try{setSaved(loadDecks());}catch(e){setStorageError(`Could not read saved decks: ${(e as Error).message}`);}},[]);
  const persist = (decks:Deck[])=>{try{saveDecks(decks);setSaved(decks);return true;}catch(e){setStorageError(`Could not save decks: ${(e as Error).message}`);return false;}};
  const chosenDeck = [...saved,...examples].find(d=>d.id===deckId);
  const deckErrors = chosenDeck ? validateDeck(chosenDeck) : ['Select a player deck.'];
  const startMatch = () => request('match:start', {formatId:FORMAT_ID,deck:chosenDeck,opponent});

  const pageRef=useRef(page);
  useEffect(()=>{pageRef.current=page;if(page!=='table')setCallouts([]);},[page]);
  const eventCursor = useRef<number | undefined>(undefined);
  const [callouts,setCallouts] = useState<GameplayEvent[]>([]);
  const finishCallouts = useCallback((ids:number[])=>setCallouts(current=>current.filter(e=>!ids.includes(e.id))),[]);
  const lastRevision = useRef(-1);
  const inFlight = useRef(false);
  const requestGeneration = useRef(0);
  function receive(state: MatchView) {
    if (state.revision < lastRevision.current) return;
    if (lastRevision.current !== state.revision) {
      setSelected(undefined); setPile(undefined); setInspectedEffects(undefined); setError('');
      lastRevision.current = state.revision;
    }
    const events = state.events || [];
    if(eventCursor.current !== undefined && pageRef.current==='table') { const fresh=events.filter(e=>e.id>eventCursor.current!); if(fresh.length)setCallouts(current=>[...current,...fresh].slice(-256)); }
    eventCursor.current = events.at(-1)?.id || 0;
    if(state.prompt){setFieldOpen(false);setMulligansOpen(false);}
    setMatch(state);
  }
  const [match, setMatch] = useState<MatchView>(); const [connected, setConnected] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [inspectedEffects,setInspectedEffects] = useState<{title:string; effects:EffectView[]}>();
  const [fieldOpen,setFieldOpen] = useState(false);
  const [mulligansOpen,setMulligansOpen] = useState(false);
  const [logOpen,setLogOpen] = useState(false);
  const [selected, setSelected] = useState<{ card: CardView; source: string }>(); const [pile, setPile] = useState<PlayerView>();
  function request(event: string, data: unknown) {
    if (inFlight.current || !socket.connected) return;
    inFlight.current = true; setBusy(true); setError('');
    const generation = ++requestGeneration.current;
    const sentRevision = lastRevision.current;
    socket.timeout(15000).emit(event, data, (err: Error | null, reply: Reply) => {
      if (generation !== requestGeneration.current) return;
      if (err) { inFlight.current = false; setBusy(false); setError('Server response timed out. Reconnecting to refresh the table…'); socket.disconnect().connect(); return; }
      if (!reply.ok) {
        setError(reply.error || 'Action failed. Please try again.');
        if (event === 'match:resume') {
          // An expired server session has no prompt left to resolve.
          localStorage.removeItem('table-token'); lastRevision.current = -1;
          setMatch(undefined); setSelected(undefined); setPile(undefined);
        }
      }
      if (reply.token) localStorage.setItem('table-token', reply.token);
      if (reply.state) { if(event==='match:start'||event==='match:resume'){eventCursor.current=undefined;setCallouts([]);targeting.reset();setFieldOpen(false);setMulligansOpen(false);} if (event === 'match:start') lastRevision.current = -1; receive(reply.state); if(event==='match:start'||event==='match:resume')setPage('table'); }
      // Keep the lock until the authoritative snapshot for a successful move arrives.
      if (!reply.ok || reply.state || lastRevision.current !== sentRevision) { inFlight.current = false; setBusy(false); }
    });
  }
  useEffect(() => {
    const onConnect = () => { setConnected(true); const token = localStorage.getItem('table-token'); if (token) request('match:resume', { token }); };
    const onDisconnect = () => { eventCursor.current=undefined;setCallouts([]); requestGeneration.current++; inFlight.current = false; setConnected(false); setBusy(false); };
    const onState = (state: MatchView) => { receive(state); inFlight.current = false; setBusy(false); };
    socket.on('connect', onConnect); socket.on('disconnect', onDisconnect); socket.on('match:state', onState); socket.on('connect_error', onDisconnect); socket.connect();
    return () => { socket.off('connect', onConnect); socket.off('disconnect', onDisconnect); socket.off('match:state', onState); socket.off('connect_error', onDisconnect); socket.disconnect(); };
  }, []);
  const select = (card: CardView | undefined, source: string) => { if (card) { setSelected({ card, source }); setPile(undefined); } };
  const act = (a: ActionView) => { if (match) request('match:action', { revision: match.revision, id: a.id }); };
  const submitPrompt = (keys:string[]|null) => { if(match?.prompt) request('match:prompt',{revision:match.revision,id:match.prompt.id,keys}); };
  const targeting = useBattlefieldTargeting(match,busy||!connected,act,submitPrompt);
  const interaction = {...targeting,disabled:busy||!connected};
  const inspectEffects = (title:string,effects:EffectView[])=>setInspectedEffects({title,effects});
  const myActions = match?.actions.filter(a => a.source === selected?.source) || [];
  const turnLabel = match?.winner !== null && match?.winner !== undefined ? (match.winner === 0 ? 'You won the match' : match.winner === 1 ? 'AI won the match' : 'Match ended') : match?.prompt ? 'Your decision' : match?.activePlayer === 1 ? 'Your turn' : 'Opponent’s turn';
  return <div className={`app ${page === 'table' && match ? 'match-app' : ''}`}><header><a className="brand" href="#" onClick={e=>{e.preventDefault();setPage('home');}}><span className="brand-mark">◒</span><span>THE PRACTICE TABLE<small>POKÉMON TRADING CARD GAME</small></span></a><nav aria-label="Main navigation"><button onClick={()=>setPage('home')}>Main menu</button><button onClick={()=>setPage('builder')}>Deck Builder</button>{match&&page!=='table'&&<button onClick={()=>setPage('table')}>Resume match</button>}</nav><span className={`connection ${connected ? 'online' : ''}`}>{connected ? 'Local server connected' : 'Reconnecting to server…'}</span>{match && <button onClick={() => { if (window.confirm('Leave this match and start a new one?')) startMatch(); }}>New match</button>}</header>
    {error && <div role="alert" className="error">{error}<button onClick={() => setError('')}>Dismiss</button></div>}
    {page==='builder' ? <DeckBuilder saved={saved} persist={persist} storageError={storageError}/> : page!=='table'||!match ? <main className="welcome"><div className="eyebrow">A SEAT AT THE TABLE / 1999</div><h1>Shuffle up.<br /><em>Play a little.</em></h1><p>The original cards. A felt tabletop. An opponent<br />ready whenever you are.</p><section className="match-config" aria-label="Match configuration"><label>Format<select value={FORMAT_ID} onChange={()=>{}}><option value={FORMAT_ID}>{FORMAT_LABEL}</option></select></label><label>Player deck<select value={deckId} onChange={e=>setDeckId(e.target.value)}><optgroup label="Your saved decks">{saved.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</optgroup><optgroup label="Example & practice decks">{examples.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</optgroup></select></label><label>AI opponent<select value={opponent} onChange={e=>setOpponent(e.target.value as 'practice'|'haymaker')}><option value="practice">Practice AI · Low Kick</option><option value="haymaker">Haymaker AI</option></select></label><p className="muted">{opponent==='haymaker'?'Aggressive Basics, resource management and disruptive Trainers.':'A simple opponent for learning and testing.'}</p>{deckErrors.length>0&&<ul className="config-errors">{deckErrors.map(e=><li key={e}>{e}</li>)}</ul>}<button className="primary large" disabled={!connected||busy||deckErrors.length>0} onClick={startMatch}>{busy?'Shuffling…':'Play vs AI →'}</button><button onClick={()=>setPage('builder')}>Build a deck ↗</button></section><small>60-card decks · Six prizes · Click cards to play</small></main> : <main className="game-layout"><div className="table-column"><div className="table-heading"><h1 tabIndex={-1} aria-live="polite">{turnLabel}</h1><div className="turn-controls"><span>TURN <b>{match.turn || 'SETUP'}</b></span><button className="primary" disabled={busy || !connected || !match.actions.some(a => a.kind === 'end')} onClick={() => act(match.actions.find(a => a.kind === 'end')!)}>End turn →</button></div></div>
      <Callouts events={callouts} onDone={finishCallouts}/>{match.fault && <div className="error" role="alert">{match.fault} Start a new match to recover; diagnostics are available on the right.</div>}
      {targeting.controls}<Playmat><Side player={match.players[1]} opponent select={select} openPile={setPile} effects={inspectEffects} interaction={interaction} /><div className="mat-divider"><span>✦</span></div><Side player={match.players[0]} opponent={false} select={select} openPile={setPile} effects={inspectEffects} interaction={interaction} /></Playmat>
      <section className="hand-area" aria-label="Your hand"><div className="hand-label"><span className="eyebrow">YOUR HAND</span><span>{match.players[0].handCount} cards</span></div><div className="hand">{match.players[0].hand.map(c => <div key={c.id} className={match.actions.some(a => a.source === `hand:${c.id}`) ? 'playable' : ''}><Card card={c} disabled={targeting.active} onClick={() => select(c, `hand:${c.id}`)} selected={selected?.card.id === c.id} /></div>)}</div></section>
    </div><aside><section className={`log-panel ${logOpen?'log-open':''}`}><div className="log-heading"><span className="eyebrow desktop-log-label">MATCH LOG</span><button className="mobile-log-toggle" aria-expanded={logOpen} onClick={()=>setLogOpen(!logOpen)}>Match log {logOpen?'−':'+'}</button><button onClick={()=>setFieldOpen(true)} disabled={targeting.active}>Field Effects{match.fieldEffects?.length ? ` · ${match.fieldEffects.length}` : ''}</button></div><ol aria-label="Match log">{match.mulligans && <li className="mulligan-log"><p>Your mulligans: {match.mulligans.own.length} · Opponent: {match.mulligans.opponent.length}. Hands without eligible Basic Pokémon were automatically redrawn.</p><button disabled={!!match.prompt || targeting.active} onClick={()=>setMulligansOpen(true)}>Review mulligan hands</button></li>}{[...match.logs].reverse().map((l, i) => <li key={`${match.logs.length - i}:${l}`}>{l}</li>)}</ol></section><details className="diagnostics"><summary>AI diagnostics</summary><pre>{match.diagnostics.join('\n') || 'Waiting for the AI’s first decision.'}</pre></details>
    </aside></main>}
    {page==='table' && match && (targeting.picker ? targeting.picker : match.prompt?.mulliganDraw && match.mulligans ? <MulliganDialog key={match.prompt.id} hands={match.mulligans} prompt={match.prompt} busy={busy} connected={connected} error={error} submit={submitPrompt}/> : match.prompt && !targeting.inline ? <SelectionDialog key={match.prompt.id} prompt={match.prompt} busy={busy} connected={connected} error={error} submit={keys => request('match:prompt', { revision: match.revision, id: match.prompt!.id, keys })} />
      : selected && !targeting.active ? <CardActionDialog key={`${selected.source}:${selected.card.id}`} card={selected.card} source={selected.source} actions={myActions} busy={busy} connected={connected} error={error} act={act} target={(actions,card)=>{setSelected(undefined);targeting.begin(actions,card);}} close={() => setSelected(undefined)} />
      : pile ? <DiscardPileDialog player={pile} close={() => setPile(undefined)} select={c => select(c, 'discard')} /> : null)}
    {page==='table' && !match?.prompt && mulligansOpen && match?.mulligans && <MulliganDialog hands={match.mulligans} busy={busy} connected={connected} error={error} close={()=>setMulligansOpen(false)}/>}
    {page==='table' && !match?.prompt && (fieldOpen || inspectedEffects) && <GameDialog title={fieldOpen?'Field Effects':inspectedEffects!.title} eyebrow={fieldOpen?'ONGOING RESTRICTIONS':'ON THIS POKÉMON'} close={()=>{setFieldOpen(false);setInspectedEffects(undefined);}}><div className="effect-list">{(fieldOpen?match?.fieldEffects||[]:inspectedEffects!.effects).map(e=><article key={e.id}><h3>{e.name}</h3><p className="muted">{e.source} · {e.scope}</p><p>{e.description}</p>{e.duration&&<p className="effect-duration">{e.duration}</p>}</article>)}{fieldOpen&&!match?.fieldEffects?.length&&<p>No active field effects.</p>}</div></GameDialog>}
    {page !== 'table' && <footer>UNOFFICIAL FAN PROJECT <span>Powered by Twinleaf · Local practice, no account required.</span></footer>}
  </div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
