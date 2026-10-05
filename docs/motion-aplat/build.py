#!/usr/bin/env python3
# Générateur de la maquette « aplat » : écrit index.html (HTML + CSS + SVG inline, aucune dépendance).
# Toute l'animation est en @keyframes CSS ; les mouvements composés (caméra, utilitaire, mètre)
# sont échantillonnés à 30 images/s depuis des courbes d'accélération réelles (cubic-bezier, ressorts).
import math, os, random

HERE = os.path.dirname(os.path.abspath(__file__))

INK = '#2b2320'; STEEL = '#5d6168'; GOLD = '#b9874a'; GOLD2 = '#ad8148'
OAK = '#c9a36b'; OAK2 = '#d8b07a'; PAPER = '#fbf8f4'; GREEN = '#2f6b45'


# ---------------------------------------------------------------- outils
def fmt(v, nd=2):
    if isinstance(v, str):
        return v
    s = ('%.' + str(nd) + 'f') % v
    if '.' in s:
        s = s.rstrip('0').rstrip('.')
    return '0' if s in ('-0', '', '-') else s


def f4(v):
    return fmt(v, 4)


def pct(t, dur):
    s = ('%.4f' % (t / dur * 100)).rstrip('0').rstrip('.')
    return (s or '0') + '%'


class Ease:
    def __init__(self, x1, y1, x2, y2):
        self.p = (x1, y1, x2, y2)
        self.css = 'cubic-bezier(%s,%s,%s,%s)' % tuple(fmt(v) for v in self.p)

    def __call__(self, x):
        if x <= 0:
            return 0.0
        if x >= 1:
            return 1.0
        x1, y1, x2, y2 = self.p

        def b(t, a, c):
            return 3 * a * (1 - t) ** 2 * t + 3 * c * (1 - t) * t * t + t ** 3
        lo, hi = 0.0, 1.0
        for _ in range(50):
            m = (lo + hi) / 2
            if b(m, x1, x2) < x:
                lo = m
            else:
                hi = m
        return b((lo + hi) / 2, y1, y2)


E_INOUT = Ease(.65, 0, .35, 1)
E_SOFT = Ease(.45, 0, .25, 1)
E_OUT = Ease(.22, 1, .36, 1)
E_OUTQ = Ease(.25, .8, .35, 1)
E_IN = Ease(.55, 0, 1, .45)
E_INQ = Ease(.5, 0, .85, .55)
E_CAM = Ease(.55, 0, .2, 1)
E_VAN = Ease(.5, 0, .18, 1)
E_WHIP = Ease(.78, 0, .14, 1)
E_DOLLY = Ease(.45, 0, .15, 1)
E_BACK = Ease(.3, 1.4, .55, 1)
E_POP = Ease(.34, 1.65, .5, 1)
E_LOCK = Ease(.2, 1.25, .45, 1)
E_TAPE = Ease(.2, .7, .3, 1)
E_ROLL = Ease(.18, .6, .25, 1.04)

KF = []
RULES = []


def anim(cls, dur, stops, extra=''):
    st = sorted(stops, key=lambda s: s[0])
    if st[0][0] > 0:
        st.insert(0, (0, st[0][1], None))
    if st[-1][0] < dur:
        st.append((dur, st[-1][1], None))
    name = 'aplat-' + cls
    body = []
    for s in st:
        e = s[2] if len(s) > 2 else None
        tf = (';animation-timing-function:' + e.css) if e is not None else ''
        body.append('%s{%s%s}' % (pct(s[0], dur), s[1], tf))
    KF.append('@keyframes %s{%s}' % (name, ''.join(body)))
    RULES.append('.%s{animation:%s %ss linear infinite%s}' % (name, name, fmt(dur), (';' + extra) if extra else ''))
    return name


def track(cls, dur, fn, cuts=(), fps=30, extra=''):
    ts = set(round(i / fps, 5) for i in range(int(round(dur * fps)) + 1))
    for c in cuts:
        ts.add(round(c - 0.002, 5))
        ts.add(round(c, 5))
    ts = sorted(t for t in ts if 0 <= t <= dur)
    vals = [fn(t) for t in ts]
    st = []
    for i, t in enumerate(ts):
        if 0 < i < len(ts) - 1 and vals[i] == vals[i - 1] and vals[i] == vals[i + 1]:
            continue
        st.append((t, vals[i], None))
    return anim(cls, dur, st, extra)


def tw(t, t0, t1, d, e=E_INOUT):
    if t <= t0:
        return 0.0
    if t >= t1:
        return d
    return d * e((t - t0) / (t1 - t0))


def step(t, t0, d):
    return d if t >= t0 else 0.0


def kick(t, t0, amp, freq=2.0, damp=6.0):
    if t < t0:
        return 0.0
    u = t - t0
    return amp * math.exp(-damp * u) * math.sin(2 * math.pi * freq * u)


def bounce(t, t0, t1, amp=.55, per=.27):
    if t <= t0 or t >= t1:
        return 0.0
    u = (t - t0) / (t1 - t0)
    return amp * math.sin(math.pi * u) * math.sin(2 * math.pi * (t - t0) / per)


def R(x, y, w, h, fill, rx=None, extra=''):
    r = (' rx="%s"' % fmt(rx)) if rx else ''
    return '<rect x="%s" y="%s" width="%s" height="%s"%s fill="%s"%s/>' % (fmt(x), fmt(y), fmt(w), fmt(h), r, fill, extra)


def P(d, fill, extra=''):
    return '<path d="%s" fill="%s"%s/>' % (d, fill, extra)


def E(cx, cy, rx, ry, fill, extra=''):
    return '<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s"%s/>' % (fmt(cx), fmt(cy), fmt(rx), fmt(ry), fill, extra)


def Ci(cx, cy, r, fill, extra=''):
    return '<circle cx="%s" cy="%s" r="%s" fill="%s"%s/>' % (fmt(cx), fmt(cy), fmt(r), fill, extra)


def poly(pts, fill, extra=''):
    return '<polygon points="%s" fill="%s"%s/>' % (' '.join('%s,%s' % (fmt(a), fmt(b)) for a, b in pts), fill, extra)


def smooth(pts, bottom):
    d = 'M%s,%s' % (fmt(pts[0][0]), fmt(pts[0][1]))
    for i in range(len(pts) - 1):
        p0 = pts[i - 1] if i > 0 else pts[i]
        p1, p2 = pts[i], pts[i + 1]
        p3 = pts[i + 2] if i + 2 < len(pts) else pts[i + 1]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += ' C%s,%s %s,%s %s,%s' % tuple(fmt(v) for v in (c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]))
    d += ' V%s H%s Z' % (fmt(bottom), fmt(pts[0][0]))
    return d


def cls(c):
    return ' class="aplat-%s"' % c


# ---------------------------------------------------------------- éléments dessinés
def rosette(fill=INK):
    s = []
    for i in range(8):
        a = i * math.pi / 4
        s.append(Ci(3.55 * math.cos(a), 3.55 * math.sin(a), 1.75, fill))
    s.append(Ci(0, 0, 3.1, fill))
    s.append('<circle r="2.05" fill="none" stroke="#6a605b" stroke-width=".45"/>')
    s.append(Ci(0, 0, .9, '#7a706a'))
    return ''.join(s)


RAIL_W = 96
DIAG_A = math.degrees(math.atan2(14.0, 22.35))
DIAG_L = 2 * math.hypot(22.35, 14.0)
PANELS = (24.55, 71.45)


def railing_static(p, sheen=False):
    """Garde-corps (origine en haut à gauche, 96 × 37) : acier plein noir, croix de Saint-André, rosaces, main courante chêne."""
    s = []
    s.append(R(0, 4.6, 96, 2.2, INK))
    s.append(R(0, 34.8, 96, 2.2, INK))
    for x in (0, 46.9, 93.8):
        s.append(R(x, 4.6, 2.2, 32.4, INK))
    for cx in PANELS:
        for sg in (1, -1):
            s.append('<g transform="translate(%s,20.8) rotate(%s)">%s</g>' % (fmt(cx), fmt(sg * DIAG_A), R(-DIAG_L / 2, -.8, DIAG_L, 1.6, INK)))
        s.append('<g transform="translate(%s,20.8)">%s</g>' % (fmt(cx), rosette()))
    s.append(R(-2, 0, 100, 4.6, OAK, 1.6))
    s.append(R(-1, .45, 98, 1.25, OAK2, .6))
    s.append(R(0, 4.6, 96, .7, 'rgba(43,35,32,.35)'))
    if sheen:
        s.append('<g clip-path="url(#%s-hr)"><g%s>%s</g></g>' % (p, cls('c-sheen'), R(-18, 0, 16, 4.6, 'url(#%s-sheen)' % p)))
    return ''.join(s)


def van(sc, roof_rail=''):
    body = []
    body.append(P('M6,-74H106Q114,-74 119,-68L136,-46Q148,-43 150,-36L152,-22Q152,-15 146,-15H6Q2,-15 2,-19V-70Q2,-74 6,-74Z', '#3b3532'))
    body.append(R(6, -74, 100, 2.2, '#4a4340', 1))
    body.append(R(2, -23, 150, 8, '#2b2320', 2))
    body.append(P('M14,-15A16,16 0 0 1 46,-15Z', '#211b19'))
    body.append(P('M106,-15A16,16 0 0 1 138,-15Z', '#211b19'))
    body.append(P('M110,-66H117Q119,-66 120.5,-64L132,-48Q133,-46 131,-46H110Z', '#c6ccd0'))
    body.append(poly([(113, -66), (117.5, -66), (112.5, -46), (110, -46), (110, -60)], '#d9dee1'))
    body.append(R(4, -33.5, 146, 2.2, GOLD))
    body.append(R(104, -66, 1, 44, '#2b2320', None, ' opacity=".7"'))
    body.append(R(64, -71, 1, 49, '#2b2320', None, ' opacity=".45"'))
    body.append(R(95, -42, 5.5, 1.6, '#2b2320', .8))
    body.append(E(134.5, -50, 2.4, 3.6, '#2b2320'))
    body.append(R(146, -37, 5.6, 5.4, '#f1e3cb', 1.6))
    # Le nom de l'atelier en grand sur le flanc (demande de Quentin, 05/10/2026) : c'est l'entreprise qui vient, mesure et
    # pose ; le camion du transporteur (film « Je mesure moi-même »), lui, reste sans nom.
    body.append('<text x="55" y="-44.6" text-anchor="middle" textLength="90" lengthAdjust="spacingAndGlyphs" '
                'font-family="-apple-system,BlinkMacSystemFont,&quot;Helvetica Neue&quot;,Arial,sans-serif" '
                'font-size="13.5" font-weight="700" fill="#f1e3cb">AUBOIACIER</text>')
    body.append(R(2, -50, 3, 10, '#8c5a3c', 1))
    body.append(R(147, -22.5, 7, 6.5, '#211b19', 1.6))
    body.append(R(0, -22.5, 5, 6.5, '#211b19', 1.6))
    body.append(R(10, -77.6, 94, 1.6, STEEL, .8))
    for x in (14, 55.5, 97):
        body.append(R(x, -76.2, 3, 2.4, STEEL))
    body.append(roof_rail)

    def wheel(cx, c):
        w = [Ci(cx, -12, 12, '#1f1a18'), Ci(cx, -12, 7.2, '#8a8e94'), Ci(cx, -12, 5.6, '#767a80')]
        bolts = []
        for i in range(5):
            a = i * 2 * math.pi / 5
            bolts.append(Ci(cx + 3.3 * math.cos(a), -12 + 3.3 * math.sin(a), .95, '#5d6168'))
        w.append('<g%s>%s</g>' % (cls(sc + '-bolts'), ''.join(bolts)))
        w.append('<circle cx="%s" cy="-12" r="3.3" fill="none" stroke="#666a70" stroke-width="1.5"%s/>' % (fmt(cx), cls(sc + '-blur')))
        w.append(Ci(cx, -12, 1.5, '#a4a8ad'))
        return '<g%s>%s</g>' % (cls(c), ''.join(w))
    return ('<g%s>' % cls(sc + '-van') +
            poly([(2, 0), (152, 0), (118, 8), (-32, 8)], 'rgba(43,35,32,.09)') +
            E(77, .2, 76, 3.6, 'rgba(43,35,32,.2)') +
            '<g%s>%s</g>' % (cls(sc + '-vbody'), ''.join(body)) +
            wheel(30, sc + '-wr') + wheel(122, sc + '-wf') + '</g>')


