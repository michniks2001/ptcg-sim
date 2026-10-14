# Mulligan reveal and draw refinement

## Scope and architecture

This change only refines setup presentation. The finalized battlefield layout, card rules, deck builder and AI policies are unchanged. The pinned Twinleaf revision remains `a8b6fe9075f982f7722e3c9ee2ce5e39cea1f1ca`; no vendored engine source was modified.

Reviewed `setup-reducer.ts`, `ShowMulliganPrompt`, `SelectPrompt`, Arbiter, the Match adapter, prompt decoder, socket ownership/revision checks, historical configuration, existing dialogs, and previous rules/testing documentation.

Twinleaf already records each failed opening hand as a separate `Card[]` inside `ShowMulliganPrompt.hands`. Previously `server/prompts.ts` flattened these into one generic gallery, and players acknowledged the reveal before opening a separate compensation choice. The engine performs shuffles, tests for eligible starting Pokémon, places starting Pokémon/Prizes, issues the reveals and then offers compensation through `SelectPrompt(WANT_TO_DRAW_CARDS)`.

`server/mulligans.ts` now snapshots only those explicit disclosures into viewer-specific sanitized card DTOs. `Match.settle()` resolves the acknowledgement-only `ShowMulliganPrompt` with the engine's accepted `true` result, only during setup and only for its two recognized reveal messages. It never resolves the compensation choice or a starting/extra-Bench decision automatically. Unknown prompts retain their existing path.

Protocol additions:

- `MatchView.mulligans`: separate `own` and `opponent` arrays of revealed hands, each retaining its actual card identities and order. Stored server-side for the lifetime of the match, including reconnects. No current opposing hand, deck order, raw Store or generator state is exposed.
- `PromptView.mulliganDraw`: numeric counts paired with the existing opaque choice keys, plus the engine's default option. The adapter translates the pinned setup prompt's explicit `Draw N card(s)` values; it does not infer choices from logs. Unrecognized upstream option text falls back to the ordinary prompt instead of guessing.

The React quantity selector consumes these options without knowing a format multiplier. Its single Draw action submits the existing prompt ID, revision and one choice key. Existing server ownership, bounds, duplicate-key and revision validation still applies. Existing client in-flight protection prevents repeated clicks. Twinleaf moves the actual cards, and its next authoritative snapshot advances setup.

## Rules and timing

`server/format.ts` retains the historical multiplier of two. The existing engine offers `0..2 × max(0, opposing mulligans − own mulligans)` after initial placement. Both players' hands remain separately labeled when both mulligan; tied mulligans create no compensation choice.

The project's [1999–2002 rules reference](https://jklaczpokemon.com/pokemon-wotc-rules/) says to decide on zero, one or two cards immediately following each mulligan. This was checked again for this task. The engine's previously documented aggregated timing remains a historical rules limitation; this UX change does not claim to correct it or reorder setup. See [Milestone 3 research](milestone-3-research.md) and [existing engine patches](../vendor/twinleaf/PATCHES.md).

After compensation, Twinleaf may offer an optional extra-Bench placement. This legitimate decision remains visible, with the clearer title **Add Pokémon to your Bench**. It is not a redundant reveal acknowledgement.

When the player mulligans, or both players mulligan equally, automatic setup transitions do not stop for an Okay button. A match-log summary explains that hands without eligible Basic Pokémon were redrawn. **Review mulligan hands** opens the retained disclosures voluntarily once there is no mandatory prompt.

## Interface and screenshots

The existing accessible `GameDialog` supplies modal focus and required-prompt behavior. Opposing hands appear in numbered seven-card rows. Own mulligans appear in a separate labeled section. Cards open an inspection dialog that returns focus to the originating card. The footer remains outside the scrollable hand area, with minus/select/plus controls and one primary action. Zero reads **Continue Without Drawing**. Disconnection, pending requests and server errors use existing dialog feedback.

Cards are 94×129px on desktop and 78×107px on phones; narrow screens pan within each row. The dialog body scrolls independently for many hands. No playmat styles changed.

Captured and visually inspected:

