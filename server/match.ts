import { MulliganReveals } from './mulligans';
import { GameplayEvents } from './events';
import { projectEffects } from './effects';
import { E } from './engine';
import { decks, format, engineDeck, validateMatchOptions, type MatchOptions } from './format';
import { legalOffers, type Offer } from './actions';
import { decodeSelection, promptSpec } from './prompts';
import { playerView, logView } from './views';
import { chooseAction, choosePrompt, chooseAdvancedAction, chooseAdvancedPrompt } from './bot';
import type { MatchView } from '../shared/protocol';
export class Match {
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
  readonly opponent: 'practice' | 'haymaker';
  constructor(input: MatchOptions = {}) {
    const options = validateMatchOptions(input);
    this.opponent = options.opponent || 'practice';
    const settings = new E.GameSettings(); settings.format = format.engineFormat; settings.rules = new E.Rules(format.rules);
    this.store = new E.Store({ onStateChange() {}, gameSettings: settings });
    this.events = new GameplayEvents(this.store);
    this.store.state.gameSettings = settings; this.store.state.rules = settings.rules;
    this.events.dispatch(new E.AddPlayerAction(1, options.deck ? `You · ${options.deck.name}` : 'You · Ember', options.deck ? engineDeck(options.deck) : decks.ember));
    this.events.dispatch(new E.AddPlayerAction(2, this.opponent === 'haymaker' ? 'AI · Haymaker' : 'AI · Low Kick', this.opponent === 'haymaker' ? decks.haymaker : decks.lowKick));
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
    try { this.events.dispatch(offer.action); } finally { this.cache.clear(); }
    this.settle();
  }
  resolve(player: number, revision: number, promptId: number, keys: unknown) {
    this.checkRevision(revision);
    const p = this.pending(player);
    if (!p || p.id !== promptId) throw Error('This prompt is stale or belongs to another player.');
    const result = decodeSelection(p, this.state, keys);
    try { this.events.dispatch(new E.ResolvePromptAction(p.id, result)); } catch (e) { this.fault = `Prompt resolution failed: ${(e as any)?.message || String(e)}`; throw e; }
    this.settle();
  }
  private checkRevision(revision: number) { if (this.fault) throw Error(this.fault); if (revision !== this.revision) throw Error('The table changed. Please select the action again.'); }
  view(viewer = 1): MatchView {
    let prompt;
    try { const p = this.pending(viewer); if (p) prompt = promptSpec(p, this.state).view; } catch (e) { this.fault = String(e); }
    const players = this.state.players.map((p:any)=>playerView(p,viewer));
    const fieldEffects = projectEffects(this.state,players);
    return { mulligans: this.mulligans.view(viewer), events:this.events.view(), fieldEffects, revision: this.revision, format: format.label, turn: this.state.turn, phase: E.GamePhase[this.state.phase], activePlayer: this.state.players[this.state.activePlayer]?.id, winner: this.state.phase === E.GamePhase.FINISHED ? this.state.winner : null, players, actions: this.fault ? [] : this.offers(viewer).map(o => o.view), prompt, logs: this.state.logs.filter((l: any) => !l.client || l.client === viewer).map((l: any) => logView(l, this.state.players.find((p: any) => p.id === viewer)?.name)).slice(-150), diagnostics: viewer === 1 ? this.diagnostics.slice(-80) : [], fault: this.fault };
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
        let keys = this.opponent === 'haymaker' ? chooseAdvancedPrompt(spec,me,opponent) : choosePrompt(spec);
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
        const a = this.opponent === 'haymaker' ? chooseAdvancedAction(actions,me,opponent,this.usedActions) : chooseAction(actions, me);
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