def poplar(x, base, h, c1='#bab49b', c2='#c9c3aa'):
    return (P('M%s,%s L%s,%s L%s,%s L%s,%s Z' % (fmt(x - 2), fmt(base), fmt(x - 26), fmt(base + 5), fmt(x - 18), fmt(base + 5), fmt(x + 2), fmt(base)), 'rgba(43,35,32,.06)') +
            R(x - 1.3, base - h * .22, 2.6, h * .22, '#978c7d') +
            E(x, base - h * .58, h * .17, h * .42, c1) +
            E(x + h * .045, base - h * .62, h * .1, h * .34, c2))


def round_tree(x, base, h, c1='#b6b096', c2='#c6c0a6'):
    return (E(x - 16, base + 2, h * .5, 2.6, 'rgba(43,35,32,.07)') +
            R(x - 1.6, base - h * .34, 3.2, h * .34, '#978c7d') +
            E(x, base - h * .62, h * .4, h * .34, c1) +
            E(x + h * .08, base - h * .7, h * .27, h * .24, c2))


def lamp(x):
    return (R(x - 1.1, 238, 2.2, 62, STEEL) + R(x - 2.6, 296, 5.2, 4, '#4a4e55') +
            R(x - 4.2, 227, 8.4, 11.5, '#4a4e55', 1.2) + R(x - 2.6, 229.5, 5.2, 6.5, '#f1e3cb', .6) +
            P('M%s,227 L%s,223 L%s,227 Z' % (fmt(x - 5), fmt(x), fmt(x + 5)), '#4a4e55') +
            P('M%s,300 L%s,300 L%s,306 L%s,306 Z' % (fmt(x - 1), fmt(x + 1), fmt(x - 22), fmt(x - 26)), 'rgba(43,35,32,.06)'))


def win_ext(x, y, w, h, keystone=False):
    s = []
    s.append(R(x - 6, y - 6, w + 12, h + 6, '#e3d8c6'))
    s.append(R(x, y, w, h, PAPER))
    fr = 2.6
    lw = (w - 3 * fr) / 2
    for gx in (x + fr, x + 2 * fr + lw):
        s.append(R(gx, y + fr, lw, h - 2 * fr, '#c5cacd'))
        s.append(poly([(gx + lw * .18, y + fr), (gx + lw * .5, y + fr), (gx + lw * .05, y + h - fr), (gx, y + h - fr), (gx, y + h * .55)], '#d3d7da'))
        for k in (1, 2):
            s.append(R(gx, y + fr + (h - 2 * fr) * k / 3 - .7, lw, 1.4, PAPER))
    s.append(R(x + fr, y + fr, w - 2 * fr, 3.2, 'rgba(43,35,32,.13)'))
    s.append(R(x + w - fr - 3, y + fr, 3, h - 2 * fr, 'rgba(43,35,32,.10)'))
    s.append(R(x - 9, y + h, w + 18, 5, '#ddd2c1', .8))
    s.append(R(x - 6, y + h + 5, w + 12, 2.2, 'rgba(43,35,32,.08)'))
    if keystone:
        s.append(P('M%s,%s H%s L%s,%s H%s Z' % (fmt(x + w / 2 - 6), fmt(y - 7), fmt(x + w / 2 + 6), fmt(x + w / 2 + 4.5), fmt(y + 1), fmt(x + w / 2 - 4.5)), '#e8decd'))
    return ''.join(s)


# ---------------------------------------------------------------- monde partagé (scènes A et C)
def world(p, sc, VH, bench=None, shutter=False, house_rail='', cote='', roof_rail=''):
    o = []
    # ciel + soleil (statiques : à l'infini)
    o.append(R(0, 0, 720, VH, 'url(#%s-sky)' % p))
    o.append(Ci(578, 84, 62, '#f3e0bd', ' opacity=".5"'))
    o.append(Ci(578, 84, 29, '#ecd09e'))

    # --- plan lointain : coteaux, château de Saumur, Loire
    far = []
    for (x, y, w) in ((20, 74, 130), (250, 44, 92), (690, 66, 150), (980, 34, 104), (1290, 78, 126), (1540, 50, 96)):
        far.append(R(x, y, w, 9, '#f8f1e7', 4.5))
        far.append(R(x + w * .22, y - 6, w * .42, 9, '#f8f1e7', 4.5))
    far.append(P(smooth([(-300, 228), (-60, 216), (180, 220), (380, 205), (580, 214), (780, 225), (980, 209), (1180, 216), (1400, 226), (1640, 212), (1900, 222)], 420), '#ece2d2'))
    far.append(P(smooth([(-300, 242), (60, 236), (250, 231), (400, 219), (470, 216), (545, 219), (680, 230), (860, 240), (1040, 232), (1240, 238), (1460, 233), (1900, 240)], 420), '#e4d8c5'))
    ch = []
    ch.append(poly([(422, 223), (518, 223), (511, 214.5), (429, 214.5)], '#d8c9b1'))
    ch.append(R(447, 197, 46, 18, '#dccdb6'))
    ch.append(poly([(445, 197.5), (495, 197.5), (488, 189), (452, 189)], '#c9b79d'))
    for (tx, w, top) in ((439, 9.5, 193), (455, 8, 195.5), (477, 8, 195.5), (491.5, 9.5, 193)):
        ch.append(R(tx, top, w, 216 - top, '#e1d3bd'))
        ch.append(poly([(tx - 1.6, top), (tx + w / 2, top - 16), (tx + w + 1.6, top)], '#c4b296'))
        ch.append(R(tx + w / 2 - .45, top - 20, .9, 4.5, OAK))
    for (wx, wy) in ((458, 203), (466, 203), (474, 203), (482, 203)):
        ch.append(R(wx, wy, 2.4, 4, '#cdbda4'))
    far.append(''.join(ch))
    for (x, y, rx, ry) in ((170, 241, 17, 8), (196, 243.5, 12, 6), (300, 242, 10, 5), (620, 240, 19, 9), (652, 243.5, 12, 6), (880, 241, 15, 7.5), (1130, 240, 19, 9), (1160, 243.5, 11, 6), (1330, 242, 14, 7)):
        far.append(E(x, y, rx, ry, '#dccfb9'))
    far.append(R(-300, 246.5, 2200, 6.5, '#f4ede2'))
    for (x, w) in ((120, 60), (390, 90), (700, 50), (960, 80), (1250, 70)):
        far.append(R(x, 248.6, w, .9, '#fbf8f2', .45))
    far.append(R(-300, 253, 2200, 12, '#dfd3bf'))
    o.append('<g%s>%s</g>' % (cls(sc + '-far'), ''.join(far)))

    # --- plan moyen : le décor où roule l'utilitaire
    m = []
    m.append(R(-500, 258, 3200, 44, '#e8dfd1'))
    m.append(R(-500, 284, 3200, 18, '#e3d9c9'))
    for x in (690, 1210):
        m.append(round_tree(x, 300, 62))
    for x in (905, 1440):
        m.append(poplar(x, 300, 92))
    m.append(poplar(1955, 300, 96))
    m.append(round_tree(2040, 300, 58))
    for x in (790, 1060, 1330):
        m.append(lamp(x))

    # atelier : bâtiment à bardage acier, appentis en tuffeau, grande porte ouverte sur l'atelier éclairé
    m.append(poly([(36, 300), (432, 300), (404, 308), (8, 308)], 'rgba(43,35,32,.07)'))
    m.append(poly([(40, 300), (40, 229), (96, 215), (96, 300)], '#e7ddcd'))
    m.append(poly([(35, 230.5), (96, 214.5), (96, 219.5), (35, 235.5)], '#5d6168'))
    m.append(R(54, 246, 22, 22, '#e1d6c5'))
    m.append(R(57, 249, 16, 16, '#c6cbce'))
    m.append(poly([(57, 249), (64, 249), (57, 258)], '#d4d8db'))
    m.append(P('M90,300 V170 L250,116 L410,170 V300 Z', 'url(#%s-clad)' % p))
    m.append(P('M90,170 L250,116 L410,170 L410,178 L250,124 L90,178 Z', 'rgba(43,35,32,.16)'))
    m.append(P('M83,173 L250,111 L417,173 L417,168 L250,106 L83,168 Z', '#34373c'))
    m.append(R(400, 170, 10, 130, 'rgba(255,255,255,.035)'))
    m.append(Ci(250, 146, 7.5, '#4a4e55'))
    for k in (-3, 0, 3):
        m.append(R(244, 145.4 + k, 12, 1.2, '#3a3d42'))
    m.append('<text x="250" y="171" text-anchor="middle" class="aplat-sign">SAUMUR</text>')
    m.append(R(145, 180.5, 210, 119.5, '#34373c'))
    m.append(poly([(150, 300), (350, 300), (372, 308), (128, 308)], '#f4e9d6', ' opacity=".75"'))
    # intérieur (vu par la porte)
    it = []
    it.append(R(150, 186, 200, 114, '#efe4d3'))
    it.append(R(150, 283, 200, 17, '#e1d4c0'))
    it.append(R(158, 194, 66, 50, '#8e9196'))
    for i in range(4):
        for j in range(3):
            it.append(R(160 + i * 15.75, 196 + j * 15.6, 14.2, 14.2, '#faf3e7'))
    it.append(poly([(158, 244), (224, 244), (236, 283), (150, 283)], '#fbf3e4', ' opacity=".45"'))
    for (x, c) in ((322, '#a9acb0'), (326.5, '#94979c'), (331, '#b4b7bb'), (335.5, '#9fa2a7')):
        it.append(P('M%s,283 L%s,200 L%s,200 L%s,283 Z' % (fmt(x), fmt(x + 3), fmt(x + 5), fmt(x + 2)), c))
    for lx in (205, 295):
        it.append(poly([(lx - 6, 201), (lx + 6, 201), (lx + 30, 266), (lx - 30, 266)], '#fff7e8', ' opacity=".55"'))
        it.append(R(lx - .35, 186, .7, 11, INK))
        it.append(P('M%s,201 L%s,201 L%s,196.5 L%s,196.5 Z' % (fmt(lx - 6), fmt(lx + 6), fmt(lx + 3), fmt(lx - 3)), INK))
        it.append(E(lx, 201.3, 3.2, 1.1, '#fff3d9'))
    it.append(E(250, 283.5, 80, 3, 'rgba(43,35,32,.08)'))
    it.append(R(178, 266, 144, 4, STEEL))
    it.append(R(180, 270, 140, 4, '#4c5057'))
    it.append(R(186, 274, 4, 26, '#4c5057'))
    it.append(R(310, 274, 4, 26, '#4c5057'))
    it.append(R(190, 289, 120, 2.6, '#4c5057'))
    for x in (201, 248, 295):
        it.append(R(x, 264, 4.4, 2, '#3a3d42'))
    if bench:
        it.append(bench)
    if shutter:
        sh = R(150, 186, 200, 114, 'url(#%s-slat)' % p) + R(150, 295, 200, 5, '#4a4e55') + R(240, 291, 20, 2.2, '#3a3d42', 1)
        it.append('<g%s>%s</g>' % (cls('c-shutter'), sh))
    m.append('<g clip-path="url(#%s-door)">%s</g>' % (p, ''.join(it)))
    m.append(R(145, 180.5, 210, 6, '#34373c'))

    # maison du client : façade en tuffeau, toit d'ardoise
    hx0, hx1 = 1500, 1860
    m.append(poly([(1492, 300), (1868, 300), (1838, 308), (1462, 308)], 'rgba(43,35,32,.07)'))
    m.append(poly([(1494, 104), (1532, 50), (1828, 50), (1866, 104)], '#5a5f66'))
    for y in range(58, 104, 8):
        m.append(R(1494, y, 372, .8, 'rgba(255,255,255,.06)'))
    m.append(R(1529, 47.5, 302, 4.5, '#4b4f55', 1))
    m.append(R(1786, 28, 16, 24, '#e6dccb'))
    m.append(R(1783, 25.5, 22, 4, '#d6cbb9', 1))
    m.append(R(1666, 68, 28, 27, '#efe6d8'))
    m.append(poly([(1661, 69), (1680, 57), (1699, 69)], '#4b4f55'))
    m.append(R(1671, 73, 18, 22, '#c5cacd'))
    m.append(R(1671, 73, 18, 3, 'rgba(43,35,32,.14)'))
    m.append(R(hx0, 104, hx1 - hx0, 196, '#efe6d8'))
    for y in range(122, 286, 15):
        m.append(R(hx0, y, hx1 - hx0, .8, '#e4d9c8'))
    for k, y in enumerate(range(108, 286, 15)):
        wq = 16 if k % 2 == 0 else 11
        m.append(R(hx0, y, wq, 14.2, '#e7dccb'))
        m.append(R(hx1 - wq, y, wq, 14.2, '#e7dccb'))
    m.append(R(1494, 100, 372, 8, '#e4d9c8'))
    m.append(R(hx0, 108, hx1 - hx0, 4, 'rgba(43,35,32,.06)'))
    m.append(R(1496, 222, 368, 4.5, '#e6dccb'))
    m.append(R(hx0, 226.5, hx1 - hx0, 2.5, 'rgba(43,35,32,.05)'))
    m.append(R(1496, 286, 368, 14, '#e2d7c6'))
    m.append(win_ext(1540, 136, 48, 78))
    m.append(win_ext(1772, 136, 48, 78))
    m.append(win_ext(1632, 130, 96, 84, keystone=True))
    m.append(R(1566, 236, 52, 64, '#e3d8c6'))
    m.append(R(1572, 242, 40, 58, '#b98f5c'))
    m.append(R(1576, 247, 14.5, 22, '#ad8452', 1))
    m.append(R(1593.5, 247, 14.5, 22, '#ad8452', 1))
    m.append(R(1576, 274, 14.5, 22, '#ad8452', 1))
    m.append(R(1593.5, 274, 14.5, 22, '#ad8452', 1))
    m.append(Ci(1606, 272, 1.3, INK))
    m.append(R(1572, 242, 40, 3, 'rgba(43,35,32,.15)'))
    m.append(win_ext(1660, 244, 40, 36))
    m.append(win_ext(1760, 244, 40, 36))
    m.append(R(1622.5, 250, 4, 7, INK, 1))
    m.append(round_tree(1872, 300, 30, '#b2ac92', '#c2bca2'))

    # trottoir, route
    m.append(R(-500, 300, 3200, 8, '#ede5d8'))
    m.append(R(-500, 307.2, 3200, 1.8, '#d5cabb'))
    m.append(R(-500, 309, 3200, 43, '#c7bdaf'))
    m.append(R(-500, 309, 3200, 3, 'rgba(43,35,32,.06)'))
    for x in range(-480, 2700, 44):
        m.append(R(x, 329.5, 22, 2.4, '#e4dbcd', 1))
    m.append(R(-500, 350, 3200, 3, '#b9ae9f'))
    m.append(R(-500, 353, 3200, 400, '#ddd2c1'))
    m.append(cote)
    m.append(van(sc, roof_rail))
    m.append(house_rail)
    o.append('<g%s>%s</g>' % (cls(sc + '-mid'), ''.join(m)))

    # --- premier plan (défile plus vite : profondeur)
    n = []
    for i, x in enumerate(range(-40, 3200, 330)):
        w = (170, 120, 210, 140)[i % 4]
        top = (362, 366, 360, 365)[i % 4]
        n.append(R(x, top + 4, w, 80, '#c3bda3', 10))
        k = 0
        for cx in range(int(x + 9), int(x + w - 6), 12):
            n.append(Ci(cx, top + 6 + (1.5 if k % 2 else 0), 8, '#c3bda3'))
            n.append(Ci(cx + 1.5, top + 3.5 + (1.5 if k % 2 else 0), 4.2, '#cdc7ad'))
            k += 1
        n.append(R(x, top + 10, 9, 72, '#b8b298', 4.5))
    o.append('<g%s>%s</g>' % (cls(sc + '-near'), ''.join(n)))
    return ''.join(o)


