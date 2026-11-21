"""The nine Dex families + nine order silhouettes, all from geom.py primitives.
viewBox 240x240, head up, animal centred, transparent background."""
import math
from geom import *

CX = 120


def V(*rows):
    """vertical spine helper: rows of (y, w) -> (x, y, w) on centre line"""
    return [(CX, y, w) for y, w in rows]


# --------------------------------------------------------------------------
def baetidae():
    P = Plate(seed=4)
    base, dark, light = "#8F7F4C", "#5A4C2C", "#CFC293"
    r = P.rng
    head = Spine(V((36, 3), (40, 11), (48, 15), (56, 14), (62, 9)), r)
    thor = Spine(V((60, 8), (66, 15), (78, 18), (92, 18), (104, 14), (108, 9)), r)
    abd = Spine([(120, 104, 12), (120, 114, 14), (120.5, 128, 13), (121.5, 142, 11), (122.5, 156, 8.5), (123, 168, 6), (123, 178, 3.5)], r)
    # tails + antennae
    P.thread((123, 178), (112, 206), (94, 232), 0.9, hairs=14)
    P.thread((123, 178), (124, 204), (123, 226), 0.9, hairs=12)
    P.thread((123, 178), (136, 206), (154, 230), 0.9, hairs=14)
    for s in (1, -1):
        P.thread((CX + s * 5, 39), (CX + s * 10, 22), (CX + s * 24, 9), 0.7)
    # legs
    P.leg_pair((CX + 14, 70), [(18, -35), (15, -72), (9, -100)], base)
    P.leg_pair((CX + 17, 82), [(19, 2), (15, 36), (9, 62)], base)
    P.leg_pair((CX + 16, 96), [(20, 32), (16, 62), (9, 86)], base)
    # gills on abdomen segs 1-7
    for k, fr in enumerate([0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.82]):
        i = abd.at(fr)
        for s in (1, -1):
            p = abd.side(i, s, 1.0)
            P.gill(p, s * 7.5, 3, 5.6 - k * 0.35, 3.4, s * 28, light)
    P.body(abd, base, dark)
    P.body(thor, base, dark)
    P.body(head, base, dark)
    # wing pads
    for s in (1, -1):
        wp = Spine([(CX + s * 9, 84, 2.5), (CX + s * 11, 94, 4.8), (CX + s * 12, 104, 4), (CX + s * 12.5, 112, 1.6)], r, jitter=0.2)
        P.body(wp, dark, None, ink_w=0.9)
    # markings
    for fr in [0.14, 0.27, 0.40, 0.53, 0.66, 0.78]:
        i = abd.at(fr)
        x, y, w = abd.pts[i]
        for s in (1, -1):
            P.blob(x + s * w * 0.42, y + 4, w * 0.25, 2.2, 0, dark)
    P.blob(CX, 76, 6, 9, 0, dark, op=.6)
    P.hi.append(f'<path d="M{CX-8},70 Q{CX-12},86 {CX-9},100" stroke="#FFF8E6" stroke-width="3" fill="none"/>')
    P.hi.append(f'<path d="M{CX-6},116 Q{CX-8},140 {CX-4},164" stroke="#FFF8E6" stroke-width="2.4" fill="none"/>')
    P.segs(abd, [0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 0.8, 0.9])
    P.segs(thor, [0.15, 0.42], w=0.6, op=0.6)
    for s in (1, -1):
        P.blob(CX + s * 10.5, 46, 3.6, 4.8, s * 10, INK, layer="detail", op=.9)
    return P


