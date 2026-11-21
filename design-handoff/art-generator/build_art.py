import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from families import FAMILIES, orders, ORDER_LABELS

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
ROT = {"baetidae": -6, "heptageniidae": 4, "leuctridae": -8, "simuliidae": 7, "rhyacophilidae": -5,
       "hydropsychidae": 6, "elmidae": -10, "chironomidae": 0, "gammaridae": 0}

manifest = {"families": [], "orders": []}
react_paths = {"families": {}, "orders": {}}
for d in ("families", "family-silhouettes", "orders"):
    os.makedirs(os.path.join(OUT, d), exist_ok=True)
for slug, common, latin, order, sens, fn in FAMILIES:
    P = fn()
    tr = f"rotate({ROT[slug]} 120 120)"
    open(f"{OUT}/families/{slug}.svg", "w").write(P.svg(f"{common} ({latin}), larval or adult aquatic stage, ink and watercolour", tr))
    P.sil.c = "#4F6E70"
    open(f"{OUT}/family-silhouettes/{slug}.svg", "w").write(P.sil.svg(f"Silhouette of {common}", tr))
    react_paths["families"][slug] = P.sil.plain(tr)
    manifest["families"].append(dict(slug=slug, common=common, latin=latin, order=order, sensitivity=sens,
                                     art=f"families/{slug}.svg", silhouette=f"family-silhouettes/{slug}.svg"))

ROT_O = {"mayfly": -6, "stonefly": -8, "beetle": -10, "crustacean": 0, "caddis": -8, "fly-larva": 8, "snail": 0, "worm": 0, "leech": 6}
for k, S in orders().items():
    S.c = "#4F6E70"
    tr = f"rotate({ROT_O[k]} 120 120)"
    open(f"{OUT}/orders/{k}.svg", "w").write(S.svg(f"{ORDER_LABELS[k]} silhouette", tr))
    react_paths["orders"][k] = S.plain(tr)
    manifest["orders"].append(dict(slug=k, label=ORDER_LABELS[k], file=f"orders/{k}.svg"))

os.makedirs(OUT, exist_ok=True)
json.dump(manifest, open(f"{OUT}/manifest.json", "w"), indent=2)
json.dump(react_paths, open(f"{OUT}/silhouette-paths.json", "w"))

# contact sheet (for my own asset QA)
cells = "".join(f'<figure><img src="families/{m["slug"]}.svg"><figcaption>{m["latin"]}</figcaption></figure>' for m in manifest["families"])
cells2 = "".join(f'<figure><img src="family-silhouettes/{m["slug"]}.svg" style="opacity:.25"><figcaption>{m["latin"]} sil</figcaption></figure>' for m in manifest["families"])
cells3 = "".join(f'<figure><img src="orders/{m["slug"]}.svg"><figcaption>{m["slug"]}</figcaption></figure>' for m in manifest["orders"])
open(f"{OUT}/sheet.html", "w").write(
    f"<html><body style='background:#F7F3EA;margin:0;font:12px sans-serif'><div style='display:grid;grid-template-columns:repeat(9,240px);gap:4px'>{cells}{cells2}{cells3}</div>"
    "<style>figure{margin:0;background:#FFFDF8}img{width:240px;height:240px;display:block}</style></body></html>")
print("ok")
