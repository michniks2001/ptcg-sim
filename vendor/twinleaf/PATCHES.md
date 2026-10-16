# Local integration patches

## Milestone 5 additions

The revision remains pinned. The full compatible set dependency closure was added without replacing existing patched files. `scripts/card-sets.ts` is the generated registration manifest. Source test/Game Boy modules are excluded. Competing official-printing definitions remain registered for audit but are quarantined by catalog/deck validation; no effect is chosen silently.

- `setup-reducer.ts`: bind the second player in `decideStartingPlayer`; the modern coin-loser choice path otherwise referenced an undefined `opponent`.
- `rules.ts`, `play-card-reducer.ts`, `trainer-prefabs.ts`: honor `firstTurnUseSupporter`; enforce the once-per-turn Supporter counter after cleanup; add default-safe `firstTurnUseTrainer`, `unlimitedStadium`, `replaceSameNameStadium` switches. The original Wizards profile enables the historical Stadium behavior.
- `rules.ts`, `game-phase-effect.ts`: optional `legacyBurn` behavior flips for damage and retains Burn rather than applying automatic modern damage/recovery. Modern defaults remain unchanged.
- Sword & Shield Frosmoth: expose the same dynamic Water-type Bench restrictions in the AttachEnergy prompt that its callback already enforces; one attachment per activation for persistent sessions.
- Phantasmal Flames Oricorio ex: search the top Pokémon in every in-play slot for the Fire Mega Evolution Pokémon ex prerequisite, instead of only the Active stack.
- `pre2002PowerConditions` optionally preserves the printed Sleep/Confusion/Paralysis restrictions for Base Alakazam, Blastoise and Venusaur instead of applying the later 2002 Poison/Burn erratum. Other helper callers retain upstream behavior; broader historical Power auditing remains incomplete.

Behavioral coverage is in `tests/historical-profiles.test.ts`, `tests/repeatable.test.ts` and the card/format/browser suites. Historical profiles outside enabled snapshots are representative tests, not full-format certification. All earlier patches and their documented limitations below are preserved.

Upstream revision remains `a8b6fe9075f982f7722e3c9ee2ce5e39cea1f1ca`. Milestones 1–2 did not change gameplay source. Milestone 3 expands the dependency closure by 189 source files from that exact checkout and makes the isolated corrections below. The exact unified source diff is [milestone-3.patch](milestone-3.patch).

## Registry and card corrections

- Fossil `other-prints.ts` / `index.ts`: add Ditto #18 by subclassing the existing Ditto implementation; only printing metadata changes.
- Blastoise: restrict Rain Dance to one Water Energy and a Water Pokémon; cap Hydro Pump's extra damage at 20 even with more than five Water attached.
- Alakazam: correct Damage Swap's target perspective and printed attack name (Confuse Ray).
- Slowbro: correct damage-cap target perspective and restrict Strange Behavior's destination to the actual Slowbro using it.
- Gengar: Stage 2; enforce status restriction and once-per-turn marker cleanup; omit a nonapplicable own-board damage-cap map (Curse may KO opposing Pokémon); reject activation without two opposing Pokémon; remove upstream debug logging.
- Omastar: Stage 2. Grimer: 50 HP. Mysterious Fossil: 10 HP, rather than the later 30-HP convention.
- Ditto: retain the number of Energy units when Transform treats Energy as any type. Double Colorless: expose its two units immediately, including before its effect callback runs.
- Energy Removal: select attached Energy from the main Pokémon card list, where this integration and the engine's normal attachment reducer put it; retain the original selection and movement effect.
- Pokédex: return ordered cards to the top of the deck and clean up the Trainer.
- Mysterious Fossil / Clefairy Doll: discard the actual chosen card's stack without erroneously manipulating the Active Pokémon; Mysterious Fossil's no-Prize check uses the KO target.
- Printed name typos: Doduo's Fury Attack, Parasect's Spore, Golduck's Psyshock, Gyarados's Bubblebeam, Pokédex, Pokémon Breeder and Pokémon Flute. Registry fullName IDs remain unchanged.

Base Set Gastly #50 is absent upstream. No replacement effect was created: its catalog entry explicitly reports unavailable engine support and match validation rejects it. All other upstream definitions remain available.

## Historical switches (default off / modern defaults preserved)

`Rules` gains `setupCoinAfterSelection`, `unlimitedRetreat`, `historicalConfusion`, and `mulliganDrawMultiplier`. The Base–Fossil format enables them independently of its card allowlist.

- Normal setup defers the existing starting-player coin flip until after starting Pokémon selection when requested.
- Mulligan compensation maximum uses the configured multiplier (2 here).
- Successful retreats can repeat; Confused retreat pays before a server-generated coin flip and tails blocks further retreats that turn. Effects/conditions are cleared by the existing successful switch rather than unconditionally by the action reducer.
- Failed confusion attacks deal 20 self-damage with printed Weakness/Resistance under the historical switch.

Known rule gaps: the engine still aggregates mulligan compensation after mulligans instead of offering 0–2 immediately after each; attack Energy-discard costs occur after the confusion check instead of before it under pre-Neo rules. Confusion against dynamically modified type/Weakness/Resistance has not been certified. See the research report for limits.

## Adapter changes outside this directory

- Game-only root barrel resolution at build time avoids importing account/database services.
- Printing catalog, schema and format validation; engine registration is checked independently at match creation.
- Action probes drain animation Wait prompts so they reach real Power validation. Engine attack-cost/Energy checks precede status coin prompts. All real actions still dispatch through Twinleaf.
- Original prompt decoders/validators are used behind owner-checked choice keys. Transfer offers enforce scope/filter/blocked targets; duplicate Energy assignments are rejected. Secret ChooseCards choices stay anonymous.
- AI remains a policy over its own/public DTO and engine legal offers. Rejected actions are skipped safely when the engine remains in a recoverable turn; unresolved engine failures stop visibly.
- Live Arbiter randomness, hidden-log redaction and independent speculative clones are retained.

No upstream contribution or floating version upgrade is included. Source-code notices and attribution remain in NOTICE.md.

## Retreat payment selection follow-up

The pinned revision is unchanged. [retreat-payment.patch](retreat-payment.patch) is an additional patch **after** the existing Milestone 3 patch; no earlier fixes are removed.

- `Rules.historicalRetreatPayment` defaults to false and is enabled only in the Base–Fossil configuration. With it enabled, both retreat reducer entry paths always issue the existing `ChooseEnergyPrompt` for a positive cost instead of silently choosing an exact/identical Energy payment. Zero-cost retreats still skip payment.
- That retreat prompt passes `payInOrder: true`. Its engine validator accepts sufficient Energy only when the selected prefix before the final card is still insufficient. This implements the historical instruction to discard cards in order and stop once the cost is reached; a final Double Colorless may overpay. Duplicate physical cards are rejected. Other Energy prompts retain their original minimal-payment validation.
- Existing legality, cost modifiers, card movement, cancellation before payment, historical Confusion payment/coin timing, and retreat switching remain engine operations. The actual app still selects the destination on the battlefield before opening payment.

Sources, test evidence and manual steps: [retreat-payment.md](../../docs/retreat-payment.md).