def heptageniidae():
    P = Plate(seed=9)
    base, dark, light = "#7E5E3D", "#4B3622", "#C9AC84"
    r = P.rng
    head = Spine(V((30, 6), (33, 22), (40, 30), (50, 31), (58, 26), (64, 12)), r)
    thor = Spine(V((62, 10), (68, 20), (80, 23), (94, 22), (106, 15), (110, 9)), r)
    abd = Spine([(120, 106, 15), (120, 118, 17), (120, 132, 16), (120.5, 146, 13), (121, 160, 10), (121, 172, 6.5), (121, 182, 3.5)], r)
    P.thread((121, 182), (104, 212), (78, 236), 0.9, hairs=16)
    P.thread((121, 182), (121, 210), (120, 238), 0.9, hairs=16)
    P.thread((121, 182), (138, 212), (163, 236), 0.9, hairs=16)
    for s in (1, -1):
        P.thread((CX + s * 12, 33), (CX + s * 18, 20), (CX + s * 30, 14), 0.7)
    P.leg_pair((CX + 18, 72), [(22, -18), (17, -8), (10, 12)], base, flat=4.5)
    P.leg_pair((CX + 22, 86), [(24, 14), (19, 30), (10, 52)], base, flat=5)
    P.leg_pair((CX + 20, 100), [(26, 40), (19, 62), (10, 82)], base, flat=5)
    for k, fr in enumerate([0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 0.8]):
        i = abd.at(fr)
        for s in (1, -1):
            p = abd.side(i, s, 0.85)
            P.gill(p, s * 10, 3, 8.6 - k * 0.6, 5.2, s * 32, light)
    P.body(abd, base, dark)
    P.body(thor, base, dark)
    P.body(head, base, dark)
    for s in (1, -1):
        wp = Spine([(CX + s * 12, 84, 3), (CX + s * 15, 96, 6), (CX + s * 16.5, 108, 5), (CX + s * 17, 117, 2)], r, jitter=0.2)
        P.body(wp, dark, None, ink_w=0.9)
    # mottling
    for _ in range(26):
        x = CX + r.uniform(-24, 24)
        y = r.uniform(36, 104)
        P.blob(x, y, r.uniform(1.5, 3.5), r.uniform(1.2, 2.6), r.uniform(0, 180), dark, op=.55)
    for fr in [0.1, 0.25, 0.4, 0.55, 0.7]:
        i = abd.at(fr)
        x, y, w = abd.pts[i]
        P.blob(x, y + 4, w * 0.55, 3, 0, dark, op=.7)
    # pale bands on femora
    for (o, a, L) in [((CX + 18, 72), -18, 22), ((CX + 22, 86), 14, 24), ((CX + 20, 100), 40, 26)]:
        for s in (1, -1):
            ang = math.radians(a if s == 1 else 180 - a)
            ox = o[0] if s == 1 else 2 * CX - o[0]
            P.blob(ox + math.cos(ang) * L * 0.55, o[1] + math.sin(ang) * L * 0.55, 3.4, 2.2, a if s == 1 else 180 - a, light, layer="hi", op=1)
    P.hi.append(f'<path d="M{CX-18},42 Q{CX-6},36 {CX+8},38" stroke="#FFF8E6" stroke-width="3" fill="none"/>')
    P.segs(abd, [0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 0.8, 0.9])
    for s in (1, -1):
        P.blob(CX + s * 15, 50, 4.6, 3.8, 0, INK, layer="detail", op=.9)
    return P


