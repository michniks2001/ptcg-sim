# Milestone 4: physical tabletop layout correction

This correction replaces the rejected side-by-side Active/Bench layout. It changes presentation only. No Twinleaf source, pin, rules, card library, server DTOs, AI policy or deck-builder behavior changed.

## Composition

The opponent's Bench sits above its centered Active; the player's Active sits directly below the opponent's, with the player's Bench behind it. Both Active slots and both five-slot Bench groups share one horizontal centerline. Empty Active slots reserve the same footprint, including after a real knockout and finished game.

The Bench is sized from five actual cards and 16px gaps (12px on tablet and 14px on phones). Extra viewport width does not spread those cards apart. Empty slots are faint. Side columns have equal widths, keeping the battle center independent of the Prize/Deck contents.

Prizes use the existing face-down card-back treatment in a 2×3 grid, at 62% of a Bench card's width. Deck and Discard are 84% of Bench-card width. Decks show a small stack and count; Discard shows its last public card and count, with the existing inspection dialog. Twinleaf appends discarded cards to its public array, so the last entry supplies the visible top card. No private card faces are used.

Active attachments and condition/effect controls sit in an upright resource area beside the card. They do not offset the art from the centerline. The art has a square rotation footprint. A sideways Benched card reserves its wider footprint. Basic Energy continues to use symbols cropped from the existing card artwork; DCE and other attached cards keep their identities.

`src/battlefield.css` owns the active-match layout and feedback styles, replacing the previous accumulated match-layout block in `style.css`. `Playmat` provides one keyboard-focusable scroll viewport with a bounded inner surface. Small screens start horizontally centered on the battle and can pan to either side. Resizing recenters the surface; ordinary snapshots do not undo a player's pan. Mandatory targeting scrolls its target into view. The hand remains outside the mat's scroll region.

## Current screenshots

Historical comparison captures have been removed at the user's request. All linked screenshots now show the current application. Browse the [current screenshot gallery](screenshots/README.md) for the complete refreshed set, including the latest mulligan flow and Special Energy artwork icons.

## Screenshot gallery

| Scenario | Screenshots |
|---|---|
| 1650×930 | [One Benched Pokémon](screenshots/layout-correction/table-1-bench-1650.png), [three](screenshots/layout-correction/table-3-bench-1650.png), [five](screenshots/layout-correction/table-5-bench-1650.png) |
| 1280×800 | [One](screenshots/layout-correction/table-1-bench-1280.png), [three](screenshots/layout-correction/table-3-bench-1280.png), [five](screenshots/layout-correction/table-5-bench-1280.png) |
| 760×800 tablet | [One](screenshots/layout-correction/table-1-bench-760.png), [three](screenshots/layout-correction/table-3-bench-760.png), [five](screenshots/layout-correction/table-5-bench-760.png) |
| 390×800 phone | [Battle center](screenshots/layout-correction/table-5-bench-390.png), [Prize area](screenshots/layout-correction/prizes-390.png), [Deck/Discard](screenshots/layout-correction/deck-discard-390.png) |
| 320×800 phone | [Battle center](screenshots/layout-correction/table-5-bench-320.png), [Prize area](screenshots/layout-correction/prizes-320.png), [Deck/Discard](screenshots/layout-correction/deck-discard-320.png) |
| Rotated card, multiple Energy, conditions | [1650](screenshots/layout-correction/rotated-resources-1650.png), [1280](screenshots/layout-correction/rotated-resources-1280.png), [760](screenshots/layout-correction/rotated-resources-760.png), [390](screenshots/layout-correction/rotated-resources-390.png), [320](screenshots/layout-correction/rotated-resources-320.png) |
| Real knockout, mandatory replacement | [1280](screenshots/layout-correction/knockout-replacement-1280.png) |
| Engine-resolved last-Prize victory, empty Active | [1650](screenshots/layout-correction/finished-empty-active-1650.png), [1280](screenshots/layout-correction/finished-empty-active-1280.png), [760](screenshots/layout-correction/finished-empty-active-760.png), [390](screenshots/layout-correction/finished-empty-active-390.png), [320](screenshots/layout-correction/finished-empty-active-320.png) |

