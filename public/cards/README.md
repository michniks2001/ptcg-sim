# Printing artwork

228 printing-specific PNGs cached on 2026-10-13 from `https://images.pokemontcg.io/{set}/{number}.png`:

- `base1/1.png` through `base1/102.png`: Base Set.
- `base2/1.png` through `base2/64.png`: Jungle (not Base Set 2).
- `base3/1.png` through `base3/62.png`: Fossil.

`shared/catalog.json` is the generated asset manifest. Run `npm run engine:build`, then `node scripts/download-cards.mjs` to restore missing images (requires network access). The downloader skips existing files, reports failures and never blocks gameplay. The original thirteen flat-path assets remain for provenance/backward compatibility; the application uses set-qualified paths.

No metadata API is called at runtime. Missing images display engine text. Stable printing IDs follow the Pokémon TCG data repository's IDs; executable effects come from Twinleaf. [Source metadata](https://github.com/PokemonTCG/pokemon-tcg-data/tree/master/cards/en) was used to audit identities, HP and stages; a small static audit snapshot lives in `data/printing-reference.json`. `data/base-gastly.json` supplies metadata for the one missing executable definition.

Artwork and Pokémon names are owned by their respective rights holders and are separate from software licenses. This is an unofficial local fan project.
