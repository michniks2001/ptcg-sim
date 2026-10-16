# Card coverage

Twinleaf pin: `a8b6fe9075f982f7722e3c9ee2ce5e39cea1f1ca`.

| Measurement | Result |
| --- | ---: |
| Discovered exported set modules | 162 |
| Imported/registered set modules | 160 |
| Registered executable identities | 13,791 |
| Distinct effect functions | 8,981 |
| Catalog entries | 13,792 |
| Selectable entries | 13,711 |
| Quarantined entries | 80, representing 40 ambiguous official printings |
| Known unavailable original printing | Base Gastly #50 |
| Independent metadata printings | 20,635 |
| Catalog-matched unique official printings | 12,854, including unavailable/quarantined entries |
| Extra executable entries without matched official metadata | 898 |

Set modules are not necessarily physical expansions: Energy collections and promotional collections have their own modules. Complete module names, engine codes and counts are in [the set manifest](../shared/set-manifest.json). This spans Wizards, e-Card, EX, Diamond & Pearl/Platinum, HGSS, BW, XY, Sun & Moon, Sword & Shield, Scarlet & Violet and upstream Mega Evolution collections. Presence is not certification of completeness or official release.

## Inventories

- [Source inventory](twinleaf-inventory.json): exports at the audited upstream pin, including excluded test/Game Boy modules.
- [Application inventory](card-inventory.json): printing/executable identities, dates, stage/types, mechanics, artwork and status.
- [Independent printing inventory](printing-inventory.json): dataset printings with represented/unavailable executable mapping.
- [Conflicts](card-registration-conflicts.json): the exact 40 official printings quarantined because effects have not been reconciled.
- [Counts](card-coverage-summary.json): machine-readable summary.

`implemented-unverified` means a registered upstream definition; it is not an effect certification. `tested-representative` names a card with a targeted gameplay regression, not exhaustive coverage. Quarantined cards remain visible with an explanation and cannot enter executable decks. Printings absent from the metadata snapshot are not claimed to be official releases. Official dataset printings absent from Twinleaf are not fabricated or silently substituted.

The original 228 catalog entries and 227 executable identities remain intact, including distinct Jungle/Fossil holo printings and the local Ditto #18 alias. Existing saved-deck IDs remain valid. Alternate definitions that inherit the same effect reuse the upstream implementation; cards sharing only a name are not merged.

## Artwork

Original artwork stays locally cached. Additional exact printing matches use the snapshot's image URL, lazy loading, normal browser caching and text fallback. No API key or live metadata API is needed. Remote image availability is not guaranteed; 898 unmatched entries explicitly lack verified artwork metadata. Image failure never changes game legality.

To reproduce metadata and inventories, use the scripts documented in `milestone-5-research.md` against the exact recorded checkouts, then run `npm run engine:build` and `node scripts/coverage-report.mjs`. Do not point the vendoring script at an arbitrary revision: it preserves existing files and is not an upgrade/migration tool.
