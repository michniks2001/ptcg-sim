# Retreat Energy selection

## Rules review

The Wizards-era rules let the player choose attached Energy to discard for retreat. The [original Expert Rules reprinted by Pojo](https://www.pojo.com/pokemon/rules/oldexpertrules.html), section **How Do You Retreat Using Double Energy Cards?**, explicitly allows several payment choices. Its credits identify Wizards' rulebook authors. The [Wizards Advanced Rulebook v1 archive](https://www.judgeball.com/files/archives/tcg-rulebooks/en/WOTC_v1.pdf) gives the same examples and carries 1999–2000 copyright notices. The archive's full PDF returned HTTP 403 during this review; indexed text and the accessible Expert Rules reprint supplied the relevant passage. This review did not substitute the current rulebook for the historical one.

For a retreat cost of two, with two Basic Energy cards and one Double Colorless attached, legal payments include DCE alone, both Basics, or one Basic followed by DCE. After the cost has been met, no further card can be discarded. Consequently, DCE followed by a Basic is not the same legal sequence as Basic followed by DCE. The card identities and discard order belong to the player.

Historical Confusion still requires payment before the retreat flip, and a failed flip does not refund the chosen Energy. The existing historical retreat implementation and retry restriction are preserved. No unrelated historical corrections were attempted.

## Integration

The current adapter already uses real `RetreatAction` offers and the real `ChooseEnergyPrompt` decoder. The missing choice came from two upstream retreat optimizations: automatically discard when the whole Energy map is a minimal payment, or when all entries provide identical Energy. The latter can also mask differing card identities under a provided-Energy modifier.

A small, format-gated engine patch was necessary because those branches perform the discard inside Twinleaf before a client prompt exists. The version pin remains `a8b6fe9075f982f7722e3c9ee2ce5e39cea1f1ca`. See [PATCHES.md](../vendor/twinleaf/PATCHES.md) and the additional [unified patch](../vendor/twinleaf/retreat-payment.patch).

- `historicalRetreatPayment` defaults off in `Rules`, and Base–Fossil enables it. Both positive-cost retreat entry paths bypass automatic payment and use the existing Energy prompt. Even a single payable card is shown for explicit confirmation. Free retreats remain immediate after choosing a destination.
- `ChooseEnergyPrompt.options.payInOrder` defaults false. Retreat opts in through the historical switch. Validation uses Twinleaf's provided-Energy checks: the complete choice must meet the cost, but its prefix before the last card must not. One physical card cannot occur twice. Other Energy-payment prompts retain their original validator.
- `PromptView.paymentInOrder` is a sanitized presentation flag. The client shows discard-order instructions, card selection numbers, and the authoritative retreat cost. It does not calculate Energy units, approve payment, or discard cards.
- Existing owner/revision/choice-key checks and submission locks remain. Selecting a Bench target commits the retreat request but does not discard anything yet. The engine-authorized **Cancel action** cancels an unpaid payment prompt without moving cards. A confirmed payment resolves the original engine continuation, including Confusion when applicable.

The interface sequence is **Retreat → choose replacement on the battlefield → choose attached Energy in discard order → Confirm choice**. The actual payment still precedes the switch and historical Confusion flip. No battlefield layout, deck-builder or AI policy changes were made.

## Verification

Pre-change baseline: `npm test` passed **123/123**, five files, **55.63s**.

Focused build and retreat/Confusion tests passed before full regression. Final build passed; `npm test` passed **141/141** (six files, 46.23s); `PLAYWRIGHT_BROWSERS_PATH=/tmp/ptcg-browsers npm run test:e2e` passed **58/58** (2.1m). Desktop and 320px mobile payment screenshots were visually inspected, including visible order numbers and accessible confirmation controls. Further results are recorded in [testing.md](testing.md).

Coverage includes identical Basic Energy, a single exact payment, choosing either Basic type or DCE for a one-Energy cost, all three historical two-Energy examples, rejected excess/insufficient/out-of-order payment, cancellation, owner/stale/duplicate protection, real Dodrio retreat reduction to zero, Asleep/Paralyzed/no-Energy/no-Bench restrictions, failed Confusion after chosen payment, unchanged default engine behavior and unaffected non-retreat payment validation. Browser coverage includes selection by actual card ID, order markers, desktop/320px layout, DCE identity, repeated submit, cancellation and reload; the existing disconnect/reconnect payment case remains in the suite.

Screenshots: [Desktop payment](screenshots/retreat-energy-1280.png) · [Mobile payment](screenshots/retreat-energy-320.png).

## Manual check

1. Attach multiple Energy cards to an Active Pokémon with a positive retreat cost and have a Pokémon on the Bench.
2. Click the Active, choose **Retreat**, then click the highlighted replacement.
3. Select the attached Energy to discard. For different combinations of Basic Energy and DCE, check the selection numbers reflect your discard order.
4. Confirm and inspect the retreating Pokémon on the Bench: unselected Energy should remain attached. Check the selected cards in Discard.
5. Repeat with identical Energy, test **Cancel action**, and reload while payment is pending. No Energy should leave until payment is accepted.
6. A free retreat should still skip payment. A Confused Pokémon pays before its coin flip, even if the flip fails.

Stop for manual feedback. Physical devices and non-Chromium browsers remain unverified. Other historical limitations listed in the existing project research are unchanged.
