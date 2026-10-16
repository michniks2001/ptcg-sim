import {test,expect,type Page} from '@playwright/test';
import type {MatchView} from '../../shared/protocol';
async function start(page:Page,fixture='interactions'){
 let state:MatchView|undefined;
 page.on('websocket',ws=>ws.on('framereceived',({payload})=>{const text=payload.toString();if(text.startsWith('42')){const[event,data]=JSON.parse(text.slice(2));if(event==='match:state')state=data;}}));
 await page.context().addCookies([{name:'table-fixture',value:fixture,url:'http://127.0.0.1:5174'}]);await page.goto('/');await page.getByRole('button',{name:'Play vs AI'}).click();await expect.poll(()=>state?.turn).toBe(5);return()=>state!;
}
const own=(page:Page)=>page.getByRole('region',{name:'Your battlefield',exact:true});
const hand=(page:Page,name:string)=>page.getByRole('region',{name:'Your hand'}).getByRole('button',{name,exact:true}).first();
const active=(page:Page)=>own(page).locator('.active-area .card');
const feedback=(page:Page)=>page.getByRole('status',{name:'Gameplay feedback'});
const screenshot=async(page:Page,name:string)=>{await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`docs/screenshots/m4-${name}.png`,fullPage:true});};
const noOverflow=async(page:Page)=>expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
const handInView=async(page:Page)=>{
 const hand=page.getByRole('region',{name:'Your hand'});await expect(hand).toBeVisible();
 const bounds=await hand.boundingBox();
 expect(bounds!.y).toBeGreaterThanOrEqual(0);expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
 expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);
};

