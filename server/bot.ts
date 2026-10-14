import type { ActionView, PlayerView, PromptView } from '../shared/protocol';
// Policy sees only the bot's DTO, never the Store or the human's hidden cards.
export function chooseAction(actions: ActionView[], me: PlayerView): ActionView | undefined {
  const score = (a: ActionView) => {
    if (a.kind === 'play') return a.source.startsWith('hand:') && me.hand.find(c => `hand:${c.id}` === a.source)?.kind === 'pokemon' ? 100 : a.label.includes('Switch') ? -5 : a.label.includes('Computer Search') ? 18 : 65;
    if (a.kind === 'energy') return a.target?.startsWith('Active') ? (me.active.energy.length < 4 ? 95 : 40) : 45;
    if (a.kind === 'evolve') return 80;
    if (a.kind === 'ability') return 60;
    if (a.kind === 'attack') return 30 + (a.damage || 0) / 10;
    if (a.kind === 'retreat') return -10;
    return 0;
  };
  return [...actions].sort((a, b) => score(b) - score(a))[0];
}
export function choosePrompt(p: PromptView): string[] {
  if(p.ordered)return p.choices.map(c=>c.key);
  const sorted = [...p.choices];
  if (p.message.toLowerCase().includes('starting')) sorted.sort((a, b) => (b.card?.hp || 0) - (a.card?.hp || 0));
  if (p.message.toLowerCase().includes('discard')) sorted.sort((a, b) => Number(b.card?.kind === 'energy') - Number(a.card?.kind === 'energy'));
  if (p.type === 'Choose cards' && p.message.toLowerCase().includes('starting')) return sorted.slice(0, p.max).map(c => c.key);
  if (p.type === 'Select') return sorted.slice(-1).map(c => c.key); // take allowed mulligan draws
  return sorted.slice(0, Math.max(p.min, p.max ? 1 : 0)).map(c => c.key);
}

