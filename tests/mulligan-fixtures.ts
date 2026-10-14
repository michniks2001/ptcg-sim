import { Match } from '../server/match';
import { E } from '../server/engine';
import { choosePrompt } from '../server/bot';
import { promptSpec } from '../server/prompts';
import { cardView } from '../server/views';
import type { CardView } from '../shared/protocol';

/** Real setup/shuffles, with a deterministic RNG only inside this test helper. */
export function mulliganSetup(seed: number, multiplier?: number) {
  const random = Math.random;
  Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  try {
    const match = new Match();
    if (multiplier !== undefined) match.state.rules.mulliganDrawMultiplier = multiplier;
    const revealed: { viewer: number; message: string; hands: CardView[][] }[] = [];
    const original = match.store.prompt;
    match.store.prompt = function(state: any, prompts: any, ...rest: any[]) {
      for (const p of Array.isArray(prompts) ? prompts : [prompts]) if (p instanceof E.ShowMulliganPrompt) {
        revealed.push({ viewer: p.playerId, message: p.message, hands: p.hands.map((h: any[])=>h.map(cardView)) });
      }
      return original.call(this,state,prompts,...rest);
    };
    for (let n=0;n<100 && match.state.turn===0;n++) {
      const p = match.pending(1) || match.pending(2);
      if (!p) throw Error('Setup stalled');
      if (promptSpec(p,match.state).view.mulliganDraw) return { match, revealed };
      const spec = promptSpec(p,match.state).view;
      match.resolve(p.playerId,match.revision,p.id,choosePrompt(spec));
    }
    if (match.fault) throw Error(match.fault);
    return { match, revealed };
  } finally { Math.random = random; }
}
