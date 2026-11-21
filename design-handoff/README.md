# design-handoff

- `HANDOFF.md`: the DarwinFlow design spec (tokens, map style, components, illustration rules). Read this first.
- `prototype/`: the standalone React + MapLibre prototype the redesign was lifted from (reference only).
- `art-generator/`: Python that draws the invertebrate plates and silhouettes. Add families here.
- `backup-before-redesign/`: copy of `web/src`, `web/index.html` and `web/package.json` from before the redesign was wired in (21 Nov 2026). To revert, copy them back over `web/`.
- `darwinflow-handoff.zip`: the original bundle these folders came from.

What changed in `web/`: new header, map layers (thin rivers, hatched status bands, pins, legend, selected-site connector), site sidebar on real NRW data, design tokens in `src/styles/tokens.css`, art in `public/art/`, and `scripts/etl_site_series.py` (per-site trends + paired chemistry -> `public/data/site_series.json`, now part of `npm run etl`). The old `SitePanel.tsx` and `TaxonCard.tsx` are no longer used and can be deleted.