def leuctridae():
    P = Plate(seed=13)
    base, dark, light = "#A1824C", "#6A5230", "#DCC995"
    r = P.rng
    head = Spine(V((30, 3), (34, 9), (42, 10.5), (50, 9), (54, 6)), r)
    pro = Spine(V((53, 7), (56, 11), (66, 11), (70, 8)), r)
    tho = Spine(V((69, 8), (74, 10.5), (96, 10), (104, 7)), r)
    abd = Spine([(120, 102, 7), (120, 110, 7.5), (120.5, 130, 7), (121.5, 150, 6), (122, 166, 4.5), (122, 180, 3)], r)
    P.thread((122, 180), (114, 204), (104, 230), 0.85, hairs=10)
    P.thread((122, 180), (128, 204), (138, 229), 0.85, hairs=10)
    for s in (1, -1):
        P.thread((CX + s * 4, 32), (CX + s * 10, 10), (CX + s * 30, 0), 0.65, hairs=10)
    P.leg_pair((CX + 10, 60), [(16, -30), (15, -62), (8, -84)], base, widths=(1.6, 1.2, .9))
    P.leg_pair((CX + 10, 80), [(19, 8), (17, 36), (8, 58)], base, widths=(1.6, 1.2, .9))
    P.leg_pair((CX + 10, 94), [(21, 34), (19, 60), (9, 82)], base, widths=(1.6, 1.2, .9))
    P.body(abd, base, dark, ink_w=1.1)
    P.body(tho, base, dark, ink_w=1.1)
    P.body(pro, base, dark, ink_w=1.1)
    P.body(head, base, dark, ink_w=1.1)
    for s in (1, -1):
        wp = Spine([(CX + s * 7.5, 76, 1.8), (CX + s * 8.6, 86, 2.8), (CX + s * 8.8, 96, 2.8), (CX + s * 8.6, 104, 1.4)], r, jitter=0.15)
        P.body(wp, dark, None, ink_w=0.8)
    P.blob(CX, 61, 5, 3, 0, dark, op=.7)
    P.blob(CX, 42, 4, 5, 0, dark, op=.5)
    P.hi.append(f'<path d="M{CX-4},110 Q{CX-5},136 {CX-2},164" stroke="#FFF8E6" stroke-width="2" fill="none"/>')
    P.segs(abd, [0.08, 0.18, 0.28, 0.38, 0.48, 0.58, 0.68, 0.78, 0.88], w=0.6)
    for s in (1, -1):
        P.blob(CX + s * 8, 40, 2.4, 3, 0, INK, layer="detail", op=.9)
    return P


def chironomidae():
    P = Plate(seed=21)
    base, dark, light = "#B64A3A", "#7E2A21", "#E9967F"
    r = P.rng
    nodes = [(84, 54, 5.2), (92, 60, 6.2), (104, 70, 6.5), (118, 84, 6.6), (131, 102, 6.6), (138, 124, 6.6),
             (135, 147, 6.5), (125, 167, 6.3), (114, 184, 6.1), (109, 199, 5.6), (112, 212, 4.6)]
    body = Spine(nodes, r, per=8)
    # anterior prolegs
    i = body.at(0.06)
    for s in (1, -1):
        p = body.side(i, s, 0.9)
        P.leg(p, [(6, 70 + s * 30)], base, widths=(3.0,), claw=False)
    # posterior prolegs + anal tubules
    end = body.pts[-1]
    for ang in (60, 115):
        P.leg((end[0], end[1] - 2), [(9, ang)], base, widths=(3.2,), claw=True)
    for ang in (20, 160):
        P.leg((end[0], end[1] - 4), [(7, ang)], light, widths=(2.4,), claw=False)
    P.body(body, base, dark, ink_w=1.2)
    # head capsule
    head = Spine([(74, 44, 2.5), (77, 47, 5.4), (82, 52, 5.6), (86, 56, 3)], r, jitter=0.15)
    P.body(head, "#5A3A26", "#2F1E14", ink_w=1.1)
    P.blob(77.5, 48, 1.3, 1.6, 0, INK, layer="detail", op=.9)
    P.thread((74, 44), (71, 41), (69, 38), 0.6, layer="detail")
    P.thread((76, 43), (75, 39), (75, 36), 0.6, layer="detail")
    # gut line + highlight
    P.mark.append(smooth_path([(p[0] + 1.2, p[1]) for p in [(x, y) for x, y, w in body.pts][6:-6:3]], False).replace("M", '<path fill="none" stroke="#7E2A21" stroke-width="3.2" d="M', 1) + '"/>')
    hl = [(x - n[0] * w * 0.45, y - n[1] * w * 0.45) for (x, y, w), n in zip(body.pts[8:-8:4], body.N[8:-8:4])]
    P.hi.append(f'<path d="{smooth_path(hl, False)}" stroke="#FFF1E6" stroke-width="2" fill="none"/>')
    P.segs(body, [k / 13 for k in range(1, 13)], w=0.65, op=0.6, bow=0.2)
    return P