## Verification scope

The new layout fixtures arrange real registered Base–Fossil cards inside real Match/Store instances. They are controlled game states, not claims that each screenshot was reached through a complete manual game. The finished-game and replacement screenshots are reached by actual engine attacks and knockout resolution. The final remaining Prize ends the game automatically in this adapter, rather than opening an unnecessary Prize choice. Existing full-game tests separately exercise complete games.

Fourteen added browser tests cover centerline alignment, correct front/back row order, bounded Bench gaps, all five slots, Prize aspect ratio and 2×3 arrangement, relative Deck/Discard dimensions, public top-discard artwork and inspection, hand visibility, no page overflow, deliberate mobile wheel panning, all five Bench cards reachable, rotated art/attachment separation, and centered empty slots after real KO/victory. Standard one/three/five-Bench boards must fit vertically in the mat at both desktop sizes. Existing interaction tests remain; only the obsolete card-width expectation and Discard accessible-name selector were adjusted to the new proportions/label.

Early screenshot review exposed lower-Bench clipping at 1280×800. Vertical gaps and labels were tightened before final verification, and a mat-height assertion was added. An initial finished-game test waited for a Prize choice the engine correctly skips; the test now asserts the actual automatic win. Neither required a rules change.

## Executed results

- `npm run build`: **PASS**, including TypeScript and the production Vite bundle.
- `npm test`: **108/108 PASS**, four files, **64.86 seconds**. Includes the existing 14 complete-game scenarios.
- `PLAYWRIGHT_BROWSERS_PATH=/tmp/ptcg-browsers npm run test:e2e`: **43/43 PASS**, **1.7 minutes**. The original 29 tests remain, plus 14 spatial/layout tests.
- Final practice browser match: turn 9, 34 actions, eight prompts, zero browser errors. Saved-deck Haymaker browser scenario: turn 5, three human plays, zero browser errors.
- Screenshots at 1650×930, 1280×800, 760×800, 390×800 and 320×800 were opened and visually inspected. Desktop geometry asserts the standard full table fits vertically; tablet geometry asserts no horizontal mat overflow. Hand/page overflow checks pass throughout.

The first layout-focused run passed 13/14, with an incorrect test assumption about the automatic final Prize. An intermediate full run passed 40/43 and correctly caught remaining bottom padding overflow at 1280×800. Both issues were resolved before the final 43/43 run. No tests were deleted or skipped.

## Manual review and limits

Run from the repository root:

```sh
npm ci  # only if dependencies are not installed
npm run dev
```

Open **http://127.0.0.1:5173/**. The command starts both the backend and Vite. The normal development server was not started for this handoff; Playwright used isolated ports 5174/3002.

Start with a saved deck against Haymaker. Check that the opposing Actives face each other, develop one/three/five Benched Pokémon, inspect Discard, attach Energy, retreat, and finish a game. Check status rotation and mandatory replacement targeting. On a narrow viewport, pan the mat left/right to reach Prizes, Deck/Discard and every Bench position; the hand stays along the bottom. Open Match log and Field Effects to confirm continued access.

Small screens intentionally show a window onto the physical table. The tested 760px tablet fits horizontally but requires vertical scrolling; phone playmats support both horizontal and vertical panning. Dense Bench attachments, larger text/zoom or shorter desktop windows can also require internal scrolling; they do not enlarge the page or move the hand off-screen. Large Active attachment collections scroll within their resource area. This is Chromium automation and screenshot review, not physical-device or screen-reader certification. Existing engine limitations documented in milestone-4-research.md are unchanged.

Stop here for manual feedback. No further milestone is started.
