import json, math, random, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from geom import DEFS, INK, smooth_path, f, Spine
from families import baetidae, heptageniidae, gammaridae, chironomidae, hydropsychidae, elmidae

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out", "scenes")
rng = random.Random(5)
os.makedirs(OUT, exist_ok=True)

# ------------------------------------------------------------ tray "photo"
W, H = 880, 600
HALF = {"baetidae": (40, 100), "heptageniidae": (50, 100), "gammaridae": (96, 66), "chironomidae": (46, 88),
        "elmidae": (46, 74), "hydropsychidae": (40, 90)}
FN = {"baetidae": baetidae, "heptageniidae": heptageniidae, "gammaridae": gammaridae, "chironomidae": chironomidae,
      "elmidae": elmidae, "hydropsychidae": hydropsychidae}
BUGS = [
    ("baetidae", 222, 196, .62, 32, 92),
    ("baetidae", 616, 156, .55, -62, 88),
    ("baetidae", 712, 436, .5, 148, 81),
    ("heptageniidae", 424, 316, .72, -18, 86),
    ("gammaridae", 182, 446, .56, 8, 95),
    ("gammaridae", 752, 282, .46, 118, 90),
    ("chironomidae", 568, 470, .56, 66, 77),
    ("hydropsychidae", 352, 486, .5, -78, 84),
    ("elmidae", 468, 118, .46, 24, 64),
]

parts = []
boxes = []
for slug, x, y, s, r, conf in BUGS:
    P = FN[slug]()
    parts.append(P.group(f"translate({f(x - 120 * s)} {f(y - 120 * s)}) scale({s}) rotate({r} 120 120)"))
    hw, hh = HALF[slug]
    a = math.radians(r)
    bw = abs(hw * math.cos(a)) + abs(hh * math.sin(a))
    bh = abs(hw * math.sin(a)) + abs(hh * math.cos(a))
    pad = 6
    boxes.append(dict(family=slug, x=round(x - bw * s - pad), y=round(y - bh * s - pad), w=round(2 * bw * s + 2 * pad), h=round(2 * bh * s + 2 * pad), conf=conf))

det = []
for _ in range(34):  # leaf fragments
    cx, cy = rng.uniform(80, 800), rng.uniform(80, 520)
    pts = []
    n = rng.randint(5, 8)
    R = rng.uniform(4, 11)
    for k in range(n):
        a = k / n * 2 * math.pi
        rr = R * rng.uniform(.5, 1.2)
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a) * rng.uniform(.5, 1)))
    c = rng.choice(["#8A6A44", "#6E5233", "#A0805A", "#5E4A30"])
    det.append(f'<path d="{smooth_path(pts)}" fill="{c}" opacity="{rng.uniform(.45, .8):.2f}"/>')
for _ in range(7):  # twigs
    x0, y0 = rng.uniform(90, 780), rng.uniform(90, 510)
    a = rng.uniform(0, math.pi)
    L = rng.uniform(25, 60)
    det.append(f'<path d="M{f(x0)},{f(y0)} q{f(L/2*math.cos(a)+rng.uniform(-4,4))},{f(L/2*math.sin(a)+rng.uniform(-4,4))} {f(L*math.cos(a))},{f(L*math.sin(a))}" stroke="#6B5236" stroke-width="{rng.uniform(1.5,3):.1f}" stroke-linecap="round" fill="none" opacity=".75"/>')
for _ in range(220):  # sand
    det.append(f'<circle cx="{f(rng.uniform(70, 810))}" cy="{f(rng.uniform(66, 534))}" r="{rng.uniform(.6, 1.8):.1f}" fill="{rng.choice(["#9C8E78", "#7F7360", "#B5A88F"])}" opacity=".7"/>')
for _ in range(6):  # gravel
    cx, cy = rng.uniform(90, 790), rng.uniform(90, 510)
    rx, ry = rng.uniform(6, 13), rng.uniform(5, 10)
    det.append(f'<ellipse cx="{f(cx)}" cy="{f(cy)}" rx="{f(rx)}" ry="{f(ry)}" fill="#8F8B82"/><ellipse cx="{f(cx-rx*.25)}" cy="{f(cy-ry*.3)}" rx="{f(rx*.5)}" ry="{f(ry*.35)}" fill="#C9C5BB" opacity=".7"/>')