def simuliidae():
    P = Plate(seed=27)
    base, dark, light = "#6F7357", "#444832", "#B8BB9C"
    r = P.rng
    head = Spine(V((54, 3), (57, 7), (64, 7.5), (71, 5)), r)
    tho = Spine(V((69, 6), (74, 8), (92, 8.5), (104, 8)), r)
    abd = Spine([(120, 102, 8), (120, 116, 9), (120.5, 136, 12), (121, 156, 15), (121, 172, 16), (121, 184, 14), (121, 193, 9), (121, 198, 3)], r)
    # labral fans
    for s in (1, -1):
        o = (CX + s * 4, 54)
        rays = []
        for k in range(13):
            a = math.radians(-90 + s * (8 + k * 6.2))
            L = 22 + r.uniform(-2, 1.5)
            e = (o[0] + L * math.cos(a), o[1] + L * math.sin(a))
            m = (o[0] + L * 0.55 * math.cos(a - s * 0.12), o[1] + L * 0.55 * math.sin(a - s * 0.12))
            rays.append(e)
            P.thread(o, m, e, 0.45, layer="back")
        fan = [o] + rays
        P.under.append(f'<path d="{smooth_path(fan, True)}" fill="{light}" opacity=".55" filter="url(#wash)"/>')
        P.sil.shape(smooth_path(fan, True))
    # thoracic proleg (peeks out on left)
    P.leg((CX - 6, 77), [(7, 160), (4, 120)], base, widths=(3.2, 2.4), claw=False)
    P.body(abd, base, dark)
    P.body(tho, base, dark)
    P.body(head, "#5D5E45", dark)
    for fr in [0.12, 0.26, 0.4, 0.54, 0.66, 0.78]:
        i = abd.at(fr)
        x, y, w = abd.pts[i]
        P.blob(x, y + 2.5, w * 0.8, 2.6, 0, dark, op=.6)
    P.blob(CX, 62, 3, 4, 0, INK, op=.5)
    # posterior circlet
    for k in range(13):
        a = math.radians(15 + k * 12.5)
        c = (121 + 8 * math.cos(a), 191 + 6 * math.sin(a))
        e = (121 + 11 * math.cos(a), 191 + 9 * math.sin(a))
        P.detail.append(f'<path d="M{f(c[0])},{f(c[1])} L{f(e[0])},{f(e[1])}" stroke="{INK}" stroke-width=".6" stroke-linecap="round"/>')
    P.hi.append(f'<path d="M{CX-8},140 Q{CX-11},160 {CX-8},180" stroke="#FFF8E6" stroke-width="3" fill="none"/>')
    P.segs(abd, [0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 0.82], w=0.6)
    P.segs(tho, [0.33, 0.66], w=0.6)
    for s in (1, -1):
        P.blob(CX + s * 4.5, 59, 1.5, 1.8, 0, INK, layer="detail", op=.9)
    return P


