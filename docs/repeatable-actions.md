# Repeatable Ability sessions

Activate a supported Power once from its Pokémon inspector. Its interaction stays open until Done, cancellation, an incompatible action, or invalidation. The server records the source Pokémon's physical identity, effect, player and turn. Every activation comes from freshly probed legal offers; every choice passes the original prompt decoder and validator. Revisions and Socket.IO ownership remain authoritative.

Audited adapters cover Alakazam's Damage Swap, Blastoise's Rain Dance, Venusaur's Energy Trans, Frosmoth's Ice Dance, Baxcalibur's Super Cold and Oricorio ex's Excited Turbo. Inherited printings reuse an adapter only when their actual effect method is identical. A shared card/Power name does not grant repeatability. Restricted Powers such as Gengar's Curse remain ordinary activations.

## Manual controls

1. Damage Swap: select Alakazam → Use Ability: Damage Swap. Click a damaged Pokémon, then a gold destination. The next source selection appears immediately.
2. Bulk movement: set **Counters to move** before choosing the destination. Each counter is a separate legal activation/selection. If the destination cannot receive the requested amount, processing stops at the last legal state and reports the completed quantity. No damage total is assigned directly.
3. Choose another source/destination after each transfer. **Change source** or Escape abandons the uncommitted selection. Completed moves remain completed.
4. Rain Dance: activate Blastoise, click a highlighted Water Energy in your hand, then a gold Water Pokémon. Repeat using the remaining hand cards. The inspector stays closed.
5. Energy Trans: activate Venusaur, click an eligible physical Energy attachment, then a gold destination. Repeat from another Pokémon or transfer back. Special Energy identities and DCE remain individual cards.
6. **Done** exits the mode without ending the turn or marking a reusable Power spent. Reopen that Pokémon later to reactivate if the engine permits it. **Cancel action** exits the optional engine selection. Mandatory prompts cannot be dismissed through Done/Escape.
7. Ice Dance highlights eligible Water Energy and only eligible Water Bench targets. Super Cold permits its own engine target set. Excited Turbo requires a Fire Mega Evolution Pokémon ex in play and Fire Bench targets.

Super Cold and Excited Turbo use non-cancellable upstream prompts. After a completed attachment their session pauses with **Continue** and **Done**. Continue activates the next prompt without reopening the inspector. Done is disabled while an already-committed mandatory prompt is unresolved. This additional Continue click is a remaining interaction limitation, not a bypass of mandatory choices.

## Feedback and safety

One Ability activation callout appears per session. Board changes remain immediate; attachment feedback is retained and consecutive public attachment changes coalesce to avoid a backlog. Trainer/attack/coin callouts remain. Public feedback never carries hidden hand/deck information.

After each successful selection the server refreshes legal actions and prompts. A stale request cannot move a card that has already moved. Bulk requests are bounded to 1–100 counters and revalidate after every counter. A different prompt interrupts bulk processing; it is not answered automatically. A missing/disabled source suspends or invalidates continuation. Empty optional transfer prompts are cancelled by the server while leaving a visible Done control.

The controller is deliberately opt-in. Other damage distribution, exact-count, once-per-turn and once-per-game effects retain their own prompts. General Energy-discard/damage-distribution adapters do not automatically become repeatable sessions.