// Strategy estimates are advisory only. Every selected action has passed the
// engine and is dispatched through it again; no estimated damage is applied.
function units(cards: import('../shared/protocol').CardView[]) { return cards.flatMap(c => c.provides || (c.name==='Double Colorless Energy'?['COLORLESS','COLORLESS']:[c.name.split(' ')[0].toUpperCase()])); }
export function energyMissing(cost: string[], energy: import('../shared/protocol').CardView[]) {
  const available=units(energy); let missing=0;
  for(const type of cost.filter(t=>t!=='COLORLESS')) { let i=available.indexOf(type);if(i<0)i=available.indexOf('ANY');if(i<0)missing++;else available.splice(i,1); }
  return missing+Math.max(0,cost.filter(t=>t==='COLORLESS').length-available.length);
}
export function expectedDamage(attack: {name:string;damage:number}, source: import('../shared/protocol').PokemonView, target: import('../shared/protocol').PokemonView, me?: PlayerView) {
  let damage=attack.damage;
  if(attack.name==='Thunderpunch') damage=35;
  if(attack.name==='Do the Wave') damage=10+10*(me?.bench.filter(p=>p.card).length||0);
  if(attack.name==='Hydro Pump') damage=40+Math.min(2,Math.max(0,units(source.energy).filter(t=>t==='WATER').length-3))*10;
  const types=source.card?.types||[];
  if(target.card?.weakness?.some(w=>types.includes(w.type)))damage*=2;
  for(const r of target.card?.resistance||[])if(types.includes(r.type))damage+=r.value??-30;
  return Math.max(0,damage)+(damage>0?(source.attackBonus||0):0);
}
function bestAttack(p: import('../shared/protocol').PokemonView, opponent: import('../shared/protocol').PokemonView, me?: PlayerView) {
  return Math.max(0,...(p.card?.attacks||[]).filter(a=>energyMissing(a.cost,p.energy)===0).map(a=>expectedDamage(a,p,opponent,me)));
}
export function evaluateAttack(a: ActionView, me:PlayerView, opponent:PlayerView) {
  const damage=expectedDamage({name:a.label,damage:a.damage||0},me.active,opponent.active,me);
  const hp=(opponent.active.card?.hp||999)-opponent.active.damage;
  return 30+damage/3+(damage>=hp?70:0)+(a.label==='Thundershock'?4:0);
}
export function evaluateEnergyAttachment(a:ActionView,me:PlayerView,opponent:PlayerView) {
  const card=me.hand.find(c=>`hand:${c.id}`===a.source);if(!card)return -20;
  const target=a.target?.startsWith('Active')?me.active:me.bench[Number(/Bench (\d+)/.exec(a.target||'')?.[1])-1];
  if(!target?.card)return -20;
  const attacks=target.card.attacks;
  const before=Math.min(99,...attacks.map(at=>energyMissing(at.cost,target.energy)));
  const after=Math.min(99,...attacks.map(at=>energyMissing(at.cost,[...target.energy,card])));
  const potential={...target,energy:[...target.energy,card]};
  const gain=bestAttack(potential,opponent.active,me)-bestAttack(target,opponent.active,me);
  if(before===after&&gain<=0)return -8;
  return 65+(before>0&&after===0?35:0)+(target===me.active?20:0)+gain/3-target.energy.length*2;
}
export function evaluateTrainer(name:string,me:PlayerView,opponent:PlayerView,actions:ActionView[]) {
  const legalAttacks=actions.filter(a=>a.kind==='attack');
  const damage=Math.max(0,...legalAttacks.map(a=>expectedDamage({name:a.label,damage:a.damage||0},me.active,opponent.active,me)));
  const hp=(opponent.active.card?.hp||999)-opponent.active.damage;
  const enemies=[opponent.active,...opponent.bench].filter(p=>p.card);
  const mine=[me.active,...me.bench].filter(p=>p.card);
  switch(name) {
    case 'Bill':return me.deckCount>2?110:-10;
    case 'Professor Oak': return me.deckCount<9?-15:me.hand.length<=3?92:me.hand.length<=5&&!legalAttacks.length?68:-15;
    case 'PlusPower':return damage>0&&damage<hp&&damage+10>=hp?140:-15;
    case 'Gust of Wind':return opponent.bench.some(p=>p.card&&bestAttack(me.active,p,me)>=(p.card.hp||999)-p.damage)&&damage<hp?135:-12;
    case 'Energy Removal':return enemies.some(p=>p.energy.length)?88:-20;
    case 'Super Energy Removal':return enemies.some(p=>p.energy.length>=2)&&mine.some(p=>p!==me.active&&p.energy.length>0||p===me.active&&p.energy.some((_,i)=>bestAttack({...p,energy:p.energy.filter((_,j)=>i!==j)},opponent.active,me)>=damage&&damage>0))?82:-20;
    case 'Computer Search':return me.hand.length>=4&&(!legalAttacks.length||!me.bench.some(p=>p.card))?72:-10;
    case 'Item Finder':return me.hand.length>=4&&me.discard.some(c=>['Bill','Energy Removal','PlusPower'].includes(c.name))?58:-10;
    case 'Energy Retrieval':return me.hand.filter(c=>c.kind==='energy').length===0&&me.discard.some(c=>c.kind==='energy')?84:-12;
    case 'Scoop Up':return me.active.damage>=40&&me.active.energy.length<=1&&me.bench.some(p=>bestAttack(p,opponent.active,me)>0)?100:-15;
    case 'Switch':return me.bench.some(p=>bestAttack(p,opponent.active,me)>damage+10)?80:-15;
    case 'Potion':return mine.some(p=>p.damage>=20)?76:-15;
    default:return 5;
  }
}
export function chooseAdvancedAction(actions:ActionView[],me:PlayerView,opponent:PlayerView,used:ReadonlyMap<string,number>=new Map()):ActionView|undefined {
  const score=(a:ActionView)=>{
    if((used.get(`${a.source}:${a.label}:${a.target||''}`)||0)>0&&['ability','retreat'].includes(a.kind))return -30;
    if(a.kind==='attack')return evaluateAttack(a,me,opponent);
    if(a.kind==='energy')return evaluateEnergyAttachment(a,me,opponent);
    if(a.kind==='play') {const c=me.hand.find(c=>`hand:${c.id}`===a.source);return c?.kind==='pokemon'?(me.bench.filter(p=>p.card).length<3?96:-6):evaluateTrainer(c?.name||'',me,opponent,actions);}
    if(a.kind==='retreat'){const b=me.bench[Number(/Bench (\d+)/.exec(a.target||'')?.[1])-1];return b&&bestAttack(b,opponent.active,me)>bestAttack(me.active,opponent.active,me)+15?75:-15;}
    if(a.kind==='evolve')return 90;
    if(a.kind==='ability')return 20;
    return 0;
  };
  return [...actions].sort((a,b)=>score(b)-score(a))[0];
}
export function chooseAdvancedPrompt(p:PromptView,me:PlayerView,opponent:PlayerView):string[] {
  if(p.ordered)return p.choices.map(c=>c.key);
  const own=[me.active,...me.bench], enemy=[opponent.active,...opponent.bench];
  const value=(choice:PromptView['choices'][number])=>{
    const c=choice.card;if(!c)return 0;
    const ownPokemon=own.find(p=>p.card?.id===c.id), enemyPokemon=enemy.find(p=>p.card?.id===c.id);
    if(p.type==='Choose pokemon') {
      if(enemyPokemon) return choice.label.includes('Bench')&&bestAttack(me.active,enemyPokemon,me)>=(c.hp||999)-enemyPokemon.damage?300:enemyPokemon.energy.length*40+enemyPokemon.damage;
      if(ownPokemon) return p.message.toLowerCase().includes('discard')?-(bestAttack(ownPokemon,opponent.active,me)*3)+ownPokemon.energy.length*5:bestAttack(ownPokemon,opponent.active,me)*3+(c.hp||0)-ownPokemon.damage;
    }
    const needed=me.active.card?.attacks.some(a=>energyMissing(a.cost,me.active.energy)>0&&energyMissing(a.cost,[...me.active.energy,c])<energyMissing(a.cost,me.active.energy));
    let score=c.kind==='energy'?(needed?100:me.hand.filter(c=>c.kind==='energy').length>2?15:60):c.stage==='Basic'?50+(c.hp||0)/10:['Bill','Professor Oak','Energy Removal'].includes(c.name)?65:35;
    if(p.message.toLowerCase().includes('starting')) score=(c.hp||0)+(c.name==='Hitmonchan'||c.name==='Electabuzz'?40:0);
    if(p.sourceZone==='opponent-board')return (c.provides?.length||1)*60;
    if(p.context==='discard')score=-score;
    return score;
  };
  if(p.type==='Select'&&p.message.toLowerCase().includes('draw'))return p.choices.slice(0,1).map(c=>c.key);
  const sorted=[...p.choices].sort((a,b)=>value(b)-value(a));
  const count=p.message.toLowerCase().includes('starting')?Math.min(4,p.max):p.sourceZone==='opponent-board' || p.sourceZone==='discard' && sorted.every(c=>c.card?.kind==='energy') ? Math.min(p.max,sorted.length) : Math.max(p.min,p.max?1:0);
  return sorted.slice(0,count).map(c=>c.key);
}
