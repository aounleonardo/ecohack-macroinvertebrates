"""Geometry + ink-and-wash SVG primitives shared by every illustration.

Style recipe (keep consistent across the set):
  * wash  = flat pigment fill, warped edge + paper grain (filter #wash), offset ~1px from ink
  * pool  = thin darker stroke on the wash edge (pigment pooling)
  * ink   = warm near-black #2A2724 line, 0.6-1.4px, slight wobble (filter #ink)
"""
import math, random

INK = "#2A2724"

DEFS = """<defs>
<filter id="wash" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="warp"/>
<feDisplacementMap in="SourceGraphic" in2="warp" scale="4.5" xChannelSelector="R" yChannelSelector="G" result="shape"/>
<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="1" seed="3" result="grain"/>
<feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.75 1.22" result="ga"/>
<feComposite in="shape" in2="ga" operator="in"/>
</filter>
<filter id="sil" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="warp"/>
<feDisplacementMap in="SourceGraphic" in2="warp" scale="3.5" xChannelSelector="R" yChannelSelector="G" result="shape"/>
<feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="5" result="blot"/>
<feColorMatrix in="blot" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.9 1.25" result="ba"/>
<feComposite in="shape" in2="ba" operator="in"/>
</filter>
<filter id="ink" x="-10%" y="-10%" width="120%" height="120%">
<feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="1" seed="11" result="n"/>
<feDisplacementMap in="SourceGraphic" in2="n" scale="1.4" xChannelSelector="R" yChannelSelector="G"/>
</filter>
</defs>"""


def f(v):
    return f"{v:.1f}".rstrip("0").rstrip(".")


def catmull3(nodes, per=10):
    """Catmull-Rom through (x, y, w) nodes; returns dense list."""
    pts = [nodes[0]] + list(nodes) + [nodes[-1]]
    out = []
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[i + 1], pts[i + 2]
        for s in range(per):
            t = s / per
            t2, t3 = t * t, t * t * t
            out.append(tuple(
                0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2
                       + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3) for k in range(3)))
    out.append(tuple(nodes[-1]))
    return out


def smooth_path(pts, closed=True):
    n = len(pts)
    if n < 3:
        return "M" + " L".join(f"{f(x)},{f(y)}" for x, y in pts)
    d = f"M{f(pts[0][0])},{f(pts[0][1])}"
    rng = range(n) if closed else range(n - 1)
    for i in rng:
        p0 = pts[(i - 1) % n] if closed else pts[max(i - 1, 0)]
        p1 = pts[i]
        p2 = pts[(i + 1) % n] if closed else pts[i + 1]
        p3 = pts[(i + 2) % n] if closed else pts[min(i + 2, n - 1)]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f" C{f(c1[0])},{f(c1[1])} {f(c2[0])},{f(c2[1])} {f(p2[0])},{f(p2[1])}"
    return d + (" Z" if closed else "")


