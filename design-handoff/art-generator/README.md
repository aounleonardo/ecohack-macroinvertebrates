# Illustration generator

Draws every plate and silhouette from one set of primitives so the style stays consistent.

    python3 build_art.py   # families/, family-silhouettes/, orders/, manifest.json, silhouette-paths.json -> out/
    python3 scenes.py      # tray photo mock, rod, kick-sample thumbnail, tray line drawing -> out/scenes/

Add a family: write a function in families.py (body parts are `Spine` centrelines with half-widths;
legs, tails, gills via `Plate` helpers), add it to FAMILIES, run build_art.py, copy the SVGs into
prototype/public/art/. Its silhouette is generated automatically from the same geometry.