tray = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="Photo of a white sorting tray with river invertebrates and detritus">
<title>Sorting tray photo (mock)</title>{DEFS}
<defs>
<filter id="bank" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves="4" seed="9"/><feColorMatrix values="0 0 0 0 .20  0 0 0 0 .26  0 0 0 0 .16  0 0 0 -1.4 1.1"/><feGaussianBlur stdDeviation="3"/></filter>
<filter id="caus" x="0" y="0" width="100%" height="100%"><feTurbulence type="turbulence" baseFrequency="0.018 0.026" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -2.2 1.05"/><feGaussianBlur stdDeviation="1.2"/></filter>
<filter id="soft"><feGaussianBlur stdDeviation=".45"/></filter>
<filter id="drop" x="-10%" y="-10%" width="120%" height="125%"><feGaussianBlur stdDeviation="10"/></filter>
<radialGradient id="vig" cx="50%" cy="48%" r="75%"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".35"/></radialGradient>
<linearGradient id="floor" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EEF1EE"/><stop offset=".55" stop-color="#E6EAE6"/><stop offset="1" stop-color="#DCE2DE"/></linearGradient>
<linearGradient id="glare" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<clipPath id="floorclip"><rect x="62" y="58" width="756" height="484" rx="18"/></clipPath>
</defs>
<rect width="{W}" height="{H}" fill="#3F4A33"/>
<rect width="{W}" height="{H}" filter="url(#bank)"/>
<rect x="52" y="54" width="800" height="532" rx="30" fill="#000" opacity=".45" filter="url(#drop)"/>
<rect x="40" y="36" width="800" height="528" rx="30" fill="#F6F4EF" stroke="#D3CFC4" stroke-width="2"/>
<rect x="62" y="58" width="756" height="484" rx="18" fill="url(#floor)"/>
<g clip-path="url(#floorclip)">
<rect x="62" y="58" width="756" height="484" filter="url(#caus)" opacity=".35"/>
<g filter="url(#soft)">{"".join(det)}</g>
<g filter="url(#soft)">{"".join(parts)}</g>
<path d="M62,58 h756 v14 h-756 z" fill="#B8BDB6" opacity=".25"/>
<rect x="520" y="40" width="60" height="560" fill="url(#glare)" transform="rotate(28 550 300)" opacity=".5"/>
</g>
<rect x="62" y="58" width="756" height="484" rx="18" fill="none" stroke="#C9CCC4" stroke-width="2"/>
<rect width="{W}" height="{H}" fill="url(#vig)"/>
</svg>'''
open(f"{OUT}/tray-photo.svg", "w").write(tray)
json.dump(boxes, open(f"{OUT}/tray-boxes.json", "w"), indent=1)

# ------------------------------------------------------------ rod deployment illustration
rod = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180" width="240" height="180" role="img" aria-label="Camera rod staked into the riverbed with a bubble-burst sampler">
<title>Camera rod on the riverbed</title>{DEFS}
<g filter="url(#wash)">
<path d="M0,44 Q30,38 60,44 T120,44 T180,44 T240,44 V146 H0 Z" fill="#BFD8D5" opacity=".7"/>
<path d="M0,146 Q40,140 90,146 T240,144 V180 H0 Z" fill="#C9B796"/>
</g>
<g filter="url(#ink)" fill="none" stroke="{INK}" stroke-linecap="round">
<path d="M0,44 Q30,38 60,44 T120,44 T180,44 T240,44" stroke-width="1.2"/>
<path d="M18,70 h22 M150,86 h30 M60,100 h18 M190,112 h24" stroke-width=".7" opacity=".6"/>
<path d="M0,146 Q40,140 90,146 T240,144" stroke-width="1"/>
</g>
<g filter="url(#wash)">
{"".join(f'<ellipse cx="{f(x)}" cy="{f(y)}" rx="{f(rx)}" ry="{f(ry)}" fill="{c}"/>' for x, y, rx, ry, c in [(20,156,13,8,"#8E8A80"),(52,162,9,6,"#A39D90"),(160,158,14,8,"#8E8A80"),(196,164,10,6,"#A39D90"),(224,154,9,6,"#7E7A70"),(84,166,7,5,"#7E7A70")])}
</g>
<g filter="url(#ink)" fill="none" stroke="{INK}" stroke-width=".8">
{"".join(f'<ellipse cx="{f(x)}" cy="{f(y)}" rx="{f(rx)}" ry="{f(ry)}"/>' for x, y, rx, ry in [(20,156,13,8),(52,162,9,6),(160,158,14,8),(196,164,10,6),(224,154,9,6),(84,166,7,5)])}
</g>
<g filter="url(#wash)"><rect x="113" y="10" width="7" height="166" rx="2" fill="#2F6F73"/><rect x="99" y="92" width="34" height="24" rx="6" fill="#E8E2D2"/><path d="M134,120 h40 v24 h-40 z" fill="#E7F0EE" opacity=".9"/><circle cx="116" cy="14" r="7" fill="#E06A4E"/></g>
<g filter="url(#ink)" fill="none" stroke="{INK}" stroke-linecap="round" stroke-linejoin="round">
<rect x="113" y="10" width="7" height="166" rx="2" stroke-width="1.1"/>
<rect x="99" y="92" width="34" height="24" rx="6" stroke-width="1.1"/>
<circle cx="126" cy="104" r="5" stroke-width="1"/><circle cx="126" cy="104" r="2" fill="{INK}"/>
<path d="M134,120 h40 v24 h-40 z" stroke-width="1"/>
<path d="M134,120 q20,-4 40,0" stroke-width=".7"/>
<circle cx="116" cy="14" r="7" stroke-width="1"/>
<path d="M120,140 h14" stroke-width="1"/>
</g>
<g fill="none" stroke="#2F6F73" stroke-width=".9" filter="url(#ink)">
{"".join(f'<circle cx="{f(x)}" cy="{f(y)}" r="{f(r)}"/>' for x, y, r in [(150,112,2.2),(156,100,2.8),(149,86,2),(158,74,3),(152,60,2.4),(162,52,1.8)])}
</g>
<g transform="translate(140 118) scale(.11)">{baetidae().group("rotate(80 120 120)")}</g>
</svg>'''
open(f"{OUT}/rod.svg", "w").write(rod)