def _caddis(P, base, dark, light, plate_c, plate_d, lobed=1.0, tufts="small", seed_jit=0.3):
    r = P.rng
    head = Spine(V((30, 3), (34, 10), (44, 11), (52, 9.5), (56, 6.5)), r)
    pro = Spine(V((55, 8), (58, 12), (68, 12.5), (72, 10)), r)
    meso = Spine(V((71, 10), (74, 13), (84, 13.5), (88, 11)), r)
    meta = Spine(V((87, 11), (90, 14), (100, 14.5), (104, 12)), r)
    nodes = [(CX, 103, 12)]
    for k in range(9):
        y0 = 104 + k * 10
        wm = 16 - k * 0.75 - (2.5 if k > 6 else 0)
        nodes += [(CX + k * 0.3, y0 + 1, wm * (1 - 0.22 * lobed)), (CX + k * 0.3, y0 + 5.5, wm)]
    nodes += [(CX + 2.6, 196, 6.5), (CX + 2.7, 200, 3)]
    abd = Spine(nodes, r, per=4, jitter=seed_jit)
    # anal prolegs with hooks
    for s in (1, -1):
        o = (CX + 2.7 + s * 4, 198)
        pts = P.leg(o, [(7, 90 - s * 25), (5, 90 - s * 70)], base, widths=(3.4, 2.2), claw=False)
        e = pts[-1]
        P.detail.append(f'<path d="M{f(e[0])},{f(e[1])} q{f(s*4)},2 {f(s*1)},6" fill="none" stroke="{INK}" stroke-width="1.1" stroke-linecap="round"/>')
        if tufts == "brush":
            P.tuft(pts[1], (0, 1), n=6, L=8, color="#E6DDC8")
    # gills
    for k in range(7):
        y = 109 + k * 10
        i = min(range(len(abd.pts)), key=lambda j: abs(abd.pts[j][1] - y))
        for s in (1, -1):
            p = abd.side(i, s, 0.95)
            if tufts == "brush":
                P.tuft(p, (s, 0.35), n=6, L=9, color="#ECE6D6")
            else:
                P.tuft(p, (s, 0.2), n=3, L=5, color=light)
    P.leg_pair((CX + 10, 63), [(13, -35), (11, -66), (7, -92)], plate_c)
    P.leg_pair((CX + 13, 80), [(15, 0), (12, 26), (7, 52)], plate_c)
    P.leg_pair((CX + 14, 96), [(16, 24), (13, 50), (7, 72)], plate_c)
    P.body(abd, base, dark)
    P.body(meta, plate_c if tufts == "brush" else base, plate_d if tufts == "brush" else dark)
    P.body(meso, plate_c if tufts == "brush" else base, plate_d if tufts == "brush" else dark)
    P.body(pro, plate_c, plate_d)
    P.body(head, plate_c, plate_d)
    P.segs(abd, [k / 9 + 0.01 for k in range(1, 9)], w=0.6, op=0.55)
    return head, pro, meso, meta, abd


def rhyacophilidae():
    P = Plate(seed=33)
    base, dark, light = "#6E9B49", "#446B2A", "#B9D290"
    head, pro, meso, meta, abd = _caddis(P, base, dark, light, "#7A5530", "#4B3219", lobed=1.0, tufts="small")
    P.blob(CX, 42, 4, 6, 0, "#3A2614", op=.7)
    P.blob(CX - 5, 64, 3, 2, 0, "#3A2614", op=.6)
    P.blob(CX + 5, 64, 3, 2, 0, "#3A2614", op=.6)
    P.hi.append(f'<path d="M{CX-8},112 Q{CX-11},150 {CX-6},186" stroke="#FAFFF0" stroke-width="3" fill="none"/>')
    for s in (1, -1):
        P.blob(CX + s * 7, 39, 1.6, 2, 0, INK, layer="detail", op=.9)
    return P


def hydropsychidae():
    P = Plate(seed=37)
    base, dark, light = "#A58E6B", "#6E5A3E", "#D8C8A6"
    head, pro, meso, meta, abd = _caddis(P, base, dark, light, "#7A5A36", "#45311C", lobed=0.45, tufts="brush", seed_jit=0.25)
    P.blob(CX, 44, 5, 7, 0, "#D9C49A", layer="hi", op=1)
    P.blob(CX, 62, 6, 2.4, 0, "#2E2013", op=.5)
    for k in range(9):
        y = 108 + k * 10
        P.blob(CX + k * 0.3, y + 4, 9 - k * 0.5, 2.2, 0, dark, op=.45)
    # body hairs
    for k in range(40):
        i = P.rng.randrange(len(abd.pts))
        s = P.rng.choice((1, -1))
        p = abd.side(i, s, 1.0)
        P.detail.append(f'<path d="M{f(p[0])},{f(p[1])} l{f(s*2.2)},{f(1.2)}" stroke="{INK}" stroke-width=".45"/>')
    for s in (1, -1):
        P.blob(CX + s * 7, 39, 1.6, 2, 0, INK, layer="detail", op=.9)
    return P