def world_defs(p):
    return ('<linearGradient id="%s-sky" x1="0" y1="0" x2="0" y2="1">'
            '<stop offset="0" stop-color="#efe3d1"/><stop offset=".62" stop-color="#f5ecdf"/><stop offset="1" stop-color="#f8f1e6"/></linearGradient>'
            '<pattern id="%s-clad" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="#585c63"/><rect width="1.1" height="9" fill="#4d5158"/></pattern>'
            '<pattern id="%s-slat" width="10" height="5.5" patternUnits="userSpaceOnUse"><rect width="10" height="5.5" fill="#6b6f76"/><rect y="4.6" width="10" height=".9" fill="#575b62"/></pattern>'
            '<clipPath id="%s-door"><rect x="150" y="186" width="200" height="114"/></clipPath>'
            '<clipPath id="%s-hr"><rect x="-2" y="0" width="100" height="4.6" rx="1.6"/></clipPath>'
            '<linearGradient id="%s-sheen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff6e2" stop-opacity="0"/>'
            '<stop offset=".5" stop-color="#fff6e2" stop-opacity=".9"/><stop offset="1" stop-color="#fff6e2" stop-opacity="0"/></linearGradient>'
            ) % (p, p, p, p, p, p)


# ---------------------------------------------------------------- caméra et utilitaire (échantillonnés)
def cam_tracks(sc, dur, VH, camfn, cuts):
    def mk(kx, ky, ks):
        def f(t):
            cx, cy, s = camfn(t)
            lcx = 360 + (cx - 360) * kx
            lcy = 200 + (cy - 200) * ky
            ls = 1 + (s - 1) * ks
            return 'transform:translate(%spx,%spx) scale(%s)' % (fmt(360 - ls * lcx), fmt(VH / 2 - ls * lcy), f4(ls))
        return f
    track(sc + '-far', dur, mk(.45, .25, .25), cuts)
    track(sc + '-mid', dur, mk(1, 1, 1), cuts)
    track(sc + '-near', dur, mk(1.3, 1, 1), cuts)


def van_tracks(sc, dur, xfn, angfn, dyfn, cuts):
    track(sc + '-van', dur, lambda t: 'transform:translate(%spx,346px)' % fmt(xfn(t)), cuts)
    track(sc + '-vbody', dur, lambda t: 'transform:translate(0px,%spx) translate(76px,-14px) rotate(%sdeg) translate(-76px,14px)' % (fmt(dyfn(t)), fmt(angfn(t))), cuts)

    def wheel(cx):
        return lambda t: 'transform:translate(%spx,-12px) rotate(%sdeg) translate(%spx,12px)' % (cx, fmt((xfn(t) - 470) / 12 * 57.2958, 1), -cx)
    track(sc + '-wr', dur, wheel(30), cuts)
    track(sc + '-wf', dur, wheel(122), cuts)

    def speed(t):
        v = 0.0
        for a, b in ((t - .02, t), (t, t + .02)):
            if 0 <= a and b <= dur:
                dv = abs(xfn(b) - xfn(a)) / .02
                if dv < 5000:  # ignore les téléportations hors champ
                    v = max(v, dv)
        return v

    def blur_k(t):
        return min(1.0, max(0.0, (speed(t) - 140) / 260))
    track(sc + '-bolts', dur, lambda t: 'opacity:%s' % fmt(1 - blur_k(t)), cuts)
    track(sc + '-blur', dur, lambda t: 'opacity:%s' % fmt(.55 * blur_k(t)), cuts)


def find_teleport(camfn, VH, t0, t1, vx_a=(470, 622), vx_b=(1560, 1712)):
    best = None
    t = t0
    while t <= t1:
        cx, cy, s = camfn(t)
        hw = 360 / s
        lo, hi = cx - hw, cx + hw
        margin = min(lo - vx_a[1], vx_b[0] - hi)
        if best is None or margin > best[0]:
            best = (margin, round(t, 3))
        t += 0.01
    return best


# ---------------------------------------------------------------- cotes (monde)
def cote_world(sc, dur, t_ext, t_half, t_chip, t_check, t_out):
    t_reset = t_out + .4
    anim(sc + '-cote', dur, [(0, 'opacity:1'), (t_out, 'opacity:1', E_SOFT), (t_out + .25, 'opacity:0'), (t_reset + .02, 'opacity:0'), (t_reset + .021, 'opacity:1')])
    anim(sc + '-cext', dur, [(0, 'opacity:0'), (t_ext, 'opacity:0', E_SOFT), (t_ext + .25, 'opacity:.5'), (t_reset, 'opacity:.5'), (t_reset + .001, 'opacity:0')])
    anim(sc + '-chalf', dur, [(0, 'stroke-dashoffset:1px'), (t_half, 'stroke-dashoffset:1px', E_OUTQ), (t_half + .42, 'stroke-dashoffset:0px'), (t_reset, 'stroke-dashoffset:0px'), (t_reset + .001, 'stroke-dashoffset:1px')])
    anim(sc + '-ctick', dur, [(0, 'opacity:0'), (t_half + .3, 'opacity:0', E_SOFT), (t_half + .42, 'opacity:1'), (t_reset, 'opacity:1'), (t_reset + .001, 'opacity:0')])
    anim(sc + '-cchip', dur, [(0, 'opacity:0;transform:scale(.6)'), (t_chip, 'opacity:0;transform:scale(.6)', E_POP), (t_chip + .34, 'opacity:1;transform:scale(1)'), (t_reset, 'opacity:1;transform:scale(1)'), (t_reset + .001, 'opacity:0;transform:scale(.6)')])
    anim(sc + '-ccheck', dur, [(0, 'opacity:0;transform:scale(0)'), (t_check, 'opacity:0;transform:scale(0)', E_POP), (t_check + .36, 'opacity:1;transform:scale(1)'), (t_reset, 'opacity:1;transform:scale(1)'), (t_reset + .001, 'opacity:0;transform:scale(0)')])
    anim(sc + '-ccheckp', dur, [(0, 'stroke-dashoffset:1px'), (t_check + .14, 'stroke-dashoffset:1px', E_OUTQ), (t_check + .4, 'stroke-dashoffset:0px'), (t_reset, 'stroke-dashoffset:0px'), (t_reset + .001, 'stroke-dashoffset:1px')])
    y = 117
    g = []
    g.append('<g%s>' % cls(sc + '-cote'))
    g.append('<g%s>%s%s</g>' % (cls(sc + '-cext'), R(1631.4, 112, 1.2, 17, INK), R(1727.4, 112, 1.2, 17, INK)))
    for x2 in (1632, 1728):
        g.append('<path%s d="M1680,%s H%s" pathLength="1" stroke="%s" stroke-width="1.15" fill="none" stroke-dasharray="1 1"/>' % (cls(sc + '-chalf'), y, x2, INK))
    for x in (1632, 1728):
        g.append('<path%s d="M%s,%s L%s,%s" stroke="%s" stroke-width="1.5" fill="none"/>' % (cls(sc + '-ctick'), fmt(x - 3.4), y + 3.4, fmt(x + 3.4), y - 3.4, INK))
    g.append('<g transform="translate(1680,%s)"><g class="aplat-zk"><g%s>%s<text y="3.8" text-anchor="middle" class="aplat-chiptx" font-size="10.6">1&#8239;000 mm</text></g></g></g>' % (y, cls(sc + '-cchip'), R(-29.5, -8.6, 59, 17.2, INK, 8.6)))
    g.append('<g transform="translate(1746,%s)"><g class="aplat-zk"><g%s>%s<path%s d="M-3.4,.2 L-1,2.6 L3.6,-2.6" pathLength="1" stroke="%s" stroke-width="1.7" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 1"/></g></g></g>'
             % (y, cls(sc + '-ccheck'), Ci(0, 0, 7.6, GREEN), cls(sc + '-ccheckp'), PAPER))
    g.append('</g>')
    return ''.join(g)


