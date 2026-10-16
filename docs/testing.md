# Milestone 5 verification checkpoint — October 16, 2026

The unchanged baseline passed build, 141 unit/integration cases and 58 Chromium browser cases. Chromium was installed into the default Playwright cache; the previous `/tmp/ptcg-browsers` path was absent. The first non-isolated browser baseline had one general-play timeout; the isolated unchanged checkpoint passed all 58.

Current executed results:

- `npm test`: **180/180 passing**, 11 files, **80.65 seconds** in the final full run. All original 141 cases remain.
- `npm run test:e2e`: **65/65 passing**, **2.4 minutes** in the final full run.
- Focused Ability/catalog/Worlds-menu suite: **7/7 passing**. Final card/format follow-up after adding disabled format entries: **10/10 passing**.
- Final `npm run build`: **PASS**, **8.78 seconds** wall time; Vite portion **1.72 seconds**. The optional expanded metadata chunk still emits Vite's large-chunk warning.
- New behavioral suites cover 14 historical-profile cases, 12 persistent-session cases, 10 card/legality cases, six seeded legacy/laboratory games and three seeded Worlds 2024 games. Game evidence: [JSON results](milestone-5-game-results.json).
- New browser cases cover mobile bulk transfers, source changes/Escape, Done/re-entry/reload, physical Energy identity, three later accelerators, lazy catalog bounds and format/deck/opponent selection.

One intervening 65-case browser run passed 64 and failed when its geometry helper read the hand before React rendered it. The helper now waits for visibility before the same geometry assertions; the final complete rerun passed all 65. Builds and browser checks were run sequentially for that final run.

Screenshots were opened and visually inspected: the original tabletop, the mobile Damage Swap controls, and the structural Worlds 2024 capture. The session bar was tightened after visual review without changing the tabletop layout.

All enabled formats are experimental. Passing representative games does not certify all imported cards, event legality or era mechanics. The new Worlds screenshot uses stubbed artwork to avoid external image/network dependence; it is a structural capture, not evidence of correct artwork. Original Base–Fossil screenshots use the local artwork.

## Reproduce and manually review

```sh
npm ci
npx playwright install chromium
npm run build
npm test
npm run test:e2e
npm run dev
```

Open http://127.0.0.1:5173/. The normal backend is 127.0.0.1:3001; tests use 5174/3002. Do not expose the test fixture server as the production entrypoint.

1. Select Base–Fossil, load an existing saved deck and play against Haymaker. Confirm setup, grouped mulligans, normal Energy, retreat payment, searches, attacks, KOs/Prizes and an engine-confirmed game ending.
2. Open Deck Builder. Confirm old printing IDs and quantities survive save/reload and text/JSON round trips. Change a duplicate's format and confirm illegal cards remain listed with errors.
3. Build an Alakazam deck. Evolve Abra → Kadabra → Alakazam legally, accumulate damage, activate Damage Swap once and move counters between several Pokémon. Change **Counters to move** to three before choosing a destination. Try exceeding the destination's safe capacity; confirm partial completion stops before a KO.
4. Change sources/destinations; use Escape/Change source before committing. Click Done, confirm the turn does not end, and reactivate later. A disabled Power must not appear as a legal activation.
5. Use the Rain Dance example. Evolve Blastoise, activate Rain Dance, click Water Energy in hand and an eligible Water Pokémon. Repeat without reopening the inspector. Done preserves any unused ordinary attachment.
6. Use Venusaur in a custom deck. Activate Energy Trans, click actual attached Grass Energy and a destination. Repeat from another Pokémon, verify attachment identities and try DCE/non-Grass restrictions.
7. Choose the card laboratory and construct a deck around Frosmoth or Baxcalibur. Ice Dance restricts destinations to eligible Water Bench Pokémon. Super Cold retains its different targets and requires Continue between completed mandatory activations. Test Oricorio ex with a Fire Mega Evolution Pokémon ex on the Bench as well as Active; Fire Energy goes to eligible Fire Bench Pokémon.
8. Return to the menu, choose Worlds 2024, wait for catalog loading and choose one of the three contemporary example decks. Select Iron Thorns, Roaring Moon or Miraidon as opponent. Confirm the match identifies the selected snapshot and uses modern opening restrictions.
9. Inspect Tools, public Stadium/Lost Zone details, attachments and GX/VSTAR usage when present. Complete all mandatory strategic prompts. Imported mechanics beyond representative tests may still expose upstream defects; record the exact card and choice sequence.
10. Complete the game, check callouts and logs, then repeat at 1280px, 760px, 390px and 320px. Reduced motion should preserve results without elaborate animation.