def elmidae():
    P = Plate(seed=41)
    base, dark, light = "#3F3229", "#221A15", "#9C8470"
    r = P.rng
    head = Spine(V((44, 3), (48, 7), (54, 8), (60, 6)), r)
    pro = Spine(V((58, 9), (61, 14), (72, 16), (82, 16.5), (86, 14)), r)
    ely = Spine(V((85, 15), (90, 18), (110, 19), (135, 17.5), (155, 13), (168, 7), (175, 2)), r)
    for s in (1, -1):
        P.thread((CX + s * 5, 46), (CX + s * 9, 38), (CX + s * 17, 31), 0.9)
    P.leg_pair((CX + 13, 70), [(17, -22), (16, -48), (14, -70)], "#4A3B30", widths=(2.2, 1.7, 1.3))
    P.leg_pair((CX + 16, 98), [(19, 10), (17, 38), (14, 60)], "#4A3B30", widths=(2.2, 1.7, 1.3))
    P.leg_pair((CX + 15, 114), [(21, 40), (18, 64), (15, 84)], "#4A3B30", widths=(2.2, 1.7, 1.3))
    P.body(ely, base, dark)
    P.body(pro, base, dark)
    P.body(head, base, dark)
    # suture, striae, carinae
    P.detail.append(f'<path d="M{CX},87 L{CX+0.5},172" stroke="{INK}" stroke-width=".9"/>')
    for s in (1, -1):
        P.detail.append(f'<path d="M{CX+s*8},62 Q{CX+s*9},72 {CX+s*8.5},84" stroke="{INK}" stroke-width=".7" fill="none"/>')
        for col in (4, 8.5, 13):
            for k in range(11):
                y = 92 + k * 6.5
                i = min(range(len(ely.pts)), key=lambda j: abs(ely.pts[j][1] - y))
                w = ely.pts[i][2]
                if col < w - 2:
                    P.detail.append(f'<circle cx="{f(CX + s * col * (w / 19))}" cy="{f(y)}" r=".7" fill="{light}" opacity=".9"/>')
    P.hi.append(f'<ellipse cx="{CX-7}" cy="118" rx="4" ry="18" fill="#FFFFFF"/>')
    P.hi.append(f'<ellipse cx="{CX-6}" cy="70" rx="5" ry="4" fill="#FFFFFF"/>')
    return P