# ---------------------------------------------------------------- chiffres qui défilent
def roll_number(p, sc, dur, chars, baseline, size, fill, t0, t_reset, clip_box, font_cls='aplat-price', spin=(7, 3), col_dur=(.55, .11)):
    """chars : liste de (caractère, x centre). Les chiffres défilent dans une fenêtre (clip), les autres apparaissent."""
    lh = size * 1.18
    out = ['<clipPath id="%s-%s-clip"><rect x="%s" y="%s" width="%s" height="%s"/></clipPath>' % (p, sc, fmt(clip_box[0]), fmt(clip_box[1]), fmt(clip_box[2]), fmt(clip_box[3]))]
    out.append('<g clip-path="url(#%s-%s-clip)">' % (p, sc))
    j = 0
    for (ch, x) in chars:
        if ch.isdigit():
            d = int(ch)
            n = spin[0] + spin[1] * j
            texts = []
            for k in range(1, n + 1):
                texts.append('<text x="%s" y="%s" text-anchor="middle">%d</text>' % (fmt(x), fmt(baseline + k * lh), (d - n + k) % 10))
            c = '%s-rl%d' % (sc, j)
            td = t0 + j * .05
            te = td + col_dur[0] + col_dur[1] * j
            anim(c, dur, [(0, 'transform:translateY(0px)'), (td, 'transform:translateY(0px)', E_ROLL), (te, 'transform:translateY(%spx)' % fmt(-n * lh)),
                          (t_reset, 'transform:translateY(%spx)' % fmt(-n * lh)), (t_reset + .001, 'transform:translateY(0px)')])
            out.append('<g class="aplat-%s %s" fill="%s" font-size="%s">%s</g>' % (c, font_cls, fill, fmt(size), ''.join(texts)))
            j += 1
        elif ch.strip():
            c = '%s-rlx' % sc
            out.append('<text x="%s" y="%s" text-anchor="middle" class="aplat-%s %s" fill="%s" font-size="%s">%s</text>' % (fmt(x), fmt(baseline), c, font_cls, fill, fmt(size * .86), ch))
    anim('%s-rlx' % sc, dur, [(0, 'opacity:0;transform:translateY(6px)'), (t0 + .2, 'opacity:0;transform:translateY(6px)', E_OUT), (t0 + .6, 'opacity:1;transform:translateY(0px)'),
                              (t_reset, 'opacity:1;transform:translateY(0px)'), (t_reset + .001, 'opacity:0;transform:translateY(6px)')])
    out.append('</g>')
    return ''.join(out)


# ---------------------------------------------------------------- devis (le même dans les scènes B et C)
QW, QH = 236, 292   # carte de devis, origine en haut à gauche


def quote_card(p, sc, dur, t_roll, t_reset, spin=(7, 3), col_dur=(.55, .11)):
    """Carte « DEVIS » : titre, petit dessin du garde-corps et sa largeur, lignes grises, filet, Total + montant souligné d'or.
    Classes animées préfixées par sc (quote_anims) ; le montant défile via roll_number. Le filtre #<p>-blur doit exister."""
    s = []
    s.append(R(10, 18, 220, 282, 'rgba(43,35,32,.20)', 14, ' filter="url(#%s-blur)"' % p))
    s.append(R(0, 0, QW, QH, PAPER, 12))
    s.append('<text x="20" y="30" class="aplat-dlabel">DEVIS</text>')
    s.append('<text x="20" y="54" class="aplat-dtitle">Garde-corps sur mesure</text>')
    s.append(R(20, 66, 196, 1, '#e6ddd0'))
    s.append('<g%s>' % cls(sc + '-dthumb'))
    s.append(R(20, 78, 196, 70, '#f3ede4', 8))
    s.append('<g transform="translate(43,92) scale(1.57)">%s</g>' % railing_static(p))
    s.append('<text x="118" y="164" text-anchor="middle" class="aplat-dsmall aplat-dsize">1&#8239;000 mm</text>')
    s.append('</g>')
    for i, (w, w2) in enumerate(((132, 30), (104, 24), (118, 28))):
        y = 180 + i * 13
        s.append('<g transform="translate(20,%s)"><g%s>%s</g></g>' % (y, cls(sc + '-dl%d' % i), R(0, 0, w, 5, '#e9e1d5', 2.5)))
        s.append('<g transform="translate(%s,%s)"><g%s>%s</g></g>' % (216 - w2, y, cls(sc + '-dl%d' % i), R(0, 0, w2, 5, '#ddd2c3', 2.5)))
    s.append(R(20, 226, 196, 1, '#e6ddd0'))
    s.append('<text x="20" y="262" class="aplat-dsmall">Total</text>')
    s.append(roll_number(p, sc, dur, [('3', 144), ('2', 160.5), ('0', 177), (' ', 0), ('€', 202)], 263, 31, INK, t_roll, t_reset, (110, 232, 110, 40),
                         spin=spin, col_dur=col_dur))
    s.append('<g transform="translate(134,272)"><g%s>%s</g></g>' % (cls(sc + '-dline'), R(0, 0, 82, 1.6, GOLD, .8)))
    return ''.join(s)


def quote_motion(sc, dur, ti, to):
    """Entrée du devis : il glisse depuis la droite en pivotant légèrement, dépasse un peu puis se pose ; sortie vers la droite."""
    t_gone = round(to + .4, 5)

    def f(t):
        if t >= t_gone or t < ti:
            return 'opacity:0;transform:translate(300px,14px) rotate(5deg)'
        x = 300 + tw(t, ti, ti + .55, -306, E_OUT) + tw(t, ti + .55, ti + .85, 6, E_SOFT) + tw(t, to, to + .34, 340, E_IN)
        y = 14 + tw(t, ti, ti + .6, -14, E_OUT)
        a = 5 + tw(t, ti, ti + .55, -6.4, E_OUT) + tw(t, ti + .55, ti + .9, 1.4, E_SOFT) + tw(t, to, to + .34, 4, E_IN)
        op = tw(t, ti, ti + .2, 1, E_SOFT) - tw(t, to + .3, to + .36, 1, E_SOFT)
        return 'opacity:%s;transform:translate(%spx,%spx) rotate(%sdeg)' % (fmt(op), fmt(x), fmt(y), fmt(a))
    track(sc + '-devis', dur, f, cuts=[ti, t_gone])


# rythme du devis, compté depuis son entrée : identique dans la carte B et dans le film C (même affichage du prix)
Q_THUMB, Q_LINES, Q_ROLL, Q_ULINE = .35, .53, .9, 1.65


def quote_sequence(sc, dur, ti, to, t_reset):
    """Entrée + remplissage du devis avec le rythme commun ; renvoie l'instant où le montant commence à défiler."""
    quote_motion(sc, dur, ti, to)
    quote_anims(sc, dur, ti + Q_THUMB, ti + Q_LINES, ti + Q_ULINE, t_reset)
    return ti + Q_ROLL


def quote_anims(sc, dur, t_thumb, t_lines, t_uline, t_reset):
    """Le contenu du devis se remplit : dessin, lignes grises (en cascade), soulignement doré du montant."""
    anim(sc + '-dthumb', dur, [(0, 'opacity:0;transform:translateY(8px)'), (t_thumb, 'opacity:0;transform:translateY(8px)', E_OUT), (t_thumb + .4, 'opacity:1;transform:translateY(0px)'),
                               (t_reset, 'opacity:1;transform:translateY(0px)'), (t_reset + .001, 'opacity:0;transform:translateY(8px)')])
    for i in range(3):
        t0 = t_lines + .1 * i
        anim(sc + '-dl%d' % i, dur, [(0, 'transform:scaleX(0)'), (t0, 'transform:scaleX(0)', E_OUTQ), (t0 + .4, 'transform:scaleX(1)'), (t_reset, 'transform:scaleX(1)'), (t_reset + .001, 'transform:scaleX(0)')])
    anim(sc + '-dline', dur, [(0, 'transform:scaleX(0)'), (t_uline, 'transform:scaleX(0)', E_SOFT), (t_uline + .4, 'transform:scaleX(1)'), (t_reset, 'transform:scaleX(1)'), (t_reset + .001, 'transform:scaleX(0)')])


# ================================================================ SCÈNE A — L'atelier vient mesurer (carte, 9 s)
DA = 9.0
VHA = 334


def pvanA(t):
    return tw(t, .62, 2.82, 1.0, E_VAN)


def camA(t):
    # la caméra suit l'utilitaire (léger retard), puis panoramique rapide vers l'atelier et petit dépassement
    cx = 330 + 1350 * pvanA(t - .1) + tw(t, 7.3, 8.45, -1362, E_WHIP) + tw(t, 8.38, 8.98, 12, E_INOUT)
    cy = 200 + tw(t, 2.7, 3.7, -51.5) + tw(t, 7.25, 8.2, 51.5)
    s = 1 + tw(t, 2.7, 3.7, 1.0, E_DOLLY) + tw(t, 7.22, 8.15, -1.0)
    return cx, cy, s


TPA = find_teleport(camA, VHA, 7.3, 8.45)
print('teleport A', TPA)


def vanxA(t):
    return 470 + 1090 * pvanA(t) - step(t, TPA[1], 1090)


def build_A_anims():
    cuts = [TPA[1]]
    cam_tracks('a', DA, VHA, camA, cuts)
    van_tracks('a', DA, vanxA, lambda t: kick(t, .6, -3.0) + kick(t, 2.64, 3.6), lambda t: bounce(t, .8, 2.62), cuts)


def scene_A(p):
    cote = cote_world('a', DA, 3.5, 3.55, 3.85, 4.3, 7.12)
    return ('<svg class="aplat-svg" viewBox="0 0 720 %d" role="img" aria-label="L\'utilitaire de l\'atelier part de Saumur, arrive devant la maison et la fenêtre est cotée.">'
            '<defs>%s</defs>%s</svg>') % (VHA, world_defs(p), world(p, 'a', VHA, cote=cote))


# ================================================================ SCÈNE C — le film du parcours (16 s)
DC = 16.0
VHC = 400
T2, T3, T4 = 3.5, 6.4, 10.1
V4A, V4B = 10.45, 11.78   # trajet de livraison (chapitre 4)
HO = 12.15                # passage du garde-corps du toit de l'utilitaire à la fenêtre
LAND = HO + .84           # le garde-corps est posé
WH = 15.05                # fin de l'image finale : panoramique rapide de retour vers l'atelier (boucle)


def pv1(t):
    return tw(t, .3, 1.95, 1.0, E_VAN)


def pv4(t):
    return tw(t, V4A, V4B, 1.0, E_VAN)


