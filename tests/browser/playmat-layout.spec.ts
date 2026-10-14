import { test, expect, type Page, type Locator } from '@playwright/test';
import type { MatchView } from '../../shared/protocol';
const sizes=[[1650,930],[1280,800],[760,800],[390,800],[320,800]] as const;
const side=(page:Page,opponent=false)=>page.getByRole('region',{name:opponent?'Opponent battlefield':'Your battlefield',exact:true});
const bounds=async(locator:Locator)=>{const b=await locator.boundingBox();expect(b).not.toBeNull();return b!;};
const cx=(r:{x:number;width:number})=>r.x+r.width/2;
async function start(page:Page,fixture:string) {
 let state:MatchView|undefined;
 page.on('websocket',ws=>ws.on('framereceived',({payload})=>{const text=payload.toString();if(text.startsWith('42')){const[event,data]=JSON.parse(text.slice(2));if(event==='match:state')state=data;}}));
 await page.context().addCookies([{name:'table-fixture',value:fixture,url:'http://127.0.0.1:5174'}]);
 await page.goto('/');await page.getByRole('button',{name:'Play vs AI'}).click();await expect.poll(()=>state?.turn).toBe(5);return()=>state!;
}
async function shot(page:Page,name:string) {await page.screenshot({path:`docs/screenshots/layout-correction/${name}.png`,fullPage:true});}
async function handVisible(page:Page) {
 const h=await bounds(page.getByRole('region',{name:'Your hand'}));expect(h.y).toBeGreaterThan(0);expect(h.y+h.height).toBeLessThanOrEqual(page.viewportSize()!.height);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
}
async function geometry(page:Page) {
 const surface=await bounds(page.locator('.table-surface'));
 const own=await bounds(side(page).locator('.active-area .pokemon-art'));
 const opponent=await bounds(side(page,true).locator('.active-area .pokemon-art'));
 expect(Math.abs(cx(own)-cx(surface))).toBeLessThan(2);expect(Math.abs(cx(opponent)-cx(own))).toBeLessThan(2);
 expect(own.y-opponent.y-opponent.height).toBeGreaterThan(8);expect(own.y-opponent.y-opponent.height).toBeLessThan(65);
 for(const isOpponent of [false,true]) {
  const player=side(page,isOpponent);const active=await bounds(player.locator('.active-area'));
  const bench=await bounds(player.locator('.bench'));
  expect(Math.abs(cx(bench)-cx(own))).toBeLessThan(2);
  if(isOpponent)expect(bench.y+bench.height).toBeLessThan(active.y);
  else expect(active.y+active.height).toBeLessThan(bench.y);
  const slots=player.locator('.bench .pokemon-slot');await expect(slots).toHaveCount(5);
  let previous=await bounds(slots.first());const width=previous.width;
  for(let i=1;i<5;i++){const next=await bounds(slots.nth(i));const gap=next.x-previous.x-previous.width;expect(gap).toBeGreaterThanOrEqual(12);expect(gap).toBeLessThanOrEqual(20);expect(Math.abs(next.width-width)).toBeLessThan(1);previous=next;}
  expect(bench.width).toBeLessThanOrEqual(width*5+80);
  const prize=await bounds(player.locator('.prize').first());expect(prize.width/width).toBeGreaterThanOrEqual(.5);expect(prize.width/width).toBeLessThanOrEqual(.7);expect(prize.height/prize.width).toBeCloseTo(330/240,1);
  const prizes=await bounds(player.locator('.prize-area'));expect(prizes.x+prizes.width).toBeLessThan(bench.x);
  const firstPrize=await bounds(player.locator('.prize').nth(0));const thirdPrize=await bounds(player.locator('.prize').nth(2));expect(thirdPrize.y).toBeGreaterThan(firstPrize.y+firstPrize.height);
  const deck=await bounds(player.locator('.deck'));expect(deck.width/width).toBeGreaterThanOrEqual(.65);expect(deck.width/width).toBeLessThanOrEqual(.9);
  const discard=await bounds(player.locator('.discard-stack'));expect(Math.abs(deck.width-discard.width)).toBeLessThan(1);expect(deck.x).toBeGreaterThan(bench.x+bench.width);
  await expect(player.locator('.prize img,.deck img')).toHaveCount(0);
 }
 await handVisible(page);
}
for(const [width,height] of sizes)for(const count of width>=760?[1,3,5]:[5])test(`${width}×${height}: centered Actives, compact ${count}-card Benches and physical side zones`,async({page})=>{
 await page.setViewportSize({width,height});const state=await start(page,`layout-${count}`);
 for(const player of [side(page),side(page,true)])await expect(player.locator('.bench .card')).toHaveCount(count);
 await geometry(page);
 if(width>=1280){const mat=await page.locator('.playmat').evaluate(e=>({content:e.scrollHeight,available:e.clientHeight}));expect(mat.content).toBeLessThanOrEqual(mat.available+1);}
 if(width===760)expect(await page.locator('.playmat').evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
 await shot(page,`table-${count}-bench-${width}`);
 const top=state().players[0].discard.at(-1)!;await expect(side(page).locator('.discard-stack img')).toHaveAttribute('src',top.image);
 if(width<=390){
  // Pan the real scroll surface; every card and side zone stays reachable.
  await page.locator('.playmat').hover();const before=await page.locator('.playmat').evaluate(e=>e.scrollLeft);await page.mouse.wheel(180,0);await expect.poll(()=>page.locator('.playmat').evaluate(e=>e.scrollLeft)).toBeGreaterThan(before);
  for(let i=0;i<5;i++){await side(page).locator('.bench .card').nth(i).scrollIntoViewIfNeeded();const b=await bounds(side(page).locator('.bench .card').nth(i));const mat=await bounds(page.locator('.playmat'));expect(b.x).toBeGreaterThanOrEqual(mat.x);expect(b.x+b.width).toBeLessThanOrEqual(mat.x+mat.width);}
  await side(page).locator('.prize-area').scrollIntoViewIfNeeded();await shot(page,`prizes-${width}`);
  await side(page).locator('.pile-area').scrollIntoViewIfNeeded();await shot(page,`deck-discard-${width}`);await handVisible(page);
 }
 await side(page).getByRole('button',{name:/Your Discard Pile/}).click();await expect(page.getByRole('dialog')).toContainText(top.name);await page.getByRole('button',{name:'Close dialog'}).click();
});

test('rotated Active with resources remains centered and clear of its Bench and other controls',async({page})=>{
 await start(page,'layout-5-status');
 for(const [width,height]of sizes){
  await page.setViewportSize({width,height});await geometry(page);
  const player=side(page);await player.locator('.active-area').scrollIntoViewIfNeeded();
  const art=await bounds(player.locator('.active-area .pokemon-art'));const card=await bounds(player.locator('.active-area .card'));
  expect(card.x).toBeGreaterThanOrEqual(art.x-1);expect(card.x+card.width).toBeLessThanOrEqual(art.x+art.width+1);
  const indicators=player.locator('.active-area .pokemon-details');const detail=await bounds(indicators);expect(detail.x).toBeGreaterThan(art.x+art.width);
  await expect(player.locator('.active-area .basic-energy')).toHaveCount(2);await expect(player.locator('.active-area .special-energy')).toHaveCount(1);
  await shot(page,`rotated-resources-${width}`);
 }
 await side(page).getByRole('button',{name:'Inspect attached Double Colorless Energy'}).click();await expect(page.getByRole('dialog')).toHaveAccessibleName('Double Colorless Energy');
});

test('an engine-resolved last Prize victory keeps the empty Active and both full Benches in place',async({page})=>{
 await page.setViewportSize({width:1650,height:930});const state=await start(page,'layout-finish');
 const initialX=cx(await bounds(side(page,true).locator('.active-area .pokemon-slot')));
 await side(page).locator('.active-area .card').click();await page.getByRole('button',{name:'Attack: Scratch',exact:true}).click();
 // Twinleaf awards the final remaining Prize automatically and ends the match.

 await expect.poll(()=>state().winner).toBe(0);await expect(side(page,true).locator('.active-area .empty-slot')).toBeVisible();expect(state().fault).toBeUndefined();
 expect(cx(await bounds(side(page,true).locator('.active-area .pokemon-slot')))).toBeCloseTo(initialX,1);
 await expect(page.getByRole('button',{name:'End turn'})).toBeDisabled();await expect(page.getByRole('status',{name:'Gameplay feedback'})).toHaveCount(0);
 for(const [width,height]of sizes){await page.setViewportSize({width,height});await geometry(page);await expect(side(page,true).locator('.bench .card')).toHaveCount(5);await shot(page,`finished-empty-active-${width}`);}
});

test('a real knockout keeps the centered empty Active during mandatory replacement targeting',async({page})=>{
 await page.setViewportSize({width:1280,height:800});const state=await start(page,'layout-replacement');
 await expect.poll(()=>state().prompt?.type).toBe('Choose pokemon');await expect(side(page).locator('.active-area .empty-slot')).toBeVisible();await expect(side(page).locator('.bench .legal-target')).toHaveCount(5);
 await geometry(page);await shot(page,'knockout-replacement-1280');
 await side(page).locator('.bench .legal-target .card').last().click();await expect.poll(()=>state().players[0].active.card?.name).toBe('Scyther');await expect(side(page).locator('.active-area .card')).toHaveAccessibleName('Scyther');
});