Historical Worlds 2004/2006/2010/2013/2016/2019/2022/2025/2026, Expanded, GLC and RSPK cannot currently be manually reviewed as verified playable formats. Their missing coverage is documented, not silently mapped to modern rules.

---

# Retreat Energy selection — latest verification

Paid Base–Fossil retreats now always offer the attached Energy chooser. Historical payment order is validated by Twinleaf, including Basic Energy followed by Double Colorless where the last card overpays. Free retreats skip payment. See [rules research, implementation and manual checklist](retreat-payment.md).

- Pre-change `npm test`: **123/123 passed**, five files, **55.63s**.
- Final `npm run build`: **PASS**.
- Final `npm test`: **141/141 passed**, six files, **46.23s**, including existing complete-game scenarios.
- Final `PLAYWRIGHT_BROWSERS_PATH=/tmp/ptcg-browsers npm run test:e2e`: **58/58 passed**, **2.1m**.

The 18 new integration tests and six new browser tests cover actual selected card identities, identical/exact payments, Double Colorless, historical discard order, invalid payments, cancellation, repeated submission, ownership/revisions, pending-payment reload, free retreats and Confusion timing. Existing disconnect/reconnect and normal-game coverage also passed. The saved-deck Haymaker scenario reached turn 5 with seven player plays and zero browser errors; the normal-game scenario reached turn 10 with 34 actions and zero browser errors.

Desktop (1280×800) and mobile (320×800) payment screenshots were visually inspected: artwork, selection-order markers and confirmation controls remain readable and accessible. The full browser run refreshed the existing captures; the gallery now contains **74 current screenshots**, including [desktop](screenshots/retreat-energy-1280.png) and [mobile](screenshots/retreat-energy-320.png) retreat payment. Chromium/emulated mobile only; physical devices and other browser engines remain unverified.

---

# Previous screenshot refresh

All **72 screenshots** in [the current gallery](screenshots/README.md) were recaptured from the current application. The three historical before-layout images and their comparison links were removed. The regular-game tabletop captures now write directly to this gallery so future runs refresh them too. Gameplay source was unchanged.

`PLAYWRIGHT_BROWSERS_PATH=/tmp/ptcg-browsers npm run test:e2e`: **52/52 passed**, **2.0m**. Every retained PNG was checked for a capture timestamp after the refresh started; none was stale. Gallery links were checked, and representative desktop tabletop, mulligan and attachment screenshots were visually inspected. [Visual gallery](screenshots/index.html) · [Image manifest](screenshots/manifest.json).

---

# Mulligan UI refinement — latest verification

The setup modal now keeps each revealed hand separate, provides an engine-derived draw quantity in a fixed footer, and resolves compensation with one action. Acknowledgement-only mulligan prompts are handled by the server; genuine starting/extra-Bench decisions remain. No engine source or finalized playmat layout changed.

Baseline before changes: build passed; **108/108** unit/integration tests passed (49.37s); browser suite **42/43 passed** (1.7m). The pre-existing unseeded saved-deck Haymaker scenario failed its `played > 2` assertion after reaching turn 8 with one player play. This baseline failure is not reported as a passing run.

Final build passed. Final `npm test`: **123/123 passed**, five files, **49.87s**, including existing complete-game scenarios. Fifteen new cases use actual seeded Twinleaf setup, reveals and draws. The focused new browser suite passed **9/9** (11.5s). Final `PLAYWRIGHT_BROWSERS_PATH=/tmp/ptcg-browsers npm run test:e2e`: **52/52 passed** (**2.0m**). The saved-deck Haymaker scenario reached turn 8 with ten player plays and zero browser errors; the normal-game browser scenario reached turn 10 with Trainers, attachments and attacks exercised and zero browser errors. The baseline random-game failure did not recur; its unseeded nature remains a test reliability limitation.

The new browser tests exercise one/multiple/simultaneous mulligans, own-hand review without mandatory acknowledgement, accessible inspection, draw bounds and zero, duplicate clicks, socket rejection, reload/resume, and footer geometry at 760/390/320px. Existing full-game drivers were updated to operate the new quantity selector when compensation occurs; their gameplay assertions remain intact.

[Architecture, protocol changes, screenshots, historical timing limitation and manual checklist](mulligan-refinement.md). Screenshots were visually reviewed at 1280×800, 1440×1000, 760×650, 390×650 and 320×650. Chromium/emulated mobile only; physical devices and other browser engines are not claimed as tested.

---

# Milestone 4: physical tabletop layout correction — latest results