def camC_raw(t):
    # gros plans sur la façade : le bord bas du cadre tombe sur le bandeau entre les étages (ni toit d'utilitaire ni bouts de porte coupés)
    cx = (360 + 1320 * pv1(t - .08) + tw(t, 3.5, 4.3, 85, E_SOFT)
          + tw(t, 6.32, 6.52, 16, E_SOFT) + tw(t, 6.48, 7.45, -1531, E_WHIP)
          + tw(t, 10.1, 10.7, 70, E_SOFT) + 1360 * pv4(t - .08)
          + tw(t, WH + .05, WH + .83, -1328, E_WHIP) + tw(t, WH + .75, DC, 8, E_INOUT))
    cy = (200 + tw(t, 1.85, 2.6, -82) + tw(t, 6.48, 7.25, 82) + tw(t, 7.2, 8.05, 43)
          + tw(t, 10.1, 10.65, -43) + tw(t, HO + .25, HO + 1.1, -53) + tw(t, WH, WH + .75, 53))
    s = (1 + tw(t, 1.85, 2.6, .75, E_DOLLY) + tw(t, 3.5, 4.3, -.05, E_SOFT) + tw(t, 6.45, 7.2, -.6)
         + tw(t, 7.15, 8.05, 2.65, Ease(.6, 0, .2, 1)) + tw(t, 10.1, 10.7, -2.75, Ease(.55, 0, .3, 1))
         + tw(t, HO + .25, HO + 1.1, 1.32, E_DOLLY) + tw(t, LAND - .2, WH, .08, Ease(.3, 0, .7, 1))
         + tw(t, WH - .02, WH + .73, -1.4))
    return cx, cy, s


camC = camC_raw
TPC = find_teleport(camC_raw, VHC, 6.5, 7.45)
TPC2 = find_teleport(camC_raw, VHC, WH + .05, DC - .05)
print('teleport C', TPC, TPC2)


def vanxC(t):
    return 470 + 1090 * pv1(t) - step(t, TPC[1], 1090) + 1090 * pv4(t) - step(t, TPC2[1], 1090)


def bench_parts():
    """Garde-corps assemblé sur l'établi (chapitre 3) : barres qui glissent et se verrouillent, soudures, croix, rosaces, main courante."""
    D = DC
    HID = WH  # caché derrière le rideau métallique (fermé jusqu'au panoramique de retour), on remet tout en place
    parts = []

    def slide(c, t0, d0x, d0y, dt=.3, e=E_LOCK):
        anim(c, D, [(0, 'transform:translate(%spx,%spx)' % (d0x, d0y)), (t0, 'transform:translate(%spx,%spx)' % (d0x, d0y), e),
                    (t0 + dt, 'transform:translate(0px,0px)'), (HID, 'transform:translate(0px,0px)'), (HID + .001, 'transform:translate(%spx,%spx)' % (d0x, d0y))])

    slide('c-bbot', 7.95, -200, 0)
    slide('c-btop', 8.05, 200, 0)
    parts.append('<g%s>%s</g>' % (cls('c-bbot'), R(0, 34.8, 96, 2.2, INK)))
    parts.append('<g%s>%s</g>' % (cls('c-btop'), R(0, 4.6, 96, 2.2, INK)))
    for i, x in enumerate((0, 46.9, 93.8)):
        c = 'c-bp%d' % i
        t0 = 8.28 + .07 * i
        anim(c, D, [(0, 'transform:translateY(-95px)'), (t0, 'transform:translateY(-95px)', E_INQ), (t0 + .17, 'transform:translateY(1.6px)', E_OUT),
                    (t0 + .3, 'transform:translateY(0px)'), (HID, 'transform:translateY(0px)'), (HID + .001, 'transform:translateY(-95px)')])
        parts.append('<g%s>%s</g>' % (cls(c), R(x, 4.6, 2.2, 32.4, INK)))
    for pi, cx in enumerate(PANELS):
        for sgi, sg in enumerate((1, -1)):
            c = 'c-bd%d%d' % (pi, sgi)
            t0 = 8.86 + .06 * pi
            a = sg * DIAG_A
            anim(c, D, [(0, 'opacity:0;transform:rotate(0deg) scaleX(.82)'), (t0, 'opacity:0;transform:rotate(0deg) scaleX(.82)', E_SOFT),
                        (t0 + .06, 'opacity:1;transform:rotate(%sdeg) scaleX(.83)' % fmt(a * .04), Ease(.3, 1.3, .55, 1)),
                        (t0 + .38, 'opacity:1;transform:rotate(%sdeg) scaleX(1)' % fmt(a)), (HID, 'opacity:1;transform:rotate(%sdeg) scaleX(1)' % fmt(a)),
                        (HID + .001, 'opacity:0;transform:rotate(0deg) scaleX(.82)')])
            parts.append('<g transform="translate(%s,20.8)"><g%s>%s</g></g>' % (fmt(cx), cls(c), R(-DIAG_L / 2, -.8, DIAG_L, 1.6, INK)))
    for pi, cx in enumerate(PANELS):
        c = 'c-br%d' % pi
        t0 = 9.26 + .07 * pi
        anim(c, D, [(0, 'transform:scale(0) rotate(-120deg)'), (t0, 'transform:scale(0) rotate(-120deg)', E_POP), (t0 + .36, 'transform:scale(1) rotate(0deg)'),
                    (HID, 'transform:scale(1) rotate(0deg)'), (HID + .001, 'transform:scale(0) rotate(-120deg)')])
        parts.append('<g transform="translate(%s,20.8)"><g%s>%s</g></g>' % (fmt(cx), cls(c), rosette()))
    anim('c-bhr', D, [(0, 'transform:translateY(-70px)'), (9.55, 'transform:translateY(-70px)', E_INQ), (9.76, 'transform:translateY(1.4px)', E_OUT),
                      (9.92, 'transform:translateY(0px)'), (HID, 'transform:translateY(0px)'), (HID + .001, 'transform:translateY(-70px)')])
    parts.append('<g%s>%s%s%s</g>' % (cls('c-bhr'), R(-2, 0, 100, 4.6, OAK, 1.6), R(-1, .45, 98, 1.25, OAK2, .6), R(0, 4.6, 96, .7, 'rgba(43,35,32,.35)')))

    # soudures : éclair, gerbe d'étincelles (particules à durée de vie courte), point de soudure qui refroidit
    rnd = random.Random(11)
    joints = [((1.1, 5.7), 8.6), ((1.1, 35.9), 8.66), ((48, 5.7), 8.72), ((48, 35.9), 8.78), ((94.9, 5.7), 8.84), ((94.9, 35.9), 8.9),
              ((PANELS[0], 20.8), 9.2), ((PANELS[1], 20.8), 9.26)]
    for ji, ((jx, jy), tb) in enumerate(joints):
        c = 'c-sw%d' % ji
        anim(c, D, [(0, 'opacity:0'), (tb, 'opacity:0'), (tb + .001, 'opacity:1', E_SOFT), (tb + .9, 'opacity:0')])
        parts.append(Ci(jx, jy, 1.25, '#f0b45e', cls(c)))
        c = 'c-sf%d' % ji
        anim(c, D, [(0, 'opacity:0;transform:scale(.3)'), (tb, 'opacity:0;transform:scale(.3)'), (tb + .001, 'opacity:1;transform:scale(.5)', E_OUT),
                    (tb + .07, 'opacity:1;transform:scale(1.1)', E_SOFT), (tb + .22, 'opacity:0;transform:scale(1.3)'), (tb + .221, 'opacity:0;transform:scale(.3)')])
        parts.append('<g transform="translate(%s,%s)"><g%s>%s%s%s</g></g>' % (fmt(jx), fmt(jy), cls(c), Ci(0, 0, 10, '#ffe7b8', ' opacity=".2"'), Ci(0, 0, 4.8, '#f6d28f', ' opacity=".45"'), Ci(0, 0, 2.1, '#fff6e3')))
        for k in range(8):
            ang = math.radians(rnd.uniform(-170, -10) if k < 6 else rnd.uniform(-200, 20))
            dist = rnd.uniform(8, 17)
            mx, my = math.cos(ang) * dist * .62, math.sin(ang) * dist * .62
            ex, ey = math.cos(ang) * dist, math.sin(ang) * dist + rnd.uniform(5, 9)
            life = rnd.uniform(.26, .4)
            t1 = tb + rnd.uniform(0, .05)
            c = 'c-sp%d_%d' % (ji, k)
            anim(c, D, [(0, 'opacity:0;transform:translate(0px,0px)'), (t1, 'opacity:0;transform:translate(0px,0px)'),
                        (t1 + .001, 'opacity:1;transform:translate(0px,0px)', E_OUT),
                        (t1 + life * .42, 'opacity:1;transform:translate(%spx,%spx)' % (fmt(mx), fmt(my)), E_INQ),
                        (t1 + life, 'opacity:0;transform:translate(%spx,%spx)' % (fmt(ex), fmt(ey))),
                        (t1 + life + .001, 'opacity:0;transform:translate(0px,0px)')])
            ln = rnd.uniform(2.8, 4.4)
            parts.append('<g transform="translate(%s,%s)"><g%s><rect x="%s" y="-.42" width="%s" height=".84" rx=".42" fill="%s" transform="rotate(%s)"/></g></g>' % (
                fmt(jx), fmt(jy), cls(c), fmt(-ln), fmt(ln), rnd.choice(('#fff1cf', '#f8d48f', '#ffffff', '#f2bb6a')), fmt(math.degrees(math.atan2(ey, ex)))))
    return '<g transform="translate(202,227)">%s</g>' % ''.join(parts)


def build_C_anims(p_unused=None):
    cuts = [TPC[1], TPC2[1]]
    cam_tracks('c', DC, VHC, camC, cuts)

    def ang(t):
        return kick(t, .28, -3.0) + kick(t, 1.82, 3.6) + kick(t, V4A - .04, -3.0) + kick(t, V4B - .13, 3.6)

    def dy(t):
        return bounce(t, .48, 1.75) + bounce(t, V4A + .18, V4B - .2)
    van_tracks('c', DC, vanxC, ang, dy, cuts)
    # garde-corps sur le toit de l'utilitaire, puis posé dans la fenêtre
    anim('c-roofrail', DC, [(0, 'opacity:0'), (10.14, 'opacity:0'), (10.141, 'opacity:1'), (HO, 'opacity:1'), (HO + .001, 'opacity:0')])

    def hrail(t):
        if t >= TPC2[1] or t < HO:
            return 'opacity:0;transform:translate(1570px,231.5px) rotate(0deg)'
        x = 1570 + tw(t, HO, HO + .62, 62, E_SOFT)
        y = 231.5 + tw(t, HO, HO + .36, -97, E_OUT) + tw(t, HO + .36, HO + .62, 45, E_INQ) + tw(t, HO + .62, HO + .84, -2.5, E_OUT)
        a = tw(t, HO, HO + .3, -2.6, E_SOFT) + tw(t, HO + .3, HO + .6, 2.6, E_SOFT)
        return 'opacity:1;transform:translate(%spx,%spx) rotate(%sdeg)' % (fmt(x), fmt(y), fmt(a))
    track('c-hrail', DC, hrail, cuts=[HO, TPC2[1]])
    anim('c-sheen', DC, [(0, 'transform:translateX(0px)'), (LAND + .01, 'transform:translateX(0px)', E_SOFT), (LAND + .56, 'transform:translateX(124px)'), (LAND + .561, 'transform:translateX(0px)')])
    # le rideau se rouvre pendant le panoramique de retour, quand l'atelier est hors champ
    anim('c-shutter', DC, [(0, 'transform:translateY(-118px)'), (10.12, 'transform:translateY(-118px)', E_INQ), (10.42, 'transform:translateY(0px)', E_OUT),
                           (10.5, 'transform:translateY(-2.2px)', E_SOFT), (10.6, 'transform:translateY(0px)'), (TPC2[1], 'transform:translateY(0px)'), (TPC2[1] + .001, 'transform:translateY(-118px)')])

    # devis (chapitre 2)
    quote_sequence('c', DC, C_QIN, C_QOUT, C_QRST)


C_QIN, C_QOUT, C_QRST = 3.65, 6.2, 7.0   # devis du film : entrée, sortie, remise à zéro


