import { test, expect } from '@playwright/test';
import type { MatchView } from '../../shared/protocol';
import { targetKey } from '../../src/targeting';
import { actionLabel } from '../../src/dialogs';
import { chooseAction, choosePrompt } from '../../server/bot';
test('human clicks through setup and consecutive turns against automatic AI, then reconnects', async ({ page }) => {
  let state: MatchView | undefined;
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('websocket', ws => ws.on('framereceived', ({ payload }) => {
    const text = payload.toString();
    if (text.startsWith('42')) { try { const [event, data] = JSON.parse(text.slice(2)); if (event === 'match:state') state = data; } catch {} }
  }));
  page.setDefaultTimeout(12000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Play vs AI' }).click();
  await expect.poll(() => !!state).toBe(true);
  await expect(page.getByRole('region', { name: 'Opponent battlefield' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Your battlefield', exact: true })).toBeVisible();
  let games = 1, actions = 0, prompts = 0, trainer = false, energy = false, attack = false;
  while (actions++ < 220) {
    const current = state!;
    expect(current.fault).toBeUndefined();
    expect(current.players[1].hand).toEqual([]);
    if (current.turn >= 9 && trainer && energy && attack && !current.prompt && current.activePlayer === 1) break;
    if (current.winner !== null) {
      if (current.turn >= 7 && trainer && energy && attack) break;
      expect(games++).toBeLessThan(5);
      page.once('dialog', d => d.accept());
      await page.getByRole('button', { name: 'New match' }).click();
      await expect.poll(() => state?.turn).toBe(0);
      continue;
    }
    if (current.prompt) {
      prompts++;
      const p = current.prompt;
      let keys = choosePrompt(p);
      if (p.type === 'Choose energy') {
        // These decks have only basic single-unit Energy. Retreat/Ember payment
        // amount is shown by the server; preserve engine rejection for bad input.
        keys = p.choices.slice(0, p.min || 1).map(c => c.key);
      }
      if(p.mulliganDraw){
        await page.getByLabel('Additional cards to draw:').selectOption(keys[0]);
        await page.getByRole('button',{name:/^(Draw \d+ Cards?|Continue Without Drawing)$/}).click();
      } else if(p.battlefield==='pokemon' && p.max===1) { await page.locator(`[data-target="${targetKey(p.choices.find(c=>c.key===keys[0])!.boardTarget!)}"] .card`).click(); } else {
      const panel = page.getByRole('dialog');
      for (const key of keys) {
        const index = p.choices.findIndex(c => c.key === key);
        await panel.locator('.selection-option').nth(index).click();
      }
      await panel.getByRole('button', { name: 'Confirm choice' }).click();
      }
    } else if (current.actions.length) {
      const a = chooseAction(current.actions, current.players[0])!;
      if (a.kind === 'end') await page.getByRole('button', { name: 'End turn' }).click();
      else {
        const source = a.source;
        if (source.startsWith('hand:')) {
          const index = current.players[0].hand.findIndex(c => `hand:${c.id}` === source);
          await page.getByRole('region', { name: 'Your hand' }).locator('.card').nth(index).click();
          if (current.players[0].hand[index].kind === 'trainer') trainer = true;
        } else {
          const area = page.getByRole('region', { name: 'Your battlefield', exact: true });
          await area.locator(source === 'active' ? '.active-area .card' : `.bench .pokemon-slot:nth-child(${Number(source.split(':')[1]) + 1}) .card`).click();
        }
        const card = source.startsWith('hand:') ? current.players[0].hand.find(c => `hand:${c.id}` === source)! : source === 'active' ? current.players[0].active.card! : current.players[0].bench[Number(source.split(':')[1])].card!;
        await page.getByRole('dialog').getByRole('button', { name: actionLabel(a, card), exact: true }).click();
        if(a.boardTarget && a.kind!=='play') await page.locator(`[data-target="${targetKey(a.boardTarget)}"] .card`).click();
        else if (a.target) await page.getByRole('dialog').getByRole('button', { name: a.target, exact: true }).click();
        energy ||= a.kind === 'energy'; attack ||= a.kind === 'attack';
      }
    } else {
      await expect.poll(() => state?.revision, { timeout: 15000 }).not.toBe(current.revision);
      continue;
    }
    await expect.poll(() => state?.revision, { timeout: 15000 }).not.toBe(current.revision);
    await expect(page.getByRole('alert')).toHaveCount(0);
  }
  expect(state!.turn).toBeGreaterThanOrEqual(7);
  expect(trainer && energy && attack).toBe(true);
  expect(prompts).toBeGreaterThan(0);
  await page.screenshot({ path: 'docs/screenshots/tabletop.png', fullPage: true });
  const revision = state!.revision;
  await page.reload();
  await expect.poll(() => state!.revision).toBeGreaterThanOrEqual(revision);
  await expect(page.getByRole('region', { name: 'Your battlefield', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/screenshots/tabletop-1280.png', fullPage: true });
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ turn: state!.turn, actions, prompts, games, trainer, energy, attack, browserErrors: errors.length }));
});
