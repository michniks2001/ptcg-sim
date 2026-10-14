# Milestone 3 research

Research begun 2026-10-13 against Twinleaf revision `a8b6fe9075f982f7722e3c9ee2ce5e39cea1f1ca`. This revision is preserved.

## Baseline

Before implementation: `npm run build` passed; `npm test` passed 42/42; `PLAYWRIGHT_BROWSERS_PATH=/tmp/ptcg-browsers npm run test:e2e` passed 11/11 (31.1 s). Browser servers required execution outside the filesystem/network sandbox. The ordinary browser run reached turn 9 with Trainer, Energy and attack interactions and zero browser errors.

## Registry and dependency investigation

Compared the downloaded [pinned upstream source](https://github.com/twinleafgg/twinleafgg/tree/a8b6fe9075f982f7722e3c9ee2ce5e39cea1f1ca/ptcg-server/src) to `vendor/twinleaf`. The local snapshot contains a runtime dependency closure, not the full upstream sets. `scripts/engine-entry.ts` explicitly exports thirteen cards. The build script itself simply bundles this entrypoint.

`CardManager.defineSet` registers executable instances, indexes `fullName`, and clones on retrieval. `set-base-set/index.ts` has 95 definitions, with the six basic Energy cards in `set-base-set-energy`. Jungle includes all 64 printings through subclasses in `other-prints.ts`. Fossil includes 61: Ditto #18 is missing from both the index and `other-prints.ts`. Its holo #3 has a substantial executable Transform implementation. A metadata-only subclass will reuse it for #18. A number-by-number audit additionally found Base Set Gastly #50 absent from the entire pinned set directory (not merely its index). It has no reusable same-card definition elsewhere in this revision. Its catalog metadata is retained from the static Pokémon TCG data repository, explicitly marked unavailable for matches rather than given fabricated effects. There are 227 executable printings after adding Ditto #18, and 228 catalog entries. The three complete sets therefore need 228 distinct `(set, setNumber)` catalog IDs; names and fullName alone are not interchangeable identifiers.

Some cards import the server root barrel (`../..`), which also exports backend services. Bundling must redirect that barrel to its game exports without importing account/database services. Dependencies must be copied from this exact revision, preserving source notices. CardType initializes upstream's short type globals (P, C, W, etc.).

## Actions and prompts

There is no exhaustive legal-actions API: upstream `advanced-bot/action-enumerator.ts` produces legal-ish candidates, often capped at eight, and `Simulator` probes them. Our existing independently cloned Store probing is the appropriate boundary. Basic, evolution, Trainer, Energy, attack, retreat and in-play Power candidates already exist. Expanded pool testing must check copied attacks, Trainer-as-Pokémon and passive Powers.

The previous prompt adapter handles ChooseCards, ChoosePokemon, ChoosePrize, ChooseEnergy, Confirm, Select and public reveals. Additional set prompts include AttachEnergy (Blastoise), MoveEnergy (Venusaur), MoveDamage (Alakazam, Gengar, Slowbro), OrderCards (Pokédex, Hypno, Recycle), SelectOption (Mankey) and copied attack selection. The transfer validators in the pinned engine are incomplete: some assume its original UI enforced targets, filters and unique Energy cards. The adapter must constrain offered choices and validate the submitted combination; human choices must remain explicit. Ordering must preserve user selection order. Hidden search/peek data must only go to the prompt owner.

## Deck validation

`DeckAnalyser` validates size, name-based copies, Basic Energy exceptions and Basic Pokémon, but not our format allowlist. It also silently ignores unregistered names while constructing its card list. Use explicit printing-ID/schema/quantity validation, the format allowlist, registration checks, and finally DeckAnalyser. Mysterious Fossil is a TrainerCard with stage BASIC, so stage alone is insufficient for setup eligibility. Incomplete decks may be persisted but cannot start matches.

## Historical rules audit

[1999–2002 rules reference](https://jklaczpokemon.com/pokemon-wotc-rules/) and the source reducers were inspected. RETRO makes the coin winner go first; explicit Rules already allow first-turn draw, Trainers and attack. Evolution timing, status, damage, KO/prizes and setup remain engine operations. However the pinned source has modern once-per-turn retreat, one-card mulligan compensation, and modern confusion behavior. Historical rules require repeated retreat, paying before a confusion retreat flip, 20 confusion self-damage with Weakness/Resistance, and up to two cards per mulligan. These need isolated rule switches or explicit gap documentation, not frontend mechanics. Exact timing of attack discards under confusion requires particular care.

## AI and historical deck

Read upstream SimpleTacticsAi, its resolvers and the advanced enumerator. SimpleBot depends on Client/Game services and unknown prompts can be canceled silently. The advanced search consumes full state. Retain the existing DTO-only policy boundary and legal engine offers, reuse the evaluation/ordered-tactic approach, and improve public-board attack, attachment, Trainer and prompt scores with bounded action safeguards.

[Jason Klaczynski's retrospective](https://jklaczpokemon.com/1999-base-fossil/) describes the Hitmonchan/Electabuzz/Scyther archetype and provides period lists. This project's Haymaker is a documented adaptation: 4 Hitmonchan, 4 Electabuzz, 3 Scyther; 4 Professor Oak, 4 PlusPower, 4 Energy Removal, 3 Bill, 3 Gust of Wind, 3 Scoop Up, 3 Energy Retrieval, 3 Item Finder, 3 Super Energy Removal, 2 Computer Search; 7 Fighting Energy, 6 Lightning Energy, 4 Double Colorless Energy. This totals 60. It substitutes Jungle Scyther for the retrospective's Base-only Farfetch’d slots. Unlike some retrospective Base–Fossil conventions, this project's format deliberately excludes every promo. Examples are adaptations, not claimed tournament-winning lists.

## Artwork

Use stable printing IDs `base1-N`, `base2-N`, `base3-N`, a generated manifest and locally cached printing-specific images. Runtime gameplay must not call the deprecated Pokémon TCG API. Engine definitions supply executable behavior and displayed text; artwork never supplies rules. Unavailable images fall back to text.

## Verification and remaining uncertainty

Catalog completeness is not evidence of exhaustive card correctness. Implementation notes, precise local patches and tested/unverified interactions will be added after the engine-backed tests. Existing notices and license evidence remain in `vendor/twinleaf/NOTICE.md`.

## Implemented integration and measured findings

The executable registry contains **227** printings: 101 Base Set, 64 Jungle and 62 Fossil. The catalog contains **228** entries; Gastly BS #50 alone is metadata-only and prominently unavailable for matches. The original upstream totals were 101 + 64 + 61 = 226. This distinction is enforced by registration tests, including a check of every English printing number and every registered fullName. Independent static metadata checks cover Pokémon name, HP and evolution stage, not effect correctness.

The dependency-closure expansion added 189 source files. No revision upgrade was needed. `scripts/vendor-base-fossil.mjs` accepts an extracted pinned source root and copies missing executable dependencies; the build redirects imports of the root server barrel to game exports. The generated catalog contains separate set/number IDs, image paths and executable availability. Artwork was downloaded for all 228 printings with zero image-download failures.

`server/actions.ts` continues to test candidates on independent Stores. Two expanded-pool failures demonstrated why merely dispatching once was insufficient: activated Powers validate after their animation Wait prompt, and attack cost checks can follow a status coin prompt. Probes now drain animation acknowledgements and explicitly invoke Twinleaf's provided-Energy/attack-cost checks. Real submissions are still engine-validated. In-play Trainer-as-Pokémon Powers use Twinleaf's ordinary in-play UseAbilityAction; its separate UseTrainerAbilityAction supports hand/discard sources, not these board cards.

`server/prompts.ts` adds AttachEnergy, MoveEnergy, MoveDamage, OrderCards, ChooseAttack and SelectOption presentation. Transfer choices carry only server-held target mappings behind opaque keys. Every final combination uses the original decoder/validator, and duplicate assignment of one Energy is rejected. Ordering follows explicit click order. ChooseCards with `isSecret` shows anonymous backs, which is necessary for Mankey's Prize peek; only the subsequent authorized ShowCards reveal carries an identity. No human decision is supplied automatically.

## Local engine corrections

Targeted tests and independent printed-metadata comparisons exposed local issues rather than requiring new mechanics. Exact fixes are recorded in [PATCHES.md](../vendor/twinleaf/PATCHES.md), with a complete diff against the pinned checkout. They cover Rain Dance targets/Hydro Pump cap, transfer constraints, Gengar and Omastar stages, Grimer and Mysterious Fossil HP, Ditto's multi-unit Energy handling, Energy Removal's attachment zone, Pokédex's top-deck ordering, Trainer-Pokémon discard targeting, printed-name typos and explicit historical switches.

Historical configuration now includes first-turn draw/attack, ordinary unrestricted Item-style Trainers, repeated retreat, historical confusion retreat payment, 20 confusion self-damage with printed Weakness/Resistance, up to two cards per excess mulligan, and coin flip after Pokémon selection. All changes are in engine Rules/reducers, not frontend gameplay code.

## AI implementation and verification boundaries

Haymaker is 11 Pokémon / 32 Trainers / 17 Energy, as listed above. `evaluateAttack`, `evaluateEnergyAttachment`, `evaluateTrainer` and `chooseAdvancedPrompt` use public board position, visible attached Energy, own hand, remaining HP and engine action offers. They estimate expected damage, penalize unused attachments and expensive disruption, preserve valuable discards, prioritize useful searches and replacement Actives, and identify PlusPower/Gust opportunities. Double Colorless contributes two units. Engine legal offers remain the final authority; estimates are never applied as damage.

The policy receives no raw State, opponent hand identities or deck order. Tests pass a public opponent DTO that throws on hidden-zone access. Action signatures prevent repeated retreat/Power choices, failed recoverable actions are excluded, and the 80-decision guard remains. Eight seeded games against Ember, Haymaker, Rain Dance and Wigglytuff complement the six original practice games. These test automated progression to engine win conditions, not competitive strength. Some opening games can end on turn one under the historical attack rule.

## Explicit remaining gaps

- **Base Set Gastly #50:** absent executable implementation. Its catalog entry is retained and decks can be saved, but match entry is rejected with a specific reason. Fossil Gastly is separately registered.
- **Historical timing:** mulligan draws are aggregated after the engine's setup sequence, rather than offered immediately after each mulligan. Attack discard costs under Confusion still follow the engine's modern timing, rather than the pre-Neo timing. Dynamic type/Weakness/Resistance changes during confusion self-damage are unverified.
- **Card coverage:** focused engine tests verify Rain Dance/Hydro Pump, Do the Wave, Swords Dance/Slash, Ditto copying and DCE, Metronome, Professor Oak, Energy Removal, Pokédex, Energy Trans, Damage Swap, Curse, Mankey Peek and Mysterious Fossil discard. Original tests cover Bill, Potion, Computer Search, Switch, practice attacks, KO, Prizes and wins. Full games exercise additional Haymaker Trainers. This does not certify every attack, Power or interaction on 227 definitions. In particular Buzzap/Charizard Energy interactions, Muk/Aerodactyl locks, Clefairy Doll edge cases, multi-Pokémon simultaneous KOs, Fossil evolution/Revive, Hypno/Recycle ordering, and every multi-status/copied-Power combination have not been exhaustively verified. Existing implementations are retained.
- **AI:** bounded heuristics, no multi-turn search; expected coin-flip damage can miss a KO, and replacement/search/discard priorities remain approximate. It is purposefully stronger than Practice AI, not tournament-perfect.
- **UI/runtime:** Chromium and the specified viewport sizes are the automated target. Physical touch devices, screen readers, Safari and Firefox remain unverified. Local storage is browser-specific and live sessions do not survive backend restarts.

See [testing.md](testing.md) for actual final command results, screenshots and the manual checkpoint.