def devis_svg(p):
    return ('<g%s><g transform="translate(452,54)"><g class="aplat-dz">%s</g></g></g>'
            % (cls('c-devis'), quote_card(p, 'c', DC, C_QIN + Q_ROLL, C_QRST)))


def scene_C(p):
    cote = cote_world('c', DC, 2.3, 2.35, 2.6, 2.85, 6.33)
    roof = '<g%s transform="translate(10,-114.5)">%s%s%s</g>' % (cls('c-roofrail'), railing_static(p), R(26, 2, 2, 35, '#7a5a38', .6), R(70, 2, 2, 35, '#7a5a38', .6))
    hrail = '<g%s><g class="aplat-railshadow" transform="translate(-3.2,3.6)">%s</g>%s</g>' % (cls('c-hrail'), railing_static(p), railing_static(p, sheen=True))
    w = world(p, 'c', VHC, bench=bench_parts(), shutter=True, house_rail=hrail, cote=cote, roof_rail=roof)
    return ('<svg class="aplat-svg" viewBox="0 0 720 %d" role="img" aria-label="Film : l\'atelier vient prendre les cotes, envoie le prix exact, fabrique le garde-corps à Saumur puis le pose.">'
            '<defs>%s<filter id="%s-blur" x="-30%%" y="-30%%" width="160%%" height="160%%"><feGaussianBlur stdDeviation="9"/></filter></defs>%s%s</svg>') % (
        VHC, world_defs(p), p, w, devis_svg(p))




# ================================================================ SCÈNE B — Je mesure moi-même (carte, 8 s)
DB = 8.0
VHB = 334
# fenêtre vue de l'intérieur, en proportion avec les cotes : 1 000 mm de large (180), allège 650 mm (117)
OX0, OX1, OY0, OY1, FLOOR = 186, 366, 73, 193, 310
CXW = (OX0 + OX1) / 2            # axe de la fenêtre
SILL_T = 11                      # épaisseur de la tablette
CW, CH = 46, 44                  # boîtier du mètre ruban
BDY = 16.5                       # sortie de la lame sous le centre du boîtier
BT = 9.6                         # largeur de la lame
CASE1 = (OX0 + CW / 2 + 2, OY1 - CH / 2)        # sur la tablette, contre le tableau gauche
L2X = OX0 + 36                                  # verticale de la cote ②
CASE2 = (L2X - BDY, FLOOR - CW / 2)             # au sol, tourné d'un quart de tour (lame vers le haut)
Y1 = 60                                         # ligne de la cote ① (étiquette posée au-dessus, la ligne reste lisible)
YM2 = 234                                       # étiquette de la cote ②
# caméra : pendant la mesure, léger plan rapproché centré sur la fenêtre ; à l'arrivée du devis, recul + travelling latéral
ZOOM = 1.05
CAM0 = 'transform:translate(%spx,%spx) scale(%s)' % (fmt(360 - ZOOM * CXW), fmt(-3.5), fmt(ZOOM))
CAM1 = 'transform:translate(0px,0px) scale(1)'
QX, QY = 446, 28                                # devis, position finale (son bas passe devant le sol : il flotte devant la pièce)
T_PAN, T_PAN_END = 3.98, 4.85                   # la caméra se décale pendant que le devis entre
T_QIN, T_QOUT = 4.0, 7.35                       # entrée / sortie du devis
T_ROLL = T_QIN + Q_ROLL                         # le montant défile comme dans le film (même rythme depuis l'entrée)
B_OUT, B_RST = 7.35, 7.75                       # effacement des cotes, remise à zéro
T_BACK = 7.45                                   # retour de la caméra sur la fenêtre (boucle)


def build_B_anims():
    def case(t):
        x = CASE1[0] + kick(t, 1.36, .9, 5, 14) + kick(t, 2.16, -2.6, 4.5, 9)
        y = CASE1[1] - 28 + tw(t, .22, .6, 28, E_BACK)
        a = kick(t, 2.16, -7, 4.5, 9)
        x += tw(t, 2.28, 2.76, CASE2[0] - CASE1[0], E_SOFT)
        y += tw(t, 2.28, 2.42, -12, E_OUT) + tw(t, 2.42, 2.76, CASE2[1] - CASE1[1] + 12, E_INQ) + kick(t, 2.76, -1.6, 4, 11)
        a += tw(t, 2.32, 2.74, -90, E_SOFT)
        a += kick(t, 3.94, 6, 4.5, 9)
        x += kick(t, 3.3, -.6, 5, 14) + tw(t, 3.98, 4.32, -40, E_IN)
        op = tw(t, .22, .36, 1, E_SOFT) - tw(t, 4.0, 4.3, 1, E_SOFT)
        return 'opacity:%s;transform:translate(%spx,%spx) rotate(%sdeg)' % (fmt(op), fmt(x), fmt(y), fmt(a))
    track('b-case', DB, case)
    x_out = CASE1[0] + CW / 2           # la lame sort du flanc droit du boîtier

    hx0 = x_out - 4                     # crochet rentré : caché sous le boîtier
    reach = OX1 - 2.6 - hx0             # crochet contre le tableau droit

    def blade1(t):
        hx = hx0 + tw(t, .7, 1.36, reach, E_TAPE) + tw(t, 1.36, 1.46, -2.2, E_OUT) + tw(t, 1.46, 1.6, 2.2, E_SOFT) + tw(t, 2.0, 2.16, -reach, E_IN)
        return 'transform:translateX(%spx)' % fmt(hx)
    track('b-blade1', DB, blade1)
    y_out = CASE2[1] - CW / 2           # sortie de la lame, boîtier couché au sol
    hy0 = y_out + 4
    rise = hy0 - (OY1 + SILL_T + 2.6)   # crochet sous la tablette

    def blade2(t):
        hy = hy0 + tw(t, 2.8, 3.32, -rise, E_TAPE) + tw(t, 3.32, 3.42, 2.2, E_OUT) + tw(t, 3.42, 3.56, -2.2, E_SOFT) + tw(t, 3.78, 3.94, rise, E_IN)
        return 'transform:translateY(%spx)' % fmt(hy)
    track('b-blade2', DB, blade2)
    anim('b-marks', DB, [(0, 'opacity:1;transform:translateY(0px)'), (B_OUT, 'opacity:1;transform:translateY(0px)', E_SOFT), (B_OUT + .32, 'opacity:0;transform:translateY(-6px)'),
                         (B_RST + .02, 'opacity:0;transform:translateY(-6px)'), (B_RST + .021, 'opacity:1;transform:translateY(0px)')])
    for k, (te, th, tc) in enumerate(((1.3, 1.36, 1.62), (3.24, 3.3, 3.56))):
        anim('b-cext%d' % k, DB, [(0, 'opacity:0'), (te, 'opacity:0', E_SOFT), (te + .25, 'opacity:.45'), (B_RST, 'opacity:.45'), (B_RST + .001, 'opacity:0')])
        anim('b-chalf%d' % k, DB, [(0, 'stroke-dashoffset:1px'), (th, 'stroke-dashoffset:1px', E_OUTQ), (th + .42, 'stroke-dashoffset:0px'), (B_RST, 'stroke-dashoffset:0px'), (B_RST + .001, 'stroke-dashoffset:1px')])
        anim('b-ctick%d' % k, DB, [(0, 'opacity:0'), (th + .3, 'opacity:0', E_SOFT), (th + .42, 'opacity:1'), (B_RST, 'opacity:1'), (B_RST + .001, 'opacity:0')])
        anim('b-cchip%d' % k, DB, [(0, 'opacity:0;transform:scale(.6)'), (tc, 'opacity:0;transform:scale(.6)', E_POP), (tc + .34, 'opacity:1;transform:scale(1)'),
                                   (B_RST, 'opacity:1;transform:scale(1)'), (B_RST + .001, 'opacity:0;transform:scale(.6)')])
    # caméra : recul + travelling latéral qui fait de la place au devis, puis retour sur la fenêtre pour la boucle
    anim('b-room', DB, [(0, CAM0), (T_PAN, CAM0, E_CAM), (T_PAN_END, CAM1), (T_BACK, CAM1, E_INOUT), (DB, CAM0)])
    # devis : même carte, même mouvement et même affichage du prix que dans le film (chapitre 2)
    quote_sequence('b', DB, T_QIN, T_QOUT, B_RST + .05)


def chip_B(num, text, w, dy=0):
    g = (R(-w / 2, -16, w, 32, INK, 16) + Ci(-w / 2 + 16.5, 0, 10.5, GOLD) +
         '<text x="%s" y="4.9" text-anchor="middle" class="aplat-chipnum" font-size="13.5">%s</text>' % (fmt(-w / 2 + 16.5), num) +
         '<text x="%s" y="6" text-anchor="middle" class="aplat-chiptx" font-size="17">%s</text>' % (fmt(13), text))
    return ('<g transform="translate(0,%s)">%s</g>' % (fmt(dy), g)) if dy else g


def tape_strip(vertical=False):
    """Lame du mètre ruban : crochet en x=0 (ou y=0), la lame file derrière (masquée dans le boîtier)."""
    h = BT / 2
    s = []
    if not vertical:
        s.append(R(-300, -h, 300, BT, '#e6c27a'))
        s.append(R(-300, h - 1.2, 300, 1.2, '#c99f58'))
        for i in range(0, 300, 6):
            ln = 4.6 if i % 30 == 0 else 2.4
            s.append(R(-i - 1.2, -h, .8, ln, INK, None, ' opacity=".55"'))
        s.append(R(-.8, -h - 2.6, 3.4, BT + 5.2, INK, .8))
    else:
        s.append(R(-h, 0, BT, 300, '#e6c27a'))
        s.append(R(h - 1.2, 0, 1.2, 300, '#c99f58'))
        for i in range(0, 300, 6):
            ln = 4.6 if i % 30 == 0 else 2.4
            s.append(R(-h, i + .4, ln, .8, INK, None, ' opacity=".55"'))
        s.append(R(-h - 2.6, -2.6, BT + 5.2, 3.4, INK, .8))
    return ''.join(s)


def tape_case():
    return (P('M%s,%s h%s v%s h%s Z' % (fmt(-CW / 2 + 4), fmt(CH / 2), fmt(CW - 8), fmt(3), fmt(-(CW - 8))), 'rgba(43,35,32,.12)') +
            R(-CW / 2, -CH / 2, CW, CH, INK, 11) +
            R(-CW / 2, CH / 2 - 9, CW, 9, '#211b19', 4.5) +
            Ci(-3, -2, 13.5, '#3a3330') + Ci(-3, -2, 9, '#2f2926') + Ci(-3, -2, 3.6, '#4c4441') +
            R(5, -CH / 2 - 2.5, 13, 5.5, GOLD, 2) +
            R(CW / 2 - 4, BDY - BT / 2 - 1.5, 4, BT + 3, '#1a1513', 1.2))


