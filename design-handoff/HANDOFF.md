# DarwinFlow: design handoff for the coding agent

River invertebrate monitoring app for Wales (hackathon build). The mockups live on the design canvas (link in the chat). This bundle has everything you need to build them in the real app.

```
HANDOFF.md                 this file
prototype/                 Vite + React + TS + MapLibre, main map + sidebar screen, working
  src/styles/tokens.css    design tokens (CSS custom properties)  <- lift as-is
  src/styles/app.css       component styles using only tokens
  src/map/mapStyle.ts      MapLibre layer spec, colours, pin + hatch image generators  <- lift as-is
  src/map/MapView.tsx      map, selection, connector wedge, legend, controls
  src/components/*.tsx     header, sidebar variants, cards, atoms
  src/data/demo.ts         demo sites, families, status logic, GeoJSON builders
  public/art/              all illustrations (SVG)
art-generator/             Python that draws the illustrations; add families here
```

Run: `cd prototype && npm install && npm run dev`. If the CARTO basemap can't load (offline), the map falls back to plain paper and the overlays still render.

---

## 1. Screens on the canvas

Page **Screens**

| Artboard | What it shows |
|---|---|
| Main · stale site, Kick kit | Map 65% / sidebar 35%. Cwmpennar (upstream), last sampled 26 Sep 2013. Task card first, expected families second, history last. |
| Map · stale site, Has rod | Same site, rod profile. Rod deployment card replaces the kick card; kick offered as secondary action. |
| Map · fresh site (Gowerton) | Latest-survey chips, sparklines (EPT %, taxa, abundance), water chemistry paired within 90 days, family history cards with presence dots. |
| Sidebar state · chemistry unavailable | Graceful empty state for WaterQualityPanel. |
| CV · upload / identifying / result / Dex unlock | Drop zone, staged progress, tray photo with detection boxes, card-flip unlock with glow and a badge toast. |
| Dex | 6 of 9 with progress ring, 3×3 trading cards (recorded / unrecorded / new), badges row. |
| Mobile · camera / results / Dex unlock | 390×844. No fake status bar; the top 47 px is left for the real one. |

Page **Handoff spec**: tokens, map style, components, illustration system.

Map artboards are drawn taller than 900 px so the whole sidebar is visible. In the app the root is `100vh`: the sidebar body scrolls and its action bar stays pinned at the bottom.

---

## 2. Decisions that differ from, or sharpen, the brief

1. **Dex count tells one story.** Before the Cwmpennar upload the user has 5/9; the CV result finds Flat-headed mayflies (new) and the unlock takes them to 6/9. Map stale screens and CV screens show 5/9; fresh map, unlock and Dex show 6/9.
2. **Moss vs. status green.** Moss is a main brand colour and green is also "fresh". To avoid a moss element reading as a status, moss is used only for Dex/nature moments (ticks, NEW tags, progress, notes). Status fresh is a darker leaf green `#2C6E43` and always comes with its check glyph.
3. **Life-stage rule.** "Larva or nymph" can't apply to shrimp, snails, worms or leeches (no larval stage), and riffle beetles are recorded as adults. Rule used: *the aquatic stage you find in the tray*.
4. **Colour never alone.** Bands: solid → diagonal hatch → cross-hatch as staleness rises; rod = dashed centre stitch. Pins: check / half-filled circle / exclamation / rod glyph. Amber pins use a dark glyph (white on amber fails 3:1).
5. **Coordinator profile** isn't designed yet. The prototype treats it like Kick kit.
6. Plausible demo values are invented where the brief allowed (visit counts, chemistry, sparklines). Replace with real NRW data.

---

## 3. Design tokens

All in `prototype/src/styles/tokens.css`. Key values:

| Group | Tokens |
|---|---|
| Paper/ink | `--paper #F7F3EA` `--paper-raised #FFFDF8` `--paper-sunk #EFE9DC` `--line #E4DCCB` `--line-strong #CFC4B0` `--ink #1F2A2C` `--ink-2 #4A5658` `--ink-3 #5F696B` |
| River teal | `--river-900 #0E3B43` `--river-700 #1B5E66` (primary) `--river-500 #3D8A90` `--river-300 #9CC3C3` `--river-100 #E3EFEC` |
| Moss | `--moss-700 #4E6B3A` `--moss-500 #7A9461` `--moss-100 #ECEFDF` |
| Status | fresh `#2C6E43 / #1D4D2E / #E2EEE4 / #1F5432`, ageing `#E5A93A / #9A6510 / #FBEFD5 / #7A4E0B`, stale `#E06A4E / #9A3220 / #FBE5DD / #9A3220`, rod `#1B5E66 / #0E3B43 / #E3EFEC / #0E3B43` (fill / dark / tint / text) |
| Patterns | `--pattern-ageing`, `--pattern-stale`, `--pattern-rod` (CSS backgrounds for swatches) |
| Type | Fraunces 600 for display (44/50, 30/36, 22/28, 18/24); Inter for UI (16/24, 14/20 default, 13/18 labels, 12/16 captions, 11/14 overline +0.08em caps). Latin names always italic. |
| Spacing | 4 px base: 4 8 12 16 20 24 32 40 48 64 |
| Radii | 6 10 12 16 20 999 |
| Shadows | `--shadow-1` resting, `--shadow-2` floating map UI, `--shadow-3` modals/toasts, `--glow-new` unlock |
| Motion | `--ease-out cubic-bezier(.2,.8,.2,1)`, 120 / 200 / 400 ms, flip 650 ms; all zero under reduced motion |