- [One mulligan and Draw 2 Cards](screenshots/mulligan-single-desktop.png) — 1280×800.
- [Two separate hands and Draw 4 Cards](screenshots/mulligan-multiple-desktop.png) — 1440×1000.
- [Both players' mulligans](screenshots/mulligan-both-players.png) — 1440×1000; two opposing and one own mulligan, offering up to two cards.
- [Four hands, tablet](screenshots/mulligan-multiple-760.png) — 760×650.
- [Four hands, mobile](screenshots/mulligan-multiple-390.png) — 390×650.
- [Four hands, narrow mobile](screenshots/mulligan-multiple-320.png) — 320×650.

## Verification

Before changes:

- `npm run build`: passed.
- `npm test`: 108 tests passed across four files (49.37 seconds).
- `PLAYWRIGHT_BROWSERS_PATH=/tmp/ptcg-browsers npm run test:e2e`: 42 passed, one failed (1.7 minutes). The existing unseeded saved-deck Haymaker scenario reached turn 8 with one player play, failing its `played > 2` assertion. No source had changed when this baseline ran.

New coverage uses the real setup generator and actual engine shuffle/draw operations, with deterministic RNG only in the isolated test helpers. Production never imports these fixtures. Seeds 9/69/453/369 produce one/two/three/four opposing mulligans; 3 produces an own mulligan; 33 produces equal simultaneous mulligans; 34 and 81 exercise excess mulligans on opposite sides. Captured engine reveal prompts are compared with the sanitized grouped DTOs. Draw tests compare actual card IDs moved from the front of the engine deck, including a possible ordinary opening-turn draw.

Fifteen new integration cases cover grouping, exact identities, historical/configurable compensation ranges, every count from zero to four, automatic acknowledgement handling, privacy, ownership, invalid/excessive/duplicate/stale submissions, equal and unequal simultaneous mulligans, and genuine extra-Bench choices. Nine new browser cases cover card inspection/focus return, singular/plural/zero actions, quantity bounds, repeated clicks, reload/session resume, Socket.IO rejection and double-submit behavior, own-hand review, simultaneous compensation, and fixed-footer geometry at 760/390/320px. Existing complete-game browser drivers now use the new draw control when offered.

Final results: `npm run build` passed; `npm test` passed **123/123** tests across five files (**49.87s**); `PLAYWRIGHT_BROWSERS_PATH=/tmp/ptcg-browsers npm run test:e2e` passed **52/52** browser tests (**2.0m**). The saved-deck Haymaker scenario passed with ten player plays through turn 8 and zero browser errors; the normal-game scenario reached turn 10 with zero browser errors. The baseline random-game assertion failure did not recur, but that unseeded test remains potentially variable. Details are recorded in [testing.md](testing.md).

## Manual testing checkpoint

Run `npm run dev`, then open **http://127.0.0.1:5173/**. Production randomness is unchanged, so a particular number of mulligans is not guaranteed on each match. The screenshots and isolated Playwright fixtures provide repeatable examples without a production fixture endpoint.

1. Start a normal match with your saved deck and complete initial Pokémon placement.
2. When the opponent mulligans, check each numbered row contains its own seven revealed cards. Inspect a card, close it, and check the draw choice remains selected.
3. Check the maximum is selected initially. Use minus/plus or the quantity selector; click **Draw X Cards** once. Verify setup advances without an Okay confirmation.
4. Try zero and verify **Continue Without Drawing** advances without compensation cards.
5. If extra Bench placement is offered, add Basics or continue without selecting. Then play normal turns.
6. Reload while a draw choice is pending, and again after drawing. Verify grouped reveals return when needed and cards are not drawn twice.
7. If you mulligan, check the log summary and later **Review mulligan hands**. If both players mulligan, check the two sections and the engine's excess compensation.
8. On a phone, pan a seven-card row and scroll between hands. The draw footer should remain visible.

Stop here for manual feedback. No additional milestone, formats, account features or gameplay mechanics were started. Chromium desktop/emulated mobile were tested; physical touch devices and other browser engines remain unverified. Process-local session recovery has its existing limitation: restarting the backend ends the match.