def scene_B(p):
    W = OX1 - OX0
    s = []
    s.append('<svg class="aplat-svg" viewBox="0 0 720 %d" role="img" aria-label="Le mètre ruban prend la largeur de la fenêtre puis la hauteur sous l\'appui ; le devis s\'affiche aussitôt avec le prix.">' % VHB)
    s.append('<defs><radialGradient id="%s-wall" cx="%s" cy="120" r="440" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f8f3ec"/><stop offset="1" stop-color="#ebe3d7"/></radialGradient>'
             '<linearGradient id="%s-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e1e5e2"/><stop offset="1" stop-color="#eee7da"/></linearGradient>'
             '<clipPath id="%s-b1"><rect x="%s" y="%s" width="%s" height="20"/></clipPath>'
             '<clipPath id="%s-b2"><rect x="%s" y="%s" width="20" height="%s"/></clipPath>'
             '<filter id="%s-blur" x="-30%%" y="-30%%" width="160%%" height="160%%"><feGaussianBlur stdDeviation="9"/></filter></defs>' % (
                 p, fmt(CXW), p, p, fmt(CASE1[0] + CW / 2), fmt(CASE1[1] + BDY - 10), fmt(OX1 + 4 - CASE1[0] - CW / 2),
                 p, fmt(L2X - 10), OY1 + SILL_T - 4, fmt(CASE2[1] - CW / 2 - (OY1 + SILL_T - 4)), p))
    # la pièce (mur, sol, plante, fenêtre, cotes, mètre) bouge d'un bloc avec la caméra
    s.append('<g%s>' % cls('b-room'))
    XL, XW = -120, 960                   # mur et sol débordent du cadre : travelling latéral
    s.append(R(XL, 0, XW, VHB, 'url(#%s-wall)' % p))
    # sol en chêne (lames en perspective), plinthe, lumière de la fenêtre au sol
    s.append(R(XL, FLOOR, XW, VHB - FLOOR, '#dcc6a2'))
    for i in range(-12, 14):
        xt = CXW + i * 46
        xb = CXW + i * 46 * 1.35
        s.append(P('M%s,%s L%s,%s' % (fmt(xt), FLOOR, fmt(xb), VHB), 'none', ' stroke="#cfb68f" stroke-width=".9"'))
    s.append(poly([(OX0, FLOOR), (OX1, FLOOR), (OX1 + 70, VHB), (OX0 + 24, VHB)], '#ead7b4', ' opacity=".85"'))
    s.append(R(XL, FLOOR - 11, XW, 11, '#f6f2ec'))
    s.append(R(XL, FLOOR - 11.4, XW, 1, '#e2d9cc'))
    s.append(R(XL, FLOOR, XW, 1.4, 'rgba(43,35,32,.08)'))
    # plante (gauche)
    px, pb = 84, FLOOR
    s.append(poly([(px - 23, pb), (px + 23, pb), (px - 31, pb + 22), (px - 93, pb + 22)], 'rgba(43,35,32,.05)'))
    for (ang, ln, wd) in ((-30, 78, 10), (-12, 104, 11), (8, 96, 10.5), (26, 72, 9.5), (-20, 60, 9), (2, 66, 9)):
        s.append('<g transform="translate(%s,%s) rotate(%s)">%s</g>' % (px, pb - 40, ang, E(0, -ln / 2, wd, ln / 2, '#aaa58c' if ang < 0 else '#bab59c')))
    s.append(P('M%s,%s H%s L%s,%s H%s Z' % (px - 22, pb - 42, px + 22, px + 17, pb, px - 17), '#3b3532'))
    s.append(R(px - 24, pb - 44, 48, 5, '#2b2320', 1.5))
    # fenêtre vue de l'intérieur : tableau (embrasure), dormant, deux vantaux à petits bois, espagnolette dorée
    s.append(R(OX0, OY0, W, OY1 - OY0, '#e6ded2'))
    s.append(R(OX0, OY0, W, 6, 'rgba(43,35,32,.06)'))
    s.append(R(OX0 + 8, OY0 + 8, W - 16, OY1 - OY0 - 8, PAPER))
    gw, gy0, gy1 = (W - 32 - 10) / 2, OY0 + 16, OY1 - 6
    k = gw / 116
    for gx in (OX0 + 16, OX0 + 16 + gw + 10):
        s.append(R(gx, gy0, gw, gy1 - gy0, 'url(#%s-glass)' % p))
        s.append(P('M%s,%s V%s L%s,%s L%s,%s L%s,%s L%s,%s V%s Z' % (fmt(gx), gy1, gy1 - 22, fmt(gx + 30 * k), gy1 - 29, fmt(gx + 52 * k), gy1 - 21, fmt(gx + 80 * k), gy1 - 33, fmt(gx + gw), gy1 - 25, gy1), '#ddd3c4'))
        s.append(poly([(gx + 14, gy0), (gx + 32, gy0), (gx + 6, gy1), (gx, gy1), (gx, gy0 + 50)], 'rgba(255,255,255,.38)'))
        for kk in (1, 2):
            s.append(R(gx, gy0 + (gy1 - gy0) * kk / 3 - 1.6, gw, 3.2, PAPER))
    s.append(R(CXW - 5, OY0 + 8, 10, OY1 - OY0 - 8, PAPER))
    s.append(R(CXW - .4, OY0 + 8, .8, OY1 - OY0 - 8, '#e9e2d7'))
    s.append(R(CXW - 1.8, (OY0 + OY1) / 2 - 8, 3.6, 16, GOLD, 1.4))
    s.append(R(OX0 - 10, OY1, W + 20, SILL_T, '#ece5da', 1.5))
    s.append(R(OX0 - 10, OY1, W + 20, 1.6, '#f8f4ee'))
    s.append(R(OX0 - 6, OY1 + SILL_T, W + 12, 3, 'rgba(43,35,32,.08)'))
    # mètre ruban : lames sous le boîtier
    s.append('<g clip-path="url(#%s-b1)"><g transform="translate(0,%s)"><g%s>%s</g></g></g>' % (p, fmt(CASE1[1] + BDY), cls('b-blade1'), tape_strip()))
    s.append('<g clip-path="url(#%s-b2)"><g transform="translate(%s,0)"><g%s>%s</g></g></g>' % (p, L2X, cls('b-blade2'), tape_strip(True)))
    s.append('<g%s>%s</g>' % (cls('b-case'), tape_case()))
    # cotes (groupe effacé en fin de boucle), au-dessus du mètre : la lame qui se rembobine ne passe jamais sur une étiquette
    s.append('<g%s>' % cls('b-marks'))
    s.append('<g%s>%s%s</g>' % (cls('b-cext0'), R(OX0 - .6, Y1 - 9, 1.2, OY0 - Y1 + 5, INK), R(OX1 - .6, Y1 - 9, 1.2, OY0 - Y1 + 5, INK)))
    for x2 in (OX0, OX1):
        s.append('<path%s d="M%s,%s H%s" pathLength="1" stroke="%s" stroke-width="2" fill="none" stroke-dasharray="1 1"/>' % (cls('b-chalf0'), fmt(CXW), Y1, x2, INK))
    for x in (OX0, OX1):
        s.append('<path%s d="M%s,%s L%s,%s" stroke="%s" stroke-width="2.2" fill="none"/>' % (cls('b-ctick0'), fmt(x - 4.5), Y1 + 4.5, fmt(x + 4.5), Y1 - 4.5, INK))
    # étiquette ① au-dessus de la ligne (ancrée par son bord bas : en petit elle grandit vers le haut, sans masquer la cote)
    s.append('<g transform="translate(%s,%s)"><g class="aplat-zkb"><g%s>%s</g></g></g>' % (fmt(CXW), Y1 - 7, cls('b-cchip0'), chip_B(1, '1&#8239;000 mm', 132, dy=-16)))
    for y2 in (OY1, FLOOR):
        s.append('<path%s d="M%s,%s V%s" pathLength="1" stroke="%s" stroke-width="2" fill="none" stroke-dasharray="1 1"/>' % (cls('b-chalf1'), L2X, YM2, y2, INK))
    for y in (OY1, FLOOR):
        s.append('<path%s d="M%s,%s L%s,%s" stroke="%s" stroke-width="2.2" fill="none"/>' % (cls('b-ctick1'), L2X - 4.5, fmt(y + 4.5), L2X + 4.5, fmt(y - 4.5), INK))
    s.append('<g%s></g>' % cls('b-cext1'))
    s.append('<g transform="translate(%s,%s)"><g class="aplat-zkb"><g%s>%s</g></g></g>' % (L2X, YM2, cls('b-cchip1'), chip_B(2, '650 mm', 118)))
    s.append('</g>')
    s.append('</g>')
    # devis : la même carte que dans le film (quote_card), posée à droite de la fenêtre
    s.append('<g%s><g transform="translate(%s,%s)"><g class="aplat-dzb">%s</g></g></g>' % (
        cls('b-devis'), fmt(QX), fmt(QY), quote_card(p, 'b', DB, T_ROLL, B_RST + .05)))
    s.append('</svg>')
    return ''.join(s)


# ================================================================ page
def card(scene, tag, title, text, btn, sm=False, scls=''):
    return ('<article class="aplat-card%s"><div class="aplat-card-scene ' + scls + '">%s</div><div class="aplat-card-body">'
            '<span class="aplat-tag">%s</span><h2 class="aplat-card-title">%s</h2><p class="aplat-card-text">%s</p>'
            '<button type="button" class="aplat-btn">%s</button></div></article>') % (' aplat-sm' if sm else '', scene, tag, title, text, btn)


CAPS = ["Nous venons prendre les cotes", "Vous recevez le prix exact", "Fabrication à l'atelier, à Saumur", "Pose de votre garde-corps"]


def panel(scene, sm=False):
    bars = ''.join('<span class="aplat-bar"><i class="aplat-fill%d"></i></span>' % i for i in range(4))
    caps = ''.join('<p class="aplat-cap aplat-cap%d"><span class="aplat-capn">0%d</span>%s</p>' % (i, i + 1, c) for i, c in enumerate(CAPS))
    return ('<section class="aplat-panel%s"><h2 class="aplat-panel-title">Nous nous occupons de tout</h2>'
            '<p class="aplat-panel-sub">De la prise de cotes à la pose, un seul interlocuteur&nbsp;: l\'atelier.</p>'
            '<div class="aplat-film">%s</div><div class="aplat-progress">%s</div><div class="aplat-caps">%s</div></section>') % (' aplat-sm' if sm else '', scene, bars, caps)


def build_html_anims():
    # les traits se remplissent au rythme des chapitres ; pendant le panoramique de retour ils s'effacent, se vident, puis réapparaissent vides
    bounds = [(0, T2), (T2, T3), (T3, T4), (T4, LAND)]
    for i, (a, b) in enumerate(bounds):
        anim('fill%d' % i, DC, [(0, 'opacity:1;transform:scaleX(0)'), (a, 'opacity:1;transform:scaleX(0)'), (b, 'opacity:1;transform:scaleX(1)'),
                                (WH, 'opacity:1;transform:scaleX(1)', E_SOFT), (WH + .25, 'opacity:0;transform:scaleX(1)'), (WH + .26, 'opacity:0;transform:scaleX(0)'),
                                (WH + .27, 'opacity:1;transform:scaleX(0)')])
    # légendes : la sortante part vers le haut, l'entrante arrive dès qu'elle a disparu (pas de trou)
    hid, vis, gone = 'opacity:0;transform:translateY(10px)', 'opacity:1;transform:translateY(0px)', 'opacity:0;transform:translateY(-8px)'
    anim('cap0', DC, [(0, vis), (T2 - .22, vis, E_SOFT), (T2 + .03, gone), (T2 + .031, hid), (WH + .38, hid, E_OUT), (WH + .83, vis)])
    ends = [T3, T4, WH + .25]
    starts = [T2, T3, T4]
    for i in range(1, 4):
        st, en = starts[i - 1], ends[i - 1]
        anim('cap%d' % i, DC, [(0, hid), (st + .03, hid, E_OUT), (st + .48, vis), (en - .25, vis, E_SOFT), (en, gone), (en + .001, hid)])