The centered, face-to-face playmat supersedes the earlier side-by-side layout described below. Opposing Actives now share a centerline, Benches use compact groups behind them, Prizes are 2×3 card backs, and Deck/Discard are substantial stacks. Discard displays its public top card. The hand remains outside the mat's scroll region.

- `npm run build`: **PASS**.
- `npm test`: **108/108 PASS**, four files, **64.86s**; includes 14 complete-game scenarios.
- `PLAYWRIGHT_BROWSERS_PATH=/tmp/ptcg-browsers npm run test:e2e`: **43/43 PASS**, **1.7m**.
- Added 14 browser tests for spatial geometry and real KO/victory layouts. Existing 29 browser workflows remain.
- Visually inspected screenshots at **1650×930, 1280×800, 760×800, 390×800 and 320×800**, with one/three/five Benched Pokémon, both Actives, empty Active after KO/victory, public discard, multiple Energy, and rotated conditions.
- Standard boards fit vertically at both desktop sizes. Tablet fits horizontally and can scroll vertically. Phones pan within the mat. The hand stays visible without page scrolling.

[Full correction report, current screenshot gallery and manual checklist](milestone-4-layout-correction.md). No engine, rules, AI or deck-builder changes. Stop for manual feedback.

The older sections below are historical records of the preceding implementations, including the now-replaced side-by-side layout.

---

# Milestone 4: battlefield verification and manual checkpoint

Verified with Node 24.14.0 and Chromium. This section supersedes the earlier milestone controls below. Implementation stops here for manual review; no next milestone has started.

## Manual feedback follow-up: compact field and printed Energy symbols

The match now reserves the bottom of the viewport for the hand. Active and Bench share one row per player, and Prize/Deck/Discard zones use a compact strip. Field and hand cards share the same desktop size: about **103×144px at 1280×800**, versus the initial Milestone 4 field width of about 74px and hand width of 76px. Phone hand cards are **96×134px**. On small/short screens, excess field content scrolls inside the mat and Bench/hand lanes scroll horizontally; the hand no longer requires page scrolling. Targeting scrolls the focused Pokémon into the visible mat region.

Basic Energy indicators crop the printed central symbol from the existing locally cached Base Set Energy artwork using an SVG viewport. Fire, Water, Grass, Lightning, Psychic and Fighting therefore use actual card symbols, with no Energy emoji. DCE and other Special Energy retain their distinct card indicators. Each attached card remains separately inspectable.

Updated browser assertions check the entire hand is within the viewport, there is no vertical page overflow, a focused legal target is fully inside the visible mat, and the Energy indicator references the correct card artwork. Sizes covered: 1280×800, 760×800, 390×800, 320×800, 1680×1050, plus **1280×720 and 390×667**. Rotation, attachments, dialogs, saved decks and gameplay regressions remain in the suite. Screenshots below were refreshed; see also [short-phone targeting](screenshots/m4-targeting-390-667.png) and [720px-high desktop targeting](screenshots/m4-targeting-1280-720.png).

Verification: production build **PASS**; full browser suite **29/29 PASS** (2.3m); after the final attachment-row spacing adjustment, production build **PASS** and focused battlefield suite **13/13 PASS** (50.3s). The 108-test engine/integration suite was not rerun for this presentation-only follow-up. An intermediate run was affected by a development hot reload during a concurrent build; another exposed a test expecting the desktop log after ending at a mobile viewport. The clean rerun passed after correcting the viewport sequence. Short-screen target visibility was also fixed and asserted. No final failures remain.

## Commands and measured results