def gammaridae():
    P = Plate(seed=45)
    base, dark, light = "#A39472", "#6C6046", "#D8CEB0"
    r = P.rng
    cx0, cy0, R = 126, 134, 64
    nodes = []
    for k in range(13):
        a = math.radians(206 + k * 15.5)
        w = [12, 15, 17, 18, 18.5, 18.5, 18, 17, 15.5, 13.5, 11, 8.5, 6][k]
        nodes.append((cx0 + R * math.cos(a), cy0 + R * math.sin(a), w))
    body = Spine(nodes, r, per=5)
    # which side is ventral (toward centre)?
    i0 = len(body.pts) // 2
    p = body.side(i0, 1)
    vs = 1 if math.hypot(p[0] - cx0, p[1] - cy0) < R else -1
    hx, hy, _ = body.pts[0]
    # antennae
    P.thread((hx - 2, hy - 6), (52, 70), (34, 52), 1.0, hairs=14)
    P.thread((hx - 4, hy + 2), (50, 98), (30, 104), 1.0, hairs=12)
    # legs (pereopods): jointed, bent, short; first two are folded gnathopods
    for k, fr in enumerate([0.07, 0.14, 0.23, 0.32, 0.41, 0.5, 0.58]):
        i = body.at(fr)
        o = body.side(i, vs, 0.92)
        nx, ny = body.N[i]
        an = math.degrees(math.atan2(vs * ny, vs * nx))
        lean = -38 + k * 13
        if k < 2:
            P.leg(o, [(8, an + lean), (7, an + lean - 70), (4, an + lean - 140)], base, widths=(2.4, 2.0, 1.2), claw=True)
        else:
            L = 9 + k * 0.8
            P.leg(o, [(L, an + lean), (L * 0.85, an + lean + 35), (5, an + lean + 55)], base, widths=(1.8, 1.3, 0.9), claw=True)
    # pleopods
    for fr in [0.7, 0.77, 0.84]:
        i = body.at(fr)
        o = body.side(i, vs, 0.9)
        P.thread(o, (o[0] - 4, o[1] + 6), (o[0] - 9, o[1] + 9), 1.0, hairs=4)
    # uropods + telson
    tx, ty, _ = body.pts[-1]
    for da in (-25, 0, 25):
        a = math.radians(70 + da)
        P.thread((tx, ty), (tx + 6 * math.cos(a), ty + 6 * math.sin(a)), (tx + 15 * math.cos(a), ty + 15 * math.sin(a)), 1.2, hairs=4)
    P.body(body, base, dark)
    # coxal plates
    for fr in [0.1, 0.18, 0.27, 0.36]:
        i = body.at(fr)
        o = body.side(i, vs, 0.85)
        P.blob(o[0], o[1], 6.5, 4.5, math.degrees(math.atan2(body.T[i][1], body.T[i][0])), light, layer="under", op=.9, stroke=INK, sw=.6)
    # plates
    P.segs(body, [k / 14 for k in range(1, 14)], w=0.7, op=0.7, bow=-0.25)
    for fr in [0.2, 0.33, 0.46, 0.59, 0.72]:
        i = body.at(fr)
        q = body.side(i, -vs, 0.5)
        P.blob(q[0], q[1], 3.2, 2, 0, "#C0884E", op=.7)
    hl = [body.side(i, -vs, 0.6) for i in range(6, len(body.pts) - 6, 5)]
    P.hi.append(f'<path d="{smooth_path(hl, False)}" stroke="#FFFBEF" stroke-width="3" fill="none"/>')
    # eye (kidney)
    P.blob(hx + 9, hy - 1, 3, 5, 30, INK, layer="detail", op=.85)
    return P


FAMILIES = [
    # slug, common, latin, order, sensitivity, fn
    ("chironomidae", "Non-biting midges", "Chironomidae", "fly-larva", "Tolerant", chironomidae),
    ("baetidae", "Swimming mayflies", "Baetidae", "mayfly", "EPT", baetidae),
    ("elmidae", "Riffle beetles", "Elmidae", "beetle", "Sensitive", elmidae),
    ("heptageniidae", "Flat-headed mayflies", "Heptageniidae", "mayfly", "EPT", heptageniidae),
    ("leuctridae", "Needle stoneflies", "Leuctridae", "stonefly", "EPT", leuctridae),
    ("simuliidae", "Blackflies", "Simuliidae", "fly-larva", "Moderate", simuliidae),
    ("rhyacophilidae", "Free-living caddis", "Rhyacophilidae", "caddis", "EPT", rhyacophilidae),
    ("hydropsychidae", "Net-spinning caddis", "Hydropsychidae", "caddis", "EPT", hydropsychidae),
    ("gammaridae", "Freshwater shrimp", "Gammaridae", "crustacean", "Tolerant", gammaridae),
]


# ------------------------------------------------------------------ orders
def order_cased_caddis():
    P = Plate(seed=51)
    r = P.rng
    S = P.sil
    # case: tube with pebble edge
    case = Spine(V((66, 15), (90, 16), (130, 14), (170, 11.5), (206, 8.5)), r)
    S.shape(case.outline())
    for k in range(34):
        i = r.randrange(len(case.pts))
        s = r.choice((1, -1))
        p = case.side(i, s, 0.95)
        S.ell(p[0], p[1], r.uniform(3, 5.5), r.uniform(2.5, 4.5), r.uniform(0, 180))
    head = Spine(V((34, 3), (38, 9), (48, 10), (56, 8.5)), r)
    tho = Spine(V((54, 9), (58, 12), (70, 13)), r)
    S.shape(head.outline())
    S.shape(tho.outline())
    for o, segs in [((CX + 9, 58), [(13, -35), (11, -66), (6, -92)]), ((CX + 12, 64), [(14, -5), (11, 20)])]:
        S.stroke(poly(jointed(o, segs)), 3.2)
        S.stroke(poly(jointed(mirror_x(o), segs, True)), 3.2)
    return S


