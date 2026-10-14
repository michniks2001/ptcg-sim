import { test, expect, type Page } from '@playwright/test';
import { io } from 'socket.io-client';
import type { MatchView, Reply } from '../../shared/protocol';

async function start(page: Page, seed: number) {
  let state: MatchView | undefined;let submissions=0;
  page.on('websocket',ws=>{
    ws.on('framereceived',({payload})=>{const raw=payload.toString();if(raw.startsWith('42')){const [event,data]=JSON.parse(raw.slice(2));if(event==='match:state')state=data;}});
    ws.on('framesent',({payload})=>{if(payload.toString().includes('"match:prompt"'))submissions++;});
  });
  await page.context().addCookies([{name:'table-fixture',value:`mulligan-${seed}`,url:'http://127.0.0.1:5174'}]);
  await page.goto('/');await page.getByRole('button',{name:'Play vs AI'}).click();await expect.poll(()=>!!state).toBe(true);
  return {state:()=>state!,submissions:()=>submissions};
}
async function finishSetup(page: Page, state:()=>MatchView) {
  if(state().turn===0){
    await expect(page.getByRole('dialog')).toHaveAccessibleName('Add Pokémon to your Bench');
    await expect(page.getByRole('button',{name:'Confirm without selecting'})).toBeVisible();
    await page.getByRole('button',{name:'Confirm without selecting'}).click();
  }
  await expect.poll(()=>state().turn).toBeGreaterThan(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(state().prompt?.mulliganDraw).toBeUndefined();expect(state().fault).toBeUndefined();
}
async function fit(page: Page) {
  const box=(await page.getByRole('dialog').first().boundingBox())!;const viewport=page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(0);expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x+box.width).toBeLessThanOrEqual(viewport.width);expect(box.y+box.height).toBeLessThanOrEqual(viewport.height);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const button=page.getByRole('button',{name:/^(Draw \d+ Cards?|Continue Without Drawing)$/});
  const footer=(await button.boundingBox())!;expect(footer.y+footer.height).toBeLessThanOrEqual(viewport.height);
}

