import { test, expect, type Page } from '@playwright/test';
import type { MatchView } from '../../shared/protocol';

async function start(page: Page, fixture = 'interactions') {
  let state: MatchView | undefined;
  page.on('websocket', ws => ws.on('framereceived', ({ payload }) => {
    const text = payload.toString();
    if (text.startsWith('42')) { const [event, data] = JSON.parse(text.slice(2)); if (event === 'match:state') state = data; }
  }));
  await page.context().addCookies([{ name: 'table-fixture', value: fixture, url: 'http://127.0.0.1:5174' }]);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play vs AI' }).click();
  await expect.poll(() => state?.turn).toBe(5);
  return () => state!;
}
const dialog = (page: Page) => page.getByRole('dialog');
const hand = (page: Page, name: string) => page.getByRole('region', { name: 'Your hand' }).getByRole('button', { name, exact: true }).first();
async function confirm(page: Page) { await dialog(page).getByRole('button', { name: 'Confirm choice', exact: true }).click(); }
async function fit(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const box = await dialog(page).boundingBox();
  const size = page.viewportSize()!;
  expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(size.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(size.height);
}

test('card inspection, keyboard focus, legal bench and Energy actions, public cards and responsive layout', async ({ page }) => {
  const state = await start(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  const card = hand(page, 'Charmander');
  await card.click();
  await expect(dialog(page)).toHaveAccessibleName('Charmander');
  const image = dialog(page).getByRole('img', { name: 'Charmander card' });
  await expect(image).toBeVisible();
  expect((await image.boundingBox())!.width).toBeGreaterThan(300);
  await expect(dialog(page).getByRole('button', { name: 'Play to Bench', exact: true })).toBeVisible();
  await fit(page);
  await page.screenshot({ path: 'docs/screenshots/card-actions.png' });
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toHaveCount(0);
  await expect(card).toBeFocused();
  await card.click();
  await page.keyboard.press('Shift+Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true);
  await dialog(page).getByRole('button', { name: 'Close dialog' }).click();
  await expect(card).toBeFocused();
  await card.click();
  await dialog(page).getByRole('button', { name: 'Play to Bench', exact: true }).click();
  const beforeBench = state().revision;
  // Two events in the same browser task must still submit only one move.
  await dialog(page).getByRole('button', { name: 'Bench 2', exact: true }).evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
  await expect.poll(() => state().players[0].bench[1].card?.name).toBe('Charmander');
  await expect(dialog(page)).toHaveCount(0);
  expect(state().revision).toBe(beforeBench + 1);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await hand(page, 'Fire Energy').click();
  await dialog(page).getByRole('button', { name: 'Attach Energy', exact: true }).click();
  await page.locator('.active-area .legal-target').getByRole('button', { name: 'Charmander', exact: true }).click();
  await expect.poll(() => state().players[0].active.energy.length).toBe(1);
  await hand(page, 'Fire Energy').click();
  await expect(dialog(page).getByText('No available actions.', { exact: false })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('region', { name: 'Opponent battlefield' }).getByRole('button', { name: 'Machop', exact: true }).click();
  await expect(dialog(page).getByText('No available actions.', { exact: false })).toBeVisible();
  expect(state().players[1].hand).toEqual([]);
  await page.keyboard.press('Escape');
  await hand(page, 'Computer Search').click();
  for (const width of [760, 390, 320]) {
    await page.setViewportSize({ width, height: 800 }); await fit(page);
    const before = await page.evaluate(() => scrollY);
    await dialog(page).getByRole('button', { name: 'Play Trainer' }).scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => scrollY)).toBe(before);
  }
  await page.setViewportSize({ width: 390, height: 800 });
  await page.screenshot({ path: 'docs/screenshots/card-actions-mobile.png' });
});

test('Computer Search transitions from discard to deck gallery without allowing dismissal or excess selections', async ({ page }) => {
  const state = await start(page);
  await hand(page, 'Computer Search').click();
  await dialog(page).getByRole('button', { name: 'Play Trainer' }).click();
  await expect(dialog(page)).toHaveAccessibleName('Choose cards to discard');
  await expect(page.getByRole('status',{name:'Gameplay feedback'})).toContainText('Computer Search — Trainer played');
  await expect(page.locator('.game-callouts')).toHaveJSProperty('popover','manual');
  await page.keyboard.press('Escape');
  await page.mouse.click(4, 4);
  await expect(dialog(page)).toHaveAccessibleName('Choose cards to discard');
  await expect(dialog(page).getByRole('button', { name: /Close|Cancel/ })).toHaveCount(0);
  await expect(dialog(page).getByRole('button', { name: 'Confirm choice' })).toBeDisabled();
  const choices = dialog(page).getByRole('button', { name: 'Fire Energy', exact: true });
  await choices.nth(0).click(); await choices.nth(1).click();
  await expect(choices.nth(2)).toBeDisabled();
  await expect(dialog(page).getByText('2 selected · 0 required remaining')).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/discard-selection.png' });
  await confirm(page);
  await expect(dialog(page)).toHaveAccessibleName('Search your deck');
  await expect(dialog(page).getByRole('button', { name: 'Confirm choice' })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toHaveAccessibleName('Search your deck');
  await dialog(page).getByRole('searchbox').fill('Bill');
  await expect(dialog(page).getByRole('button', { name: 'Fire Energy', exact: true })).toHaveCount(0);
  await dialog(page).getByRole('button', { name: 'Bill', exact: true }).first().click();
  await fit(page);
  await page.screenshot({ path: 'docs/screenshots/deck-search.png' });
  const revision = state().revision;
  await confirm(page);
  await expect(dialog(page)).toHaveCount(0);
  await expect.poll(() => state().revision).toBe(revision + 1);
  expect(state().players[0].hand.some(c => c.name === 'Bill')).toBe(true);
  expect(state().players[0].discard.map(c => c.name)).toEqual(['Fire Energy', 'Fire Energy', 'Computer Search']);
  await page.getByRole('region', { name: 'Your battlefield', exact: true }).getByRole('button', { name: /Discard Pile/i }).click();
  await dialog(page).getByRole('button', { name: 'Computer Search', exact: true }).click();
  await expect(dialog(page)).toHaveAccessibleName('Computer Search');
  await expect(dialog(page).getByText('No available actions.', { exact: false })).toBeVisible();
});

test('engine target prompts and evolution offers use the battlefield', async ({ page }) => {
  const state = await start(page);
  await hand(page, 'Charmeleon').click();
  await dialog(page).getByRole('button', { name: 'Evolve Pokémon', exact: true }).click();
  await page.locator('.active-area .legal-target').getByRole('button', { name: 'Charmander', exact: true }).click();
  await expect.poll(() => state().players[0].active.card?.name).toBe('Charmeleon');
  await hand(page, 'Switch').click();
  await dialog(page).getByRole('button', { name: 'Play Trainer' }).click();
  await expect(page.locator('.legal-target')).toHaveCount(1);
  await page.locator('.legal-target .card').click();
  await expect.poll(() => state().players[0].active.card?.name).toBe('Rattata');
});

test('named attack causes real knockout and face-down prize selection, then AI resumes', async ({ page }) => {
  const state = await start(page, 'prize');
  await page.getByRole('region', { name: 'Your battlefield', exact: true }).locator('.active-area .card').click();
  await expect(dialog(page).getByRole('button', { name: 'Attack: Ember', exact: true })).toHaveCount(0);
  await dialog(page).getByRole('button', { name: 'Attack: Scratch', exact: true }).click();
  await expect(dialog(page)).toHaveAccessibleName('Choose your Prize cards');
  await expect(dialog(page).locator('.prize-back')).toHaveCount(6);
  await expect(dialog(page).getByRole('img')).toHaveCount(0);
  expect(state().prompt!.choices.every(c => c.card === undefined)).toBe(true);
  await dialog(page).getByRole('button', { name: 'Face-down Prize 3' }).click();
  await page.screenshot({ path: 'docs/screenshots/prize-selection.png' });
  await confirm(page);
  await expect.poll(() => state().players[0].prizes).toBe(5);
  await expect.poll(() => state().players[1].active.card?.name).toBe('Rattata');
  await expect.poll(() => state().turn).toBeGreaterThan(5);
  expect(state().fault).toBeUndefined();
});

test('replacement Active prompt cannot close before the legal choice', async ({ page }) => {
  const state = await start(page, 'replacement');
  await expect.poll(() => state().prompt?.type).toBe('Choose pokemon');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('region', {name:'Battlefield targeting'})).toBeVisible();
  await expect(page.locator('.legal-target')).toHaveCount(1);
  await page.locator('.legal-target .card').click();
  await expect.poll(() => state().players[0].active.card?.name).toBe('Rattata');
  expect(state().players[0].discard.some(c => c.name === 'Charmander')).toBe(true);
});

test('multiple prizes require exactly the engine count', async ({ page }) => {
  const state = await start(page, 'multi-prize');
  await dialog(page).getByRole('button', { name: 'Face-down Prize 1' }).click();
  await expect(dialog(page).getByRole('button', { name: 'Confirm choice' })).toBeDisabled();
  await dialog(page).getByRole('button', { name: 'Face-down Prize 2' }).click();
  await expect(dialog(page).getByRole('button', { name: 'Face-down Prize 3' })).toBeDisabled();
  await confirm(page);
  await expect.poll(() => state().prompt).toBeUndefined();
});

test('server rejection preserves Energy choices; disconnect and resume preserve mandatory prompt', async ({ page, context }) => {
  const state = await start(page, 'payment');
  await page.getByRole('region', { name: 'Your battlefield', exact: true }).locator('.active-area .card').click();
  await dialog(page).getByRole('button', { name: 'Retreat', exact: true }).click();
  await page.locator('.legal-target').getByRole('button', {name:'Rattata',exact:true}).click();
  await expect(dialog(page)).toHaveAccessibleName('Choose Energy payment');
  // The engine's Energy contract permits 0..N entries but validates exact payment server-side.
  await dialog(page).getByRole('button', { name: 'Confirm choice' }).click();
  await expect(dialog(page).getByRole('alert')).toContainText('engine rejected');
  await dialog(page).locator('.selection-option').first().click();
  await context.setOffline(true);
  await expect(dialog(page).getByRole('status').filter({ hasText: 'Connection lost' })).toBeVisible();
  await expect(dialog(page).getByRole('button', { name: 'Confirm choice' })).toBeDisabled();
  await context.setOffline(false);
  await expect(dialog(page).getByRole('button', { name: 'Confirm choice' })).toBeEnabled({ timeout: 20000 });
  await expect(dialog(page).locator('.selection-option[aria-pressed="true"]')).toHaveCount(1);
  await confirm(page);
  await expect.poll(() => state().players[0].active.card?.name).toBe('Rattata');
});

test('unavailable artwork has readable card text', async ({ page }) => {
  await page.route('**/cards/base1/24.png', route => route.abort());
  await start(page);
  await hand(page, 'Charmeleon').click();
  await expect(dialog(page).locator('.preview-fallback')).toContainText('Charmeleon');
});


test('engine-authorized cancellation and choosing zero cards are explicit decisions', async ({ page }) => {
  const state = await start(page, 'optional-search');
  await expect(dialog(page)).toHaveAccessibleName('Search your deck');
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeVisible();
  await dialog(page).getByRole('button', { name: 'Confirm without selecting' }).click();
  await expect.poll(() => state().prompt).toBeUndefined();
  expect(state().players[0].deckCount).toBe(18);
  await page.reload();
  await expect(page.getByRole('button', { name: 'New match' })).toBeVisible();
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: 'New match' }).click();
  await expect(dialog(page)).toBeVisible();
  await dialog(page).getByRole('button', { name: 'Cancel action' }).click();
  await expect(dialog(page)).toHaveCount(0);
  expect(state().players[0].deckCount).toBe(18);
});

test('expired sessions return to a usable start screen', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('table-token', 'expired-test-token'));
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('expired');
  await expect(page.getByRole('button', { name: 'Play vs AI' })).toBeEnabled();
  expect(await page.evaluate(() => localStorage.getItem('table-token'))).toBeNull();
  await page.getByRole('button', { name: 'Play vs AI' }).click();
  await expect(page.getByRole('region', { name: 'Your battlefield', exact: true })).toBeVisible();
});
