# Engine investigation and milestone decision

Investigated 2026-10-13. Twinleaf source pinned to `a8b6fe9075f982f7722e3c9ee2ce5e39cea1f1ca` (not a floating dependency).

## Findings from source

Source links below are relative to [the pinned server source](https://github.com/twinleafgg/twinleafgg/tree/a8b6fe9075f982f7722e3c9ee2ce5e39cea1f1ca/ptcg-server/src).

- `game/store/store.ts`: mutable authoritative State; typed Action classes dispatch through setup, play-card and player-turn reducers. Effects propagate to card `reduceEffect` implementations. Ordinary failed actions restore a cloned state. Prompt callbacks/generators live in Store, so JSON alone cannot restore a match.
- `advanced-bot/action-enumerator.ts`: explicitly describes candidates as “legal-ish”; caps some categories at eight. `game/bots/simulator.ts` clones state and dispatches candidates. There is no complete, ready-made legal-action API. Our adapter enumerates the small pool's targets and tests them on an isolated Store before offering them. Real dispatch validates again.
- `backend/socket/game-socket.ts`: actual events include `game:join`, `game:action:playCard`, `game:action:attack`, `game:action:ability`, `game:action:resolvePrompt`, `game:action:passTurn`. Socket auth and Core couple this path to account/storage services. `game-state-broadcaster.ts` and `state-sanitizer.ts` sanitize per viewer and emit full states/patches.
- `game/store/prompts/*`: prompts carry owner, type, options and `decode`/`validate`. Important: Store expects **decoded, validated results**; validation occurs in the socket layer, not Store. Adapter must do the same, enforce owner and target restrictions, reject duplicate/out-of-range indices, and never accept browser coin or shuffle results.
- `game/core/arbiter.ts`: actual match arbiter generates coin results and Fisher–Yates deck permutations. Reused on the server. BotArbiter defaults are deterministic for simulation and must not be used as live randomness.
- `game/store/reducers/setup-reducer.ts`: AddPlayerAction, DeckAnalyser, shuffles, mulligans, starting Pokémon, six prizes. Retro coin winner goes first. `effect-reducers/game-phase-effect.ts` advances turns/draws; `check-effect.ts` resolves damage, knockouts, replacement/prize prompts, no-Pokémon, prize and deck-out victories.
- `game/cards/card-manager.ts`: singleton registers card instances via defineSet; `sets/*/index.ts` normally registers a much larger catalog. `card-types.ts` contains Format; `state/rules.ts` contains independent historical rules switches. DeckAnalyser checks deck size/copies/basic Pokémon, **not complete format legality**. Our format module separately allowlists the selected real cards.
- `simple-bot/simple-tactics-ai.ts`: reusable ordered tactics, simulated validation, prompt resolvers. Its full SimpleBot/GameHandler depend on Client/Game and silently swallow failures. Advanced search also simulates full states; scoring may inspect opponent hidden cards. We reuse the candidate concepts and prompt contracts but use a small server-side heuristic receiving only public board + its own hand/prompt choices. It selects from the same engine-validated offers as the human, with action limits and diagnostics.
- Existing package is `ptcg-server` 0.0.3, main `dist/index.js`; its install/build brings Express, TypeORM, SQLite/MySQL and the full service. No isolated supported engine npm package is established here. Decision: vendor a pinned source dependency closure and build a CommonJS engine bundle, retaining upstream effects. A small Socket.IO adapter provides new, explicitly local events (`match:start`, `match:resume`, `match:action`, `match:prompt`, `match:state`). These are our API, not purported Twinleaf endpoints.

## Scope and architecture

React/Vite browser → local Socket.IO adapter → Twinleaf Store/cards/Arbiter. Browser stores display and interaction state only. Explicit allowlisted DTOs expose own hand, public board/discard, counts of hidden zones, only own pending prompts and validated action offers. Never serialize the raw State, cardNames, opponent prompt payloads, hand, deck or prizes. Match resumes with an opaque browser-held token while the process lives. No persistence/accounts.

Initial format: **Base Set (1999), a restricted pool within Twinleaf RETRO**, 60 cards and six prizes; first player draws and can attack. Separate format identity, card allowlist, and Rules settings. Decks: Ember (Charmander/Charmeleon) and Low Kick (Machop/Machoke), each with Rattata/Raticate, Farfetch’d, Bill, Potion, Switch, Computer Search and matching basic Energy. Existing card effects, no artificial damage/deck mechanics. These are teaching/test decks, not competitive historical archetypes. No activated Ability in these decks; generic action plumbing exists, but additional Ability cards require a later tested pool.

## License/provenance

Upstream README and server package declare MIT. The checkout contains no standalone project LICENSE file; preserve both declarations and attribution to Twinleaf, Keeshii, TheEPSD / ryuu-play. `vendor/twinleaf/NOTICE.md` records this evidence; do not invent a missing copyright statement. Upstream's no-LLM policy concerns contributions to their repository: no contribution is being submitted. Pokémon names/art are separate from source-code licensing. This is a local unofficial fan prototype; no bundled commercial art rights are claimed.

## Documentation consulted

- [React Effects](https://react.dev/learn/synchronizing-with-effects): socket subscription setup/cleanup, events for user actions.
- [Vite guide](https://vite.dev/guide/) and [server options](https://vite.dev/config/server-options): React TypeScript application, development proxy, supported Node version.
- [Socket.IO v4 API overview](https://socket.io/docs/v4/tutorial/api-overview) and [delivery guarantees](https://socket.io/docs/v4/delivery-guarantees): event acknowledgements and explicit full-state resume. Revision checks reject stale/double actions; reconnect fetches a snapshot.
- [TypeScript narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html): discriminated view/command types; do not trust runtime payloads solely because TS compiles.

## Known limits

Only registered test-pool cards/prompts are supported. Unsupported prompts halt visibly with diagnostics, never silently skip. This is not certification of all Twinleaf effects or all historical rulings. In-memory local matches; a server restart ends them. Card artwork is optional and has a text fallback. See README and testing notes for measured results and reproducible checks.

## Integration verification discoveries

The engine's `WaitPrompt` is an animation/phase-transition acknowledgement, not a player decision; the adapter resolves it server-side immediately. Coin/shuffle prompts still use the real `Arbiter`. The upstream automatic logger may put a searched/drawn card's name in generic log parameters; the DTO layer explicitly redacts those opponent-private details. Speculative action validation clones all card instances, omitting old resolved prompts and logs to avoid retaining unnecessary historic object graphs. No card effects or reducers were changed.

Artwork uses the thirteen Base Set image URLs documented by the [Pokémon TCG API card object](https://docs.pokemontcg.io/api-reference/cards/card-object/), cached locally. Its docs currently announce API deprecation; this app does not depend on that API for gameplay or installation. Images have engine-text fallbacks.

Validation includes the upstream `game/store/state-utils.spec.ts` Energy cases, adapted only at the import/type boundary to run against the same bundle as the app. The complete upstream database/server suite was not run: this adapter does not instantiate those services. See `docs/testing.md` for measured gameplay coverage.


## Milestone 2 interaction review

The old card inspector lived in the sidebar; actions were grouped there and scrolled with its content. The existing native prompt dialog already used engine choice keys, but did not cap selection locally, had small previews, and kept rejection messages outside the modal. Socket acknowledgement and snapshot handling also reset optional inspection inconsistently.

The new shared dialog shell uses `showModal()` for background inertness, an accessible heading, explicit Tab containment, focus restoration and body scroll locking. Its effect closes the native dialog and restores styles on cleanup, including React Strict Mode. References: [MDN dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog), [WAI modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), and [React useEffect](https://react.dev/reference/react/useEffect). Required engine decisions deliberately suppress Escape; optional inspection supports Escape and a visible Close button.

The client still sends only `match:action` offer IDs and `match:prompt` choice keys with the snapshot revision. A synchronous request lock prevents repeated clicks before React rerenders, and successful moves wait for the server snapshot. Prompt IDs preserve an in-progress selection through reconnect; a new prompt ID resets it. New optional DTO fields identify a deck source or discard instruction and describe Energy costs, solely for presentation. No legality checks, effect resolution or hidden card identities moved into the browser.

Energy prompt cardinality alone is not proof of a valid payment: the existing adapter allows 0..N entries and Twinleaf validates exact Energy. The UI displays that cost and reports engine rejection in the dialog; it does not advertise a free payment. Search prompts offer zero selections only when the engine supplies min=0, and cancellation only when allowCancel is true. Face-down prizes never render card images or card names.
