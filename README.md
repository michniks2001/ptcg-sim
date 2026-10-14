# The Practice Table

A local Pokémon TCG tabletop with a Base–Fossil deck builder and two automatic opponents. React presents the cards and choices; the pinned Twinleaf engine owns setup, legality, effects and game outcomes. Keep the felt table, click a card, select an action, and complete its required choices. No drag-and-drop or accounts.

## Run locally

Use Node **22.12+ or 24.x** (tested with 24.14.0).

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5173/**. The backend listens on **127.0.0.1:3001**. Keep the terminal running; both ports must be free. There is no database, API key or external game server. All 228 printing images are locally cached and missing images fall back to card text.

## Build and play

1. Open **Deck Builder** from the navigation. Search or filter the collection, then click a card for its enlarged preview and **Add to Deck / Remove from Deck** controls.
2. Start empty or load an example: Ember, Low Kick, Haymaker, Rain Dance or Wigglytuff. Examples are immutable starting points; saving creates your own local deck.
3. Name and **Save deck**. Incomplete decks can be saved. Edit the name and save to rename; **Duplicate**, **Delete deck**, **Import** and **Export** are in the deck panel. On narrow screens, switch between **Card catalog** and **Your deck** tabs.
4. Return to **Main menu**, select a saved or example deck, choose **Practice AI** or **Haymaker AI**, and click **Play vs AI**. Invalid decks show specific errors and cannot start. The server independently validates every submitted deck.
5. Select your starting Active first, then optional Bench Pokémon. If compensation is offered, review the separate mulligan hands, choose an amount, and click **Draw X Cards** once (or **Continue Without Drawing**). Mulligan reveals otherwise advance automatically and remain available through **Review mulligan hands** in the match log. The historical opening coin flip follows setup. Click your hand or board cards to inspect legal actions. The opponent finishes its turns automatically.

Browser-local decks have a versioned schema and survive ordinary reloads/restarts. Storage failures are reported rather than claiming success. Export JSON for a portable backup. Clearing browser storage removes saved decks. Active matches live only in backend memory; an opaque local token resumes a match while that process still exists. Backend restarts and development hot reloads end existing sessions.

Text import/export includes printing identity, for example:

```text
# My Haymaker
4 Hitmonchan BS 7 [base1-7]
4 Electabuzz BS 20 [base1-20]
3 Scyther JU 10 [base2-10]
```

Lines use quantity, name, set code and number; `[printing-id]` is optional. Ambiguous names are rejected. **Lossless JSON** additionally preserves deck ID, name, format and schema version. Import creates an editable copy in the builder; save it to retain it.

## Battlefield controls

Click a card to inspect it and choose an action. **Attach Energy**, **Retreat**, evolution and eligible Pokémon effects close the inspector and highlight legal battlefield targets in gold. Click a target or use Tab/Enter. **Cancel targeting** (or Escape) abandons an unsubmitted action; committed choices remain required unless the engine explicitly provides **Cancel action**. Rain Dance/Energy Trans select the Energy first, then a destination. Damage Swap selects source then destination. For a paid **Retreat**, select the replacement on the Bench, then choose which attached Energy cards to discard in the payment dialog. Selection numbers show discard order; confirm once the cost is met. Double Colorless counts as two Energy on one card, and the final card may overpay. Free retreats skip payment. Deck searches, discards, Energy payments, Prizes, ordering and text choices retain dialogs.

The two Active Pokémon face each other in the center, with compact Benches behind them, six-card Prize grids to the left, and Deck/Discard stacks to the right. Discard shows its public top card. Your hand stays beneath the field. On tablets and phones, scroll or pan inside the mat to reach every zone. Energy symbols use the existing card artwork; symbols and Special Energy/attached-card badges can be clicked to inspect each actual card. DCE is one attachment. Poison/Burn counters and the upright status buttons open condition details; Sleep rotates artwork left, Paralysis right, and Confusion upside down. **!** opens Pokémon effect details. **Field Effects**, beside the log, shows ongoing restrictions. On mobile, open **Match log +**, pan the playmat for battlefield zones, and scroll the hand to reach more cards. Short callouts use confirmed server events and respect reduced-motion settings.

See [Milestone 4 research and limitations](docs/milestone-4-research.md) and the [manual testing checkpoint](docs/testing.md). Defender's existing attachment defect is documented; no new engine patch, legal Tool, Burn mechanic or later format was added.

## Format and coverage

**Base–Fossil (1999)** includes exactly **102 Base Set + 64 Jungle + 62 Fossil = 228 printings**, including separate holo/non-holo entries. Promos, Base Set 2, Rocket and later sets are excluded. Catalog IDs `base2-*` refer to **Jungle**, following the metadata source's numbering.

**227 printings have executable Twinleaf definitions. Base Set Gastly #50 is missing from the pinned source.** Its artwork and metadata appear with an explicit engine-unavailable notice; decks containing it can be saved but cannot start matches. Fossil Gastly works. Fossil Ditto #18 reuses Ditto #3 through a printing-only subclass.

Decks require exactly 60 cards, at least one eligible Basic Pokémon, and no more than four of any name across printings, except Basic Energy. Mysterious Fossil and Clefairy Doll do not satisfy the starting-Pokémon requirement. All five example lists pass server and engine validation. Targeted effects and seeded complete matches are tested; that is not exhaustive certification of every card or archetype.

Historical rule switches allow first-turn drawing/attacking, unlimited Trainers, repeated retreat and historical confusion-retreat payment; the coin winner goes first after initial Pokémon selection. Mulligan compensation is up to two cards per excess mulligan. Known gaps remain in compensation timing and attack-discard timing under Confusion; see the research report.

## Opponents

**Practice AI** retains the simple Low Kick deck and policy. Ember remains available as the original player practice deck.

**Haymaker AI** uses a documented 60-card adaptation with Hitmonchan, Electabuzz, Scyther, draw/search, Energy removal and KO-support Trainers. It scores expected damage, Weakness/Resistance, remaining HP, attack-enabling attachments, resource costs, favorable switching and prompt choices. It saves PlusPower for KO thresholds and avoids indiscriminate Oak and Super Energy Removal use. It receives only its own hand and public-board DTOs, never the opponent's hidden hand or deck order. Its predictions do not resolve gameplay: every move is validated and executed by Twinleaf. Diagnostics and an 80-decision safeguard remain available. This is a heuristic opponent, not a tournament-strength search engine.

## Current screenshots

[Browse the current screenshot gallery](docs/screenshots/README.md) · [Open the visual gallery](docs/screenshots/index.html). Historical screenshots have been removed; captures show the current application, including the updated mulligan flow.

## Verification

```sh
npm run build
npm test
npx playwright install chromium
npm run test:e2e
```

Playwright uses isolated servers on **5174 / 3002**. On this execution machine Chromium is in `/tmp/ptcg-browsers`, so use:

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/ptcg-browsers npm run test:e2e
```

[Mulligan refinement and manual checklist](docs/mulligan-refinement.md) · [Testing results and manual checklist](docs/testing.md) · [Milestone 3 research and coverage limits](docs/milestone-3-research.md) · [Original architectural research](docs/research.md).

## Architecture

- `vendor/twinleaf/`: pinned source at `a8b6fe9075f982f7722e3c9ee2ce5e39cea1f1ca`. Additional dependencies come from that exact revision. [Local patches](vendor/twinleaf/PATCHES.md) are isolated card corrections and historical rule switches.
- `scripts/engine-entry.ts`, `scripts/build-engine.mjs`: bundle the engine and three sets; generate `shared/catalog.json`. The server root barrel is redirected to game exports to avoid account/database services.
- `server/format.ts`: independent format registry, historical configuration, executable registration and final deck validation. `shared/decks.ts`: versioned deck schema, immediate validation, import/export and examples.
- `server/actions.ts`: candidate actions tested on independently cloned Stores, with engine Energy prechecks before status coin prompts. `server/prompts.ts`: owner-only projection, bounded choices, secret-card handling and original engine decoding/validation.
- `server/match.ts`: authoritative Store, randomness, session revisions, setup and AI coordination. `server/socket.ts`: input validation, ownership and timed AI advancement.
- `server/bot.ts`: public-information heuristics. `server/views.ts` / `shared/protocol.ts`: explicit DTOs, never raw engine state.
- `src/DeckBuilder.tsx`, `src/deck-storage.ts`: catalog, local CRUD and persistence. `src/dialogs.tsx`: shared native modal framework for inspections and required choices.
- `scripts/download-cards.mjs`: optional image restoration from the generated manifest; no metadata API is required at runtime.

No accounts, public matchmaking, production deployment or later formats are included. This milestone stops for manual review.

Upstream attribution and license evidence are preserved in [vendor/twinleaf/NOTICE.md](vendor/twinleaf/NOTICE.md). Pokémon artwork and names remain their respective owners' property. This is an unofficial local fan project.