class Spine:
    """A body part defined by a centreline with half-widths."""

    def __init__(self, nodes, rng, per=6, jitter=0.35):
        if len(nodes[0]) == 2:
            raise ValueError
        self.pts = catmull3(nodes, per)
        self.rng = rng
        self.jit = jitter
        self._frames()

    def _frames(self):
        P = self.pts
        self.T, self.N = [], []
        for i in range(len(P)):
            a = P[max(i - 1, 0)]
            b = P[min(i + 1, len(P) - 1)]
            tx, ty = b[0] - a[0], b[1] - a[1]
            L = math.hypot(tx, ty) or 1
            tx, ty = tx / L, ty / L
            self.T.append((tx, ty))
            self.N.append((ty, -tx))

    def at(self, frac):
        i = min(int(frac * (len(self.pts) - 1)), len(self.pts) - 1)
        return i

    def side(self, i, s=1, k=1.0):
        x, y, w = self.pts[i]
        nx, ny = self.N[i]
        return (x + s * nx * w * k, y + s * ny * w * k)

    def outline(self):
        P, N, T = self.pts, self.N, self.T
        j = lambda: self.rng.uniform(-self.jit, self.jit)
        left = [(x + nx * w + j(), y + ny * w + j()) for (x, y, w), (nx, ny) in zip(P, N)]
        right = [(x - nx * w + j(), y - ny * w + j()) for (x, y, w), (nx, ny) in zip(P, N)]
        x0, y0, w0 = P[0]
        tx, ty = T[0]
        x1, y1, w1 = P[-1]
        ux, uy = T[-1]
        nx0, ny0 = N[0]
        nx1, ny1 = N[-1]
        kc = 0.62
        hcap = [(x0 + nx0 * w0 * math.cos(math.radians(a)) - tx * w0 * kc * math.sin(math.radians(a)),
                 y0 + ny0 * w0 * math.cos(math.radians(a)) - ty * w0 * kc * math.sin(math.radians(a))) for a in (135, 90, 45)]
        tcap = [(x1 + nx1 * w1 * math.cos(math.radians(a)) + ux * w1 * kc * math.sin(math.radians(a)),
                 y1 + ny1 * w1 * math.cos(math.radians(a)) + uy * w1 * kc * math.sin(math.radians(a))) for a in (45, 90, 135)]
        L = left[::2] if (len(left) - 1) % 2 == 0 else left[::2] + [left[-1]]
        R = right[::-1][::2]
        if R[-1] != right[0]:
            R = R + [right[0]]
        pts = hcap + L + tcap + R
        return smooth_path(pts, True)

    def cross(self, frac, bow=0.35):
        i = self.at(frac)
        x, y, w = self.pts[i]
        tx, ty = self.T[i]
        a = self.side(i, 1, 0.96)
        b = self.side(i, -1, 0.96)
        c = (x + tx * w * bow * 2, y + ty * w * bow * 2)
        return f"M{f(a[0])},{f(a[1])} Q{f(c[0])},{f(c[1])} {f(b[0])},{f(b[1])}"


def jointed(origin, segs, mirror=False):
    """segs: [(length, angle_deg)] absolute angles, 0 = +x, 90 = +y (down)."""
    x, y = origin
    pts = [(x, y)]
    for L, a in segs:
        if mirror:
            a = 180 - a
        r = math.radians(a)
        x, y = x + L * math.cos(r), y + L * math.sin(r)
        pts.append((x, y))
    return pts


def poly(pts):
    return "M" + " L".join(f"{f(x)},{f(y)}" for x, y in pts)


def qcurve(a, c, b):
    return f"M{f(a[0])},{f(a[1])} Q{f(c[0])},{f(c[1])} {f(b[0])},{f(b[1])}"


def mirror_x(p, cx=120):
    return (2 * cx - p[0], p[1])


