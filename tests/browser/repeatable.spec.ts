import { test,expect,type Page } from '@playwright/test';
import type { MatchView } from '../../shared/protocol';
import { chooseAdvancedPrompt } from '../../server/bot';
async function start(page:Page,name:string){
 let state:MatchView|undefined;page.on('websocket',ws=>ws.on('framereceived',({payload})=>{const s=payload.toString();if(s.startsWith('42')){const[e,v]=JSON.parse(s.slice(2));if(e==='match:state')state=v;}}));
 await page.context().addCookies([{name:'table-fixture',value:name,url:'http://127.0.0.1:5174'}]);await page.goto('/');await page.getByRole('button',{name:'Play vs AI'}).click();await expect.poll(()=>state?.turn).toBe(5);return()=>state!;
}
const own=(p:Page)=>p.getByRole('region',{name:'Your battlefield',exact:true});
test('Damage Swap quantity, changed targets, Done and same-turn reentry on desktop and mobile',async({page})=>{
 const state=await start(page,'damage-swap');await page.setViewportSize({width:390,height:800});
 await own(page).locator('.active-area .card').click();await page.getByRole('button',{name:'Use Ability: Damage Swap'}).click();
 await page.getByRole('spinbutton',{name:'Counters to move'}).fill('2');await page.locator('.legal-target .card').click();await page.locator('.legal-target .card').click();
 await expect.poll(()=>state().players[0].bench[0].damage).toBe(20);expect(state().players[0].active.damage).toBe(0);await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.screenshot({path:'docs/screenshots/m5-damage-swap-390.png'});
 await page.getByRole('spinbutton',{name:'Counters to move'}).fill('1');await own(page).locator('.bench .legal-target .card').click();await page.keyboard.press('Escape');await expect(page.locator('.target-bar')).toContainText('move damage from');
 await own(page).locator('.bench .legal-target .card').click();await own(page).locator('.active-area .legal-target .card').click();await expect.poll(()=>state().players[0].active.damage).toBe(10);
 await page.getByRole('button',{name:'Done',exact:true}).click();await expect(page.locator('.target-bar')).toHaveCount(0);expect(state().turn).toBe(5);
 await own(page).locator('.active-area .card').click();await page.getByRole('button',{name:'Use Ability: Damage Swap'}).click();await expect(page.locator('.target-bar')).toContainText('Damage Swap mode');
 await page.reload();await expect(page.locator('.target-bar')).toContainText('Damage Swap mode');await page.getByRole('button',{name:'Done',exact:true}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('Energy Trans repeatedly selects actual attachments and keeps the inspector closed',async({page})=>{
 const state=await start(page,'energy-trans');await own(page).locator('.active-area .card').click();await page.getByRole('button',{name:'Use Ability: Energy Trans'}).click();
 for(let i=1;i<=2;i++){await own(page).locator('.active-area .attachment.legal-source').first().click();await own(page).locator('.bench .legal-target .card').click();await expect.poll(()=>state().players[0].bench[0].energy.length).toBe(i);await expect(page.getByRole('dialog')).toHaveCount(0);}
 await own(page).locator('.bench .attachment.legal-source').first().click();await own(page).locator('.active-area .legal-target .card').click();await expect.poll(()=>state().players[0].active.energy.length).toBe(1);
 await page.getByRole('button',{name:'Done',exact:true}).click();expect(state().turn).toBe(5);
});
for(const [name,label]of [['ice-dance','Ice Dance'],['super-cold','Super Cold'],['excited-turbo','Excited Turbo']])test(`${label}: direct Energy targeting and safe continuous activation`,async({page})=>{
 await page.route('https://images.pokemontcg.io/**',r=>r.fulfill({path:'public/cards/base1/102.png'}));
 const state=await start(page,name);await own(page).locator('.active-area .card').click();await page.getByRole('button',{name:`Use Ability: ${label}`} ).click();
 const energy=name==='excited-turbo'?'Fire Energy':'Water Energy';
 for(let i=1;i<=2;i++){
   await page.getByRole('region',{name:'Your hand'}).getByRole('button',{name:energy,exact:true}).first().click();
   if(name!=='super-cold')await expect(own(page).locator('.active-area .legal-target')).toHaveCount(0);
   await own(page).locator('.bench .legal-target .card').first().click();await expect.poll(()=>state().players[0].bench[0].energy.length).toBe(i);
   if(i===1&&name!=='ice-dance')await page.getByRole('button',{name:'Continue',exact:true}).click();
 }
 await page.getByRole('button',{name:'Done',exact:true}).click();expect(state().turn).toBe(5);await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('expanded catalog loads on demand, caps rendered cards and preserves format on saved decks',async({page})=>{
 await page.route('https://images.pokemontcg.io/**',r=>r.fulfill({path:'public/cards/base1/102.png'}));
 await page.goto('/');await page.getByRole('button',{name:'Deck Builder',exact:true}).click();await page.getByLabel('Deck format').selectOption('engine-sandbox');
 await expect(page.locator('.builder-heading')).toContainText('13792 printings',{timeout:20000});await expect(page.locator('.catalog-card')).toHaveCount(96);
 await page.getByLabel('Search cards').fill('Baxcalibur');await page.getByRole('button',{name:'Inspect Baxcalibur PAL 60',exact:true}).click();await page.getByRole('button',{name:'Add to Deck',exact:true}).click();await page.getByRole('button',{name:'Close dialog'}).click();
 await page.getByLabel('Deck name').fill('Cold laboratory');await page.getByRole('button',{name:/Save deck/}).click();await page.reload();await page.getByRole('button',{name:'Deck Builder',exact:true}).click();await page.getByLabel('Load a saved deck').selectOption({label:'Cold laboratory'});await expect(page.getByLabel('Deck format')).toHaveValue('engine-sandbox');
 await expect(page.locator('.deck-entry-name')).toContainText('Baxcalibur');await page.getByLabel('Deck format').selectOption('base-fossil-1999');await expect(page.locator('.deck-errors')).toContainText('not legal');
 await page.setViewportSize({width:320,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('Worlds 2024 offers three researched opponents and starts the chosen historical snapshot',async({page})=>{
 await page.route('https://images.pokemontcg.io/**',r=>r.fulfill({path:'public/cards/base1/102.png'}));
 let state:MatchView|undefined;page.on('websocket',ws=>ws.on('framereceived',({payload})=>{const s=payload.toString();if(s.startsWith('42')){const[e,v]=JSON.parse(s.slice(2));if(e==='match:state')state=v;}}));
 await page.goto('/');await page.getByRole('combobox',{name:'Format',exact:true}).selectOption('worlds-2024');
 await expect(page.getByLabel('AI opponent').locator('option')).toHaveCount(3);
 await expect(page.getByLabel('Player deck').locator('option').filter({hasText:'Iron Thorns · Cifuentes 2024'})).toHaveCount(1,{timeout:20000});
 await page.getByLabel('Player deck').selectOption({label:'Iron Thorns · Cifuentes 2024'});await page.getByLabel('AI opponent').selectOption('roaring-moon-2024');
 await expect(page.getByRole('button',{name:'Play vs AI'})).toBeEnabled();await page.getByRole('button',{name:'Play vs AI'}).click();await expect.poll(()=>!!state).toBe(true);
 for(let n=0;n<30&&state!.turn===0;n++){
  const v=state!,p=v.prompt;
  if(p){const keys=chooseAdvancedPrompt(p,v.players[0],v.players[1]);
   if(p.mulliganDraw){await page.getByLabel('Additional cards to draw:').selectOption(keys[0]);await page.getByRole('button',{name:/^(Draw \d+ Cards?|Continue Without Drawing)$/}).click();}
   else{for(const key of keys)await page.locator('.selection-option').nth(p.choices.findIndex(c=>c.key===key)).click();await page.getByRole('button',{name:keys.length?'Confirm choice':'Confirm without selecting',exact:true}).click();}
  }
  await expect.poll(()=>state?.revision,{timeout:15000}).not.toBe(v.revision);
 }
 expect(state!.format).toBe('Worlds 2024 · Experimental');expect(state!.turn).toBeGreaterThan(0);expect(state!.players[1].name).toContain('Roaring Moon');expect(state!.players[1].hand).toEqual([]);
 await page.screenshot({path:'docs/screenshots/m5-worlds-2024.png'});
});
