# Milestone 5 implementation report

Work is on branch `milestone-5`, based on `60b0e4d`. This is a substantial implementation checkpoint, **not completion of every requested historical format**. All enabled formats remain experimental. Unsupported formats and unfinished audits are identified below rather than presented as verified.

## A. Card integration

Twinleaf remains pinned to `a8b6fe9075f982f7722e3c9ee2ce5e39cea1f1ca`. The audit also compared exact revision `e7a1c390ae077f01cdc251c98b1d83e576c4c228`; it was not adopted.

- 162 exported set modules discovered; 160 imported. Test/Game Boy modules are excluded.
- 13,791 executable identities registered; 8,981 distinct effect functions.
- 13,792 catalog entries; 13,711 selectable. Original printing IDs are preserved.
- Base Gastly #50 remains unavailable. Eighty entries representing 40 conflicting official-printing matches are quarantined.
- The independent 20,635-record metadata snapshot matches 12,854 unique catalog printing records, including unavailable/quarantined records. Another 898 executable entries lack matched printing metadata. Unknown artwork/dates are not invented.
- Most definitions are implemented but unverified. A representative tested status does not certify every interaction.

Exact missing-printing mappings, set names, collector numbers, mechanics, availability and conflicts: [coverage](card-coverage.md), [application inventory](card-inventory.json), [independent printing inventory](printing-inventory.json), [conflicts](card-registration-conflicts.json).

## B. Format support

| Format | Period / legal pool | Rules | Status | AI | Limitations |
| --- | --- | --- | --- | --- | --- |
| Base Set | January 1999; BS | wotc-1999 | Experimental | Low Kick | Fewer than three archetypes; legacy timing/card gaps |
| Base–Jungle | June 1999; BS/JU | wotc-1999 | Experimental | Low Kick, Haymaker | Fewer than three archetypes; legacy gaps |
| Base–Fossil | October 1999; BS/JU/FO | wotc-1999 | Experimental | Haymaker, Rain Dance, Wigglytuff, Low Kick | Gastly and historical timing gaps |
| Base–Rocket | April 2000; prior sets + TR | wotc-1999 | Experimental | Same four legacy lists | Main expansions; promos/interactions incomplete |
| Base–Gym | October 2000; prior sets + G1/G2 | wotc-1999 | Experimental | Same four legacy lists | Main expansions; new interactions unverified |
| Base–Neo Genesis | December 2000; prior sets + N1 | wotc-1999 | Experimental | Same four legacy lists | Unlimited snapshot, not Modified; Baby/Neo gaps |
| Worlds 2024 | Main BRS–SFA pool, F/G/H, August 2 cutoff | modern-2020 | Experimental | Iron Thorns, Roaring Moon, Miraidon | Promotional releases and comprehensive old reprints not certified |
| Card laboratory | All selectable registered definitions | modern-2020 | Experimental | Four legacy opponents | Mixed-era engine exploration, not sanctioned Unlimited |
| Worlds 2004, 2006, 2010, 2013, 2016, 2019, 2022, 2025, 2026 | No guessed pool enabled | Unavailable | Unavailable | None | Event legality/rules/AI integration unfinished |
| Expanded, GLC, RSPK | Upstream definitions inspected | Unavailable | Unavailable | None | Dated bans/reprints, special rules and AI coverage unfinished |

The registry separates legality, construction and engine profiles. Snapshots do not rotate with the current date. Explicit reprint mappings include Base Switch in Worlds 2024; different effects such as original Potion are not equated by name. Existing v1 decks need no destructive migration.

## C. Historical rules

Representative engine tests cover six profiles, including opening draws/attacks, first-turn Trainer/Supporter restrictions, once-per-turn Supporters, old/modern Burn and historical Stadium replacement. Only the profiles attached to enabled snapshots are offered as formats.

Wizards snapshots preserve two-card grouped compensation, post-selection coin timing, repeated retreats, historical Confusion, ordered retreat payment and DCE units. Rain Dance and other acceleration do not consume the ordinary attachment. The three original repeatable Powers respect pre-2002 Poison restrictions instead of applying the later erratum.

Remaining discrepancies include immediate-per-mulligan timing, pre-Neo Confusion attack-discard timing, dynamic Confusion modifiers, other historical Power callers and comprehensive era-specific rulings. Prize awards, Rule Boxes, evolutions, special Energy and once-per-game mechanics continue through Twinleaf; only representative later mechanics have been exercised. [Detailed rules](historical-rules.md).

## D. Repeatable Abilities

Damage Swap supports repeated source/destination selection and a counter quantity. Every counter resolves through a separate engine activation and validated choice; requests stop at the last legal state. Rain Dance selects actual Water Energy from hand and eligible Water Pokémon; Energy Trans selects actual physical attachments and fresh destinations. Gold targeting, immediate board updates and the inspector remain.

Done exits without ending the turn. Escape/Change source abandon an uncommitted selection. Completed actions cannot be undone. Re-entry is allowed when legal. Mandatory prompts cannot be dismissed through session controls. Later adapters cover Ice Dance, Super Cold and Excited Turbo, preserving their distinct restrictions. Non-cancellable upstream effects use Continue between activations; this extra click remains a limitation.