def main():
    build_A_anims()
    build_B_anims()
    build_C_anims()
    build_html_anims()
    sA, sB = scene_A('dA'), scene_B('dB')
    sC = scene_C('dC')
    # copie téléphone : mêmes classes (mêmes animations), identifiants distincts
    pA, pB = scene_A('pA'), scene_B('pB')
    pC = scene_C('pC')
    # les animations régénérées par les copies sont des doublons : on ne garde que la première occurrence
    seen = set()
    kf2, rules2 = [], []
    for k in KF:
        n = k.split('{', 1)[0]
        if n not in seen:
            seen.add(n)
            kf2.append(k)
    seenr = set()
    for r in RULES:
        n = r.split('{', 1)[0]
        if n not in seenr:
            seenr.add(n)
            rules2.append(r)
    css = CSS + '\n' + '\n'.join(rules2) + '\n' + '\n'.join(kf2) + '\n' + REDUCED
    cA = card(sA, 'Sans rien mesurer', "L'atelier vient mesurer", 'Nous prenons les cotes chez vous, puis vous recevez le prix exact. Visite à partir de 19,99&nbsp;€.', 'Prendre rendez-vous →', scls='aplat-scA')
    cB = card(sB, 'Prix immédiat', 'Je mesure moi-même', "Deux mesures au mètre, guidées pas à pas. Le prix s'affiche aussitôt, sans frais.", 'Saisir mes mesures →', scls='aplat-scB')
    cA2 = card(pA, 'Sans rien mesurer', "L'atelier vient mesurer", 'Nous prenons les cotes chez vous, puis vous recevez le prix exact. Visite à partir de 19,99&nbsp;€.', 'Prendre rendez-vous →', sm=True, scls='aplat-scA')
    cB2 = card(pB, 'Prix immédiat', 'Je mesure moi-même', "Deux mesures au mètre, guidées pas à pas. Le prix s'affiche aussitôt, sans frais.", 'Saisir mes mesures →', sm=True, scls='aplat-scB')
    html = TEMPLATE.replace('/*CSS*/', css).replace('<!--CARDS-->', cA + cB).replace('<!--PANEL-->', panel(sC)).replace('<!--PHONE-->', cA2 + cB2 + panel(pC, sm=True))
    with open(os.path.join(HERE, 'index.html'), 'w') as fh:
        fh.write(html)
    print('ok', len(html) // 1024, 'Ko,', len(kf2), 'animations')


CSS = r'''
@font-face{font-family:"Crimson Text";src:url('../fonts/CrimsonText-Regular.ttf') format('truetype');font-weight:400;font-display:block}
@font-face{font-family:"Crimson Text";src:url('../fonts/CrimsonText-SemiBold.ttf') format('truetype');font-weight:600;font-display:block}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:#e2dcd2 linear-gradient(180deg,#e9e2d7 0%,#dcd6cc 100%) fixed;color:#2b2320;
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased}
.aplat-page{max-width:1152px;margin:0 auto;padding:56px 24px 104px}
.aplat-head{display:flex;align-items:flex-end;justify-content:space-between;gap:32px;max-width:1104px;margin:0 auto 36px}
.aplat-head h1{font-family:"Crimson Text",Georgia,serif;font-weight:600;font-size:40px;line-height:1.08;letter-spacing:-.012em;margin:0 0 10px}
.aplat-head p{margin:0;max-width:640px;font-size:15px;line-height:1.55;color:#5d6168}
.aplat-replay{flex:none;display:inline-flex;align-items:center;gap:8px;height:40px;padding:0 18px 0 15px;border-radius:999px;border:1px solid rgba(43,35,32,.22);
  background:rgba(251,248,244,.6);color:#2b2320;font:600 14px/1 -apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif;cursor:pointer;transition:background .2s,border-color .2s}
.aplat-replay:hover{background:#fbf8f4;border-color:rgba(43,35,32,.4)}
.aplat-replay svg{width:15px;height:15px}
.aplat-cards{display:grid;grid-template-columns:repeat(2,minmax(0,540px));gap:24px;justify-content:center}
.aplat-card{background:#fbf8f4;border-radius:24px;overflow:hidden;display:flex;flex-direction:column;
  box-shadow:0 1px 2px rgba(43,35,32,.05),0 18px 40px -22px rgba(43,35,32,.28)}
.aplat-card-scene{position:relative;background:#f5ecdf;container-type:inline-size}
.aplat-svg{display:block;width:100%;height:auto}
.aplat-card-body{padding:20px 28px 26px;display:flex;flex-direction:column;align-items:flex-start}
.aplat-tag{display:inline-block;font-size:12.5px;font-weight:600;letter-spacing:.01em;color:#8a6233;background:#f2e7d6;padding:5px 11px;border-radius:999px}
.aplat-card-title{font-family:"Crimson Text",Georgia,serif;font-weight:600;font-size:32px;line-height:1.1;letter-spacing:-.01em;margin:12px 0 8px}
.aplat-card-text{margin:0 0 18px;font-size:15px;line-height:1.5;color:#5d6168;max-width:470px;text-wrap:pretty}
.aplat-btn{display:inline-flex;align-items:center;height:42px;padding:0 20px;border:0;border-radius:999px;background:#2b2320;color:#fbf8f4;
  font:600 14.5px/1 -apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif;cursor:pointer}
.aplat-panel{max-width:760px;margin:56px auto 0;background:#fbf8f4;border-radius:26px;padding:34px 40px 30px;
  box-shadow:0 1px 2px rgba(43,35,32,.05),0 18px 40px -22px rgba(43,35,32,.28)}
.aplat-panel-title{font-family:"Crimson Text",Georgia,serif;font-weight:600;font-size:34px;line-height:1.1;letter-spacing:-.01em;margin:0 0 6px}
.aplat-panel-sub{margin:0 0 22px;font-size:15.5px;line-height:1.5;color:#5d6168;text-wrap:pretty}
.aplat-film{border-radius:16px;overflow:hidden;background:#f5ecdf;transform:translateZ(0);container-type:inline-size}
.aplat-progress{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:18px}
.aplat-bar{display:block;height:3px;border-radius:2px;background:rgba(43,35,32,.12);overflow:hidden}
.aplat-bar i{display:block;height:100%;background:#2b2320;transform-origin:0 50%;transform:scaleX(0)}
.aplat-caps{position:relative;height:34px;margin-top:14px}
.aplat-cap{position:absolute;left:0;top:0;margin:0;display:flex;align-items:baseline;white-space:nowrap;
  font-family:"Crimson Text",Georgia,serif;font-weight:400;font-size:25px;line-height:1.2;color:#2b2320}
.aplat-capn{font:600 12px/1 -apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif;letter-spacing:.08em;color:#ad8148;margin-right:12px;transform:translateY(-3px)}
.aplat-phone{margin:72px auto 0;display:flex;flex-direction:column;align-items:center}
.aplat-phone-label{font-size:12.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#8a6233;margin:0 0 14px}
.aplat-phone-col{width:360px;max-width:100%;display:flex;flex-direction:column;gap:16px;padding:16px 0}
.aplat-phone-col .aplat-panel{margin:0}
.aplat-sm{border-radius:20px}
.aplat-sm .aplat-card-body{padding:16px 20px 20px}
.aplat-sm .aplat-card-title{font-size:26px;margin:10px 0 6px}
.aplat-sm .aplat-card-text{font-size:14px;margin-bottom:14px}
.aplat-sm .aplat-btn{height:40px;font-size:14px;padding:0 18px}
.aplat-panel.aplat-sm{padding:22px 18px 20px}
.aplat-sm .aplat-panel-title{font-size:26px}
.aplat-sm .aplat-panel-sub{font-size:14px;margin-bottom:16px}
.aplat-sm .aplat-film{border-radius:12px}
.aplat-sm .aplat-progress{margin-top:14px;gap:4px}
.aplat-sm .aplat-caps{height:28px;margin-top:10px}
.aplat-sm .aplat-cap{font-size:19.5px}
.aplat-sm .aplat-capn{font-size:11px;margin-right:9px;transform:translateY(-2px)}
.aplat-railshadow{opacity:.13}.aplat-railshadow *{fill:#2b2320;stroke:none}
.aplat-sign{font:600 10.5px -apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;letter-spacing:3px;fill:#c9a36b}
.aplat-chiptx{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif;font-weight:600;fill:#fbf8f4;font-variant-numeric:tabular-nums}
.aplat-chipnum{font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;font-weight:700;fill:#2b2320}
.aplat-price{font-family:"Crimson Text",Georgia,serif;font-weight:600;font-variant-numeric:lining-nums tabular-nums}
.aplat-dlabel{font:600 9.5px -apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;letter-spacing:2px;fill:#ad8148}
.aplat-dtitle{font-family:"Crimson Text",Georgia,serif;font-weight:600;font-size:19px;fill:#2b2320}
.aplat-dsmall{font:500 11px -apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;fill:#5d6168;font-variant-numeric:tabular-nums}
/* scènes affichées en petit (téléphone, colonne 360 px) : cotes, étiquettes et devis agrandis pour rester lisibles */
@container (max-width:520px){
  .aplat-scA .aplat-zk{transform:scale(1.3)}
  .aplat-film .aplat-zk{transform:scale(1.4)}
  .aplat-zkb{transform:scale(1.2)}
  /* devis agrandi ; assez bas pour que son coin ne sorte pas du cadre quand il pivote en entrant */
  .aplat-dz{transform:translate(-43px,-36px) scale(1.27)}
  .aplat-dz .aplat-dlabel{font-size:14px;letter-spacing:2.5px}
  .aplat-dz .aplat-dsmall{font-size:15px}
  /* devis de la carte B : agrandi autant que la hauteur le permet, petits textes à la même taille affichée que dans le film */
  .aplat-dzb{transform:translate(-12px,-10px) scale(1.05)}
  .aplat-dzb .aplat-dlabel{font-size:15.2px;letter-spacing:2.7px}
  .aplat-dzb .aplat-dsmall{font-size:16.3px}
  .aplat-dz .aplat-dsize,.aplat-dzb .aplat-dsize{transform:translateY(3px)}
}
@media (max-width:700px){
  .aplat-page{padding:32px 16px 72px}
  .aplat-head{flex-direction:column;align-items:flex-start;gap:18px}
  .aplat-head h1{font-size:32px}
  .aplat-cards{grid-template-columns:minmax(0,1fr)}
  .aplat-card-body{padding:16px 20px 20px}
  .aplat-card-title{font-size:27px}
  .aplat-panel{padding:22px 18px 20px;margin-top:32px}
  .aplat-panel-title{font-size:27px}
  .aplat-cap{font-size:20px}
}
'''

REDUCED = r'''
@media (prefers-reduced-motion:reduce){
  .aplat-scA *{animation-delay:-6.2s!important;animation-play-state:paused!important}
  .aplat-scB *{animation-delay:-6.6s!important;animation-play-state:paused!important}
  .aplat-panel *{animation-delay:-14.4s!important;animation-play-state:paused!important}
}
'''

TEMPLATE = r'''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Direction : Illustration en aplats</title>
<style>/*CSS*/</style>
</head>
<body>
<main class="aplat-page">
  <header class="aplat-head">
    <div>
      <h1>Direction : Illustration en aplats</h1>
      <p>Des aplats de couleur sans contour, des ombres longues très douces et quatre plans en parallaxe : la caméra traverse un seul décor continu, de l'atelier de Saumur jusqu'à la façade du client.</p>
    </div>
    <button type="button" class="aplat-replay"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9"/><path d="M12.4 1.8v2.8H9.6"/></svg>Rejouer</button>
  </header>
  <section class="aplat-cards"><!--CARDS--></section>
  <!--PANEL-->
  <section class="aplat-phone">
    <p class="aplat-phone-label">Aperçu téléphone · 360 px</p>
    <div class="aplat-phone-col"><!--PHONE--></div>
  </section>
</main>
<script>
(function(){
  var q = new URLSearchParams(location.search).get('t');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.fonts.ready.then(function(){
    if (q === null) return;
    var t = parseFloat(q) || 0;
    document.getAnimations().forEach(function(a){ a.pause(); a.currentTime = t * 1000; });
  });
  document.querySelector('.aplat-replay').addEventListener('click', function(){
    if (reduce) return;
    document.getAnimations().forEach(function(a){ a.cancel(); a.play(); });
  });
})();
</script>
</body>
</html>
'''

if __name__ == '__main__':
    main()
