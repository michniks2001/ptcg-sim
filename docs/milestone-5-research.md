# Milestone 5 research and implementation record

Baseline and audit started October 15, 2026; verification continued October 16. Work is on `milestone-5`, based on `60b0e4d`. The tabletop styling and previous historical patches are retained.

## Baseline

The unchanged checkpoint passed the production build, 141 unit/integration tests, and 58 Chromium browser tests. Chromium was absent at the previously documented `/tmp/ptcg-browsers` path; `npx playwright install chromium` installed this machine's default browser cache. A first browser run had one general-play timeout; the isolated unchanged checkout subsequently passed all 58 in 2.3 minutes. These are distinct executions, not a claim that the failed run passed.

## Revision decision

Retain Twinleaf `a8b6fe9075f982f7722e3c9ee2ce5e39cea1f1ca`. Upstream HEAD resolved during the audit to `e7a1c390ae077f01cdc251c98b1d83e576c4c228`. Comparison found 874 changed card/game files, including substantial Diamond & Pearl additions and Trainer rewrites. The retained pin already exports 162 set modules across Wizards through Mega Evolution. Importing its dependency closure preserves the existing patch base; the newer revision was inspected but was **not** integrated or certified. This is not a claim that both revisions have equal coverage.

`scripts/audit-cards.mjs` generated the source inventory. `scripts/vendor-all-cards.mjs` imported 160 modules and 10,048 previously absent dependency files without overwriting existing files. `set-test` and `set-game-boy-exclusives` are excluded from playable registration. Newer-era definitions are upstream code, not invented replacements.

There are 13,791 registered executable identities and 8,981 distinct `reduceEffect` functions, including inherited effects shared by alternate printings. These are different measurements. There are 13,792 catalog entries, including unavailable Base Gastly. Forty matched official printings have two competing upstream identities each; all 80 entries are quarantined pending effect review. No arbitrary implementation is chosen for those printings. See the machine-readable inventories and coverage report.

## Printing data

The independent printing snapshot comes from [Pokémon TCG Data](https://github.com/PokemonTCG/pokemon-tcg-data), revision `39a26a144c8b6ef6c2fb17b2c29d0bb7121e3a11`: 176 set records and 20,635 English printing records. It is a metadata dataset, not proof of official legality or executable behavior. Matching requires set code, collector number, and normalized name. Unknown dates/art remain unknown. The repository announces deprecation; neither installation nor gameplay calls its API.

Existing `base1-*`, `base2-*`, `base3-*` application IDs are preserved. Additional IDs use `twinleaf:` plus the encoded executable full name. Matched external printing IDs are separate fields. Non-numeric collector numbers are retained. Card effects remain server-side. Additional catalog metadata loads only when needed; the gallery initially renders 96 entries.

## Rules research

- [Wizards rules, Jason Klaczynski](https://jklaczpokemon.com/pokemon-wotc-rules/): historical setup, two-card mulligans, repeated retreats, Confusion, Stadium replacement, and the Neo attack-discard exception.
- [EX-era retrospective](https://jklaczpokemon.com/ex/): the 2004 opening-draw and Supporter restrictions.
- [Diamond & Pearl retrospective](https://jklaczpokemon.com/dpp/): historical format transitions. A calendar-year label alone is not an event snapshot.
- [Official XY rulebook](https://assets.pokemon.com/assets/cms2-es-es/pdf/trading-card-game/rulebook/xy0_rulebook_en.pdf) and [Sword & Shield rulebook](https://assets.pokemon.com/assets/cms2/pdf/trading-card-game/rulebook/swsh7_rulebook_en.pdf): later opening-turn rules.
- [Official 2020 Oceania preview](https://www.pokemon.com/us/play-pokemon/internationals/2020/oceania/tcg-power-rankings): the first-player Supporter restriction at that event.
- [Official Worlds 2024 coverage](https://www.pokemon.com/uk/play-pokemon/worlds/2024/tcg-senior) and [event decklists](https://limitlesstcg.com/tournaments/420/decklists): regulation marks F/G/H and the Brilliant Stars–Shrouded Fable event pool.

Six engine rule profiles have representative behavioral tests. Only profiles connected to the enabled snapshots are selectable. Tests of EX/DP/BW/XY opening behavior do not certify those complete formats.

## Upstream compatibility findings

Modern setup's `decideStartingPlayer` referenced an undefined opponent when the second seat won the coin flip. The missing binding is fixed. The first-turn Supporter guards ignored `Rules.firstTurnUseSupporter`; both relevant paths now honor it. The play-card path also checks the per-turn Supporter counter after immediate cleanup. Optional switches cover first-turn Trainer restrictions, historical Stadium replacement, and legacy Burn.

Frosmoth's prompt offered non-Water Bench targets even though its resolution callback rejected them. Its blocked-target map now matches the existing dynamic type check. Oricorio ex checked only the Active stack for its Fire Mega Evolution prerequisite; it now checks the top Pokémon in every in-play slot. These targeted fixes are documented in `vendor/twinleaf/PATCHES.md`.

The audit also found a January 2002 status erratum embedded in the generic old-Power helper. A default-safe pre-2002 switch now scopes printed status restrictions for the three original repeatable Powers. Other callers retain upstream behavior pending individual historical review.

The adapter now enumerates Tool targets, engine-granted attacks and Tool-granted Pokémon Powers, and activated Stadiums exposing the engine's `useStadium` method. Public Stadium/Lost Zone views and GX/VSTAR usage flags are projected separately from hidden zones. General damage-distribution and Energy-discard prompt adapters are included, but broad certification of every prompt or mechanic is not claimed.

## Deliberate support limits

This implementation does **not** complete all requested historical format coverage. Worlds 2004/2006/2010/2013/2016/2019/2022/2025/2026 remain unavailable. Standard/Expanded/GLC/RSPK are not advertised as verified snapshots. Upstream format enums are not sufficient evidence: backend legality combines dates, banlists, reprint overrides and format-specific substitutions, while its core RETRO defaults do not match 1999 rules. See `historical-rules.md` and `format-registry.md`.

All enabled formats remain explicitly experimental, including legacy Base–Fossil with its documented timing gaps. The card laboratory is a mixed-era test environment, not sanctioned Unlimited. The requested milestone cannot be described as fully complete while these limitations remain.