Status thresholds: fresh ≤ 1 year, ageing 1–3 years, stale > 3 years; a rod that is recording overrides recency (`statusFor()` in mapStyle.ts).

---

## 4. Map style spec

Basemap: CARTO Positron GL style, restyled in `tuneBasemap()`: background `#F2EEE5`, water `#DAE7E6`, and the basemap's own `waterway` layers recoloured as our thin background rivers. Nothing in the background uses status colours.

Sources: `reaches` (LineString per sampled reach, props `site_id`, `status`), `sites` (Point per site, props `site_id`, `name`, `status`, `promoteId: 'site_id'`).

| # | Layer | Type | Paint / layout |
|---|---|---|---|
| 1 | waterway (basemap) | line | `#7FAAB2`, opacity .75, width z8 .5 → z11 1 → z14 1.6 → z17 3, ×1.8 for `class = river` |
| 2 | reach-casing | line | `#F7F3EA`, opacity .95, width z9 7 → z12 15 → z15 21, round cap/join |
| 3 | reach-edge | line | colour = status dark, width z9 5 → z12 11 → z15 16 |
| 4 | reach-fill | line | colour = status fill, width z9 4 → z12 9 → z15 13 |
| 5 | reach-pattern | line | filter ageing/stale; `line-pattern` `hatch-diag` / `hatch-cross` (12 px tiles, 2× images, generated by `makeHatch`) |
| 6 | reach-rod-stitch | line | filter rod; `#F7F3EA`, width z9 1 → z15 2.4, dash [3, 2.5] |
| 7 | site-halo | circle | r 22, status fill, opacity 0.18 when `feature-state.selected` |
| 8 | sites | symbol | `pin-{status}` (17 px shape + 2.4 px paper ring), size z8 .7 → z12 1 → z15 1.15, allow overlap, stale sorted on top |
| 9 | site-selected | symbol | filter `site_id = selected`; `pin-{status}-selected` with 2.5 px ink ring |
| – | connector | HTML/SVG | wedge from `map.project(site)` to the sidebar edge; fill status tint 45%, stroke status dark 55%; recompute on `move`/`resize` |

Legend (bottom-left, collapsible): title "Last sampled"; rows "Sampled within 1 year", "1–3 years ago", "Over 3 years ago", "Camera rod, recording now", "No sample on record"; caption "Bands show the stretch of river each sample stands for." Attribution bottom-right: "© OpenStreetMap contributors © CARTO".

Real reaches: snap each site to OS Open Rivers / OSM waterways and extend downstream to the midpoint towards the next site (cap ~2 km).

---

## 5. Components

