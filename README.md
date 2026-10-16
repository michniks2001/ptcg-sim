# The Practice Table

A self-hosted Pokémon TCG practice table using React, Socket.IO and a pinned Twinleaf rules engine. The forest-green tabletop, direct targeting, inspections, conditions and lightweight callouts remain.

Milestone 5 currently provides **13,792 catalog entries / 13,711 selectable entries**, persistent repeatable Abilities, multiple experimental snapshots and three Worlds 2024 opponents. **It does not complete every requested historical format. No format is labeled verified.** Read the [coverage and limitations](docs/milestone-5-research.md) before treating a snapshot as tournament accurate.

## Run locally

Use Node **22.12+ or 24.x**.

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5173/**. The backend listens on **127.0.0.1:3001**. Both ports must be free. No database, account, API key or external game server is needed. Live matches remain in server memory; restarting the backend expires them.

## Decks and formats

Open **Deck Builder**, choose **Format**, search/filter cards, inspect a printing and add/remove quantities. The gallery initially renders 96 entries; **Show 96 more cards** expands it. **More filters** includes series, mechanic, Trainer subtype, regulation mark, availability and legality. Later-era metadata loads on demand. Original artwork stays locally cached; additional matched printings use remote images with text fallback.

Existing schema-v1 Base–Fossil decks retain their IDs, names and card quantities. Save, rename, duplicate, delete, text/JSON import and export remain browser-local. Duplicate a saved deck before changing formats; changing the format preserves its cards and reports illegality. Incomplete decks can be saved but cannot start matches.

Available experimental snapshots include Base Set, Base–Jungle, Base–Fossil, Base–Rocket, Base–Gym, Base–Neo Genesis, Worlds 2024 and a mixed-era **Twinleaf card laboratory**. The laboratory is not sanctioned Unlimited. Later Worlds snapshots remain disabled. [The format registry](docs/format-registry.md) lists precise coverage and remaining gaps.

On the main menu select the same format as your deck, choose an opponent and **Play vs AI**. Wizards examples can be copied into the selected Wizards pool. For Worlds 2024, wait for the later catalog to load, then select Iron Thorns, Roaring Moon or Miraidon from the player examples and choose one of its three opponents.

## Tabletop controls

Click a card to inspect its actual identity and engine-legal actions. Energy attachments, evolution, retreat and visible Pokémon choices use gold battlefield targets. Retreat retains its ordered Energy-payment dialog; Double Colorless is one card supplying two units. Hidden searches, ordering, complex distributions and mandatory decisions retain dialogs.

Repeatable modes support **Damage Swap, Rain Dance, Energy Trans, Ice Dance, Super Cold and Excited Turbo**:

- Activate the effect once from its Pokémon inspector.
- Damage Swap: choose the number of counters, a damaged source and a destination. Every counter uses a separate legitimate engine activation; a request stops before an illegal transfer.
- Rain Dance/Ice Dance/Super Cold: click a highlighted eligible Energy in hand, then a gold target.
- Energy Trans: click an eligible physical attachment, then a gold destination. Repeat from different Pokémon.
- **Done** exits the mode without ending the turn. Reopen the Pokémon to reactivate later if legal. **Change source** or Escape discards an uncommitted selection; completed moves remain.
- Super Cold and Excited Turbo pause between attachments with **Continue** because their upstream prompts are non-cancellable. Resolve a committed mandatory choice before Done.

[Repeatable-action documentation](docs/repeatable-actions.md) explains restrictions and interruption handling. Mandatory prompts, revision checks, ownership, duplicate protection and engine-generated randomness remain authoritative.

Callouts remain for Trainers, attacks, attachments, Abilities and coins. Repeated activations produce one session activation message, and consecutive attachment feedback coalesces. Effects/conditions and physical Energy/Tool identities remain inspectable. Public Stadium/Lost Zone details and GX/VSTAR usage appear when applicable. Mobile play uses the same scrollable mat.

## Coverage and opponents

Twinleaf remains pinned to **a8b6fe9075f982f7722e3c9ee2ce5e39cea1f1ca**. The generated manifest imports 160 of 162 exported modules, excluding test/Game Boy cards. Registered identities, official printings and tested effects are separate measurements.

Base Gastly #50 remains unavailable. Forty official printings have competing upstream definitions; their 80 catalog entries are quarantined. Other cards are marked implemented but unverified unless a representative gameplay test exists. [Card coverage](docs/card-coverage.md) links the exact machine-readable inventories.

Base–Fossil and the larger Wizards pools offer **Haymaker**, **Rain Dance** and **Wigglytuff**, plus **Low Kick** for beginner practice. Worlds 2024 offers sourced **Iron Thorns**, **Roaring Moon** and **Miraidon** lists with tournament card counts and compatible primary printings. [AI lists and sources](docs/ai-decks.md) document adaptations. The heuristic receives its own hand and public information only; every move still passes Twinleaf.

Historical accuracy gaps remain, including original compensation timing, pre-Neo Confusion discard timing, unverified card interactions, incomplete promotional/reprint coverage and unavailable later snapshots. See [historical rules](docs/historical-rules.md).

## Verification

```sh
npm run build
npm test
npx playwright install chromium
npm run test:e2e
```

Playwright starts isolated servers on **5174 / 3002**. Use its default installed browser cache on this machine; the earlier /tmp browser path is no longer required. Final results and the manual checklist are in [docs/testing.md](docs/testing.md).

Optional reproducible reports after building:

```sh
node scripts/coverage-report.mjs
node --import tsx scripts/benchmark-m5.mts
```

The engine build generates the legacy/expanded catalogs and set manifest. Executable card objects remain server-side. Additional source/metadata provenance, scripts and revision comparisons are documented in [Milestone 5 research](docs/milestone-5-research.md).

[Upstream attribution and patch record](vendor/twinleaf/NOTICE.md) · [Local engine patches](vendor/twinleaf/PATCHES.md). Pokémon names and artwork remain their respective owners' property. This is an unofficial local fan project. No public deployment, accounts, matchmaking or tournament infrastructure is included.
