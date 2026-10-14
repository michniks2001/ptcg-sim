import { test, expect, type Page } from '@playwright/test';
import type { MatchView } from '../../shared/protocol';
async function start(page:Page,fixture:string) {
  let state:MatchView|undefined;
  page.on('websocket',ws=>ws.on('framereceived',({payload})=>{const raw=payload.toString();if(raw.startsWith('42')){const [event,value]=JSON.parse(raw.slice(2));if(event==='match:state')state=value;}}));
  await page.context().addCookies([{name:'table-fixture',value:fixture,url:'http://127.0.0.1:5174'}]);await page.goto('/');
  await page.getByRole('button',{name:'Play vs AI'}).click();await expect.poll(()=>state?.turn).toBe(5);return()=>state!;
}
async function retreat(page:Page) {
  await page.getByRole('region',{name:'Your battlefield',exact:true}).locator('.active-area .card').click();
  await page.getByRole('dialog').getByRole('button',{name:'Retreat',exact:true}).click();
  await page.locator('.legal-target').getByRole('button',{name:'Rattata',exact:true}).click();
}
const dialog=(page:Page)=>page.getByRole('dialog');
const energy=(page:Page,name:string)=>dialog(page).getByRole('button',{name,exact:true});
const confirm=(page:Page)=>dialog(page).getByRole('button',{name:'Confirm choice',exact:true});

for(const [fixture,count] of [['retreat-identical',3],['retreat-exact',1]] as const)test(`paid retreat explicitly selects attached Energy: ${fixture}`,async({page})=>{
  const state=await start(page,fixture);const before=state().players[0];await retreat(page);
  await expect(dialog(page)).toHaveAccessibleName('Choose Energy payment');await expect(dialog(page).locator('.selection-option')).toHaveCount(count);
  expect(state().players[0].discard).toEqual(before.discard);expect(state().players[0].active.card?.name).toBe('Charmander');
  const chosen=state().prompt!.choices.at(-1)!.card!.id;
  await dialog(page).locator('.selection-option').last().click();await confirm(page).click();
  await expect.poll(()=>state().players[0].active.card?.name).toBe('Rattata');
  expect(state().players[0].discard.map(c=>c.id)).toEqual([chosen]);expect(state().players[0].bench[0].energy).toHaveLength(count-1);
});

test('retreat can discard Double Colorless as one card for a one-Energy cost',async({page})=>{
  const state=await start(page,'retreat-special');await retreat(page);await energy(page,'Double Colorless Energy').click();
  await expect(dialog(page).locator('.selection-count')).toContainText('1 card selected · Retreat cost: 1 Energy');await confirm(page).click();
  await expect.poll(()=>state().players[0].active.card?.name).toBe('Rattata');expect(state().players[0].discard.map(c=>c.name)).toEqual(['Double Colorless Energy']);
  expect(state().players[0].bench[0].energy.map(c=>c.name)).toEqual(['Fire Energy','Water Energy']);
});

test('discard order is visible on desktop/mobile and illegal extra payment stays server-rejected',async({page})=>{
  const state=await start(page,'retreat-order');await retreat(page);
  await energy(page,'Fire Energy').click();await energy(page,'Double Colorless Energy').click();
  await expect(energy(page,'Fire Energy').locator('.selection-number')).toHaveText('1');await expect(energy(page,'Double Colorless Energy').locator('.selection-number')).toHaveText('2');
  for(const width of [1280,320]){
    await page.setViewportSize({width,height:800});const box=(await dialog(page).boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width);expect(box.y+box.height).toBeLessThanOrEqual(800);
    await expect(confirm(page)).toBeInViewport();await page.screenshot({path:`docs/screenshots/retreat-energy-${width}.png`});
  }
  await energy(page,'Fire Energy').click();await energy(page,'Double Colorless Energy').click();
  await energy(page,'Double Colorless Energy').click();await energy(page,'Fire Energy').click();
  const before=state();await confirm(page).click();await expect(dialog(page).getByRole('alert')).toContainText('engine rejected');expect(state().revision).toBe(before.revision);expect(state().players).toEqual(before.players);
  await energy(page,'Double Colorless Energy').click();await energy(page,'Fire Energy').click();
  await energy(page,'Fire Energy').click();await energy(page,'Double Colorless Energy').click();
  await confirm(page).evaluate(button=>{(button as HTMLButtonElement).click();(button as HTMLButtonElement).click();});
  await expect.poll(()=>state().players[0].active.card?.name).toBe('Rattata');expect(state().revision).toBe(before.revision+1);
  expect(state().players[0].discard.map(c=>c.name)).toEqual(['Fire Energy','Double Colorless Energy']);expect(state().players[0].bench[0].energy.map(c=>c.name)).toEqual(['Water Energy']);
});

test('pending payment survives reload and an explicit cancellation leaves Energy attached',async({page})=>{
  const state=await start(page,'retreat-identical');await retreat(page);const before=state();
  await page.reload();await expect(dialog(page)).toHaveAccessibleName('Choose Energy payment');expect(state().prompt?.id).toBe(before.prompt?.id);expect(state().players).toEqual(before.players);
  await dialog(page).getByRole('button',{name:'Cancel action',exact:true}).click();await expect(dialog(page)).toHaveCount(0);
  expect(state().players).toEqual(before.players);await retreat(page);await expect(dialog(page)).toHaveAccessibleName('Choose Energy payment');
});

test('free retreat still uses battlefield selection without an Energy dialog',async({page})=>{
  const state=await start(page,'effects');await retreat(page);await expect.poll(()=>state().players[0].active.card?.name).toBe('Rattata');await expect(dialog(page)).toHaveCount(0);expect(state().players[0].discard).toEqual([]);
});