class Plate:
    """Collects layered SVG for one illustration."""

    def __init__(self, seed=1, size=240):
        self.rng = random.Random(seed)
        self.size = size
        self.back = []    # ink lines behind everything (tails, antennae)
        self.legs_w = []  # leg wash
        self.legs_i = []  # leg ink
        self.under = []   # gills etc. (wash + ink), behind body
        self.wash = []    # body wash
        self.mark = []    # darker markings
        self.hi = []      # highlights
        self.ink = []     # outlines
        self.detail = []  # segment lines, setae
        self.sil = Silhouette()
        self.parts = []   # ordered (wash, ink) per body part

    # ---- primitives -------------------------------------------------
    def body(self, sp, base, dark=None, light=None, ink_w=1.25):
        d = sp.outline()
        self.sil.shape(d)
        w = f'<path d="{d}" fill="{base}"/>'
        if dark:
            w += f'<path d="{d}" fill="none" stroke="{dark}" stroke-width="1.6" opacity=".55"/>'
        self.parts.append((w, f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{ink_w}" stroke-linejoin="round"/>'))
        return d

    def segs(self, sp, fracs, w=0.75, op=0.7, bow=0.35):
        for fr in fracs:
            self.detail.append(f'<path d="{sp.cross(fr, bow)}" fill="none" stroke="{INK}" stroke-width="{w}" opacity="{op}" stroke-linecap="round"/>')

    def leg(self, origin, segs, color, mirror=False, widths=(2.0, 1.5, 1.0), claw=True, flat=0):
        pts = jointed(origin, segs, mirror)
        self.sil.stroke(poly(pts), 3.2 if not flat else 4.5)
        for k in range(len(pts) - 1):
            a, b = pts[k], pts[k + 1]
            ww = widths[min(k, len(widths) - 1)]
            if flat and k == 0:
                # broad flattened femur as a lens
                mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
                dx, dy = b[0] - a[0], b[1] - a[1]
                L = math.hypot(dx, dy)
                nx, ny = -dy / L * flat, dx / L * flat
                d = f"M{f(a[0])},{f(a[1])} Q{f(mx + nx)},{f(my + ny)} {f(b[0])},{f(b[1])} Q{f(mx - nx)},{f(my - ny)} {f(a[0])},{f(a[1])} Z"
                self.legs_w.append(f'<path d="{d}" fill="{color}"/>')
                self.legs_i.append(f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="1"/>')
                continue
            seg = f"M{f(a[0])},{f(a[1])} L{f(b[0])},{f(b[1])}"
            self.legs_w.append(f'<path d="{seg}" stroke="{color}" stroke-width="{ww + 2.2}" stroke-linecap="round" fill="none"/>')
            self.legs_i.append(f'<path d="{seg}" stroke="{INK}" stroke-width="{ww * 0.7}" stroke-linecap="round" fill="none"/>')
        if claw:
            a, b = pts[-2], pts[-1]
            ang = math.atan2(b[1] - a[1], b[0] - a[0])
            for s in (-1, 1):
                r = ang + s * 0.55
                c = (b[0] + 3.2 * math.cos(r), b[1] + 3.2 * math.sin(r))
                self.legs_i.append(f'<path d="M{f(b[0])},{f(b[1])} L{f(c[0])},{f(c[1])}" stroke="{INK}" stroke-width=".7" stroke-linecap="round"/>')
        return pts

    def leg_pair(self, origin, segs, color, **kw):
        self.leg(origin, segs, color, False, **kw)
        self.leg(mirror_x(origin), segs, color, True, **kw)

    def thread(self, a, c, b, w=0.9, hairs=0, layer="back"):
        d = qcurve(a, c, b)
        self.sil.stroke(d, max(1.3, w * 1.6))
        tgt = getattr(self, layer)
        tgt.append(f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{w}" stroke-linecap="round"/>')
        if hairs:
            for k in range(1, hairs):
                t = k / hairs
                x = (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0]
                y = (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]
                dx = 2 * (1 - t) * (c[0] - a[0]) + 2 * t * (b[0] - c[0])
                dy = 2 * (1 - t) * (c[1] - a[1]) + 2 * t * (b[1] - c[1])
                L = math.hypot(dx, dy) or 1
                s = 1 if k % 2 else -1
                hx, hy = x + (-dy / L * s * 2.6) + dx / L * 1.5, y + (dx / L * s * 2.6) + dy / L * 1.5
                tgt.append(f'<path d="M{f(x)},{f(y)} L{f(hx)},{f(hy)}" stroke="{INK}" stroke-width=".45" stroke-linecap="round"/>')

    def blob(self, cx, cy, rx, ry, rot, fill, layer="mark", op=1, stroke=None, sw=0.7):
        tgt = getattr(self, layer)
        s = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ""
        tgt.append(f'<ellipse cx="{f(cx)}" cy="{f(cy)}" rx="{f(rx)}" ry="{f(ry)}" transform="rotate({f(rot)} {f(cx)} {f(cy)})" fill="{fill}" opacity="{op}"{s}/>')

    def gill(self, base_pt, outward, back, rx, ry, rot, fill, branchy=False):
        cx, cy = base_pt[0] + outward, base_pt[1] + back
        self.sil.ell(cx, cy, rx, ry, rot)
        self.under.append(f'<ellipse cx="{f(cx)}" cy="{f(cy)}" rx="{f(rx)}" ry="{f(ry)}" transform="rotate({f(rot)} {f(cx)} {f(cy)})" fill="{fill}" opacity=".85"/>')
        self.under.append(f'<ellipse cx="{f(cx)}" cy="{f(cy)}" rx="{f(rx)}" ry="{f(ry)}" transform="rotate({f(rot)} {f(cx)} {f(cy)})" fill="none" stroke="{INK}" stroke-width=".6" opacity=".8" filter="url(#ink)"/>')
        # trachea vein
        self.under.append(f'<path d="M{f(base_pt[0])},{f(base_pt[1])} L{f(cx + (outward * 0.6))},{f(cy + back * 0.3)}" stroke="{INK}" stroke-width=".4" opacity=".6"/>')

    def tuft(self, pt, direction, n=5, L=7, color="#E9E4D6"):
        ang0 = math.atan2(direction[1], direction[0])
        for k in range(n):
            a = ang0 + (k - (n - 1) / 2) * 0.32
            e = (pt[0] + L * math.cos(a), pt[1] + L * math.sin(a))
            m = (pt[0] + L * 0.5 * math.cos(a + 0.15), pt[1] + L * 0.5 * math.sin(a + 0.15))
            self.sil.stroke(qcurve(pt, m, e), 1.8)
            self.under.append(f'<path d="{qcurve(pt, m, e)}" stroke="{color}" stroke-width="2.2" stroke-linecap="round" fill="none"/>')
            self.under.append(f'<path d="{qcurve(pt, m, e)}" stroke="{INK}" stroke-width=".5" stroke-linecap="round" fill="none" opacity=".75"/>')

    def raw(self, layer, s):
        getattr(self, layer).append(s)

    # ---- output ------------------------------------------------------
    def svg(self, title, transform="", bg=None, extra_defs=""):
        s = self.size
        g = lambda items, attrs="": f"<g{attrs}>{''.join(items)}</g>" if items else ""
        body = (
            g(self.back, ' filter="url(#ink)"')
            + g(self.legs_w, ' filter="url(#wash)" opacity=".9" transform="translate(1 .8)"')
            + g(self.legs_i, ' filter="url(#ink)"')
            + g(self.under)
            + "".join(f'<g filter="url(#wash)" transform="translate(1.2 .9)">{w}</g><g filter="url(#ink)">{i}</g>' for w, i in self.parts)
            + g(self.wash, ' filter="url(#wash)" transform="translate(1.2 .9)"')
            + g(self.mark, ' filter="url(#wash)" opacity=".75" transform="translate(1.2 .9)"')
            + g(self.hi, ' opacity=".38" filter="url(#wash)"')
            + g(self.ink, ' filter="url(#ink)"')
            + g(self.detail, ' filter="url(#ink)"')
        )
        bgr = f'<rect width="{s}" height="{s}" fill="{bg}"/>' if bg else ""
        tr = f' transform="{transform}"' if transform else ""
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {s} {s}" width="{s}" height="{s}" role="img" aria-label="{title}">'
                f"<title>{title}</title>{DEFS}{extra_defs}{bgr}<g{tr}>{body}</g></svg>")

    def group(self, transform=""):
        """Same layers as a <g> (for composing into scenes; scene supplies DEFS)."""
        g = lambda items, attrs="": f"<g{attrs}>{''.join(items)}</g>" if items else ""
        body = (
            g(self.back, ' filter="url(#ink)"')
            + g(self.legs_w, ' filter="url(#wash)" opacity=".9"')
            + g(self.legs_i)
            + g(self.under)
            + "".join(f'<g filter="url(#wash)">{w}</g><g>{i}</g>' for w, i in self.parts)
            + g(self.wash, ' filter="url(#wash)"')
            + g(self.mark, ' filter="url(#wash)" opacity=".75"')
            + g(self.hi, ' opacity=".38"')
            + g(self.ink)
            + g(self.detail)
        )
        return f'<g transform="{transform}">{body}</g>'


class Silhouette:
    """Single-tone version of the same geometry (no interior detail)."""

    def __init__(self, color="#4F6E70"):
        self.c = color
        self.items = []

    def shape(self, d):
        self.items.append(f'<path d="{d}"/>')

    def stroke(self, d, w):
        self.items.append(f'<path d="{d}" fill="none" stroke="{self.c}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>')

    def ell(self, cx, cy, rx, ry, rot=0):
        self.items.append(f'<ellipse cx="{f(cx)}" cy="{f(cy)}" rx="{f(rx)}" ry="{f(ry)}" transform="rotate({f(rot)} {f(cx)} {f(cy)})"/>')

    def inner(self, transform=""):
        return f'<g fill="{self.c}" transform="{transform}">{"".join(self.items)}</g>'

    def svg(self, title, transform="", wash=True, size=240):
        filt = ' filter="url(#sil)"' if wash else ""
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}" role="img" aria-label="{title}">'
                f'<title>{title}</title>{DEFS}<g{filt}>{self.inner(transform)}</g></svg>')

    def plain(self, transform=""):
        """currentColor variant for React (no filter, no fixed colour)."""
        out = "".join(self.items).replace(f'stroke="{self.c}"', 'stroke="currentColor"')
        return f'<g fill="currentColor" transform="{transform}">{out}</g>'