# ------------------------------------------------------------ kick-sample video thumbnail
st = []
for k in range(26):
    x, y = rng.uniform(-10, 490), rng.uniform(20, 260)
    rx, ry = rng.uniform(10, 26), rng.uniform(7, 15)
    st.append((x, y, rx, ry, rng.choice(["#8E8A80", "#A39D90", "#7E7A70", "#B0A693"])))
flows = "".join(f'<path d="M{f(x)},{f(y)} q24,-5 48,0 t48,0" />' for x, y in [(rng.uniform(-20, 440), rng.uniform(10, 260)) for _ in range(30)])
kick = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 270" width="480" height="270" role="img" aria-label="Illustration of a kick sample: boots disturbing the gravel upstream of a D-frame net">
<title>Kick sampling</title>{DEFS}
<rect width="480" height="270" fill="#DCE9E5"/>
<g filter="url(#wash)" opacity=".9">{"".join(f'<ellipse cx="{f(x)}" cy="{f(y)}" rx="{f(rx)}" ry="{f(ry)}" fill="{c}"/>' for x, y, rx, ry, c in st)}</g>
<g filter="url(#ink)" fill="none" stroke="{INK}" stroke-width=".8" opacity=".7">{"".join(f'<ellipse cx="{f(x)}" cy="{f(y)}" rx="{f(rx)}" ry="{f(ry)}"/>' for x, y, rx, ry, c in st)}</g>
<rect width="480" height="270" fill="#9CC6C2" opacity=".35"/>
<g filter="url(#ink)" fill="none" stroke="#3E7C80" stroke-width="1.1" stroke-linecap="round" opacity=".7">{flows}</g>
<g filter="url(#wash)">
<path d="M150,120 q30,-30 70,-10 q30,20 60,0 q20,30 -10,50 q-40,20 -80,0 q-40,-10 -40,-40z" fill="#9C7E55" opacity=".55"/>
<path d="M200,140 q20,-20 50,-6 q16,16 -6,30 q-26,10 -44,-24z" fill="#7E6440" opacity=".5"/>
</g>
<g filter="url(#wash)">
<path d="M300,60 Q370,40 400,90 Q440,150 470,210 L440,236 Q400,200 340,190 Q300,180 296,120Z" fill="#E6E2D6" opacity=".9"/>
<path d="M300,56 Q296,120 300,200" fill="none" stroke="#3B3A36" stroke-width="7"/>
<path d="M120,150 q-10,-46 14,-60 q26,-10 34,14 l10,40 q4,20 -18,24 l-30,4 q-14,0 -10,-22z" fill="#2F5A3C"/>
<path d="M70,196 q-10,-46 14,-60 q26,-10 34,14 l10,40 q4,20 -18,24 l-30,4 q-14,0 -10,-22z" fill="#2F5A3C"/>
</g>
<g filter="url(#ink)" fill="none" stroke="{INK}" stroke-linecap="round" stroke-linejoin="round">
<path d="M300,60 Q370,40 400,90 Q440,150 470,210 M300,200 Q340,190 400,204 Q430,212 440,236" stroke-width="1.1"/>
{"".join(f'<path d="M{300+k*14},{58-k*1.5+k*k*.15} Q{320+k*14},{130} {302+k*13},{200+k*1.2}" stroke-width=".5" opacity=".6"/>' for k in range(10))}
{"".join(f'<path d="M300,{70+k*16} Q380,{60+k*18} 470,{120+k*14}" stroke-width=".5" opacity=".5"/>' for k in range(8))}
<path d="M300,56 Q296,120 300,200" stroke-width="1.4"/>
<path d="M300,56 L306,0" stroke-width="5" stroke="#3B3A36"/>
<path d="M120,150 q-10,-46 14,-60 q26,-10 34,14 l10,40 q4,20 -18,24 l-30,4 q-14,0 -10,-22z" stroke-width="1.1"/>
<path d="M70,196 q-10,-46 14,-60 q26,-10 34,14 l10,40 q4,20 -18,24 l-30,4 q-14,0 -10,-22z" stroke-width="1.1"/>
<path d="M136,92 L132,0 M86,138 L76,0" stroke-width="16" stroke="#2F5A3C" opacity=".85"/>
<path d="M190,130 q14,4 28,0 M206,150 q14,4 28,0 M180,160 q10,3 20,0" stroke-width=".9" opacity=".7"/>
</g>
</svg>'''
open(f"{OUT}/kick-sample.svg", "w").write(kick)

# ------------------------------------------------------------ tray + phone line drawing (drop zone)
tl = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 200" width="260" height="200" role="img" aria-label="A white sorting tray photographed from above with a phone">
<title>Photograph the tray from above</title>{DEFS}
<g transform="translate(0 40)"><g filter="url(#wash)"><path d="M40,92 L196,80 L232,140 L58,156 Z" fill="#FFFFFF"/><path d="M52,98 L192,88 L222,136 L66,149 Z" fill="#E3EFEC"/></g>
<g filter="url(#ink)" fill="none" stroke="{INK}" stroke-linejoin="round" stroke-linecap="round">
<path d="M40,92 L196,80 L232,140 L58,156 Z" stroke-width="1.3"/>
<path d="M52,98 L192,88 L222,136 L66,149 Z" stroke-width=".8"/>
</g>
<g transform="translate(70 92) scale(.16)">{baetidae().group("rotate(60 120 120)")}</g>
<g transform="translate(120 96) scale(.18)">{gammaridae().group("rotate(-10 120 120)")}</g>
<g transform="translate(160 100) scale(.14)">{chironomidae().group("rotate(40 120 120)")}</g></g>
<g transform="translate(26 6) scale(.8)"><g filter="url(#wash)"><rect x="104" y="6" width="58" height="96" rx="10" fill="#1B5E66" opacity=".95" transform="rotate(-6 133 54)"/></g>
<g filter="url(#ink)" fill="none" stroke="{INK}" stroke-linecap="round">
<rect x="104" y="6" width="58" height="96" rx="10" stroke-width="1.2" transform="rotate(-6 133 54)"/>
<g transform="rotate(-6 133 54)" stroke="#FFFDF8" stroke-width="1.6"><path d="M114,22 v-6 h6 M146,16 h6 v6 M152,84 v6 h-6 M120,90 h-6 v-6"/><circle cx="133" cy="53" r="9"/></g>
</g>
</g><path d="M133,92 L133,116" stroke="#1B5E66" stroke-width="1.2" stroke-dasharray="2 3"/>
</svg>'''
open(f"{OUT}/tray-line.svg", "w").write(tl)
print(json.dumps(boxes))