| Check | Before Milestone 4 | Final result |
|---|---|---|
| `npm run build` | PASS | **PASS** — engine bundle, TypeScript and Vite |
| `npm test` | 71/71 PASS (54.17s) | **108/108 PASS**, four files (84.84s) |
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/ptcg-browsers npm run test:e2e` | 16/16 PASS (1.1m) | **29/29 PASS** (2.1m) |

The final browser run includes the final production changes. Four subsequent tests added real attack-based condition application/recovery coverage; the final build and 108-test run above include those tests. No working tests were deleted. The 37 added unit/integration tests and 13 added browser tests complement the original suites.

The initial sandboxed Playwright launch could not bind its servers; the authorized rerun passed. Intermediate failures caught an ambiguous existing card selector, a coin expectation that ignored earlier engine RNG consumption, and lost focus when repeating the same optional target selection. These were fixed and the complete suites rerun. No final test failures remain.

Playwright starts isolated servers on **5174 / 3002**. Chromium is installed at `/tmp/ptcg-browsers` in this environment. Elsewhere, install it with `npx playwright install chromium`, then use `npm run test:e2e`. Normal development ports are **5173 / 3001**. The user chose to start the app personally; this handoff does not claim a running development server or a newly verified response from port 5173.

## What was verified

- **Targeting:** Energy inspection → Attach Energy → legal highlighted field target; optional cancellation, keyboard focus, invalid targets, duplicate submissions, retreat, Switch, Gust, mandatory replacement Active, reconnect, stale/forged request rejection, Rain Dance, Energy Trans and Damage Swap. Multi-step source selection preserves the actual prompt sequence. Deck/hand/discard search, Energy payment, ordering, textual choices and Prizes remain dialogs. Multi-transfer combinations have a full selection fallback.
- **Attachments:** actual Basic Energy cards, a single distinguishable DCE card, Active/Bench display, inspection, transfers, discard, evolution, switching and real KO cleanup. Canonical Tool collection projection/removal is tested independently of the production format. Historical PlusPower remains a Trainer attachment rather than a modern Tool.
- **Conditions:** real Jigglypuff Lullaby, Electabuzz Thundershock, Lapras Confuse Ray and Nidoking Toxic actions verify authoritative application; recovery, replacement, evolution, switching and reconnect are covered. Sleep rotates art −90°, Paralysis +90°, Confusion 180°. Poison/Burn counters, upright attachments/damage and clickable rotated cards have display and browser coverage. Burn plus Poison uses an engine-state display fixture, not a legal Base–Fossil match.
- **Effects:** audited flags, pending/current protection, damage modifiers, Swords Dance, Leek Slap, Headache side restrictions, attached PlusPower, multiple effects, expiration, source departure, Muk suppression and Aerodactyl restrictions. Empty Field Effects, reconnect and hidden-source omission are tested. Projection probes must not mutate the live Store. This is not exhaustive certification of every engine marker or printed Power.
- **Feedback:** actual Trainer, attack, attachment and coin events; ordered multi-flips; duplicate snapshot/reconnect suppression; rapid AI activity; mandatory Computer Search remains usable while its callout appears; reduced motion retains confirmed results. Browser coin observations are compared to the actual server event order. A bounded 256-event feed is transient feedback, not archival delivery during indefinite suspension.
- **Regression:** saved decks, deck builder, hidden information/ownership/revision controls, galleries, Prizes, normal gameplay and Haymaker remain covered. The saved-deck browser match reached turn 7 with 11 human plays and zero browser errors. The practice-table browser scenario reached turn 10 with 33 actions and five prompts, also with zero browser errors.
- **Complete games:** all 14 existing seeded complete-game scenarios pass, including eight Haymaker games. The measured eight-game report is [milestone-4-game-results.json](milestone-4-game-results.json); all finished through the engine, with no fault or action-loop timeout. This validates progression, not tournament-strength play.

## Visual evidence

Screenshots were opened and visually inspected, in addition to automated overflow, orientation, interaction and bounds assertions. Viewports include **1280×800**, widths **760**, **390**, **320**, and **1680** for the larger desktop target layout. Cards exceed the previous 60px desktop width. Rotated art stays inside its reserved square; attachment/status/effect controls stay upright. Mobile Bench and hand lanes scroll internally. After the manual feedback follow-up, dense boards scroll inside the mat while the hand remains in view; not every dense field state fits without internal scrolling.

| View | Evidence |
|---|---|
| Expanded table | [Desktop](screenshots/m4-tabletop-1280.png) |
| Inline targets | [1280](screenshots/m4-targeting-1280.png), [760](screenshots/m4-targeting-760.png), [390](screenshots/m4-targeting-390.png), [320](screenshots/m4-targeting-320.png), [1680](screenshots/m4-targeting-1680.png) |
| Basic/Special attachments and feedback | [Attachment callout](screenshots/m4-attachment-callout.png), [multiple indicators](screenshots/m4-burn-tool-display-fixture.png) |
| Sleep | [1280](screenshots/m4-asleep-1280.png), [760](screenshots/m4-asleep-760.png), [390](screenshots/m4-asleep-390.png), [320](screenshots/m4-asleep-320.png) |
| Paralysis | [1280](screenshots/m4-paralyzed-1280.png), [760](screenshots/m4-paralyzed-760.png), [390](screenshots/m4-paralyzed-390.png), [320](screenshots/m4-paralyzed-320.png) |
| Confusion | [1280](screenshots/m4-confused-1280.png), [760](screenshots/m4-confused-760.png), [390](screenshots/m4-confused-390.png), [320](screenshots/m4-confused-320.png) |
| Poison/Burn/Tool display fixtures | [Desktop](screenshots/m4-burn-tool-display-fixture.png), [320px](screenshots/m4-burn-tool-mobile-display-fixture.png) |
| Trainer and attack feedback | [Trainer](screenshots/m4-trainer-callout.png), [attack](screenshots/m4-attack-callout.png) |
| Server-generated coins | [Animation](screenshots/m4-coin-callout.png), [reveal](screenshots/m4-coin-reveal.png) |
| Effect inspection | [Pokémon effects](screenshots/m4-pokemon-effects.png), [Field Effects](screenshots/m4-field-effects.png) |

The Tool fixture uses a real engine TrainerCard with Tool metadata in the canonical Tool collection but no registered card behavior. It verifies rendering, deduplication and inspection only. It is not a new legal card, full Tool-play integration test or expanded format. Burn likewise has display coverage only.

## Manual testing checklist

Run `npm ci` if dependencies are missing, then `npm run dev` from the project directory. Open **http://127.0.0.1:5173/**. The development command starts both Vite and the backend.

1. **Saved deck:** open Deck Builder, load/save a legal deck, return to the menu, select that saved deck and **Haymaker AI**, then start. Complete setup choices.
2. **Energy:** click Energy in your hand, choose **Attach Energy**, confirm the inspector closes and legal Pokémon show gold highlights and target marks. Try Tab/Enter, cancel once, then attach. Invalid Pokémon must not submit.
3. **Retreat and switching:** with a Benched Pokémon and sufficient Energy, inspect the Active and choose Retreat. Select the replacement on the field and complete any payment prompt. Try Switch or Gust when drawn. After a KO, replacement targeting must remain mandatory, including after reload.
4. **Powers:** use the Rain Dance deck, evolve Blastoise when legal and choose its Rain Dance action. Select Water Energy, then click a highlighted destination. With suitable custom decks, try Venusaur's Energy Trans source/destination and Alakazam's Damage Swap.
5. **Visible attachments:** attach several Basic Energy cards and DCE when available. Each Basic card has an indicator; DCE is one named Special Energy attachment, not two cards. Check both Active and Bench.
6. **Inspect attachments:** click their symbols/thumbnails. Check identity and artwork, then move or discard Energy and verify both affected Pokémon update. PlusPower is an attached Trainer; modern Tools are unavailable in this format.
7. **Trainer/attack feedback:** play Bill/Oak or a search Trainer and attack. Check names/art, quick dismissal and that any mandatory selection remains immediately usable.
8. **Coins:** use an attack such as Electabuzz's Thundershock or Kangaskhan's Comet Punch. Check the confirmed results and multi-flip order against the match log. Reload and ensure old callouts do not replay.
9. **Conditions:** use legal effects such as Jigglypuff's Lullaby, Electabuzz's Thundershock, Lapras's Confuse Ray or Nidoking's Toxic. Outcomes depend on the real engine/coins. Inspect condition buttons; Poison is a green skull counter. Burn is not available in a legal 1999 match.
10. **Rotation:** check Sleep counterclockwise, Paralysis clockwise and Confusion upside down. Card art rotates while HP, damage and attachments stay upright. Inspect the rotated card; verify recovery/evolution/switching removes conditions according to the engine.
11. **Pokémon effects:** inspect an exclamation badge after Swords Dance, PlusPower or a protection/restriction effect. Read source, description and duration; advance turns or remove the source and confirm the badge updates.
12. **Field Effects:** open the button beside the log. Check the empty state. With Aerodactyl or Muk in play, inspect Prehistoric Power/Toxic Gas; Muk should suppress Aerodactyl's displayed restriction while operational. Source departure and condition-based disabling should update the panel.
13. **Complete game:** finish a match against Haymaker, including payments, Prizes and replacement choices. Confirm the engine declares the winner. Inspect collapsed AI diagnostics if needed.
14. **Desktop/mobile:** check 1280×800, 760px, 390px and 320px widths. Access hand, Deck, Discard, Prizes, End Turn and log. Scroll Bench/hand lanes on narrow screens, test keyboard focus and reduced motion, and check rotated cards with several indicators.

## Remaining limitations and review scope

No Twinleaf source or pin changed. [Architecture research](milestone-4-research.md) describes the audited effect projectors and known gaps precisely. Defender has an existing attachment/protection defect and is not falsely advertised as active protection. Dodrio's current reducer has broader in-play scope than its printed Bench requirement; Haunter's Transparency implementation covers a narrower damage case than the printed effect. Inspectors report implemented behavior. Generic flags may lack source attribution, which is explicitly stated rather than guessed. Additional marker/card-specific projectors and future Stadium effects are not certified.

Base Set Gastly and the historical rules gaps recorded in Milestone 3 remain. Safari, Firefox, screen readers and physical touch devices were not tested. Modern native popover behavior was verified in Chromium. Manual feel/readability feedback is still pending. No upstream defect is claimed fixed by this presentation milestone.

**Stop for user testing.** No additional formats, generations, AI archetypes, accounts, multiplayer, matchmaking, rankings, deployment or deck-builder redesign were added.

---

# Milestone 3: Base–Fossil verification

Tested 2026-10-13 with Node 24.14.0 and Chromium. All final checks passed.

## Commands and results

- Baseline before edits: build PASS; 42/42 unit/integration tests PASS; 11/11 browser tests PASS.
- `npm run build`: PASS (engine bundle, strict application TypeScript, Vite production build).
- `npm test`: **71/71 PASS**, three test files, 40.46 seconds.
- `PLAYWRIGHT_BROWSERS_PATH=/tmp/ptcg-browsers npm run test:e2e`: **16/16 PASS**, 52.2 seconds.
- After the final mobile-tab contrast fix: production build PASS; focused deck-builder browser check **1/1 PASS** (5.7 seconds), screenshots refreshed and inspected.
- Manual-review servers started: **http://127.0.0.1:5173/** returned HTTP 200; backend **http://127.0.0.1:3001/** returned `{"ok":true,"service":"pokemon-tabletop"}`.
- All **228 artwork files** cached locally; download failures: **0**.
- **228 catalog entries / 227 executable printings**. The single unavailable definition is Base Set Gastly #50; validation identifies it explicitly.

Playwright retains isolated ports **5174 / 3002**. In this execution environment it requires permission to bind local servers outside the sandbox. The normal development ports remain **5173 / 3001**. No tests were removed. The original registry count assertion now expects 227, the original image-fallback test uses its new set-qualified image path, and the ownership test uses a seed with a pending human prompt after moving the historical opening coin flip to after setup.

## Browser and visual evidence

The final suite exercised catalog filters, quantity controls, a 60-card deck built from scratch, incomplete saves, reload, rename, duplication/deletion, import errors, JSON export, saved-deck match selection, and forged Socket.IO submissions. A saved Wigglytuff deck reached turn 7 against Haymaker with 11 human plays and zero browser errors. The original practice workflow reached turn 9 with Trainer, Energy and attack interactions and zero browser errors. Rain Dance resolved three real attachments through the modal before Hydro Pump.

Overflow and dialog bounds passed at 1280×800 and widths 760, 390 and 320px. Desktop and mobile screenshots were opened and visually inspected; inspection caught and corrected a low-contrast selected-tab hover state.

- [Desktop deck builder](screenshots/deck-builder-desktop.png)
- [Mobile catalog](screenshots/deck-builder-mobile.png)
- [Mobile deck controls](screenshots/deck-builder-mobile-deck.png)
- [Rain Dance actions](screenshots/rain-dance-actions.png)

## Engine-backed coverage

- Number-by-number catalog completeness, distinct holo/non-holo IDs, registration of every playable entry, independent Pokémon identity/HP/stage audit, and the explicit Gastly gap.
- Five legal example decks; exact 60-card requirement; cross-printing name limits; unlimited Basic Energy; eligible starting Basics; malformed/illegal/unregistered IDs and hostile quantities; incomplete save schema; text and JSON printing-preserving round trips; ambiguous import errors; server validation independent of client flags.
- Custom decks are fed into actual AddPlayerAction/setup, including a non-holo Scyther printing.
- Rain Dance Water-only attachment and extra-attachment behavior; Hydro Pump cap; Wigglytuff Do the Wave and DCE; Scyther Swords Dance/Slash; Professor Oak; Energy Removal; Pokédex ordering; Venusaur Energy Trans/duplicate rejection; Alakazam Damage Swap/no self-KO; Gengar Curse/once-per-turn reset; Mankey anonymous Prize selection and authorized reveal; Ditto Transform/copying/DCE units; Clefable Metronome; benched Mysterious Fossil discard.
- Historical coin timing, two-card mulligan compensation maximum, repeat retreats, paid failed confusion retreat/retry blocking, and 20 confusion self-damage.
- PlusPower enabling a real KO and Prize prompt; immediately useful Energy attachment; avoiding a wasteful Super Energy Removal; Gust targeting; sensible replacement Active; DTO policy rejecting hidden-zone access.
- Existing ownership/revision/duplicate defenses, original practice card effects, status coin flips, Energy payments, evolution, KO/Prizes/replacement and victory tests remain.

## Full-game evidence

The eight new seeded games all reached Twinleaf FINISHED without a fault or action-loop timeout. Player seat 0 uses the public advanced policy over its selected deck; AI seat 1 uses Haymaker. This tests progression, not tournament strength. A turn-one loss is legal under this format's first-turn attack rules.

| Seed | Player deck | Turns | Decisions | Winner seat |
|---|---|---:|---:|---:|
| 19 | Ember | 16 | 65 | 1 |
| 73 | Ember | 1 | 8 | 1 |
| 20 | Haymaker | 47 | 157 | 1 |
| 74 | Haymaker | 14 | 56 | 1 |
| 21 | Rain Dance | 7 | 34 | 1 |
| 75 | Rain Dance | 23 | 72 | 1 |
| 22 | Wigglytuff | 43 | 166 | 0 |
| 76 | Wigglytuff | 44 | 169 | 0 |

Raw results: [milestone-3-game-results.json](milestone-3-game-results.json). The six original seeded practice games also pass, for **14 completed game scenarios** in the suite.

## Manual testing checkpoint

1. Run `npm ci` if dependencies are not installed, then `npm run dev`. Open **http://127.0.0.1:5173/**.
2. Choose **Deck Builder**. Confirm Base Set, Jungle and Fossil appear, with 228 total printings. Search Scyther to see holo #10 and non-holo #26 separately. Try expansion, category, type, stage and sorting controls.
3. Click a card. Inspect its enlarged art/text and use **Add to Deck / Remove from Deck**. Check the total and grouped Pokémon/Trainer/Energy counts. Try a fifth Scyther across its two printings and confirm the copy-limit message.
4. Create a deck from scratch or choose an example. A simple legal test is four Hitmonchan plus 56 Fighting Energy; the archetype examples make more interesting matches. Name it and **Save deck**. Try saving an incomplete deck too.
5. Reload, reopen the builder, and load your deck. Edit its name and save, duplicate it, delete the duplicate, then export text and JSON. Import a list with exact set/number printings; an ambiguous `4 Scyther` must report an error.
6. Return to **Main menu**. Select the saved deck and **Haymaker AI**. Confirm an incomplete deck disables **Play vs AI**, then choose your legal deck and start.
7. Follow the engine's mulligan/setup prompts. Select your Active first and optional Bench Pokémon after it; the opening coin flip follows setup. Check that the name above your battlefield matches your selected deck.
8. Play several turns: click a Basic, attach Energy, play Bill/Oak or Computer Search when drawn, attack, and complete all required choices. Watch Haymaker develop its board and act automatically; inspect its diagnostics and the match log.
9. Try **Rain Dance**: load/save the Rain Dance example, evolve Blastoise when legal, click it → **Use Ability: Rain Dance** → choose the Water-Energy/Water-Pokémon pair → confirm. Use Hydro Pump when affordable. Try Wigglytuff's Do the Wave, Scyther's attacks, Fossil Magmar/Lapras or Ditto in a custom deck.
10. After a KO, choose a face-down Prize or replacement Active. Verify opponent hands/decks and unselected Prizes remain hidden.
11. Complete any mandatory decision, open **Deck Builder**, reload your saved deck and edit it. **Resume match** returns to an existing table; only starting a new match replaces it.
12. Repeat at **1280×800**, **760px**, **390px** and **320px** widths. Mobile tabs should make both catalog and deck controls usable without horizontal page overflow. Try keyboard Tab/Escape and a missing image fallback.

## Known limits

See [milestone-3-research.md](milestone-3-research.md) for exact card/rules gaps and [upstream patches](../vendor/twinleaf/PATCHES.md). Catalog completeness is not comprehensive effect certification. Base Set Gastly #50 is unavailable for matches. Immediate-per-mulligan timing, pre-Neo confusion attack-discard timing and dynamic confusion Weakness/Resistance remain incomplete or unverified. The AI uses approximate heuristics. Chromium was tested; Safari, Firefox, physical touch devices and screen readers were not. Saved decks are browser-local; live matches are process-local.

This milestone stops for user review. No additional formats, accounts, matchmaking or deployment are included.

---

# Milestone 2: interaction and dialog verification

Tested 2026-10-13 using Node 24.14.0 and Chromium through Playwright.

## Commands

```sh
npm run build
npm test
npm run test:e2e
```

Playwright now starts and stops isolated servers on **5174 / 3002**. It does not require a running development server and does not replace the normal application on **5173 / 3001**. Install Chromium with `npx playwright install chromium` if needed. On this execution machine, use `PLAYWRIGHT_BROWSERS_PATH=/tmp/ptcg-browsers npm run test:e2e`.

## Final results

- `npm run build`: **PASS**.
- `npm test`: **42/42 PASS**, across two files.
- `PLAYWRIGHT_BROWSERS_PATH=/tmp/ptcg-browsers npm run test:e2e`: **11/11 PASS** (1.4 minutes).
- The normal browser gameplay run reached **turn 9**, across 40 test-loop iterations and seven human prompts in one match; Trainer, Energy and attack interactions all occurred, with **zero browser console/page errors**. Reload resumed the same match.
- Screenshots below were opened and visually inspected. The focused suite verified 1280 × 800 and widths down to 320px.

The first browser pass identified backward-Tab focus escape; the dialog now wraps focus explicitly. Fixture expectations were corrected to reflect Twinleaf's discard order and automatic payment of equivalent Energy. A later run overlapped live source edits and caught Vite development hot-reload warnings; the final complete run used stable source and passed the unchanged zero-console-error assertion.

## Coverage

- Production build: engine bundle, strict TypeScript check, Vite frontend build.
- Existing 42 integration/upstream tests: engine legality, ownership/revision/duplicate rejection, Trainer effects, Energy, evolution, damage, prizes, replacement Active, victory, hidden information, AI safeguards and six complete seeded games.
- Browser tests: enlarged artwork, legal action buttons, optional Close/Escape, keyboard focus containment/restoration, Basic to Bench, Energy attachment, evolution and Switch targets, named attacks, Computer Search discard → search → hand, gallery filtering, selection caps, actual KO → hidden prize → automatic AI replacement, human replacement Active, mandatory Escape/backdrop protection, multi-prize count, server rejection feedback, offline/resume, image fallback, duplicate clicks, allowed cancellation/zero-choice searches, expired sessions, normal setup and several consecutive turns against automatic AI.
- Responsive browser assertions at 1280 × 800, 760px, 390px and 320px: modal bounds, no horizontal page overflow and no page scrolling to reach dialog actions. The modal body scrolls internally; prompt confirmation stays in its footer.

## Fixture boundaries

`tests/browser/fixture-server.ts` arranges real Twinleaf card instances after real setup. All browser submissions go through the same `server/socket.ts`, `Match`, action probing, prompt decoding and engine validators as production. The normal entrypoint never imports test fixtures or exposes a fixture selector. The ordinary consecutive-turn browser test starts a fresh shuffled game and controls only the human seat; the AI uses its existing automatic scheduling.

Most targeted browser scenarios invoke actual card effects. Two contract fixtures instantiate real engine prompts directly: multi-prize cardinality and optional deck selection/cancellation. The current decks contain no multi-prize Pokémon or optional-search Trainer, so those fixtures verify the engine prompt contract and UI, not a new card effect. Mixed Fire/Fighting Energy in the payment fixture prevents Twinleaf's automatic selection of equivalent Energy and exposes its genuine payment prompt.

## Screenshots inspected

- [Desktop card actions](screenshots/card-actions.png)
- [Mobile card actions](screenshots/card-actions-mobile.png)
- [Discard selection](screenshots/discard-selection.png)
- [Deck search](screenshots/deck-search.png)
- [Face-down prizes](screenshots/prize-selection.png)

## Manual checklist

1. Run `npm run dev`, open http://127.0.0.1:5173/ and choose **Play vs AI**. In setup, select Active first, then optional Bench cards; confirm.
2. Click a hand card. Read its enlarged artwork, toggle card text, close with Escape, reopen and use a legal action. Try **Play to Bench** and **Attach Energy**, then select the labeled target.
3. Click Active and choose a named attack. Try evolution or Switch when offered. Watch the AI finish its turn automatically.
4. Play **Computer Search**: choose two discards, confirm, filter/select an eligible deck card and confirm. Escape should leave both required prompts open.
5. After a knockout, select a face-down prize or replacement Active when requested. Play at least three turns each and check the match log.
6. Resize to 1280 × 800 and a narrow/mobile window. Tab through a dialog; actions should remain reachable inside it. Inspect an opponent card and a public discard card.
7. Reload to resume. Disconnect/reconnect with a choice selected; it should survive while the session remains valid. Restarting the backend expires in-memory matches and returns the client to the start screen.

## Limits

Chromium is verified; Firefox, Safari, physical touch devices and screen-reader testing remain unverified. No activated Ability cards exist in the test decks; their action path is retained but not certified. Coin outcomes remain server-generated and logged, without an added animation or client decision. Exact Energy payments are validated by Twinleaf after submission; invalid combinations retain the prompt and display its rejection. No new cards, formats or complete historical-ruling certification. Matches remain in memory and do not survive backend restarts.

This milestone stops for user review. No next-milestone features are included.