test('one real mulligan: inspect cards, adjust count and draw in one action',async({page})=>{
  await page.setViewportSize({width:1280,height:800});const {state,submissions}=await start(page,9);
  await expect(page.getByRole('dialog')).toHaveAccessibleName('Opponent Mulligans');
  const hands=page.locator('.mulligan-hand');await expect(hands).toHaveCount(1);await expect(hands.locator('.card')).toHaveCount(7);
  expect(await hands.locator('.card').evaluateAll(cards=>cards.map(c=>c.getAttribute('aria-label')))).toEqual(state().mulligans!.opponent[0].map(c=>c.name));
  await expect(page.getByRole('button',{name:'Draw 2 Cards',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Draw one more card'})).toBeDisabled();
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(1);
  await fit(page);await page.screenshot({path:'docs/screenshots/mulligan-single-desktop.png'});
  await page.getByRole('button',{name:'Draw one fewer card'}).click();await expect(page.getByRole('button',{name:'Draw 1 Card',exact:true})).toBeVisible();
  await hands.locator('.card').first().click();await expect(page.getByRole('dialog').last()).toHaveAccessibleName(state().mulligans!.opponent[0][0].name);
  await page.keyboard.press('Escape');await expect(hands.locator('.card').first()).toBeFocused();
  await expect(page.getByRole('button',{name:'Draw 1 Card',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Draw 1 Card',exact:true}).evaluate(button=>{(button as HTMLButtonElement).click();(button as HTMLButtonElement).click();});
  await expect.poll(()=>submissions()).toBe(1);
  await expect.poll(()=>state().prompt?.mulliganDraw).toBeUndefined();await finishSetup(page,state);
});

test('two hands stay separate, zero is allowed and no acknowledgement follows',async({page})=>{
  const {state}=await start(page,69);await expect(page.locator('.mulligan-hand')).toHaveCount(2);
  for(let i=0;i<2;i++){
    const hand=page.getByRole('region',{name:`Opponent Mulligan ${i+1}`,exact:true});
    await expect(hand.locator('.card')).toHaveCount(7);
    expect(await hand.locator('.card').evaluateAll(cards=>cards.map(c=>c.getAttribute('aria-label')))).toEqual(state().mulligans!.opponent[i].map(c=>c.name));
  }
  await expect(page.getByRole('button',{name:'Draw 4 Cards',exact:true})).toBeVisible();
  await page.screenshot({path:'docs/screenshots/mulligan-multiple-desktop.png'});
  const before=state().players[0].handCount;
  await page.getByLabel('Additional cards to draw:').selectOption({label:'0'});
  await expect(page.getByRole('button',{name:'Draw one fewer card'})).toBeDisabled();
  await page.getByRole('button',{name:'Continue Without Drawing'}).click();
  await expect.poll(()=>state().turn).toBeGreaterThan(0);
  expect(state().players[0].handCount).toBe(before+(state().activePlayer===1?1:0));await expect(page.getByRole('dialog')).toHaveCount(0);
});

for(const width of [760,390,320])test(`multiple mulligans at ${width}px keep the draw footer visible while hands scroll`,async({page})=>{
  await page.setViewportSize({width,height:650});const {state}=await start(page,369);
  await expect(page.locator('.mulligan-hand')).toHaveCount(4);
  await expect(page.getByRole('button',{name:'Draw 8 Cards',exact:true})).toBeVisible();
  const body=page.locator('.game-dialog > .dialog-body');expect(await body.evaluate(e=>e.scrollHeight>e.clientHeight)).toBe(true);
  await fit(page);await page.screenshot({path:`docs/screenshots/mulligan-multiple-${width}.png`});
  await body.evaluate(e=>{e.scrollTop=e.scrollHeight;});await fit(page);
  if(width<600){const row=page.locator('.mulligan-cards').last();expect(await row.evaluate(e=>e.scrollWidth>e.clientWidth)).toBe(true);await row.evaluate(e=>{e.scrollLeft=e.scrollWidth;});await row.locator('.card').last().click();await page.keyboard.press('Escape');}
  await page.getByRole('button',{name:'Draw 8 Cards',exact:true}).click();await expect.poll(()=>state().prompt?.mulliganDraw).toBeUndefined();await finishSetup(page,state);
});

test('simultaneous mulligans distinguish both players and offer only excess compensation',async({page})=>{
  await start(page,81);await expect(page.getByRole('region',{name:'Opponent mulligans',exact:true}).locator('.mulligan-hand')).toHaveCount(2);
  await expect(page.getByRole('region',{name:'Your mulligans',exact:true}).locator('.mulligan-hand')).toHaveCount(1);
  await expect(page.locator('.mulligan-draw')).toContainText('You mulliganed 1 time');
  await expect(page.getByRole('button',{name:'Draw 2 Cards',exact:true})).toBeVisible();
  await page.screenshot({path:'docs/screenshots/mulligan-both-players.png'});
});

for(const seed of [3,33])test(`automatic mulligans without a human draw choice stay reviewable (${seed})`,async({page})=>{
  const {state}=await start(page,seed);await expect.poll(()=>state().turn).toBeGreaterThan(0);await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button',{name:'Review mulligan hands'}).click();await expect(page.getByRole('dialog')).toHaveAccessibleName('Mulligan hands');
  await expect(page.getByRole('region',{name:'Your mulligans',exact:true}).locator('.mulligan-hand')).toHaveCount(1);
  await expect(page.getByRole('button',{name:/^Draw \d/})).toHaveCount(0);await page.keyboard.press('Escape');
});

test('resume preserves grouped hands and pending choice; stale, excessive and duplicate draws are rejected',async({page})=>{
  const {state}=await start(page,69);const initial=state();
  await page.reload();await expect(page.getByRole('dialog')).toHaveAccessibleName('Opponent Mulligans');
  await expect(page.locator('.mulligan-hand')).toHaveCount(2);expect(state().mulligans).toEqual(initial.mulligans);
  expect(state().players[0].handCount).toBe(initial.players[0].handCount);
  const token=await page.evaluate(()=>localStorage.getItem('table-token'));
  const socket=io('http://127.0.0.1:3002',{transports:['websocket']});
  const send=(event:string,data:unknown)=>new Promise<Reply>((resolve,reject)=>socket.timeout(5000).emit(event,data,(error:Error|null,reply:Reply)=>error?reject(error):resolve(reply)));
  try{
    expect((await send('match:resume',{token})).ok).toBe(true);
    const payload={revision:initial.revision,id:initial.prompt!.id,keys:['999']};
    expect((await send('match:prompt',payload)).ok).toBe(false);
    await expect(page.getByRole('button',{name:'Draw 4 Cards',exact:true})).toBeEnabled();
    const choice=initial.prompt!.mulliganDraw!.options.find(c=>c.count===4)!;payload.keys=[choice.key];
    const replies=await Promise.all([send('match:prompt',payload),send('match:prompt',payload)]);
    expect(replies.filter(r=>r.ok)).toHaveLength(1);
    await expect.poll(()=>state().prompt?.mulliganDraw).toBeUndefined();
    await finishSetup(page,state);
    const hand=state().players[0].handCount;await page.reload();await expect(page.getByRole('region',{name:'Your hand',exact:true})).toBeVisible();
    expect(state().players[0].handCount).toBe(hand);await expect(page.getByRole('dialog')).toHaveCount(0);
  }finally{socket.disconnect();}
});