One activation callout appears per session; Trainer, attack, coin and attachment feedback remain. Consecutive attachment changes coalesce. [Controls and safety](repeatable-actions.md).

## E. AI opponents

Wizards pools reuse the existing adapted Haymaker, Blastoise Rain Dance and Wigglytuff archetypes, plus Low Kick for practice. They are not relabeled as exact later tournament lists.

Worlds 2024 lists retain card counts from [Cifuentes's Iron Thorns](https://limitlesstcg.com/decks/list/12238), [Shiokawa's Roaring Moon](https://limitlesstcg.com/decks/list/12239) and [Parker's Miraidon](https://limitlesstcg.com/decks/list/12241), with compatible primary cosmetic printings/Basic Energy. No strategic card-count substitution is claimed. Exact templates are in `shared/historical-decks.ts`; [AI documentation](ai-decks.md) identifies adaptations and heuristic limits.

Six new legacy/laboratory scenarios and three Worlds 2024 scenarios reached legitimate engine endings. Existing complete-game tests remain. [Raw game results](milestone-5-game-results.json).

## F. Testing

The final executed command results are recorded at the top of [docs/testing.md](testing.md). Tests include card registration/availability, legality boundaries, explicit reprints, 14 historical-profile cases, 12 session cases, complete seeded games, mobile targeting and later-era selection. Broad imported-card correctness and unsupported formats are not claimed merely because the production bundle passes.

Final results: production build **PASS**; unit/integration **180/180 PASS** across 11 files (80.65 seconds); browser **65/65 PASS** (2.4 minutes). The original 141 unit and 58 browser cases remain, with intentional control assertions updated for persistent targeting and bounded gallery rendering. Nine new complete-game scenarios pass in addition to the original seeded scenarios. An intervening render-timing browser failure was corrected with an explicit visibility wait and followed by the successful full rerun.

## G. Performance

Engine build measured 3.34 seconds in a standalone run. The production build also passes with strict application TypeScript. Initial browser JavaScript is about 457.7 kB / 119.0 kB gzip; expanded metadata is an on-demand 12.27 MB / 1.22 MB gzip chunk. The large-chunk warning applies to that optional data chunk and remains documented.

The latest measured import, search, validation, initial-prompt creation, legal-action refresh and single-counter timings are in [performance JSON](milestone-5-performance.json). Cold import is not an HTTP-ready benchmark; match creation excludes human setup time. Gallery rendering begins at 96 entries. Remote images remain lazy and optional.

Latest local medians: cold server/registry import **1,173.5 ms**; catalog search **0.91 ms**; validation **0.011 ms**; match creation to initial prompt **1.67 ms**; legal-action refresh **31.51 ms**; repeated counter resolution **19.35 ms**. These are local process measurements, not end-to-end network latency or human setup time.

## H. Manual review

```sh
npm ci
npx playwright install chromium
npm run dev
```

Open http://127.0.0.1:5173/. Existing Base–Fossil saved decks are under Player deck or Load a saved deck in the builder. Select Base–Fossil and Haymaker to check ordinary setup, attachments, conditions, attacks, Prizes and match completion. Choose the Rain Dance example for repeated Water attachment.

For Damage Swap, build a legal custom deck with Abra/Kadabra/Alakazam, a durable Basic such as Chansey, draw/search and Psychic Energy. Evolve legally while Chansey accumulates damage, then activate the benched Alakazam. Move one counter; change the source/destination; set the quantity to three; attempt an excessive request; use Done; and reactivate later. The game must keep the same turn when leaving the mode.

For Energy Trans, use Bulbasaur/Ivysaur/Venusaur and Grass Energy. Attach Energy normally across multiple Pokémon, evolve Venusaur, activate Energy Trans and repeatedly select actual attachments and destinations. Try a non-Grass Energy and confirm it is excluded. Done must leave ordinary turn actions available.

For later Abilities, select the laboratory before constructing a compatible deck. Ice Dance uses eligible Water Bench Pokémon; Super Cold has different targets; Excited Turbo requires a Fire Mega Evolution Pokémon ex in play and Fire Bench targets. Resolve a committed mandatory choice before Done; use Continue for the next activation.

Choose Worlds 2024 on the main menu, wait for its examples to load, select one contemporary player deck and one of its three opponents, then play through setup and a full game. Inspect public Stadium/Lost Zone details and Tools, including granted actions where available. Other event snapshots listed as unavailable cannot be reviewed as playable accurate formats yet. Repeat on desktop and 320–390px layouts. [Expanded manual checklist](testing.md).

## I. Remaining work

The requested broad historical milestone remains incomplete: most Worlds snapshots and Expanded/GLC/RSPK are unavailable; no format satisfies the full verified definition. Promotional dates, comprehensive reprints/bans, old evolution/Trainer mechanics, additional prompt families, every imported card effect and later AI strategy still need work. Forty ambiguous official printings are quarantined, Gastly is missing, and 898 entries have unmatched printing metadata. Super Cold/Excited Turbo require Continue. Remote artwork may fail and falls back to text. These limits are visible in the app and documented rather than hidden behind a complete-coverage claim.