| Component | Shows | Props / states |
|---|---|---|
| `AppHeader` | Logo + name, catchment select, profile switch, Dex button with ring + "n/9", "Assign me a red site" | catchment, profile (kick, rod, coordinator), dexCount, active (map, dex) |
| `ProfileSwitch` | Segmented control (inside AppHeader) | kick, rod, coordinator; drives sidebar variant |
| `Button` | primary / secondary / ghost; 44 px, lg 52, sm 36 | default, hover, pressed, disabled, loading |
| `MapView` | MapLibre map + layers + connector | idle, site selected, flying |
| `MapLegend` | Legend card | expanded, collapsed |
| `SelectedPinConnector` | Wedge from pin to sidebar | per status colour |
| `SiteSidebar` | Header, task or data, history row, pinned actions | stale-kick, stale-rod, fresh, empty, loading |
| `SiteHeader` | Name (normal case), catchment + code, `StatusPill`, 3 `StatTile`s | with/without code |
| `StatusPill` | Tint + glyph + "Stale · 13 years" | fresh, ageing, stale, rod |
| `InstructionCard` | Kick task: video thumb, 5 steps, kit checklist (net, tray, whiteboard, phone), ~50–70 min, safety line | default, video playing, kit complete |
| `RodDeploymentCard` | Rod illustration, facts, install/retrieve dates, 25 vs 60 min bars, 3 steps | schedule, installed (day n of 7), ready to retrieve |
| `FamilyRow` | Expected family: art, names, Dex tick / "New for you" / "Not a Dex card", play button | dex, new, none |
| `FamilyChip` | Art + common name, Latin in title | default, hover |
| `FamilyCard` | Art, names, `PresenceDots`, `TrendArrow`; Wales-wide % in tooltip | default, tooltip |
| `PresenceDots` | 10 dots, newest right | 0–10 filled |
| `TrendArrow` | Arrow + word | up, flat, down |
| `Sparkline` | SVG polyline, area, end dot (180×40) | default, single point |
| `WaterQualityPanel` | BOD, ammonia, DO % tiles, paired badge, source line, "indicate not cause" note | paired, unavailable, loading |
| `UploadDropzone` | Dashed target, tray illustration, choose / phone buttons, formats | idle, drag-over, error |
| `UploadProgress` | Stages: uploaded, identifying (bar), counting, ready | each stage, failed + retry |
| `DetectionOverlay` | Boxes + chips over the photo in image pixels (see 7) | identified, new (moss + sparkles), low confidence (dashed, "check"), edited |
| `ResultsPanel` | Families with count + confidence bar, pilot note, "Add to my Dex" | default, low-confidence rows ask Yes/No |
| `DexCard` | Plate, No., sensitivity badge, names, "First recorded at …" | recorded, unrecorded (silhouette + ?), new (glow), flipping |
| `UnlockModal` | Scrim, flipping card, glow, sparkles, 6/9 bar, "View my Dex" / "Keep reviewing" | flip, settled |
| `Toast` | Badge earned | info |
| `BadgeRow` | Medallion, title, how earned | earned, locked |
| `OrderSilhouette` | Fallback art per order, currentColor | beetle, mayfly, stonefly, caddis, fly-larva, crustacean, snail, worm, leech |

Copy rule: never "caught". Use "recorded" or "found".

---

## 6. Illustration guidance

- **Subject:** the aquatic stage found in a tray (nymph/larva for mayflies, stoneflies, caddis, true flies; adult riffle beetles; whole animal for shrimp, snails, worms, leeches).
- **View:** top-down, head up, centred in a 240×240 viewBox with ~10% margin. Shrimp and snails in side view (that is how they lie in a tray).
- **Ink:** warm `#2A2724`, 0.6–1.4 px at 240 px, slight wobble; jointed legs with claws; tails with fine hairs.
- **Wash:** one natural base colour, darker pooling at edges, paper grain, ~1 px offset from the ink.
- **Colour:** natural only. Never status colours or brand teal.
- **Ground:** transparent, on `--paper` or a `--paper-sunk` tile. No shadows, no photo textures.
- **Size:** reads down to 28 px; smaller → silhouette.
- **Silhouettes:** same outlines, one tone `#4F6E70`, no detail. 22–28% opacity on unrecorded Dex cards; full strength for order fallback. **Never a generic grey oval.**
- **Fallback:** every family carries `order`; `FamilyArt` renders the plate if `hasArt`, else `OrderSilhouette`. E.g. Dytiscidae → beetle, Ephemerellidae → mayfly, Perlodidae → stonefly, Limnephilidae → caddis (cased), Tipulidae → fly larva, Asellidae → crustacean, Lymnaeidae → snail, Oligochaeta → worm, Glossiphoniidae → leech.

Files: `public/art/families/*.svg` (9 plates), `public/art/family-silhouettes/*.svg`, `public/art/orders/*.svg` (9 order silhouettes), `src/data/silhouette-paths.json` (path data for the currentColor component), `public/art/scenes/` (kick-sample video thumb, rod, tray line drawing, mock tray photo). To add a family, define its body spine in `art-generator/families.py` and run `python3 build_art.py`.

---

## 7. Data and behaviour notes

- **Status:** `statusFor(lastSampled, rodActive)` in mapStyle.ts. Show age in the pill: weeks < 2 months, months < 1 year, else whole years.
- **Sidebar variant:** `stale|ageing` + kick → stale-kick; `stale|ageing` + rod → stale-rod; `fresh|rod` → fresh. Stale sites always lead with the task.
- **Chemistry pairing:** nearest NRW water sample within 90 days and 2 km of the survey; otherwise show the unavailable state (offer nearest older reading).
- **Detections:** `{ family, x, y, w, h, conf }` in natural image pixels (`src/data/tray-boxes.json` matches the mock photo). Scale by `renderedWidth / naturalWidth`. Chip above the box by default; below if it would overlap; right-aligned near the right edge. Confidence < 70% → dashed box and Yes/No confirm.
- **Unlock:** card `rotateY(180deg → 0)` over `--dur-flip` with `--ease-out`, then `--glow-new` fades over 1.2 s; sparkles scale in staggered by 60 ms. Badge toasts bottom-left for 5 s.
- **Accessibility:** real buttons/inputs everywhere; icon-only buttons have `aria-label`; glyph + text on every status; captions use `--ink-3` (≥ 4.5:1).