test('Energy targeting remains visible, keyboard usable, cancellable and responsive',async({page})=>{
 const state=await start(page);
 for(const [width,height] of [[1280,800],[760,800],[390,800],[320,800],[1280,720],[390,667],[1680,1050]]){
  await page.setViewportSize({width,height});await handInView(page);if(width===1280&&height===800)await screenshot(page,'tabletop-1280');await hand(page,'Fire Energy').click();await page.getByRole('button',{name:'Attach Energy',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('.legal-target')).toHaveCount(2);await expect(page.getByRole('region',{name:'Battlefield targeting'})).toContainText('attach Fire Energy');
  await expect(page.getByRole('region',{name:'Opponent battlefield'}).locator('.card').first()).toBeDisabled();await expect(active(page)).toBeFocused();await noOverflow(page);await handInView(page);
  const targetBounds=await active(page).boundingBox();const fieldBounds=await page.locator('.playmat').boundingBox();
  expect(targetBounds!.y).toBeGreaterThanOrEqual(fieldBounds!.y);expect(targetBounds!.y+targetBounds!.height).toBeLessThanOrEqual(fieldBounds!.y+fieldBounds!.height);
  expect((await hand(page,'Fire Energy').boundingBox())!.width).toBeGreaterThanOrEqual(90);
  if(width===1280&&height===800)expect((await active(page).boundingBox())!.width).toBeGreaterThan(75);
  await screenshot(page,`targeting-${width}${height<800?`-${height}`:''}`);await page.keyboard.press('Escape');await expect(page.locator('.target-bar')).toHaveCount(0);expect(state().players[0].active.energy).toHaveLength(0);
 }
 await hand(page,'Fire Energy').click();await page.getByRole('button',{name:'Attach Energy',exact:true}).click();const before=state().revision;
 await active(page).evaluate(button=>{(button as HTMLButtonElement).click();(button as HTMLButtonElement).click();});
 await expect.poll(()=>state().players[0].active.energy.length).toBe(1);expect(state().revision).toBe(before+1);await expect(own(page).getByRole('button',{name:'Inspect attached Fire Energy'})).toBeVisible();await expect(own(page).locator('.energy-symbol image')).toHaveAttribute('href','/cards/base1/98.png');await expect(feedback(page)).toContainText('Fire Energy attached to Charmander');await screenshot(page,'attachment-callout');
 await expect(page.getByText('Make your next move.')).toHaveCount(0);await expect(page.getByText('At your own pace',{exact:false})).toHaveCount(0);await expect(page.getByRole('button',{name:'End turn'})).toBeVisible();await expect(page.getByRole('list',{name:'Match log'})).toBeVisible();
});

test('Gust is mandatory opponent targeting, survives reload, and cannot be cancelled',async({page})=>{
 const state=await start(page,'gust');await hand(page,'Gust of Wind').click();await page.getByRole('button',{name:'Play Trainer'}).click();await expect(page.locator('.target-bar')).toBeVisible();const id=state().prompt!.id;
 await page.keyboard.press('Escape');await expect(page.locator('.target-bar')).toBeVisible();await expect(page.getByRole('button',{name:/Cancel targeting|Cancel action/})).toHaveCount(0);await expect(own(page).locator('.card').first()).toBeDisabled();
 await page.reload();await expect(page.locator('.target-bar')).toBeVisible();expect(state().prompt!.id).toBe(id);await expect(feedback(page)).toHaveCount(0);
 await page.getByRole('region',{name:'Opponent battlefield'}).locator('.legal-target .card').click();await expect.poll(()=>state().players[1].active.card?.name).toBe('Rattata');
});

test('Energy Trans preserves Energy source choice then selects destination on the field',async({page})=>{
 const state=await start(page,'energy-trans');await active(page).click();await page.getByRole('button',{name:'Use Ability: Energy Trans'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('.attachment.legal-source')).toHaveCount(2);await page.locator('.attachment.legal-source').first().click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('.legal-target')).toHaveCount(1);await page.locator('.legal-target .card').click();await expect.poll(()=>state().players[0].bench[0].energy.length).toBe(1);await expect(own(page).locator('.active-area .attachment')).toHaveCount(1);await expect(own(page).locator('.bench .attachment')).toHaveCount(1);
});

test('Damage Swap selects source and destination on the battlefield',async({page})=>{
 const state=await start(page,'damage-swap');await active(page).click();await page.getByRole('button',{name:'Use Ability: Damage Swap'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await page.locator('.legal-target .card').click();await expect(page.locator('.target-bar')).toContainText('receive 10 damage');await page.locator('.legal-target .card').click();await expect.poll(()=>state().players[0].active.damage).toBe(10);expect(state().players[0].bench[0].damage).toBe(10);
});

test('Field Effects describes restrictions, suppression and the empty state',async({page})=>{
 await start(page,'effects');await page.getByRole('button',{name:/Field Effects/}).click();await expect(page.getByRole('dialog')).toContainText('Prehistoric Power');await expect(page.getByRole('dialog')).toContainText('Both players');await screenshot(page,'field-effects');await page.getByRole('button',{name:'Close dialog'}).click();
 await hand(page,'PlusPower').click();await page.getByRole('button',{name:'Play Trainer'}).click();await expect(own(page).getByRole('button',{name:'Inspect attached PlusPower'})).toBeVisible();await own(page).getByRole('button',{name:'Inspect effects on Scyther'}).click();await expect(page.getByRole('dialog')).toContainText('PlusPower');await expect(page.getByRole('dialog')).toContainText('Prehistoric Power');await screenshot(page,'pokemon-effects');
});

test('Muk field suppression excludes disabled Prehistoric Power and reflects reload',async({page})=>{
 await start(page,'gas');await page.getByRole('button',{name:/Field Effects/}).click();await expect(page.getByRole('dialog')).toContainText('Toxic Gas');await expect(page.getByRole('dialog').getByRole('heading',{name:'Prehistoric Power'})).toHaveCount(0);await page.keyboard.press('Escape');await page.reload();await own(page).getByRole('button',{name:'Inspect effects on Aerodactyl'}).click();await expect(page.getByRole('dialog')).toContainText('Pokémon Powers suppressed');
});

test('Field Effects has an explicit empty state',async({page})=>{await start(page);await page.getByRole('button',{name:/Field Effects/}).click();await expect(page.getByRole('dialog')).toContainText('No active field effects.');});

for(const [condition,rotation]of[['ASLEEP',-90],['PARALYZED',90],['CONFUSED',180]]as const)test(`${condition} rotates only artwork and remains inspectable at every viewport`,async({page})=>{
 const state=await start(page,`conditions-${condition}`);await expect(own(page).locator('.active-area .card-orientation')).toHaveAttribute('data-rotation',String(rotation));
 for(const width of[1280,760,390,320]){
  await page.setViewportSize({width,height:800});await noOverflow(page);await handInView(page);const art=await own(page).locator('.active-area .pokemon-art').boundingBox();const image=await active(page).boundingBox();expect(image!.x).toBeGreaterThanOrEqual(art!.x-1);expect(image!.x+image!.width).toBeLessThanOrEqual(art!.x+art!.width+1);expect(image!.y).toBeGreaterThanOrEqual(art!.y-1);expect(image!.y+image!.height).toBeLessThanOrEqual(art!.y+art!.height+1);
  expect(await own(page).locator('.active-area .attachments').evaluate(e=>getComputedStyle(e).transform)).toBe('none');await expect(own(page).locator('.active-area .damage')).toHaveText('20');await screenshot(page,`${condition.toLowerCase()}-${width}`);
 }
 await own(page).getByRole('button',{name:'Inspect poisoned condition on Charmander'}).click();await expect(page.getByRole('dialog')).toContainText('10 damage');if(condition==='CONFUSED')await expect(page.getByRole('dialog')).toContainText('20 damage');await page.keyboard.press('Escape');await active(page).click();await expect(page.getByRole('dialog')).toHaveAccessibleName('Charmander');await page.keyboard.press('Escape');await page.reload();await expect(own(page).locator('.active-area .card-orientation')).toHaveAttribute('data-rotation',String(rotation));
 await hand(page,'Charmeleon').click();await page.getByRole('button',{name:'Evolve Pokémon'}).click();await own(page).locator('.active-area .legal-target .card').click();await expect.poll(()=>state().players[0].active.conditions.length).toBe(0);await expect(own(page).locator('.active-area .card-orientation')).toHaveAttribute('data-rotation','0');await expect(own(page).locator('.active-area .attachment')).toHaveCount(3);
});

test('display-only Burn and Tool fixtures coexist with Poison, DCE, damage and rotation',async({page})=>{
 await start(page,'display-fixture');await expect(own(page).locator('.active-area .status-counter')).toHaveCount(3);await expect(own(page).locator('.active-area .special-energy')).toHaveCount(1);await expect(own(page).locator('.active-area .tool')).toHaveCount(1);await expect(own(page).locator('.active-area .attachment')).toHaveCount(3);const special=own(page).locator('.active-area .special-energy');
 await expect(special).toHaveText('');await expect(special.locator('svg')).toHaveAttribute('viewBox','58 94 136 136');await expect(special.locator('image')).toHaveCount(1);await expect(special.locator('image')).toHaveAttribute('href',/base1\/96\.png$/);
 const basicBox=await own(page).locator('.active-area .basic-energy').boundingBox();const specialBox=await special.boundingBox();
 expect(specialBox!.width).toBe(basicBox!.width);expect(specialBox!.height).toBe(basicBox!.height);
 await screenshot(page,'burn-tool-display-fixture');
 await own(page).getByRole('button',{name:'Inspect attached Double Colorless Energy'}).click();await expect(page.getByRole('dialog')).toHaveAccessibleName('Double Colorless Energy');await page.keyboard.press('Escape');await own(page).getByRole('button',{name:'Inspect attached Tool display fixture · Pokémon Tool',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Tool display fixture');await page.keyboard.press('Escape');await page.setViewportSize({width:320,height:800});await noOverflow(page);await screenshot(page,'burn-tool-mobile-display-fixture');
});

test('real Trainer, attack and ordered server coins animate and do not replay after reconnect',async({page})=>{
 const state=await start(page,'coin');await page.evaluate(()=>{(window as any).seenCoins=[];new MutationObserver(()=>{document.querySelectorAll('.game-callout.coin').forEach(e=>{const id=Number(e.getAttribute('data-event-id'));if(!(window as any).seenCoins.includes(id))(window as any).seenCoins.push(id);});}).observe(document.body,{childList:true,subtree:true});});await hand(page,'Bill').click();await page.getByRole('button',{name:'Play Trainer'}).click();await expect(feedback(page)).toContainText('Bill — Trainer played');await screenshot(page,'trainer-callout');await expect(feedback(page)).toHaveCount(0);
 await active(page).click();await page.getByRole('button',{name:'Attack: Fury Attack',exact:true}).click();await expect(feedback(page)).toContainText('Doduo used Fury Attack!');await screenshot(page,'attack-callout');await expect(page.locator('.flip-coin').first()).toBeVisible();await screenshot(page,'coin-callout');await expect(feedback(page).locator('.coin > span:last-child').first()).toHaveCSS('opacity','1');await screenshot(page,'coin-reveal');
 const coins=state().events!.filter(e=>e.kind==='coin').slice(-2);expect(coins).toHaveLength(2);expect(coins[0].id).toBeLessThan(coins[1].id);for(const coin of coins)expect(state().logs.some(l=>l.toLowerCase().includes(`flips ${coin.result!.toLowerCase()}`))).toBe(true);
 await expect.poll(()=>state().activePlayer).toBe(1);await expect(feedback(page)).toHaveCount(0);expect(await page.evaluate(()=>(window as any).seenCoins)).toEqual(coins.map(c=>c.id));await page.reload();await expect(own(page)).toBeVisible();await expect(feedback(page)).toHaveCount(0);
});

test('reduced motion retains authoritative results and removes rotation/coin animation',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await start(page,'coin');await active(page).click();await page.getByRole('button',{name:'Attack: Fury Attack',exact:true}).click();await expect(page.locator('.flip-coin').first()).toBeVisible();expect(await page.locator('.flip-coin').first().evaluate(e=>getComputedStyle(e).animationName)).toBe('none');await expect(feedback(page)).toContainText(/Heads|Tails/);
});
