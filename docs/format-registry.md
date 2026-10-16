# Format registry

`shared/formats.ts` holds card-pool definitions, dates, marks, bans, restrictions, explicit reprint mappings, construction limits, rule-profile IDs, AI IDs, evidence links and verification status. `server/format.ts` maps those profiles to Twinleaf and independently validates submitted decks. Match configuration must agree with the submitted deck's format. Both AI and player lists pass server and Twinleaf validation.

| Format | Pool / period | Rules | AI | Status / limitations |
| --- | --- | --- | --- | --- |
| Base Set | BS, January 1999 | wotc-1999 | Low Kick | Experimental; original timing/card gaps, fewer than three archetypes |
| Base–Jungle | BS/JU, June 1999 | wotc-1999 | Low Kick, Haymaker | Experimental; fewer than three archetypes |
| Base–Fossil | BS/JU/FO, October 1999 | wotc-1999 | Low Kick, Haymaker, Rain Dance, Wigglytuff | Experimental; legacy timing/card gaps |
| Base–Rocket | Prior sets + TR, April 2000 | wotc-1999 | Same four legacy lists | Experimental; main expansions, not all promos/interactions certified |
| Base–Gym | Prior sets + G1/G2, October 2000 | wotc-1999 | Same four legacy lists | Experimental; main expansions; historical Stadium switches tested |
| Base–Neo Genesis | Prior sets + N1, December 2000 | wotc-1999 | Same four legacy lists | Experimental Unlimited snapshot, not Modified; Baby/Neo interactions unverified |
| Worlds 2024 | Main BRS–SFA expansions; F/G/H; cutoff August 2 | modern-2020 | Iron Thorns, Roaring Moon, Miraidon | Experimental; promos and older reprints not comprehensively audited |
| Twinleaf card laboratory | All selectable implementations | modern-2020 | Four legacy lists | Experimental mixed-era laboratory, not sanctioned Unlimited |
| Worlds 2004/2006/2010/2013/2016/2019/2022/2025/2026 | No guessed pool enabled | Unavailable | None | Event legality, full rules and AI coverage still required |

No format is labeled verified. A few completed seeded games do not establish full historical correctness. Unavailable entries are disabled in the UI and rejected by the server. The unused historical rule profiles are tested building blocks, not playable tournament snapshots.

## Legality and reprints

Legality checks the selected snapshot rather than the wall clock. Worlds 2024 excludes Stellar Crown and later sets even if a future card has a familiar mark. Its Basic Energy allowlist excludes Fairy Energy. The reprint map explicitly permits Base Switch as equivalent to Switch SVI; original Potion is rejected because its healing differs. The implementation does not equate cards just because they share a name. Other older Trainer equivalents and promotional release exceptions still need individual review, so no blanket reprint claim is made.

Deck construction checks 60 cards, legal/implemented printings, Basic Pokémon, cross-printing name limits, restrictions, ACE SPEC, Radiant, Pokémon Star and Prism Star limits. Twinleaf remains the final construction validator. Its additional Unown/Arceus rules are not fully duplicated in the client validator.

Schema v1 already stores independent printing and format IDs, so no destructive migration is needed. Existing saved decks retain their IDs, names and quantities. Duplicating a deck then changing its format keeps every entry and reports illegality. Immutable legacy examples can be copied into another Wizards snapshot; their cards are still checked against that pool. JSON and text exports preserve format IDs; new collector numbers may contain letters.

## Upstream identifiers

At the retained pin, backend `controllers/decks.ts` defines RETRO as Base through Skyridge plus listed promos; RSPK explicitly includes RS, SS, DR, MA, HL, RG, TRR, DX, EM, UF, DS, LM, HP, CG, DF, PK and listed promo collections. It is not a Worlds-year synonym. Core uses different opening defaults for these enums. Expanded depends on a date floor, bans and reprint exceptions; GLC adds singleton/type/Rule Box restrictions. These moving server definitions have not been transplanted as dated, verified formats here.
