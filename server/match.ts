import { MulliganReveals } from './mulligans';
import { repeatableMode, explicitContinuation, type AbilitySession } from './repeatable';
import { GameplayEvents } from './events';
import { projectEffects } from './effects';
import { E } from './engine';
import { decks, formats, engineDeck, validateMatchOptions, type MatchOptions, type OpponentId } from './format';
import { examples } from '../shared/decks';
import { historicalDeck } from '../shared/historical-decks';
import { legalOffers, type Offer } from './actions';
import { decodeSelection, promptSpec } from './prompts';
import { playerView, logView } from './views';
import { chooseAction, choosePrompt, chooseAdvancedAction, chooseAdvancedPrompt } from './bot';
import type { MatchView } from '../shared/protocol';
export class Match {
  private abilitySession?: AbilitySession;
  private sessionMessage?: string;
  private sessionCard(player: number, source: string) {
    const p = this.state.players.find((p: any) => p.id === player);
    return (source === 'active' ? p?.active : source.startsWith('bench:') ? p?.bench[Number(source.slice(6))] : undefined)?.getPokemonCard();
  }
  private sessionOffer() {
    const s = this.abilitySession;
    if (!s || s.turn !== this.state.turn || this.state.phase !== E.GamePhase.PLAYER_TURN || this.state.players[this.state.activePlayer]?.id !== s.player) { this.abilitySession = undefined; return; }
    const p = this.state.players.find((p: any) => p.id === s.player);
    if (![p.active, ...p.bench].some((l: any) => l.getPokemonCard()?.id === s.cardId && l.getPokemonCard()?.fullName === s.fullName)) { this.abilitySession = undefined; return; }
    return this.offers(s.player).find(o => o.view.kind === 'ability' && o.view.label === s.label && this.sessionCard(s.player, o.view.source)?.id === s.cardId);
  }
  private resumeAbility(explicit = false) {
    if (!this.abilitySession || this.state.prompts.some((p: any) => p.result === undefined)) return;
    const offer = this.sessionOffer();
    if (!offer) { this.sessionMessage = 'No legal activation remains. Click Done to return to the table.'; return; }
    if (!explicit && explicitContinuation.has(this.abilitySession!.label)) { this.sessionMessage = 'Choose Continue to activate again, or Done to return to the table.'; return; }
    this.events.dispatch(offer.action,true);
    this.settle();
    const p = this.pending(this.abilitySession!.player);
    if (p && !promptSpec(p, this.state).view.choices.length) {
      this.sessionMessage = 'No legal transfers remain. Click Done.';
      if (promptSpec(p,this.state).view.cancel) { this.events.dispatch(new E.ResolvePromptAction(p.id,null)); this.settle(); }
    }
  }
  continueAbility(player:number,revision:number) {
    this.checkRevision(revision);
    if(this.abilitySession?.player!==player || this.pending(player))throw Error('Resolve the current decision first.');
    this.sessionMessage=undefined;this.resumeAbility(true);
  }
  finishAbility(player: number, revision: number) {
    this.checkRevision(revision);
    if (!this.abilitySession || this.abilitySession.player !== player) throw Error('No active Ability session.');
    const p = this.pending(player);
    if (p) {
      const spec = promptSpec(p, this.state).view;
      if (spec.battlefield !== this.abilitySession.mode || !spec.cancel) throw Error('Resolve the mandatory decision before leaving this Ability.');
      this.abilitySession = undefined; this.events.repeatAbility(player);
      this.resolve(player, revision, p.id, null);
    } else { this.abilitySession = undefined; this.events.repeatAbility(player); this.changed(); }
  }
  moveCounters(player: number, revision: number, promptId: number, key: string, count: number) {
    this.checkRevision(revision);
    if (!Number.isInteger(count) || count < 1 || count > 100 || this.abilitySession?.player !== player || this.abilitySession.mode !== 'damage') throw Error('Invalid damage transfer request.');
    const p = this.pending(player);
    if (!p || p.id !== promptId) throw Error('This prompt is stale.');
    const initial = promptSpec(p, this.state).view.choices.find(c => c.key === key);
    if (!initial?.fromTarget || !initial.boardTarget) throw Error('Invalid source or destination.');
    const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
    let completed = 0;
    for (; completed < count; completed++) {
      const next = this.pending(player);
      if (!next || !this.abilitySession) break;
      const spec = promptSpec(next, this.state).view;
      if (spec.battlefield !== 'damage') break; // Never answer an interruption.
      const choice = spec.choices.find(c => same(c.fromTarget, initial.fromTarget) && same(c.boardTarget, initial.boardTarget));
      if (!choice) break;
      this.resolve(player, this.revision, next.id, [choice.key]);
    }
    this.sessionMessage = `Moved ${completed} of ${count} damage counters.${completed < count ? ' Further transfers are unavailable; choose new targets or click Done.' : ''}`;
  }
  store: any;
  revision = 0;
  private events: GameplayEvents;
  private mulligans = new MulliganReveals();
  diagnostics: string[] = [];
  fault?: string;
  private arbiter = new E.Arbiter();
  private cache = new Map<number, Offer[]>();
  private botTurn = -1;
  private botActions = 0;
  private usedActions = new Map<string,number>();
  private rejectedActions = new Set<string>();
  readonly opponent: OpponentId;
  readonly format: NonNullable<ReturnType<typeof formats.get>>;
  constructor(input: MatchOptions = {}) {
    const options = validateMatchOptions(input);
    this.opponent = options.opponent || 'practice';
    const format = this.format = formats.get(options.formatId || options.deck?.formatId || 'base-fossil-1999')!;
    const settings = new E.GameSettings(); settings.format = format.engineFormat; settings.rules = new E.Rules(format.rules);
    this.store = new E.Store({ onStateChange() {}, gameSettings: settings });
    this.events = new GameplayEvents(this.store);
    this.store.state.gameSettings = settings; this.store.state.rules = settings.rules;
    const playerDeck=options.deck || (format.id==='worlds-2024'?historicalDeck('iron-thorns-2024'):{...examples[0],formatId:format.id});
    this.events.dispatch(new E.AddPlayerAction(1, options.deck ? `You · ${options.deck.name}` : 'You · Ember', engineDeck(playerDeck)));
    const index = this.opponent === 'rain-dance' ? 3 : this.opponent === 'wigglytuff' ? 4 : this.opponent === 'haymaker' ? 2 : 1;
    const opponentList=this.opponent.endsWith('-2024')?historicalDeck(this.opponent,format.id):{...examples[index],formatId:format.id};
    const opponentDeck = engineDeck(opponentList);
    const name = ({practice:'Low Kick',haymaker:'Haymaker','rain-dance':'Rain Dance',wigglytuff:'Wigglytuff'} as Record<string,string>)[this.opponent] || opponentList.name;
    this.events.dispatch(new E.AddPlayerAction(2, `AI · ${name}`, opponentDeck));
    this.settle();
  }
  get state() { return this.store.state; }
  pending(id: number) { return this.state.prompts.find((p: any) => p.playerId === id && p.result === undefined); }
  offers(id: number) { if (!this.cache.has(id)) this.cache.set(id, legalOffers(this.state, id)); return this.cache.get(id)!; }
  private changed() { this.revision++; this.cache.clear(); }
  private settle() {
    for (let n = 0; n < 100; n++) {
      const pending = this.state.prompts.filter((p: any) => p.result === undefined);
      const action = pending.map((p: any) => this.mulligans.record(p, this.state) ? new E.ResolvePromptAction(p.id, true) : p instanceof E.WaitPrompt ? new E.ResolvePromptAction(p.id, null) : this.arbiter.resolvePrompt(this.state, p)).find(Boolean);
      if (!action) { this.changed(); return; }
      this.events.dispatch(action);
    }
    this.fault = 'Engine arbiter exceeded 100 consecutive automatic decisions.'; this.changed();
  }
  act(player: number, revision: number, offerId: string) {
    this.checkRevision(revision);
    const offer = this.offers(player).find(o => o.view.id === offerId);
    if (!offer) throw Error('Action unavailable. The game engine rejected it.');
    this.abilitySession = undefined; this.sessionMessage = undefined;
    this.events.repeatAbility(player);
    const card = this.sessionCard(player, offer.view.source);
    const mode = offer.view.kind === 'ability' && card && repeatableMode(card,offer.view.label,E.CardManager.getInstance());
    try { this.events.dispatch(offer.action); } finally { this.cache.clear(); }
    this.settle();
    if (player === 1 && mode) { this.abilitySession = { player, cardId: card.id, fullName: card.fullName, label: offer.view.label, mode, turn: this.state.turn }; this.events.repeatAbility(player,offer.view.label); }
  }
  resolve(player: number, revision: number, promptId: number, keys: unknown) {
    this.checkRevision(revision);
    const p = this.pending(player);
    if (!p || p.id !== promptId) throw Error('This prompt is stale or belongs to another player.');
    const result = decodeSelection(p, this.state, keys);
    try { this.events.dispatch(new E.ResolvePromptAction(p.id, result)); } catch (e) { this.fault = `Prompt resolution failed: ${(e as any)?.message || String(e)}`; throw e; }
    this.settle();
    if (keys === null) { this.abilitySession = undefined; this.events.repeatAbility(player); }
    else this.resumeAbility();
  }
  private checkRevision(revision: number) { if (this.fault) throw Error(this.fault); if (revision !== this.revision) throw Error('The table changed. Please select the action again.'); }
  view(viewer = 1): MatchView {
    const format = this.format;
    let prompt;
    try { const p = this.pending(viewer); if (p) prompt = promptSpec(p, this.state).view; } catch (e) { this.fault = String(e); }
    const players = this.state.players.map((p:any)=>playerView(p,viewer,!!this.state.rules.historicalConfusion));
    const fieldEffects = projectEffects(this.state,players);
    return { abilitySession: this.abilitySession?.player === viewer ? { label: this.abilitySession.label, mode: this.abilitySession.mode, available: !!prompt?.choices.length, message: this.sessionMessage } : undefined, mulligans: this.mulligans.view(viewer), events:this.events.view(), fieldEffects, revision: this.revision, format: format.label, turn: this.state.turn, phase: E.GamePhase[this.state.phase], activePlayer: this.state.players[this.state.activePlayer]?.id, winner: this.state.phase === E.GamePhase.FINISHED ? this.state.winner : null, players, actions: this.fault ? [] : this.offers(viewer).map(o => o.view), prompt, logs: this.state.logs.filter((l: any) => !l.client || l.client === viewer).map((l: any) => logView(l, this.state.players.find((p: any) => p.id === viewer)?.name)).slice(-150), diagnostics: viewer === 1 ? this.diagnostics.slice(-80) : [], fault: this.fault };
  }
  botStep(): boolean {
    if (this.fault || this.state.phase === E.GamePhase.FINISHED) return false;
    if (this.botTurn !== this.state.turn) { this.botTurn = this.state.turn; this.botActions = 0; this.usedActions.clear(); this.rejectedActions.clear(); }
    const p = this.pending(2);
    if (!p && (this.state.players[this.state.activePlayer]?.id !== 2 || this.state.prompts.some((p: any) => p.result === undefined))) return false;
    try {
      if (++this.botActions > 80) {
        if (!p) { const end = this.offers(2).find(o => o.view.kind === 'end'); if (end) { this.diagnostics.push('Action safeguard: ending AI turn.'); this.act(2, this.revision, end.view.id); return true; } }
        throw Error('AI exceeded 80 decisions in one turn.');
      }
      if (p) {
        const spec = promptSpec(p, this.state).view;
        const me = playerView(this.state.players.find((p: any)=>p.id===2),2);
        const opponent = playerView(this.state.players.find((p: any)=>p.id===1),2);
        let keys = this.opponent !== 'practice' ? chooseAdvancedPrompt(spec,me,opponent) : choosePrompt(spec);
        // Energy payment validators may require more than one selection. Try
        // bounded combinations of the bot-visible choices, never hidden cards.
        if (spec.type === 'Choose energy') {
          const choices = spec.choices;
          let found: string[] | undefined;
          for (let mask = 0; mask < 2 ** Math.min(choices.length, 12); mask++) {
            const candidate = choices.filter((_, i) => !!(mask & (1 << i))).map(c => c.key);
            try { decodeSelection(p, this.state, candidate); found = candidate; break; } catch {}
          }
          if (!found) throw Error('AI cannot find a legal Energy payment.'); keys = found;
        }
        this.diagnostics.push(`Turn ${this.state.turn}: AI answered ${spec.type} (${keys.length} choices).`);
        this.resolve(2, this.revision, p.id, keys);
      } else {
        const me = playerView(this.state.players.find((p: any) => p.id === 2), 2);
        const actions = this.offers(2).map(o => o.view).filter(a=>!this.rejectedActions.has(`${a.source}:${a.label}:${a.target||''}`));
        const opponent = playerView(this.state.players.find((p: any)=>p.id===1),2);
        const a = this.opponent !== 'practice' ? chooseAdvancedAction(actions,me,opponent,this.usedActions) : chooseAction(actions, me);
        if (!a) throw Error('AI has no legal action in an active turn.');
        this.diagnostics.push(`Turn ${this.state.turn}: ${a.label}${a.target ? ` → ${a.target}` : ''}`);
        const signature = `${a.source}:${a.label}:${a.target||''}`;
        this.usedActions.set(signature,(this.usedActions.get(signature)||0)+1);
        try { this.act(2, this.revision, a.id); }
        catch(e) {
          if (this.state.prompts.some((p:any)=>p.result===undefined) || this.state.phase!==E.GamePhase.PLAYER_TURN) throw e;
          this.rejectedActions.add(signature);
          this.diagnostics.push(`Engine rejected ${a.label}: ${(e as any)?.message || String(e)}. Re-evaluating legal offers.`);
          this.changed();
        }
      }
      this.diagnostics = this.diagnostics.slice(-80);
      return true;
    } catch (e) { this.fault = `AI stopped: ${(e as any)?.message || String(e)}`; this.diagnostics.push(this.fault); console.error(this.fault); this.changed(); return false; }
  }
}
