// Audited adapters only: names and printed text never grant repeatability.
// Every activation and every selection still passes the engine validators.
export const repeatableEffects: Record<string, Record<string, 'damage' | 'attachment'>> = {
  'Alakazam BS': { 'Damage Swap': 'damage' },
  'Blastoise BS': { 'Rain Dance': 'attachment' },
  'Venusaur BS': { 'Energy Trans': 'attachment' },
  'Frosmoth SSH': { 'Ice Dance': 'attachment' },
  'Baxcalibur PAL': { 'Super Cold': 'attachment' },
  'Oricorio ex M2': { 'Excited Turbo': 'attachment' },
};
export function repeatableMode(card:any,label:string,manager:any) {
  for(const [identity,powers] of Object.entries(repeatableEffects)) {
    if(!powers[label])continue;
    const canonical=manager.getCardByName(identity);
    if(canonical && card instanceof canonical.constructor && card.reduceEffect===canonical.reduceEffect)return powers[label];
  }
}
// These upstream effects create non-cancellable selections. Re-enter only on
// explicit Continue so Done never requires canceling a mandatory engine prompt.
export const explicitContinuation = new Set(['Super Cold','Excited Turbo']);
export interface AbilitySession {
  player: number;
  cardId: number;
  fullName: string;
  label: string;
  turn: number;
  mode: 'damage' | 'attachment';
}