def order_fly_larva():
    """Cranefly-type larva: plump lobed grub with a fanned spiracular disc."""
    P = Plate(seed=53)
    r = P.rng
    S = P.sil
    nodes = [(120, 30, 4), (120, 38, 9)]
    for k in range(10):
        y = 46 + k * 15
        w = 17 - abs(k - 4) * 0.9
        nodes += [(120 + k * 0.4, y, w * 0.86), (120 + k * 0.4, y + 7.5, w)]
    nodes += [(124, 198, 14), (124, 204, 11)]
    S.shape(Spine(nodes, r, per=4, jitter=0.2).outline())
    for k in range(6):
        a = math.radians(10 + k * 32)
        S.ell(124 + 14 * math.cos(a), 206 + 9 * math.sin(a), 3.8, 7, math.degrees(a) + 90)
    return S


def order_snail():
    S = Silhouette()
    # foot + head
    S.shape("M34,190 Q30,172 48,170 L176,172 Q206,176 212,194 Q190,204 120,204 Q60,204 34,190 Z")
    S.stroke("M46,174 Q38,152 30,142", 3.4)
    S.stroke("M56,172 Q56,152 52,140", 3.4)
    S.ell(29, 141, 3.2, 3.2)
    S.ell(52, 138, 3.2, 3.2)
    # shell
    S.ell(132, 118, 62, 58, -8)
    # spiral (cut-out line in paper colour)
    pts = []
    for k in range(60):
        t = k / 59
        a = math.radians(40 + t * 640)
        rr = 52 * (1 - t) ** 1.25 + 3
        pts.append((134 + rr * math.cos(a) * 1.05, 116 + rr * math.sin(a)))
    S.items.append(f'<path d="{smooth_path(pts, False)}" fill="none" stroke="#FFFDF8" stroke-width="3.2" stroke-linecap="round"/>')
    return S


def order_worm():
    P = Plate(seed=57)
    r = P.rng
    S = P.sil
    nodes = []
    for k in range(15):
        t = k / 14
        y = 22 + t * 196
        x = 120 + 26 * math.sin(t * 2.3 * math.pi)
        w = 4.6 if 0.1 < t < 0.92 else 2.6
        if 0.24 < t < 0.33:
            w = 6
        nodes.append((x, y, w))
    S.shape(Spine(nodes, r, per=6, jitter=0.2).outline())
    return S


def order_leech():
    P = Plate(seed=59)
    r = P.rng
    S = P.sil
    b = Spine([(112, 22, 3), (113, 34, 6.5), (118, 56, 10), (126, 84, 14), (130, 116, 17), (126, 150, 18), (116, 178, 16), (110, 198, 12), (110, 206, 8)], r, per=6)
    S.shape(b.outline())
    S.ell(110, 211, 13, 10)
    return S


def orders():
    out = {}
    out["mayfly"] = baetidae().sil
    out["stonefly"] = leuctridae().sil
    out["beetle"] = elmidae().sil
    out["crustacean"] = gammaridae().sil
    out["caddis"] = order_cased_caddis()
    out["fly-larva"] = order_fly_larva()
    out["snail"] = order_snail()
    out["worm"] = order_worm()
    out["leech"] = order_leech()
    return out


ORDER_LABELS = {
    "beetle": "Beetles (Coleoptera)", "mayfly": "Mayflies (Ephemeroptera)", "stonefly": "Stoneflies (Plecoptera)",
    "caddis": "Caddisflies (Trichoptera)", "fly-larva": "True-fly larvae (Diptera)", "crustacean": "Crustaceans (Amphipoda, Isopoda)",
    "snail": "Snails (Gastropoda)", "worm": "Worms (Oligochaeta)", "leech": "Leeches (Hirudinea)",
}
