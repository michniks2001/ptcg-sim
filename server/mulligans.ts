import { E } from './engine';
import { cardView } from './views';
import type { MulliganView, PromptView } from '../shared/protocol';

/** Only retain hands the engine explicitly revealed to this viewer. */
export class MulliganReveals {
  private viewers = new Map<number, MulliganView>();
  record(prompt: any, state: any): boolean {
    if (state.phase !== E.GamePhase.SETUP || !(prompt instanceof E.ShowMulliganPrompt)) return false;
    const side = prompt.message === 'SETUP_OPPONENT_NO_BASIC' ? 'opponent' : prompt.message === 'SETUP_PLAYER_NO_BASIC' ? 'own' : undefined;
    if (!side || !prompt.validate(true, state)) return false;
    const revealed = this.viewers.get(prompt.playerId) || { own: [], opponent: [] };
    // Snapshot identities now; never retain mutable cards or inspect the new hand.
    revealed[side] = prompt.hands.map((hand: any[]) => hand.map(cardView));
    this.viewers.set(prompt.playerId, revealed);
    return true;
  }
  view(viewer: number) { return this.viewers.get(viewer); }
}

/** Translate this pinned engine's explicit setup options, never log text or a client rule. */
export function mulliganDraw(p: any, state: any, choices: { key: string; value: any }[]): PromptView['mulliganDraw'] {
  if (state.phase !== E.GamePhase.SETUP || !(p instanceof E.SelectPrompt) || p.message !== 'WANT_TO_DRAW_CARDS') return;
  const options = choices.map(choice => {
    const match = /^Draw (\d+) card\(s\)$/.exec(p.values[choice.value]);
    return match ? { key: choice.key, count: Number(match[1]) } : undefined;
  });
  // If upstream changes its representation, retain the ordinary prompt safely.
  if (!options.length || options.some(option => !option || !Number.isSafeInteger(option.count))) return;
  const counts = options as { key: string; count: number }[];
  return { options: counts, defaultKey: choices.find(c => c.value === p.options.defaultValue)?.key || [...counts].sort((a,b)=>b.count-a.count)[0].key };
}
