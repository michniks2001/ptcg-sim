# Historical gameplay rules

Card legality and gameplay rules are separate. `RulesProfile` values initialize the live Twinleaf Store; representative tests exercise actual actions/reducers. `tests/historical-profiles.test.ts` verifies opening draws, attack offers, Item/Supporter play, the Supporter limit, Stadium replacement and Burn behavior.

| Profile | Opening draw | Opening attack | Opening Trainer / Supporter | Other differences |
| --- | --- | --- | --- | --- |
| wotc-1999 | Yes | Yes | Trainers unrestricted | Two-card mulligan multiplier; coin after selection; repeated retreats; historical Confusion; repeated/same-name Stadiums |
| ex-2004 | No | Yes | Trainers yes, Supporter no | One-card mulligans; one retreat; legacy Burn; Supporter cleanup flag |
| dp-2007 | Yes | Yes | Trainers/Supporters prohibited | Legacy Burn; one retreat |
| bw-2011 | Yes | Yes | Trainers and Supporter yes | Legacy Burn; one retreat |
| xy-2013 | Yes | No | Trainers and Supporter yes | Legacy Burn; one retreat |
| modern-2020 | Yes | No | Items yes, Supporter no | Modern Burn; one retreat; one-card mulligans |

Printed card overrides remain engine operations. The first-turn Supporter and per-turn Supporter guards were corrected to honor configuration and the counter even after immediate cleanup. Tests of the EX/DP/BW/XY profiles do not verify full formats from those eras. Coin timing/choice, historical evolution/errata, promo eligibility and complete deck lists must also be audited before enabling them.

## Preserved rules and known gaps

Base–Fossil retains its authoritative grouped compensation interface, historical paid Confusion retreat, selectable retreat Energy in discard order, Double Colorless as one card/two units, repeated successful retreats and blocked retries after a failed Confusion retreat. Ordinary attachments remain once per turn. Damage Swap/Rain Dance/Energy Trans do not consume that attachment.

Wizards compensation is still grouped after setup rather than offering 0–2 immediately after each excess mulligan. Pre-Neo attack-discard costs still occur after the Confusion check; the Neo exception differs. Dynamic Weakness/Resistance during Confusion is not comprehensively certified. These are historical accuracy gaps, not resolved by changing profile values.

Poison, Sleep, Paralysis and Confusion continue through Twinleaf. Modern Burn deals damage before its recovery flip. The legacy Burn switch instead flips for damage and leaves Burn in place; a heads result does not deal automatic damage or cure it. Heads behavior is directly tested; arbitrary card-modified checkup interactions are not exhaustively verified.

For the three original repeatable Powers, the pre-2002 switch permits Poison while still blocking Sleep/Confusion/Paralysis. Upstream otherwise applies the January 2002 Poison/Burn erratum to all years. A regression tests both settings for Alakazam, Blastoise and Venusaur. Other old Power callers have not all been migrated to this scoped helper and remain a historical coverage limitation.

Historical Stadium switches allow repeated plays and replacement by the same name. Modern rules retain both restrictions. Original Trainer attachments remain their actual cards; they are not recast as Pokémon Tools. Tools, Special Energy, Stadiums and later Pokémon still use the upstream effect/errata machinery.

## Mechanics not certified

Representative modern games exercise Pokémon ex, Special Energy, Tools, search, Stadiums, Ability suppression and multi-Prize Pokémon. VSTAR/GX usage flags and public Lost Zone/Stadium cards are displayed. Tool-granted Powers and attacks are enumerated through engine effects. This is not certification of LEGEND assembly, LV.X, BREAK, Mega turn-ending evolution, every Rule Box, all special zones, every historical Rare Candy ruling, simultaneous KOs or all once-per-game effects.

Upstream remaining defects include competing implementations and legacy discrepancies already listed in the Milestone 3/4 research. No unsupported era is represented as accurate simply because its cards compile.
