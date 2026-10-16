# AI decks and evidence

All opponents use Twinleaf-validated offers and owner-visible prompt choices. Policies receive their own hand and public DTOs, never the opponent's hidden hand/deck. The existing action safeguard and diagnostics remain. This is a heuristic opponent, not a tournament-strength search agent.

## Wizards snapshots

Base–Fossil, Base–Rocket, Base–Gym and Base–Neo Genesis offer three distinct legacy archetypes plus the original Low Kick practice opponent:

| Opponent | Strategy | Source / adaptation |
| --- | --- | --- |
| Haymaker | Aggressive Basics and disruption | Existing Milestone 3 adaptation; Hitmonchan/Electabuzz/Scyther, not claimed as an exact tournament original |
| Rain Dance | Blastoise evolution and Water acceleration | Existing Milestone 3 adaptation, with Articuno/Lapras and a substantial Water count |
| Wigglytuff | Bench development and Do the Wave | Existing Milestone 3 adaptation with Scyther/Magmar and DCE |
| Low Kick | Beginner practice | Original teaching deck, not a competitive historical archetype |

The exact 60-card lists remain in `shared/decks.ts`; prior historical research/source discussion remains in `milestone-3-research.md`. The additional Wizards pools reuse these legal legacy lists rather than relabeling them as later tournament-winning lists. Base Set only offers Low Kick, and Base–Jungle offers Low Kick/Haymaker; those restricted snapshots do not meet the three-archetype verification threshold.

## Worlds 2024

| Opponent | Tournament source | Adaptation |
| --- | --- | --- |
| Iron Thorns | [Fernando Cifuentes, 1st](https://limitlesstcg.com/decks/list/12238) | Tournament card counts retained; compatible primary artwork printings and Basic Lightning printing |
| Roaring Moon | [Seinosuke Shiokawa, 2nd](https://limitlesstcg.com/decks/list/12239) | Tournament card counts retained; compatible primary printings and Basic Darkness printing |
| Miraidon | [Jesse Parker, 3rd](https://limitlesstcg.com/decks/list/12241) | Tournament card counts retained; compatible primary printings and Basic Lightning printing |

Exact card-count templates and source links are in `shared/historical-decks.ts`. Printing resolution requires name, expansion, implementation availability and snapshot legality; mechanically different same-name Pokémon are not substituted. These opponents are also available as examples after loading a later-era catalog/format. Their policy is a generic public-information heuristic; no claim is made that it reproduces those players' strategies.

## Complete-game tests

`tests/ai-m5.test.ts` completes six seeded games: each legacy archetype under Base–Fossil and the modern laboratory profile. `tests/worlds2024.test.ts` completes one representative match against each modern list, with actual setup, mandatory decisions, attacks and engine-confirmed endings. Raw evidence is written to `/tmp/ptcg-m5-ai-games.json` and `/tmp/ptcg-m5-worlds2024-games.json`; the final report records observed results. Earlier complete-game scenarios remain in the full regression suite.

One seed per new opponent/profile is progression evidence, not comprehensive strategy or rules certification. All enabled formats remain experimental. No AI is registered for the unavailable Worlds snapshots, Expanded, GLC or RSPK.
