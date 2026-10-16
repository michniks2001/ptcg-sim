import type { EffectView } from '../shared/protocol';
import { E } from './engine';
export function conditionDetails(list: any, historical = true): EffectView[] {
  const removal = 'Evolution or moving to the Bench removes this condition.';
  const text: Record<string,string> = {
    POISONED:`Put ${list.poisonDamage} damage on this Pokémon between turns. Poison has no recovery coin flip. ${removal}`,
    BURNED:historical?'Burn is not used in Base–Fossil. This counter supports future formats; recovery and damage depend on their rules.':`Burn deals 20 damage during Pokémon Checkup, then heads removes Burn. ${removal}`,
    ASLEEP:`Cannot attack or retreat. Between turns, the server flips for recovery; heads wakes it up. ${removal}`,
    PARALYZED:`Cannot attack or retreat. Removed at the end of its owner’s next turn. ${removal}`,
    CONFUSED:historical?`Flip before attacking. On tails, the attack fails and this Pokémon takes 20 damage with Weakness/Resistance. Retreat costs are paid before a flip; tails prevents retreat and further retreat attempts that turn. ${removal}`:`Flip before attacking; tails makes the attack fail and deals confusion damage. ${removal}`
  };
  return list.specialConditions.map((n:number)=>{const name=E.SpecialCondition[n];return {id:name,name:name[0]+name.slice(1).toLowerCase(),source:'Special Condition',scope:list.getPokemonCard()?.name || 'Pokémon',description:text[name] || 'Resolved by the selected format’s engine rules.'};});
}
