import { mulliganDraw } from './mulligans';
import { E } from './engine';
import { cardView, words } from './views';
import type { PromptView, BoardTarget } from '../shared/protocol';
type Choice = { key: string; label: string; value: any; card?: ReturnType<typeof cardView>; boardTarget?: BoardTarget; fromTarget?: BoardTarget; damageAmount?:number };
export function promptSpec(p: any, state: any): { view: PromptView; choices: Choice[]; scalar: boolean } {
  const choices: Choice[] = [];
  const options = p.options || {};
  let min = options.min ?? 1, max = options.max ?? 1, scalar = false;
  const player = state.players.find((x: any) => x.id === p.getPerspectivePlayerId());
  const add = (value: any, label: string, card?: any) => choices.push({ key: String(choices.length), value, label, card: card ? cardView(card) : undefined });
  const address = (target: any): BoardTarget => ({ playerId: target.player === E.PlayerType.BOTTOM_PLAYER ? player.id : state.players.find((x: any) => x.id !== player.id).id, slot: target.slot === E.SlotType.ACTIVE ? 'active' : 'bench', index: target.index });
  let battlefield: PromptView['battlefield'];
  let displayCards;
  let context: PromptView['context'];
  let payment: string[] | undefined;
  let paymentInOrder: boolean | undefined;
  let ordered = false;
  let sourceZone: PromptView['sourceZone'];
  let damageTotal:number|undefined;
  if (p instanceof E.ChooseCardsPrompt) {
    // Presentation metadata only; selection decoding/validation remains unchanged.
    if (p.cards === player.deck) { context = 'deck'; sourceZone='deck'; }
    else if (p.cards === player.discard) sourceZone='discard';
    else if ([player.active,...player.bench].includes(p.cards)) sourceZone='own-board';
    else if (state.players.filter((x:any)=>x.id!==player.id).some((x:any)=>[x.active,...x.bench].includes(p.cards))) sourceZone='opponent-board';
    else sourceZone='hand';
    if (p.message === 'CHOOSE_CARD_TO_DISCARD') context = 'discard';
    // The engine's validator defines selectable cards. Relax only cardinality for
    // a single-option probe; validate the entire final selection unchanged below.
    for (let i = 0; i < p.cards.cards.length; i++) {
      const original = p.options; p.options = { ...original, min: 0, max: Math.max(1, original.max) };
      try { if (p.validate([p.cards.cards[i]], state)) add(i, options.isSecret ? `Face-down card ${i + 1}` : p.cards.cards[i].name, options.isSecret ? undefined : p.cards.cards[i]); } finally { p.options = original; }
    }
  } else if (p instanceof E.AttachEnergyPrompt || p instanceof E.MoveEnergyPrompt || p instanceof E.MoveDamagePrompt) {
    battlefield = p instanceof E.MoveDamagePrompt ? 'damage' : 'attachment';
    const locations: { target: any; list: any; label: string }[] = [];
    for (const who of [E.PlayerType.BOTTOM_PLAYER, E.PlayerType.TOP_PLAYER]) {
      if (p.playerType !== E.PlayerType.ANY && p.playerType !== who) continue;
      const owner = state.players.find((x: any) => who === E.PlayerType.BOTTOM_PLAYER ? x.id === player.id : x.id !== player.id);
      for (const slot of p.slots) for (let index = 0; index < (slot === E.SlotType.ACTIVE ? 1 : owner.bench.length); index++) {
        const list = slot === E.SlotType.ACTIVE ? owner.active : owner.bench[index];
        if (list.getPokemonCard()) locations.push({target:{player:who,slot,index},list,label:`${owner.name} · ${slot === E.SlotType.ACTIVE ? 'Active' : `Bench ${index+1}`} · ${list.getPokemonCard().name}`});
      }
    }
    const same = (a: any,b: any) => a.player===b.player && a.slot===b.slot && a.index===b.index;
    const blocked = (list: any[] | undefined,t: any) => list?.some(b=>same(b,t));
    if (p instanceof E.AttachEnergyPrompt) {
      p.cardList.cards.forEach((card: any,index: number) => {
        if (!(card instanceof E.EnergyCard) || !E.matchesPromptFilter(card,p.filter) || options.blocked?.includes(index)) return;
        for (const to of locations) if (!blocked(options.blockedTo,to.target)) {
          const original = p.options; p.options = {...original, min: 0, max: Math.max(1, original.max)};
          let valid = false; try { valid = p.validate(p.decode([{index,to:to.target}],state),state); } finally { p.options = original; }
          if (valid) { add({index,to:to.target}, `${card.name} → ${to.label}`,card); choices.at(-1)!.boardTarget = address(to.target); }
        }
      });
      max = Math.min(options.max, p.cardList.cards.length);
    } else if (p instanceof E.MoveEnergyPrompt) {
      for (const from of locations) {
        if (blocked(options.blockedFrom,from.target)) continue;
        from.list.cards.forEach((card: any,index: number) => {
          if (!(card instanceof E.EnergyCard) || !E.matchesPromptFilter(card,p.filter) || options.blockedMap?.some((b: any)=>same(b.source,from.target) && b.blocked.includes(index))) return;
          for (const to of locations) if (to!==from && !blocked(options.blockedTo,to.target))  { add({from:from.target,to:to.target,index}, `${card.name}: ${from.label} → ${to.label}`,card); Object.assign(choices.at(-1)!, {boardTarget:address(to.target),fromTarget:address(from.target)}); }
        });
      }
      max = options.max ?? choices.length;
    } else {
      // Repeatable Powers can be invoked again. Each offer is one 10-damage transfer.
      max = options.max ?? 1;
      for (const from of locations) for (const to of locations) {
        if (from===to || from.list.damage<10 || blocked(options.blockedFrom,from.target) || blocked(options.blockedTo,to.target)) continue;
        const cap = p.maxAllowedDamage.find((m: any)=>same(m.target,to.target));
        if (cap && to.list.damage+10 >= cap.damage) continue;
        const value={from:from.target,to:to.target};
        if(p.validate([value],state)) { add(value, `Move 10 damage: ${from.label} → ${to.label}`,to.list.getPokemonCard()); Object.assign(choices.at(-1)!, {boardTarget:address(to.target),fromTarget:address(from.target)}); }
      }
    }
  } else if (p instanceof E.DiscardEnergyPrompt || p instanceof E.PutDamagePrompt) {
    const same=(a:any,b:any)=>a.player===b.player&&a.slot===b.slot&&a.index===b.index;
    let locations=0;
    if(p instanceof E.PutDamagePrompt)damageTotal=p.damage;
    for(const who of [E.PlayerType.BOTTOM_PLAYER,E.PlayerType.TOP_PLAYER]) {
      if(p.playerType!==E.PlayerType.ANY&&p.playerType!==who)continue;
      const owner=state.players.find((x:any)=>who===E.PlayerType.BOTTOM_PLAYER?x.id===player.id:x.id!==player.id);
      for(const slot of p.slots)for(let index=0;index<(slot===E.SlotType.ACTIVE?1:owner.bench.length);index++){
        const target={player:who,slot,index},list=slot===E.SlotType.ACTIVE?owner.active:owner.bench[index];
        if(!list.getPokemonCard())continue;
        const label=`${owner.name} · ${slot===E.SlotType.ACTIVE?'Active':`Bench ${index+1}`} · ${list.getPokemonCard().name}`;
        if(p instanceof E.DiscardEnergyPrompt){
          if(options.blockedFrom?.some((t:any)=>same(t,target)))continue;
          list.cards.forEach((c:any,i:number)=>{
            if(!(c instanceof E.EnergyCard)||!E.matchesPromptFilter(c,p.filter)||options.blockedMap?.some((b:any)=>same(b.source,target)&&b.blocked.includes(i)))return;
            add({from:target,index:i},`${c.name} from ${label}`,c);choices.at(-1)!.fromTarget=address(target);
          });
        }else{
          if(options.blocked?.some((t:any)=>same(t,target)))continue;
          locations++;
          const cap=p.maxAllowedDamage.find((m:any)=>same(m.target,target));
          const increment=options.damageMultiple||10;
          for(let damage=increment;damage<=Math.min(p.damage,cap?Math.max(0,cap.damage-list.damage):p.damage);damage+=increment){
            add({target,damage},`Place ${damage} damage on ${label}`,list.getPokemonCard());Object.assign(choices.at(-1)!,{boardTarget:address(target),damageAmount:damage});
          }
        }
      }
    }
    min=p instanceof E.PutDamagePrompt?options.allowPlacePartialDamage?0:1:options.min||0;
    max=p instanceof E.PutDamagePrompt?locations:options.max??choices.length;
  } else if (p instanceof E.OrderCardsPrompt) {
    ordered = true; min = max = p.cards.cards.length;
    p.cards.cards.forEach((c: any,i: number)=>add(i,c.name,c));
  } else if (p instanceof E.ChooseAttackPrompt) {
    scalar = true;
    p.cards.forEach((c: any,index: number)=>c.attacks.forEach((a: any)=>{if(p.validate(a,state)) add({index,attack:a.name},`${c.name} · ${a.name}`,c);}));
  } else if (p instanceof E.ChoosePokemonPrompt) {
    battlefield = 'pokemon';
    for (const who of [E.PlayerType.BOTTOM_PLAYER, E.PlayerType.TOP_PLAYER]) {
      if (p.playerType !== E.PlayerType.ANY && p.playerType !== who) continue;
      const owner = state.players.find((x: any) => who === E.PlayerType.BOTTOM_PLAYER ? x.id === player.id : x.id !== player.id);
      for (const slot of p.slots) for (let index = 0; index < (slot === E.SlotType.ACTIVE ? 1 : owner.bench.length); index++) {
        const target = { player: who, slot, index }; const list = slot === E.SlotType.ACTIVE ? owner.active : owner.bench[index];
        const original=p.options; p.options={...original,min:0,max:Math.max(1,original.max)};
        let valid=false; try {valid=!!list.getPokemonCard() && p.validate([list],state);} finally {p.options=original;}
        if (valid) { add(target, `${owner.name} · ${slot === E.SlotType.ACTIVE ? 'Active' : `Bench ${index + 1}`} · ${list.getPokemonCard().name}`, list.getPokemonCard()); choices.at(-1)!.boardTarget = address(target); }
      }
    }
  } else if (p instanceof E.ChoosePrizePrompt) {
    const owner = options.useOpponentPrizes ? state.players.find((x: any) => x.id !== player.id) : player;
    const prizes = owner.prizes.filter((l: any) => l.cards.length);
    min = max = Math.min(options.count, prizes.length);
    prizes.forEach((_: any, i: number) => { if (!(options.blocked || []).includes(i)) add(i, `Face-down Prize ${i + 1}`); });
  } else if (p instanceof E.ChooseEnergyPrompt) {
    min = 0; max = p.energy.length;
    paymentInOrder = !!p.options.payInOrder;
    payment = p.cost.map((type: number) => E.CardType[type]);
    p.energy.forEach((e: any, i: number) => add(i, e.card.name, e.card));
  } else if (p instanceof E.ConfirmPrompt) { scalar = true; add(true, 'Yes'); add(false, 'No');
  } else if (p instanceof E.SelectPrompt || p instanceof E.SelectOptionPrompt) { scalar = true; p.values.forEach((v: string, i: number) => { if (!options.disabled?.[i]) add(i, words(v)); });
  } else if (p instanceof E.ShowCardsPrompt || p instanceof E.ShowMulliganPrompt || p instanceof E.AlertPrompt) {
    scalar = true; add(true, 'Continue'); displayCards = (p.hands ? p.hands.flat() : p.cards || []).map(cardView);
  } else { throw Error(`Unsupported mandatory prompt: ${p.type}`); }
  return { view: { damageTotal, mulliganDraw: mulliganDraw(p, state, choices), battlefield, id: p.id, type: p.type, message: p.message === 'CHOOSE_STARTING_POKEMONS' ? 'Choose starting Pokémon' : words(p.message || p.type), min, max, cancel: !!options.allowCancel, choices: choices.map(({ value: _, ...c }) => c), displayCards, context, payment, paymentInOrder, ordered, sourceZone }, choices, scalar };
}
export function decodeSelection(p: any, state: any, keys: unknown): any {
  const spec = promptSpec(p, state);
  if (keys === null) { if (!spec.view.cancel) throw Error('This choice cannot be canceled.'); return null; }
  if (!Array.isArray(keys) || keys.some(k => typeof k !== 'string') || new Set(keys).size !== keys.length || keys.length < spec.view.min || keys.length > spec.view.max) throw Error('Select the required number of distinct choices.');
  const values = keys.map(k => { const c = spec.choices.find(c => c.key === k); if (!c) throw Error('Invalid choice.'); return c.value; });
  const decoded = p.decode(spec.scalar ? values[0] : values, state);
  if(p instanceof E.PutDamagePrompt){
    if(new Set(decoded.map((r:any)=>JSON.stringify(r.target))).size!==decoded.length)throw Error('Choose one damage amount per target.');
    if(decoded.reduce((n:number,r:any)=>n+r.damage,0)>p.damage)throw Error('Too much damage selected.');
  }
  if (p instanceof E.AttachEnergyPrompt || p instanceof E.MoveEnergyPrompt) {
    if (new Set(decoded.map((t: any)=>t.card)).size !== decoded.length) throw Error('Each Energy card can only be moved once.');
  }
  if (!p.validate(decoded, state)) throw Error('The engine rejected that selection.');
  return decoded;
}
