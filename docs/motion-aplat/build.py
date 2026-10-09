#!/usr/bin/env python3
# Générateur de la maquette « aplat » : écrit index.html (HTML + CSS + SVG inline, aucune dépendance).
# Toute l'animation est en @keyframes CSS ; les mouvements composés (caméra, utilitaire, mètre)
# sont échantillonnés à 60 images/s depuis des courbes d'accélération réelles (cubic-bezier, ressorts),
# puis allégés sans perte visible (une clé n'est retirée que si l'interpolation la redonne à 0,1 px près).
import math, os, random, re

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

# ---------------------------------------------------------------- horloge des films (rythme ralenti + temps de lecture)
# Les films B et C sont écrits dans leur ancien minutage (« temps d'origine »). Une horloge par film les rejoue plus
# lentement (facteur s0) et insère des TEMPS DE LECTURE (pauses) juste après chaque image clé : un événement qui commence
# après une pause est décalé d'autant ; un mouvement déjà lancé se termine à sa vitesse (rien ne se fige en plein geste).
# CLOCKS[durée d'origine] = (s0, [(instant d'origine de la pause, durée ajoutée en s), ...])
CLOCKS = {}
CUR = [None]          # horloge active pendant l'échantillonnage d'une piste


def MT(x, clk=None):
    """Instant d'origine x -> instant affiché (horloge clk, ou l'horloge active ; identité sans horloge)."""
    c = clk if clk is not None else CUR[0]
    if c is None:
        return x
    s0, holds = c
    return s0 * x + sum(h for p, h in holds if p < x)


def EL(t, t0):
    """Temps d'origine écoulé depuis l'événement t0, à l'instant affiché t (horloge active)."""
    c = CUR[0]
    if c is None:
        return t - t0
    return (t - MT(t0)) / c[0]


def new_dur(dur):
    c = CLOCKS.get(dur)
    return MT(dur, c) if c is not None else dur


def anim(cls, dur, stops, extra='', mode='chain'):
    st = sorted(stops, key=lambda s: s[0])
    if st[0][0] > 0:
        st.insert(0, (0, st[0][1], None))
    if st[-1][0] < dur:
        st.append((dur, st[-1][1], None))
    clk = CLOCKS.get(dur) if mode != 'raw' else None
    if clk is not None:
        # chaque palier (valeur inchangée) s'étire jusqu'au prochain événement recalé ; chaque mouvement garde sa durée × s0
        nd = MT(dur, clk)
        out = []
        for i, s in enumerate(st):
            e = s[2] if len(s) > 2 else None
            if i == 0 or mode == 'map' or st[i - 1][1] == s[1]:
                tn = MT(s[0], clk)
            else:
                tn = out[-1][0] + (s[0] - st[i - 1][0]) * clk[0]
            if out:
                tn = max(tn, out[-1][0])
            out.append((min(tn, nd), s[1], e))
        if out[-1][0] < nd - 1e-9:
            out.append((nd, out[-1][1], None))
        st, dur = out, nd
    name = 'aplat-' + cls
    body = []
    for s in st:
        e = s[2] if len(s) > 2 else None
        tf = (';animation-timing-function:' + e.css) if e is not None else ''
        body.append('%s{%s%s}' % (pct(s[0], dur), s[1], tf))
    KF.append('@keyframes %s{%s}' % (name, ''.join(body)))
    RULES.append('.%s{animation:%s %ss linear infinite%s}' % (name, name, fmt(dur), (';' + extra) if extra else ''))
    return name


_NUM = re.compile(r'-?\d+(?:\.\d+)?')


def _parse(v):
    """Valeur CSS -> (gabarit, nombres, tolérances) : 0,1 px, 0,15°, échelle 0,0005, opacité 0,01 (invisible à l'écran)."""
    nums, tol = [], []
    for m in _NUM.finditer(v):
        nums.append(float(m.group()))
        after, before = v[m.end():m.end() + 3], v[max(0, m.start() - 8):m.start()]
        tol.append(.1 if after.startswith('px') else .15 if after.startswith('deg') else .01 if before.endswith('opacity:') else .0005)
    return _NUM.sub('#', v), nums, tol


def simplify(ts, vals, tk=1.0):
    """Échantillons à 60 i/s -> images clés : on retire un échantillon seulement si l'interpolation linéaire entre ses voisins
    gardés le redonne à la tolérance près (le mouvement affiché reste celui des 60 i/s ; les paliers deviennent 2 clés)."""
    keep_i = [i for i in range(len(ts)) if i in (0, len(ts) - 1) or not (vals[i] == vals[i - 1] and vals[i] == vals[i + 1])]
    ts = [ts[i] for i in keep_i]
    vals = [vals[i] for i in keep_i]
    P = [_parse(v) for v in vals]
    n = len(ts)

    def ok(i, j):
        if any(P[k][0] != P[i][0] for k in range(i + 1, j + 1)):
            return False
        a, b = P[i][1], P[j][1]
        for k in range(i + 1, j):
            f = (ts[k] - ts[i]) / (ts[j] - ts[i])
            for c, tl in enumerate(P[k][2]):
                if abs(a[c] + (b[c] - a[c]) * f - P[k][1][c]) > tl * tk:
                    return False
        return True
    out = [0]
    i = 0
    while i < n - 1:
        j = i + 1
        while j + 1 < n and j + 1 - i <= 90 and ok(i, j + 1):
            j += 1
        out.append(j)
        i = j
    return [(ts[k], vals[k], None) for k in out]


def track(cls, dur, fn, cuts=(), fps=60, extra='', tol=1.0):
    """Piste échantillonnée à 60 i/s (dans le temps affiché), puis allégée sans perte visible (simplify ; tol : facteur de tolérance)."""
    clk = CLOCKS.get(dur)
    nd = MT(dur, clk) if clk is not None else dur
    prev = CUR[0]
    CUR[0] = clk
    try:
        ts = set(round(i / fps, 5) for i in range(int(round(nd * fps)) + 1))
        for c in cuts:
            cn = MT(c, clk) if clk is not None else c
            ts.add(cn - 0.002)
            ts.add(cn)
        ts = sorted(t for t in ts if 0 <= t <= nd)
        vals = [fn(t) for t in ts]
    finally:
        CUR[0] = prev
    return anim(cls, nd, simplify(ts, vals, tol), extra, mode='raw')


def tw(t, t0, t1, d, e=E_INOUT):
    u = EL(t, t0)
    if u <= 0:
        return 0.0
    if u >= t1 - t0:
        return d
    return d * e(u / (t1 - t0))


def step(t, t0, d):
    return d if EL(t, t0) >= 0 else 0.0


def kick(t, t0, amp, freq=2.0, damp=6.0):
    u = EL(t, t0)
    if u < 0:
        return 0.0
    return amp * math.exp(-damp * u) * math.sin(2 * math.pi * freq * u)


def bounce(t, t0, t1, amp=.55, per=.27):
    v = EL(t, t0)
    if v <= 0 or v >= t1 - t0:
        return 0.0
    u = v / (t1 - t0)
    return amp * math.sin(math.pi * u) * math.sin(2 * math.pi * v / per)


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


def railing_static(p, sheen=False, sc='c'):
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
        s.append('<g clip-path="url(#%s-hr)"><g%s>%s</g></g>' % (p, cls(sc + '-sheen'), R(-18, 0, 16, 4.6, 'url(#%s-sheen)' % p)))
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
def world(p, sc, VH, bench=None, shutter=False, house_rail='', cote='', roof_rail='', van_on=True, xmax=None, castle=True):
    def keep(x):
        return xmax is None or x < xmax
    o = []
    # ciel + soleil (statiques : à l'infini)
    o.append(R(0, 0, 720, VH, 'url(#%s-sky)' % p))
    o.append(Ci(578, 84, 62, '#f3e0bd', ' opacity=".5"'))
    o.append(Ci(578, 84, 29, '#ecd09e'))

    # --- plan lointain : coteaux, château de Saumur, Loire
    far = []
    for (x, y, w) in ((20, 74, 130), (250, 44, 92), (690, 66, 150), (980, 34, 104), (1290, 78, 126), (1540, 50, 96)):
        if not keep(x):
            continue
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
    if castle:   # film B : pas de château (ses tourelles dépasseraient du toit du camion du transporteur)
        far.append(''.join(ch))
    for (x, y, rx, ry) in ((170, 241, 17, 8), (196, 243.5, 12, 6), (300, 242, 10, 5), (620, 240, 19, 9), (652, 243.5, 12, 6), (880, 241, 15, 7.5), (1130, 240, 19, 9), (1160, 243.5, 11, 6), (1330, 242, 14, 7)):
        if keep(x):
            far.append(E(x, y, rx, ry, '#dccfb9'))
    far.append(R(-300, 246.5, 2200, 6.5, '#f4ede2'))
    for (x, w) in ((120, 60), (390, 90), (700, 50), (960, 80), (1250, 70)):
        if keep(x):
            far.append(R(x, 248.6, w, .9, '#fbf8f2', .45))
    far.append(R(-300, 253, 2200, 12, '#dfd3bf'))
    o.append('<g%s>%s</g>' % (cls(sc + '-far'), ''.join(far)))

    # --- plan moyen : le décor où roule l'utilitaire
    m = []
    m.append(R(-500, 258, 3200, 44, '#e8dfd1'))
    m.append(R(-500, 284, 3200, 18, '#e3d9c9'))
    for x in (690, 1210):
        if keep(x):
            m.append(round_tree(x, 300, 62))
    for x in (905, 1440):
        if keep(x):
            m.append(poplar(x, 300, 92))
    if keep(1955):
        m.append(poplar(1955, 300, 96))
        m.append(round_tree(2040, 300, 58))
    for x in (790, 1060, 1330):
        if keep(x):
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
        it.append('<g%s>%s</g>' % (cls(sc + '-shutter'), sh))
    m.append('<g clip-path="url(#%s-door)">%s</g>' % (p, ''.join(it)))
    m.append(R(145, 180.5, 210, 6, '#34373c'))

    # maison du client : façade en tuffeau, toit d'ardoise
    if keep(1500):
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
        if keep(x):
            m.append(R(x, 329.5, 22, 2.4, '#e4dbcd', 1))
    m.append(R(-500, 350, 3200, 3, '#b9ae9f'))
    m.append(R(-500, 353, 3200, 400, '#ddd2c1'))
    m.append(cote)
    if van_on:
        m.append(van(sc, roof_rail))
    m.append(house_rail)
    o.append('<g%s>%s</g>' % (cls(sc + '-mid'), ''.join(m)))

    # --- premier plan (défile plus vite : profondeur)
    n = []
    for i, x in enumerate(range(-40, 3200, 330)):
        if not keep(x):
            continue
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
    track(sc + '-far', dur, mk(.45, .25, .25), cuts, tol=2)
    track(sc + '-mid', dur, mk(1, 1, 1), cuts, tol=2)
    track(sc + '-near', dur, mk(1.3, 1, 1), cuts, tol=2)


def van_tracks(sc, dur, xfn, angfn, dyfn, cuts):
    track(sc + '-van', dur, lambda t: 'transform:translate(%spx,346px)' % fmt(xfn(t)), cuts)
    track(sc + '-vbody', dur, lambda t: 'transform:translate(0px,%spx) translate(76px,-14px) rotate(%sdeg) translate(-76px,14px)' % (fmt(dyfn(t)), fmt(angfn(t))), cuts)

    def wheel(cx):
        return lambda t: 'transform:translate(%spx,-12px) rotate(%sdeg) translate(%spx,12px)' % (cx, fmt((xfn(t) - 470) / 12 * 57.2958, 1), -cx)
    track(sc + '-wr', dur, wheel(30), cuts, tol=6)
    track(sc + '-wf', dur, wheel(122), cuts, tol=6)

    def speed(t):
        v = 0.0
        for a, b in ((t - .02, t), (t, t + .02)):
            if 0 <= a and b <= MT(dur):
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
        if EL(t, t_gone) >= 0 or EL(t, ti) < 0:
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


# ---------------------------------------------------------------- écran de fin (le même pour les films B et C)
# Après l'image finale : le décor avance doucement et se fond dans le papier ; l'emblème se construit comme un garde-corps
# de l'atelier — le sceau (double cercle d'acier) se trace, puis le cadre en fer plat, la croix de Saint-André soudée
# d'angle à angle, la rosace de fonderie qui se pose au centre avec un léger rebond, enfin la main courante (la touche
# dorée) qui vient se poser sur le cadre. « AUBOIACIER » monte lettre à lettre depuis sa ligne de base, un filet doré se
# trace, « Métallerie · Saumur ». Tenu 2 s ; puis l'emblème et le nom s'effacent d'abord, et seulement ensuite le papier
# se lève sur la première image du film (pas de double exposition) : boucle parfaite.
# Temps affichés, comptés depuis le début du fondu (f0) ; le film est figé dessous pendant le fondu, puis il revient à
# sa première image sous le papier (ancien retour de boucle, désormais caché).
FIN_COVER = .6      # le papier couvre tout
FIN_L = 4.4         # durée totale : fondu 0,6 + construction 0,9 + tenue 2,0 + sortie du logo 0,3 + retour 0,6
FIN_REV = .6        # le papier se lève sur la première image
FIN_OUT = .27       # l'emblème et le nom s'effacent juste avant
FIN_NAME = 'AUBOIACIER'
# chasses de Crimson Text SemiBold (em) : lettres centrées sur leur chasse (police des titres du site : proportions voisines)
FIN_ADV = {'A': .71875, 'U': .71582, 'B': .57227, 'O': .67676, 'I': .31543, 'C': .62402, 'E': .57031, 'R': .66895}
FIN_FS, FIN_TR = 40, .3          # corps du nom, approche (em)
FIN_EY, FIN_BASE, FIN_K = 137, 241, 1.12   # centre de l'emblème, ligne de base du nom, échelle de l'emblème (Ø 112)
FIN_PW, FIN_PH = 33.0, 13.0      # garde-corps de l'emblème : deux panneaux de 33 × 26 (proportions du garde-corps du film)


def fin_holds(s0, p1, end):
    """Deux temps de lecture pour l'écran de fin : FIN_COVER au début du fondu (le film reste sur son image finale), puis
    le complément après le retour caché du film vers sa première image ; l'écran dure exactement FIN_L."""
    return [(p1, FIN_COVER), (end - .001, FIN_L - FIN_COVER - s0 * (end - p1))]


def fin_card(p, sc, D, f0):
    """Écran de fin dans le repère 720 × 400 d'un film (classes aplat-fin<sc>-…) ; D : durée affichée de la boucle,
    f0 : début du fondu. La scène du film doit être enveloppée dans <g class="aplat-fin<sc>-cam"> (caméra du fondu)."""
    assert abs(D - f0 - FIN_L) < 1e-6, (sc, D, f0)
    pre = 'fin' + sc

    def at(x):
        return f0 + x
    r0 = at(FIN_L - FIN_REV)

    def cam(k):
        return 'transform:translate(360px,200px) scale(%s) translate(-360px,-200px)' % f4(k)
    # caméra du film : elle avance un peu pendant que le décor se fond dans le papier ; au retour, la première image se pose
    anim(pre + '-cam', D, [(0, cam(1)), (at(0), cam(1), Ease(.4, 0, .6, 1)), (at(FIN_COVER + .02), cam(1.045)), (at(FIN_COVER + .5), cam(1.045)),
                           (at(FIN_COVER + .501), cam(1.035)), (r0, cam(1.035), Ease(.2, .6, .3, 1)), (D, cam(1))], mode='raw')
    anim(pre + '-veil', D, [(0, 'opacity:0'), (at(0), 'opacity:0', E_SOFT), (at(FIN_COVER), 'opacity:1'), (r0, 'opacity:1', E_INOUT), (D, 'opacity:0')], mode='raw')
    # sortie : l'emblème et le nom remontent à peine et s'effacent AVANT que le papier ne se lève
    ct1 = 'opacity:1;transform:translate(360px,190px) scale(1) translate(-360px,-190px)'
    anim(pre + '-ct', D, [(0, ct1), (r0 - FIN_OUT, ct1, Ease(.45, 0, .55, 1)), (r0 + .02, 'opacity:0;transform:translate(360px,186px) scale(.985) translate(-360px,-190px)')], mode='raw')

    def draw(c, t0, d, e=E_INOUT, L=1):
        # L > 1 (cercles) : le trait se referme en chevauchant son départ, sans joint visible
        anim(c, D, [(0, 'stroke-dashoffset:%spx' % fmt(L)), (at(t0), 'stroke-dashoffset:%spx' % fmt(L), e), (at(t0 + d), 'stroke-dashoffset:0px')], mode='raw')
    E_DRAW = Ease(.5, 0, .25, 1)
    draw(pre + '-ring', .26, .7, E_DRAW, 1.02)       # sceau : cercle d'acier
    draw(pre + '-ring2', .36, .64, E_DRAW, 1.02)     #         filet intérieur, tracé en sens inverse
    draw(pre + '-fr', .44, .42, E_SOFT)              # cadre en fer plat (deux moitiés symétriques qui se rejoignent en haut)
    draw(pre + '-mo', .6, .2, E_SOFT)                # montant du milieu
    draw(pre + '-x0', .62, .28, E_SOFT)              # croix de Saint-André, soudées d'angle à angle dans chaque panneau
    draw(pre + '-x1', .69, .28, E_SOFT)
    for j, t0 in enumerate((.9, .97)):               # rosaces de fonderie : elles se posent au cœur des croix
        anim(pre + '-ros%d' % j, D, [(0, 'opacity:0;transform:scale(0) rotate(-75deg)'), (at(t0), 'opacity:0;transform:scale(0) rotate(-75deg)', E_POP),
                                     (at(t0 + .01), 'opacity:1;transform:scale(.08) rotate(-73deg)', E_POP), (at(t0 + .34), 'opacity:1;transform:scale(1) rotate(0deg)')], mode='raw')
    anim(pre + '-hr', D, [(0, 'opacity:0;transform:translateY(-9px)'), (at(1.04), 'opacity:0;transform:translateY(-9px)', E_LOCK),
                          (at(1.38), 'opacity:1;transform:translateY(0px)')], mode='raw')
    for i in range(len(FIN_NAME)):
        t0 = at(.62 + .04 * i)
        anim(pre + '-l%d' % i, D, [(0, 'opacity:0;transform:translateY(30px)'), (t0, 'opacity:0;transform:translateY(30px)', E_OUT),
                                   (t0 + .52, 'opacity:1;transform:translateY(0px)')], mode='raw')
    anim(pre + '-rule', D, [(0, 'transform:scaleX(0)'), (at(1.1), 'transform:scaleX(0)', E_INOUT), (at(1.46), 'transform:scaleX(1)')], mode='raw')
    # tout est posé à f0 + 1,5 s (dernière lettre, « Métallerie · Saumur ») ; l'emblème et le nom sortent à f0 + 3,53 s : 2,03 s tenus
    anim(pre + '-sub', D, [(0, 'opacity:0;transform:translateY(6px)'), (at(1.16), 'opacity:0;transform:translateY(6px)', E_OUT), (at(1.5), 'opacity:1;transform:translateY(0px)')], mode='raw')

    cx, cy = 360, FIN_EY
    o = ['<g%s><defs><radialGradient id="%s-finbg" cx="360" cy="190" r="470" gradientUnits="userSpaceOnUse">'
         '<stop offset=".45" stop-color="%s"/><stop offset="1" stop-color="#f3ece1"/></radialGradient>'
         '<clipPath id="%s-fincl"><rect x="0" y="180" width="720" height="%s"/></clipPath></defs>' % (cls(pre + '-veil'), p, PAPER, p, FIN_BASE + 2 - 180)]
    # Le papier couvre aussi le décor qui déborde de chaque côté (vidéo du téléphone, plus large que la scène : Quentin,
    # 09/10/2026, « le logo ne prend pas tout le cadre »).
    o.append(R(-1100, -10, 2920, 420, 'url(#%s-finbg)' % p))
    o.append('<g class="aplat-fin-z"><g%s>' % cls(pre + '-ct'))
    # emblème : sceau à double cercle d'acier ; dedans, le garde-corps de l'atelier en miniature — deux panneaux en fer plat,
    # croix de Saint-André soudées d'angle à angle, rosaces de fonderie — et sa main courante, seule touche dorée
    pw, ph, dy, fw = FIN_PW, FIN_PH, 2.0, 2.5
    o.append('<g transform="translate(%s,%s) scale(%s)">' % (cx, cy, fmt(FIN_K)))
    o.append('<circle%s r="50" transform="rotate(-90)" pathLength="1" stroke-dasharray="1.02 1.02" fill="none" stroke="%s" stroke-width="2.1"/>' % (cls(pre + '-ring'), INK))
    o.append('<circle%s r="45.4" transform="scale(-1,1) rotate(-90)" pathLength="1" stroke-dasharray="1.02 1.02" fill="none" stroke="%s" stroke-width=".8"/>' % (cls(pre + '-ring2'), INK))
    o.append('<g transform="translate(0,%s)">' % fmt(dy))
    xs = '<path%s d="M%s,%s L%s,%s" pathLength="1" stroke-dasharray="1 1" stroke="%s" stroke-width="1.9" fill="none"/>'
    for x0 in (-pw, 0):
        o.append(xs % (cls(pre + '-x0'), fmt(x0), fmt(-ph), fmt(x0 + pw), fmt(ph), INK))
        o.append(xs % (cls(pre + '-x1'), fmt(x0 + pw), fmt(-ph), fmt(x0), fmt(ph), INK))
    for sg in (-1, 1):
        o.append('<path%s d="M0,%s H%s V%s H0" pathLength="1" stroke-dasharray="1 1" stroke="%s" stroke-width="%s" stroke-linejoin="miter" fill="none"/>'
                 % (cls(pre + '-fr'), fmt(ph), fmt(sg * pw), fmt(-ph), INK, fmt(fw)))
    # le montant couvre aussi les deux joints des moitiés du cadre (haut et bas)
    o.append('<path%s d="M0,%s V%s" pathLength="1" stroke-dasharray="1 1" stroke="%s" stroke-width="%s" fill="none"/>' % (cls(pre + '-mo'), fmt(-ph - fw / 2), fmt(ph + fw / 2), INK, fmt(fw)))
    ros = rosette()
    for j, x0 in enumerate((-pw / 2, pw / 2)):
        o.append('<g transform="translate(%s,0)"><g%s><g transform="scale(1.15)">%s</g></g></g>' % (fmt(x0), cls(pre + '-ros%d' % j), ros))
    o.append('<g%s>%s</g>' % (cls(pre + '-hr'), R(-pw - 3, -ph - fw / 2 - 4.8, 2 * pw + 6, 4.8, GOLD, 1.4)))
    o.append('</g></g>')
    # le nom : lettres centrées sur leur chasse, qui montent une à une depuis leur ligne de base (masque)
    tr = FIN_TR * FIN_FS
    widths = [FIN_ADV[ch] * FIN_FS for ch in FIN_NAME]
    total = sum(widths) + tr * (len(widths) - 1)
    x = 360 - total / 2
    o.append('<g clip-path="url(#%s-fincl)">' % p)
    for i, (ch, w) in enumerate(zip(FIN_NAME, widths)):
        o.append('<text x="%s" y="%s" text-anchor="middle" class="aplat-fin-name aplat-%s-l%d">%s</text>' % (fmt(x + w / 2), FIN_BASE, pre, i, ch))
        x += w + tr
    o.append('</g>')
    o.append('<g transform="translate(360,%s)"><g%s>%s</g></g>' % (FIN_BASE + 21, cls(pre + '-rule'), R(-46, -.65, 92, 1.3, GOLD, .65)))
    o.append('<g%s><text x="361.75" y="%s" text-anchor="middle" class="aplat-fin-sub">MÉTALLERIE · SAUMUR</text></g>' % (cls(pre + '-sub'), FIN_BASE + 48))
    o.append('</g></g></g>')
    return ''.join(o)


def step_labels(kind, D, starts, f0):
    """Étiquettes d'étape HTML (.aplat-et<kind><i>) calées sur un film : starts = débuts des étapes (temps affiché, le premier
    à 0) ; chacune entre (fondu court + léger glissement vers le haut) au début de son étape et sort juste avant la
    suivante ; la dernière s'efface au début de l'écran de fin (f0)."""
    hid, vis, gone = 'opacity:0;transform:translateY(8px)', 'opacity:1;transform:translateY(0px)', 'opacity:0;transform:translateY(-6px)'
    n = len(starts)
    for i in range(n):
        a = starts[i] + (.35 if i == 0 else .06)
        b = starts[i + 1] if i + 1 < n else f0 + .3
        anim('et%s%d' % (kind, i), D, [(0, hid), (a, hid, E_OUT), (a + .4, vis), (b - .24, vis, E_SOFT), (b, gone), (b + .001, hid)], mode='raw')


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


# ================================================================ SCÈNE C — le film du parcours (écrit sur 16 s, joué en 24 s : voir HOLDS_C)
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


# image finale : cadrage un peu plus large qu'à l'origine (zoom 2,0 au lieu de 2,4 : la lucarne et les arêtes du toit en haut) — le garde-corps posé
# reste au-dessus de l'étiquette d'étape des cartes (bas gauche), y compris sur une carte de téléphone de 320 px
# plans larges de la rue (arrivée de l'utilitaire, chapitres 1 et 4) : cadre remonté de C_Y0, l'utilitaire roule et se gare
# au-dessus de l'étiquette d'étape ; les gros plans (façade, atelier) restent exactement les mêmes
C_Y0 = 18
C_FY, C_FS = -48 - C_Y0, .92


def camC_raw(t):
    # gros plans sur la façade : le bord bas du cadre tombe sur le bandeau entre les étages (ni toit d'utilitaire ni bouts de porte coupés)
    cx = (360 + 1320 * pv1(t - .08) + tw(t, 3.5, 4.3, 85, E_SOFT)
          + tw(t, 6.32, 6.52, 16, E_SOFT) + tw(t, 6.48, 7.45, -1531, E_WHIP)
          + tw(t, 10.1, 10.7, 70, E_SOFT) + 1360 * pv4(t - .08)
          + tw(t, WH + .05, WH + .83, -1328, E_WHIP) + tw(t, WH + .75, DC, 8, E_INOUT))
    cy = (200 + C_Y0 + tw(t, 1.85, 2.6, -82 - C_Y0) + tw(t, 6.48, 7.25, 82) + tw(t, 7.2, 8.05, 43)
          + tw(t, 10.1, 10.65, -43 + C_Y0) + tw(t, HO + .25, HO + 1.1, C_FY) + tw(t, WH, WH + .75, -C_FY))
    s = (1 + tw(t, 1.85, 2.6, .75, E_DOLLY) + tw(t, 3.5, 4.3, -.05, E_SOFT) + tw(t, 6.45, 7.2, -.6)
         + tw(t, 7.15, 8.05, 2.65, Ease(.6, 0, .2, 1)) + tw(t, 10.1, 10.7, -2.75, Ease(.55, 0, .3, 1))
         + tw(t, HO + .25, HO + 1.1, C_FS, E_DOLLY) + tw(t, LAND - .2, WH, .08, Ease(.3, 0, .7, 1))
         + tw(t, WH - .02, WH + .73, -C_FS - .08))
    return cx, cy, s


camC = camC_raw
TPC = find_teleport(camC_raw, VHC, 6.5, 7.45)
TPC2 = find_teleport(camC_raw, VHC, WH + .05, DC - .05)
print('teleport C', TPC, TPC2)


def vanxC(t):
    return 470 + 1090 * pv1(t) - step(t, TPC[1], 1090) + 1090 * pv4(t) - step(t, TPC2[1], 1090)


def bench_parts(sc='c', D=DC, off=0.0, HID=WH, share=False):
    """Garde-corps assemblé sur l'établi (chapitre « Fabrication à l'atelier » du film C, réutilisé tel quel par le film B) :
    barres qui glissent et se verrouillent, soudures, croix, rosaces, main courante.
    sc : préfixe des classes ; D : durée de la boucle ; off : décalage (s) par rapport au film C ;
    HID : instant où tout est remis en place, quand c'est caché (film C : derrière le rideau métallique).
    share : soudures et étincelles sur des @keyframes partagées (décalées par animation-delay, trajectoire en variables CSS)
    au lieu d'une animation par particule : même dessin, CSS bien plus léger (film B). Le film C garde share=False."""
    parts = []

    def slide(c, t0, d0x, d0y, dt=.3, e=E_LOCK):
        anim(c, D, [(0, 'transform:translate(%spx,%spx)' % (d0x, d0y)), (t0, 'transform:translate(%spx,%spx)' % (d0x, d0y), e),
                    (t0 + dt, 'transform:translate(0px,0px)'), (HID, 'transform:translate(0px,0px)'), (HID + .001, 'transform:translate(%spx,%spx)' % (d0x, d0y))])

    slide(sc + '-bbot', 7.95 + off, -200, 0)
    slide(sc + '-btop', 8.05 + off, 200, 0)
    parts.append('<g%s>%s</g>' % (cls(sc + '-bbot'), R(0, 34.8, 96, 2.2, INK)))
    parts.append('<g%s>%s</g>' % (cls(sc + '-btop'), R(0, 4.6, 96, 2.2, INK)))
    for i, x in enumerate((0, 46.9, 93.8)):
        c = sc + '-bp%d' % i
        t0 = 8.28 + off + .07 * i
        anim(c, D, [(0, 'transform:translateY(-95px)'), (t0, 'transform:translateY(-95px)', E_INQ), (t0 + .17, 'transform:translateY(1.6px)', E_OUT),
                    (t0 + .3, 'transform:translateY(0px)'), (HID, 'transform:translateY(0px)'), (HID + .001, 'transform:translateY(-95px)')])
        parts.append('<g%s>%s</g>' % (cls(c), R(x, 4.6, 2.2, 32.4, INK)))
    for pi, cx in enumerate(PANELS):
        for sgi, sg in enumerate((1, -1)):
            c = sc + '-bd%d%d' % (pi, sgi)
            t0 = 8.86 + off + .06 * pi
            a = sg * DIAG_A
            anim(c, D, [(0, 'opacity:0;transform:rotate(0deg) scaleX(.82)'), (t0, 'opacity:0;transform:rotate(0deg) scaleX(.82)', E_SOFT),
                        (t0 + .06, 'opacity:1;transform:rotate(%sdeg) scaleX(.83)' % fmt(a * .04), Ease(.3, 1.3, .55, 1)),
                        (t0 + .38, 'opacity:1;transform:rotate(%sdeg) scaleX(1)' % fmt(a)), (HID, 'opacity:1;transform:rotate(%sdeg) scaleX(1)' % fmt(a)),
                        (HID + .001, 'opacity:0;transform:rotate(0deg) scaleX(.82)')])
            parts.append('<g transform="translate(%s,20.8)"><g%s>%s</g></g>' % (fmt(cx), cls(c), R(-DIAG_L / 2, -.8, DIAG_L, 1.6, INK)))
    for pi, cx in enumerate(PANELS):
        c = sc + '-br%d' % pi
        t0 = 9.26 + off + .07 * pi
        anim(c, D, [(0, 'transform:scale(0) rotate(-120deg)'), (t0, 'transform:scale(0) rotate(-120deg)', E_POP), (t0 + .36, 'transform:scale(1) rotate(0deg)'),
                    (HID, 'transform:scale(1) rotate(0deg)'), (HID + .001, 'transform:scale(0) rotate(-120deg)')])
        parts.append('<g transform="translate(%s,20.8)"><g%s>%s</g></g>' % (fmt(cx), cls(c), rosette()))
    anim(sc + '-bhr', D, [(0, 'transform:translateY(-70px)'), (9.55 + off, 'transform:translateY(-70px)', E_INQ), (9.76 + off, 'transform:translateY(1.4px)', E_OUT),
                      (9.92 + off, 'transform:translateY(0px)'), (HID, 'transform:translateY(0px)'), (HID + .001, 'transform:translateY(-70px)')])
    parts.append('<g%s>%s%s%s</g>' % (cls(sc + '-bhr'), R(-2, 0, 100, 4.6, OAK, 1.6), R(-1, .45, 98, 1.25, OAK2, .6), R(0, 4.6, 96, .7, 'rgba(43,35,32,.35)')))

    # soudures : éclair, gerbe d'étincelles (particules à durée de vie courte), point de soudure qui refroidit
    rnd = random.Random(11)
    joints = [((1.1, 5.7), 8.6), ((1.1, 35.9), 8.66), ((48, 5.7), 8.72), ((48, 35.9), 8.78), ((94.9, 5.7), 8.84), ((94.9, 35.9), 8.9),
              ((PANELS[0], 20.8), 9.2), ((PANELS[1], 20.8), 9.26)]
    joints = [(j, tb + off) for (j, tb) in joints]
    LIVES = (.27, .31, .35, .39)
    if share:
        anim(sc + '-swx', D, [(0, 'opacity:1', E_SOFT), (.9, 'opacity:0')])
        anim(sc + '-sfx', D, [(0, 'opacity:1;transform:scale(.5)', E_OUT), (.07, 'opacity:1;transform:scale(1.1)', E_SOFT),
                              (.22, 'opacity:0;transform:scale(1.3)'), (.221, 'opacity:0;transform:scale(.3)')])
        for li, L in enumerate(LIVES):
            anim(sc + '-spx%d' % li, D, [(0, 'opacity:1;transform:translate(0px,0px)', E_OUT), (L * .42, 'opacity:1;transform:translate(var(--mx),var(--my))', E_INQ),
                                         (L, 'opacity:0;transform:translate(var(--ex),var(--ey))'), (L + .001, 'opacity:0;transform:translate(0px,0px)')])

    def shared(c, t, extra=''):
        return ' class="aplat-%s" opacity="0" style="%sanimation-delay:%ss"' % (c, extra, fmt(MT(t, CLOCKS.get(D)), 3))
    for ji, ((jx, jy), tb) in enumerate(joints):
        c = sc + '-sw%d' % ji
        if share:
            parts.append(Ci(jx, jy, 1.25, '#f0b45e', shared(sc + '-swx', tb)))
        else:
            anim(c, D, [(0, 'opacity:0'), (tb, 'opacity:0'), (tb + .001, 'opacity:1', E_SOFT), (tb + .9, 'opacity:0')])
            parts.append(Ci(jx, jy, 1.25, '#f0b45e', cls(c)))
        c = sc + '-sf%d' % ji
        if share:
            ca = shared(sc + '-sfx', tb)
        else:
            anim(c, D, [(0, 'opacity:0;transform:scale(.3)'), (tb, 'opacity:0;transform:scale(.3)'), (tb + .001, 'opacity:1;transform:scale(.5)', E_OUT),
                        (tb + .07, 'opacity:1;transform:scale(1.1)', E_SOFT), (tb + .22, 'opacity:0;transform:scale(1.3)'), (tb + .221, 'opacity:0;transform:scale(.3)')])
            ca = cls(c)
        parts.append('<g transform="translate(%s,%s)"><g%s>%s%s%s</g></g>' % (fmt(jx), fmt(jy), ca, Ci(0, 0, 10, '#ffe7b8', ' opacity=".2"'), Ci(0, 0, 4.8, '#f6d28f', ' opacity=".45"'), Ci(0, 0, 2.1, '#fff6e3')))
        for k in range(8):
            ang = math.radians(rnd.uniform(-170, -10) if k < 6 else rnd.uniform(-200, 20))
            dist = rnd.uniform(8, 17)
            mx, my = math.cos(ang) * dist * .62, math.sin(ang) * dist * .62
            ex, ey = math.cos(ang) * dist, math.sin(ang) * dist + rnd.uniform(5, 9)
            life = rnd.uniform(.26, .4)
            t1 = tb + rnd.uniform(0, .05)
            c = sc + '-sp%d_%d' % (ji, k)
            if share:
                li = min(range(len(LIVES)), key=lambda q: abs(LIVES[q] - life))
                ca = shared(sc + '-spx%d' % li, t1, '--mx:%spx;--my:%spx;--ex:%spx;--ey:%spx;' % (fmt(mx), fmt(my), fmt(ex), fmt(ey)))
            else:
                anim(c, D, [(0, 'opacity:0;transform:translate(0px,0px)'), (t1, 'opacity:0;transform:translate(0px,0px)'),
                            (t1 + .001, 'opacity:1;transform:translate(0px,0px)', E_OUT),
                            (t1 + life * .42, 'opacity:1;transform:translate(%spx,%spx)' % (fmt(mx), fmt(my)), E_INQ),
                            (t1 + life, 'opacity:0;transform:translate(%spx,%spx)' % (fmt(ex), fmt(ey))),
                            (t1 + life + .001, 'opacity:0;transform:translate(0px,0px)')])
                ca = cls(c)
            ln = rnd.uniform(2.8, 4.4)
            parts.append('<g transform="translate(%s,%s)"><g%s><rect x="%s" y="-.42" width="%s" height=".84" rx=".42" fill="%s" transform="rotate(%s)"/></g></g>' % (
                fmt(jx), fmt(jy), ca, fmt(-ln), fmt(ln), rnd.choice(('#fff1cf', '#f8d48f', '#ffffff', '#f2bb6a')), fmt(math.degrees(math.atan2(ey, ex)))))
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
        if EL(t, TPC2[1]) >= 0 or EL(t, HO) < 0:
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
            '<defs>%s<filter id="%s-blur" x="-30%%" y="-30%%" width="160%%" height="160%%"><feGaussianBlur stdDeviation="9"/></filter></defs>'
            '<g%s>%s%s</g>%s</svg>') % (
        VHC, world_defs(p), p, cls('finc-cam'), w, devis_svg(p), fin_card(p, 'c', DC_N, F0_C))




# ================================================================ SCÈNE B — le film « Je mesure moi-même » (écrit sur 19 s, joué en 29,57 s : voir HOLDS_B)
# Six temps d'environ 3 s, sans légende, au format du film C (720 × 400) :
#   1 la mesure au mètre ruban · 2 le devis, puis le tampon « Commandé » · 3 la fabrication à l'atelier (le chapitre du
#   film C : même code, même cadrage, décalé de OFF) · 4 l'emballage en caisse, pochoir AUBOIACIER · 5 le camion d'un
#   transporteur NEUTRE (sans nom) charge la caisse par le hayon, puis la carte de France · 6 le client pose lui-même.
DB = 19.0
VHB = 400
# fenêtre vue de l'intérieur, en proportion avec les cotes : 1 000 mm de large (180), allège 650 mm (117)
OX0, OX1, OY0, OY1, FLOOR = 186, 366, 73, 193, 310
CXW = (OX0 + OX1) / 2            # axe de la fenêtre
SILL_T = 11                      # épaisseur de la tablette
CW, CH = 46, 44                  # boîtier du mètre ruban
BDY = 16.5                       # sortie de la lame sous le centre du boîtier
BT = 9.6                         # largeur de la lame
CASE1 = (OX0 + CW / 2 + 2, OY1 - CH / 2)        # sur la tablette, contre le tableau gauche
L2X = OX0 + 66                                  # verticale de la cote ② (le boîtier au sol reste à droite de l'étiquette d'étape)
CASE2 = (L2X - BDY, FLOOR - CW / 2)             # au sol, tourné d'un quart de tour (lame vers le haut)
Y1 = 60                                         # ligne de la cote ①
YM2 = 234                                       # étiquette de la cote ②


def cam_room(z, cx, cy):
    return 'transform:translate(%spx,%spx) scale(%s)' % (fmt(360 - z * cx), fmt(VHB / 2 - z * cy), fmt(z, 4))


CAM0 = cam_room(1.2, CXW, 168)       # mesure : plan rapproché sur la fenêtre (étiquette ① et sol dans le cadre)
CAM1 = cam_room(1, 360, 200)         # devis et pose : la pièce entière
CAM6 = cam_room(1.18, 428, 236)      # pose : la caisse livrée qui s'ouvre (la fenêtre entière dans le cadre, la plante hors champ)
CAMF = cam_room(1.06, 372, 214)      # image finale : plante, fenêtre et garde-corps posé, caisse ouverte, nécessaire de pose
CAMIN = cam_room(1.34, 435, 258)     # arrivée depuis la carte : l'épingle se pose sur la caisse
QX, QY = 446, 54                     # devis (même carte que le film C), centré en hauteur à droite de la fenêtre

# 1 — mesure (0 – 2,9 s)
# 2 — devis + tampon
T_PAN, T_PAN_END = 2.9, 3.7          # recul de la caméra : la place du devis
T_QIN = 2.95                         # entrée du devis (même rythme que dans le film C)
T_ROLL = T_QIN + Q_ROLL
T_STAMP = 4.8                        # impact du tampon « Commandé »
# 3 — fabrication : le chapitre du film C, décalé de OFF secondes
WHIP0, WHIP1 = 5.36, 5.96            # panoramique fouetté de la pièce vers l'atelier
OFF = -1.6                           # C 7,15 s (début du travelling avant) -> B 5,55 s
B_RST = 6.5                          # cotes, devis, tampon remis à zéro (la pièce est hors champ)
# 4 — emballage
PK0, PK1 = 8.35, 8.95                # la caméra recule un peu : établi + caisse
RL0, RL1 = 8.42, 8.74                # le garde-corps se soulève de l'établi
CR0, CR1 = 8.62, 9.0                 # la caisse glisse dessous
RD0, RD1 = 9.0, 9.3                  # le garde-corps descend dans la caisse
LD0, LD1 = 9.36, 9.56                # le couvercle tombe
NAILS = (9.72, 9.91, 10.1)           # coups de marteau
ST0 = 10.22                          # pochoir « AUBOIACIER » puis flèches ↑↑
SWAP = 10.55                         # la caisse de l'atelier passe sur une copie non découpée par la porte
HID_B = 11.0                         # l'établi est remis en place (hors champ / caché)
# 5 — expédition
SP0, SP1 = 10.6, 11.3                # recul + travelling vers le camion du transporteur
HP0, HP1 = 11.1, 11.52               # la caisse saute sur le hayon
LF0, LF1 = 11.56, 11.86              # le hayon monte
SL0, SL1 = 11.88, 12.18              # la caisse entre dans le camion
DO0, DO1 = 12.16, 12.6               # la porte arrière se referme (elle sort derrière le camion, puis claque)
FO0, FO1 = 12.6, 12.84               # le hayon se replie contre l'arrière
DV0, DV1 = 12.88, 13.5               # le camion part
MZ0, MZ1 = 12.8, 13.38               # la caméra recule : l'atelier est sur le point « Saumur » quand la carte s'ouvre
MI0, MI1 = 13.2, 13.75               # la carte apparaît (zoom arrière centré sur Saumur)
RT0, RT1 = 13.62, 14.26              # le trajet se dessine, le petit camion le suit
PIN = 14.2                           # la maison du client (l'arrivée reste lisible ≈ 0,45 s avant la plongée)
MO0, MO1 = 14.68, 15.06              # plongée sur la maison, fondu vers la pièce
ROOM_BACK = 13.8                     # la pièce revient à sa place (sous la carte opaque)
W_RST = 15.1                         # atelier, camion, caméra remis en place (cachés sous la pièce)
# 6 — pose par le client
LID0 = 15.2                          # le couvercle se soulève puis va s'appuyer contre le mur, à droite de la caisse
BAG0, BOOK0 = 15.58, 15.7            # visserie et guide de pose sautent de la caisse et se posent au sol, à gauche
RA0 = 16.02                          # le garde-corps sort de la caisse ...
RA1 = RA0 + .86                      # ... et se pose dans la fenêtre
DR0 = RA1 + .02                      # la visseuse du client entre dans le champ et fixe le garde-corps
DR1 = DR0 + .22                      # (arrivée, vissage, sortie)
DR2 = DR1 + .3
DR3 = DR2 + .2
CHK = DR3 - .04
END0 = 18.55                         # fin de l'image finale : retour au début de la boucle

# caisse (repère : coin bas gauche) — 104 × 42, couvercle 108 × 5
CRW, CRH = 104, 42
CRATE_W = (198, 300)                 # dans l'atelier : posée au sol devant l'établi, dans la porte
NAIL_X = (10, 52, 94)
# camion du transporteur (repère : arrière de la caisse au sol), garé devant l'atelier
TRX = 480
HAY = 108                            # profondeur du hayon
CRATE_H = (TRX - HAY + 2, 342)       # caisse posée sur le hayon baissé
RS = 1.875                           # échelle de la pièce (le garde-corps fait 180 = la fenêtre de 1 000 mm)
CRATE_R = (400, 352)                 # caisse livrée dans la pièce
RAIL_IN = (CRATE_R[0] + 4 * RS, 352 - 38.5 * RS)   # garde-corps rangé dans la caisse
RAIL_WIN = (OX0, OY1 - 2 - 37 * RS)                # garde-corps posé : entre les tableaux, au-dessus de l'appui

# carte de France : contour en (longitude, latitude), projection équirectangulaire
KY = 33.0
KX = KY * math.cos(math.radians(46.6))


def proj(lon, lat):
    return (360 + (lon - 2.4) * KX, 200 - (lat - 46.2) * KY)


FRANCE = [(2.55, 51.09), (3.16, 50.78), (3.7, 50.32), (4.23, 49.96), (4.85, 50.15), (4.88, 49.8), (5.47, 49.5),
          (6.37, 49.47), (6.73, 49.17), (7.63, 49.05), (8.23, 48.97), (7.8, 48.5), (7.58, 48.0), (7.55, 47.58),
          (6.85, 47.35), (6.45, 46.95), (6.1, 46.55), (6.12, 46.18), (6.8, 46.4), (6.86, 45.83), (7.05, 45.5),
          (6.65, 45.05), (6.95, 44.35), (7.53, 43.78), (7.0, 43.55), (6.6, 43.17), (5.93, 43.1), (5.35, 43.3),
          (4.85, 43.4), (4.0, 43.55), (3.2, 43.25), (3.05, 42.85), (3.17, 42.43), (2.5, 42.35), (1.72, 42.5),
          (0.7, 42.8), (-0.3, 42.85), (-1.0, 43.05), (-1.78, 43.37), (-1.45, 43.6), (-1.25, 44.65), (-1.1, 45.6),
          (-1.2, 46.15), (-1.78, 46.5), (-2.15, 46.9), (-2.2, 47.27), (-2.8, 47.5), (-3.4, 47.72), (-4.37, 47.8),
          (-4.55, 48.2), (-4.77, 48.35), (-4.6, 48.62), (-3.98, 48.72), (-3.44, 48.82), (-2.75, 48.55), (-2.0, 48.65),
          (-1.51, 48.63), (-1.6, 48.84), (-1.85, 49.35), (-1.94, 49.72), (-1.62, 49.67), (-1.26, 49.67),
          (-1.15, 49.35), (-0.25, 49.3), (0.1, 49.49), (0.6, 49.86), (1.08, 49.93), (1.58, 50.2), (1.6, 50.73),
          (1.58, 50.87), (1.85, 50.96), (2.37, 51.05)]
CORSE = [(9.35, 43.0), (9.45, 42.7), (9.55, 42.1), (9.25, 41.4), (8.8, 41.6), (8.6, 41.9), (8.65, 42.35), (9.0, 42.6)]
LOIRE = [(4.1, 45.9), (3.9, 46.5), (3.16, 46.99), (2.85, 47.4), (2.3, 47.75), (1.91, 47.9), (1.33, 47.59), (0.69, 47.39),
         (-0.08, 47.26), (-0.6, 47.35), (-1.55, 47.22), (-2.2, 47.27)]
SAUMUR = proj(-0.08, 47.26)
DEST = proj(6.1, 44.5)               # chez le client : ailleurs en France (sans nom)
# d'autres clients, partout en France (simples points, sans nom) : Lille, Paris, Strasbourg, Brest, Bordeaux, Toulouse, Lyon, Nice
CITIES = [proj(*c) for c in ((3.06, 50.63), (2.35, 48.86), (7.75, 48.58), (-4.49, 48.39), (-0.58, 44.84), (1.44, 43.6), (4.84, 45.76), (7.26, 43.7))]


def route_ctrl():
    sx, sy = SAUMUR
    dx, dy = DEST
    mx, my = (sx + dx) / 2, (sy + dy) / 2
    nx, ny = dy - sy, -(dx - sx)
    k = 40 / math.hypot(nx, ny)
    return (mx + nx * k, my + ny * k)


ROUTE_C = route_ctrl()


def route_pt(u):
    (sx, sy), (cx, cy), (dx, dy) = SAUMUR, ROUTE_C, DEST
    a, b, c = (1 - u) ** 2, 2 * (1 - u) * u, u * u
    return (a * sx + b * cx + c * dx, a * sy + b * cy + c * dy)


ROUTE_LUT = []
_acc, _prev = 0.0, route_pt(0)
for _i in range(201):
    _q = route_pt(_i / 200)
    _acc += math.hypot(_q[0] - _prev[0], _q[1] - _prev[1])
    ROUTE_LUT.append((_acc, _i / 200))
    _prev = _q


def route_at(frac):
    """Point du trajet à la fraction frac de sa longueur (le petit camion suit exactement le trait qui se dessine)."""
    L = ROUTE_LUT[-1][0] * frac
    for k in range(1, len(ROUTE_LUT)):
        if ROUTE_LUT[k][0] >= L:
            (l0, u0), (l1, u1) = ROUTE_LUT[k - 1], ROUTE_LUT[k]
            u = u0 + (u1 - u0) * ((L - l0) / (l1 - l0) if l1 > l0 else 0)
            return route_pt(u), u
    return route_pt(1), 1.0


# emballage : recul de la caméra sur l'établi et la caisse, assez large pour que la caisse reste au-dessus de l'étiquette
# d'étape (bas gauche) même sur une carte de 320 px ; le travelling vers le camion compense (cadrage du camion inchangé)
B_PKY, B_PKS = 1.3, -1.45


def camB(t):
    """Caméra du monde (atelier) dans le film B : même cadrage que le film C pendant la fabrication."""
    if EL(t, W_RST) >= 0:
        return 250, 200, 1.1
    cx = 250 + tw(t, SP0, SP1, 210, E_CAM) + tw(t, MZ0, MZ1, -147.6, E_SOFT)
    # devant le camion, le cadre descend un peu : la caisse posée sur le hayon reste au-dessus de l'étiquette d'étape
    cy = (200 + tw(t, 5.6, 6.45, 43) + tw(t, PK0, PK1, B_PKY, E_CAM) + tw(t, SP0, SP1, 8 - B_PKY, E_CAM)
          + tw(t, MZ0, MZ1, 27.9, E_SOFT))
    s = (1.1 + tw(t, 5.55, 6.45, 2.65, Ease(.6, 0, .2, 1)) + tw(t, PK0, PK1, B_PKS, E_CAM)
         + tw(t, SP0, SP1, -2.51 - B_PKS, E_CAM) + tw(t, MZ0, MZ1, -.34, E_SOFT))
    return cx, cy, s


def hop(t, t0, t1, d, peak, e=E_SOFT):
    """Saut : déplacement d (x, y) en arc de hauteur peak."""
    if EL(t, t0) <= 0:
        return 0.0, 0.0, 0.0
    u = min(1.0, EL(t, t0) / (t1 - t0))
    x = d[0] * e(u)
    y = d[1] * E_INOUT(u) - peak * math.sin(math.pi * u)
    return x, y, u


def build_B_anims():
    # ---------------------------------------------------------- 1. mesure
    def case(t):
        x = CASE1[0] + kick(t, 1.0, .9, 5, 14) + kick(t, 1.52, -2.6, 4.5, 9)
        y = CASE1[1] - 28 + tw(t, .1, .42, 28, E_BACK)
        a = kick(t, 1.52, -7, 4.5, 9)
        x += tw(t, 1.6, 2.0, CASE2[0] - CASE1[0], E_SOFT)
        y += tw(t, 1.6, 1.72, -12, E_OUT) + tw(t, 1.72, 2.0, CASE2[1] - CASE1[1] + 12, E_INQ) + kick(t, 2.0, -1.6, 4, 11)
        a += tw(t, 1.63, 1.98, -90, E_SOFT)
        a += kick(t, 2.9, 6, 4.5, 9)
        x += kick(t, 2.44, -.6, 5, 14) + tw(t, 2.94, 3.26, -40, E_IN)
        op = tw(t, .1, .22, 1, E_SOFT) - tw(t, 2.96, 3.26, 1, E_SOFT)
        return 'opacity:%s;transform:translate(%spx,%spx) rotate(%sdeg)' % (fmt(op), fmt(x), fmt(y), fmt(a))
    track('b-case', DB, case)
    x_out = CASE1[0] + CW / 2
    hx0 = x_out - 4
    reach = OX1 - 2.6 - hx0

    def blade1(t):
        hx = hx0 + tw(t, .46, .98, reach, E_TAPE) + tw(t, .98, 1.06, -2.2, E_OUT) + tw(t, 1.06, 1.18, 2.2, E_SOFT) + tw(t, 1.38, 1.52, -reach, E_IN)
        return 'transform:translateX(%spx)' % fmt(hx)
    track('b-blade1', DB, blade1)
    y_out = CASE2[1] - CW / 2
    hy0 = y_out + 4
    rise = hy0 - (OY1 + SILL_T + 2.6)

    def blade2(t):
        hy = hy0 + tw(t, 2.04, 2.46, -rise, E_TAPE) + tw(t, 2.46, 2.54, 2.2, E_OUT) + tw(t, 2.54, 2.66, -2.2, E_SOFT) + tw(t, 2.76, 2.9, rise, E_IN)
        return 'transform:translateY(%spx)' % fmt(hy)
    track('b-blade2', DB, blade2)
    for k, (te, th, tc) in enumerate(((.94, .98, 1.2), (2.4, 2.44, 2.66))):
        anim('b-cext%d' % k, DB, [(0, 'opacity:0'), (te, 'opacity:0', E_SOFT), (te + .25, 'opacity:.45'), (B_RST, 'opacity:.45'), (B_RST + .001, 'opacity:0')])
        anim('b-chalf%d' % k, DB, [(0, 'stroke-dashoffset:1px'), (th, 'stroke-dashoffset:1px', E_OUTQ), (th + .42, 'stroke-dashoffset:0px'), (B_RST, 'stroke-dashoffset:0px'), (B_RST + .001, 'stroke-dashoffset:1px')])
        anim('b-ctick%d' % k, DB, [(0, 'opacity:0'), (th + .3, 'opacity:0', E_SOFT), (th + .42, 'opacity:1'), (B_RST, 'opacity:1'), (B_RST + .001, 'opacity:0')])
        anim('b-cchip%d' % k, DB, [(0, 'opacity:0;transform:scale(.6)'), (tc, 'opacity:0;transform:scale(.6)', E_POP), (tc + .34, 'opacity:1;transform:scale(1)'),
                                   (B_RST, 'opacity:1;transform:scale(1)'), (B_RST + .001, 'opacity:0;transform:scale(.6)')])
    # caméra de la pièce : plan rapproché -> plan large (devis) ; retour depuis la carte ; fin : retour au plan rapproché
    anim('b-room', DB, [(0, CAM0), (T_PAN, CAM0, E_CAM), (T_PAN_END, CAM1), (ROOM_BACK, CAM1), (ROOM_BACK + .001, CAMIN),
                        (MO0 + .12, CAMIN, E_OUT), (MO1 + .55, CAM6), (RA0 + .1, CAM6, E_INOUT), (RA1 + .3, CAMF),
                        (END0, CAMF, E_INOUT), (DB, CAM0)])

    # ---------------------------------------------------------- 2. devis (identique au film C) + tampon
    quote_sequence('b', DB, T_QIN, 6.0, B_RST)
    anim('b-stamp', DB, [(0, 'opacity:0;transform:scale(1.7)'), (T_STAMP - .19, 'opacity:0;transform:scale(1.7)', E_IN),
                         (T_STAMP, 'opacity:.42;transform:scale(.9)'), (T_STAMP + .001, 'opacity:.94;transform:scale(.9)', E_OUT),
                         (T_STAMP + .09, 'opacity:.94;transform:scale(1.035)', E_SOFT), (T_STAMP + .2, 'opacity:.94;transform:scale(1)'),
                         (B_RST, 'opacity:.94;transform:scale(1)'), (B_RST + .001, 'opacity:0;transform:scale(1.7)')])
    anim('b-sflash', DB, [(0, 'opacity:0;transform:scale(1)'), (T_STAMP, 'opacity:0;transform:scale(1)'), (T_STAMP + .001, 'opacity:.5;transform:scale(1)', E_OUT),
                          (T_STAMP + .32, 'opacity:0;transform:scale(1.16)'), (T_STAMP + .321, 'opacity:0;transform:scale(1)')])
    anim('b-dbump', DB, [(0, 'transform:scale(1)'), (T_STAMP, 'transform:scale(1)', E_OUT), (T_STAMP + .05, 'transform:scale(.985)', E_SOFT),
                         (T_STAMP + .2, 'transform:scale(1)')])

    # ---------------------------------------------------------- 3. panoramique fouetté, fabrication (code du film C)
    anim('b-rwrap', DB, [(0, 'transform:translateX(0px)'), (WHIP0, 'transform:translateX(0px)', E_WHIP), (WHIP1, 'transform:translateX(-840px)'),
                         (ROOM_BACK, 'transform:translateX(-840px)'), (ROOM_BACK + .001, 'transform:translateX(0px)')])
    anim('b-wwrap', DB, [(0, 'transform:translateX(840px)'), (WHIP0, 'transform:translateX(840px)', E_WHIP), (WHIP1, 'transform:translateX(0px)'),
                         (W_RST, 'transform:translateX(0px)'), (W_RST + .001, 'transform:translateX(840px)')])
    cuts = [W_RST]
    cam_tracks('b', DB, VHB, camB, cuts)

    # ---------------------------------------------------------- 4. emballage
    def lift(t):
        y = tw(t, RL0, RL1, -30, E_OUT) + tw(t, RD0, RD1, 63, E_INQ) + kick(t, RD1, -1.4, 4, 12)
        op = 0 if EL(t, SWAP) >= 0 else 1   # caché jusqu'à la fin de la boucle : aucune image intermédiaire à la remise en place
        if EL(t, HID_B) >= 0:
            y = 0
        return 'opacity:%s;transform:translateY(%spx)' % (op, fmt(y))
    track('b-blift', DB, lift, cuts=[SWAP, HID_B])
    anim('b-cin', DB, [(0, 'opacity:1;transform:translateX(210px)'), (CR0, 'opacity:1;transform:translateX(210px)', Ease(.3, .9, .4, 1.06)),
                       (CR1, 'opacity:1;transform:translateX(0px)'), (SWAP, 'opacity:1;transform:translateX(0px)'), (SWAP + .001, 'opacity:0;transform:translateX(0px)'),
                       (HID_B, 'opacity:0;transform:translateX(0px)'), (HID_B + .001, 'opacity:1;transform:translateX(210px)')])
    lid_up = 'transform:translate(0px,-78px) translate(52px,-44.5px) rotate(-4deg) translate(-52px,44.5px)'
    lid_dn = 'transform:translate(0px,0px) translate(52px,-44.5px) rotate(0deg) translate(-52px,44.5px)'
    lid_bn = 'transform:translate(0px,-2.2px) translate(52px,-44.5px) rotate(.6deg) translate(-52px,44.5px)'
    anim('b-clid', DB, [(0, lid_up), (LD0, lid_up, E_IN), (LD1, lid_dn, E_OUT), (LD1 + .07, lid_bn, E_SOFT), (LD1 + .16, lid_dn),
                        (HID_B, lid_dn), (HID_B + .001, lid_up)])
    for i, tn in enumerate(NAILS):
        anim('b-nail%d' % i, DB, [(0, 'transform:translateY(0px)'), (tn - .02, 'transform:translateY(0px)'), (tn, 'transform:translateY(5px)'),
                                  (HID_B, 'transform:translateY(5px)'), (HID_B + .001, 'transform:translateY(0px)')])
    # marteau : la panne frappe la tête du clou (repère de la caisse) ; pivot à la main, sur le manche
    def ham(x, a, op, dy=0):
        return 'opacity:%s;transform:translate(%spx,%spx) translate(24px,-6px) rotate(%sdeg) translate(-24px,6px)' % (fmt(op), fmt(x), fmt(-48.2 + dy), fmt(a))
    hs = [(0, ham(NAIL_X[0] + 26, 34, 0, -20)), (LD1, ham(NAIL_X[0] + 26, 34, 0, -20), E_OUT)]
    for i, tn in enumerate(NAILS):
        x = NAIL_X[i]
        if i:
            hs.append((NAILS[i - 1] + .09, ham(x, 34, 1)))
        hs += [(tn - .07, ham(x, 34, 1), E_IN), (tn, ham(x, 0, 1), E_OUT)]
    hs += [(NAILS[-1] + .08, ham(NAIL_X[-1], 30, 1), E_IN), (NAILS[-1] + .22, ham(NAIL_X[-1] + 30, 40, 0, -24)), (NAILS[-1] + .221, ham(NAIL_X[0] + 26, 34, 0, -20))]
    anim('b-ham', DB, hs)
    for c, t0 in (('b-cmk', ST0), ('b-car', ST0 + .12)):
        anim(c, DB, [(0, 'opacity:0;transform:scale(1.3)'), (t0, 'opacity:0;transform:scale(1.3)', E_IN), (t0 + .1, 'opacity:.45;transform:scale(.95)'),
                     (t0 + .101, 'opacity:1;transform:scale(.95)', E_OUT), (t0 + .2, 'opacity:1;transform:scale(1)'),
                     (HID_B, 'opacity:1;transform:scale(1)'), (HID_B + .001, 'opacity:0;transform:scale(1.3)')])

    # ---------------------------------------------------------- 5. expédition : caisse -> hayon -> camion
    def crate_out(t):
        if EL(t, SWAP) < 0 or EL(t, SL1 + .02) >= 0:
            return 'opacity:0;transform:translate(0px,0px) translate(52px,-21px) rotate(0deg) translate(-52px,21px)'
        d = (CRATE_H[0] - CRATE_W[0], CRATE_H[1] - CRATE_W[1])
        x, y, u = hop(t, HP0, HP1, d, 34)
        a = -5 * math.sin(math.pi * u) if 0 < u < 1 else 0
        y += kick(t, HP1, 1.3, 4, 12) + tw(t, LF0, LF1, -30, E_INOUT)
        x += tw(t, SL0, SL1, 112, E_INOUT)
        return 'opacity:1;transform:translate(%spx,%spx) translate(52px,-21px) rotate(%sdeg) translate(-52px,21px)' % (fmt(x), fmt(y), fmt(a))
    track('b-cout', DB, crate_out, cuts=[SWAP, SL1 + .02])

    def truck_x(t):
        return TRX + tw(t, DV0, DV1, 360, Ease(.5, 0, .85, .6))

    def truck(t):
        op = 1 if EL(t, 9.0) >= 0 and EL(t, W_RST) < 0 else 0
        return 'opacity:%s;transform:translate(%spx,346px)' % (op, fmt(truck_x(t)))
    track('b-truck', DB, truck, cuts=[9.0, W_RST])

    def tbody(t):
        if EL(t, W_RST) >= 0:
            return 'transform:translateY(0px) rotate(0deg)'
        return 'transform:translateY(%spx) rotate(%sdeg)' % (fmt(bounce(t, DV0 + .12, DV1, .45)), fmt(kick(t, DV0 - .02, -1.6)))
    track('b-tbody', DB, tbody, cuts=[W_RST])
    for c, cx in (('b-twr', 40), ('b-twf', 222)):
        track(c, DB, (lambda cx: lambda t: 'transform:translate(%spx,-15px) rotate(%sdeg) translate(%spx,15px)' % (cx, fmt((truck_x(t) - TRX) / 15 * 57.2958, 1), -cx))(cx), cuts=[W_RST], tol=6)

    def door(t):
        if EL(t, W_RST) >= 0:
            return 'transform:scaleX(1)'
        b = (tw(t, DO0, DO0 + .12, 90, E_IN) + tw(t, DO0 + .12, DO0 + .3, 90, E_OUT) + tw(t, DO0 + .34, DO1, 90, E_IN)
             + kick(t, DO1, -9, 3.5, 10))
        return 'transform:scaleX(%s)' % f4(math.cos(math.radians(b)))
    track('b-tdoor', DB, door, cuts=[W_RST])
    anim('b-tarm', DB, [(0, 'transform:scaleY(1)'), (LF0, 'transform:scaleY(1)', E_INOUT), (LF1, 'transform:scaleY(.06)'),
                        (W_RST, 'transform:scaleY(.06)'), (W_RST + .001, 'transform:scaleY(1)')])
    anim('b-tlift', DB, [(0, 'transform:translateY(30px)'), (LF0, 'transform:translateY(30px)', E_INOUT), (LF1, 'transform:translateY(0px)'),
                         (W_RST, 'transform:translateY(0px)'), (W_RST + .001, 'transform:translateY(30px)')])
    anim('b-tfold', DB, [(0, 'transform:rotate(0deg)'), (FO0, 'transform:rotate(0deg)', Ease(.45, 0, .3, 1.12)), (FO1, 'transform:rotate(90deg)'),
                         (W_RST, 'transform:rotate(90deg)'), (W_RST + .001, 'transform:rotate(0deg)')])

    # ---------------------------------------------------------- 5 bis. carte de France
    sx, sy = SAUMUR
    px, py = DEST

    def zoom_on(x, y, k):
        return 'transform:translate(%spx,%spx) scale(%s)' % (fmt(x * (1 - k)), fmt(y * (1 - k)), fmt(k, 4))
    anim('b-map', DB, [(0, 'opacity:0'), (MI0, 'opacity:0'), (MI0 + .001, 'opacity:1'), (MO0 + .14, 'opacity:1', E_SOFT), (MO1, 'opacity:0')])
    anim('b-mdisc', DB, [(0, 'transform:scale(0)'), (MI0, 'transform:scale(0)', Ease(.5, 0, .65, 1)), (MI0 + .46, 'transform:scale(1)'),
                         (MO1, 'transform:scale(1)'), (MO1 + .001, 'transform:scale(0)')])
    anim('b-mcont', DB, [(0, 'opacity:0'), (MI0 + .1, 'opacity:0', E_SOFT), (MI0 + .36, 'opacity:1')])
    anim('b-mz1', DB, [(0, zoom_on(sx, sy, 1.9)), (MI0, zoom_on(sx, sy, 1.9), E_OUT), (MI1, zoom_on(sx, sy, 1))])
    anim('b-mz2', DB, [(0, zoom_on(px, py, 1)), (MO0, zoom_on(px, py, 1), E_IN), (MO1, zoom_on(px, py, 3.2)), (MO1 + .001, zoom_on(px, py, 1))])
    anim('b-mlab', DB, [(0, 'opacity:0;transform:translateY(5px)'), (MI0 + .28, 'opacity:0;transform:translateY(5px)', E_OUT), (MI0 + .62, 'opacity:1;transform:translateY(0px)'),
                        (MO0, 'opacity:1;transform:translateY(0px)', E_SOFT), (MO0 + .16, 'opacity:0;transform:translateY(0px)'), (MO0 + .161, 'opacity:0;transform:translateY(5px)')])
    anim('b-mpulse', DB, [(0, 'opacity:0;transform:scale(.5)'), (MI1 - .21, 'opacity:0;transform:scale(.5)'), (MI1 - .2, 'opacity:.5;transform:scale(.5)', E_OUT), (MI1 + .45, 'opacity:0;transform:scale(2.6)'),
                          (MI1 + .451, 'opacity:0;transform:scale(.5)')])
    anim('b-route', DB, [(0, 'stroke-dashoffset:1px'), (RT0, 'stroke-dashoffset:1px', E_INOUT), (RT1, 'stroke-dashoffset:0px'),
                         (MO1, 'stroke-dashoffset:0px'), (MO1 + .001, 'stroke-dashoffset:1px')])

    def ticon(t):
        if EL(t, RT0 - .12) < 0 or EL(t, PIN + .25) >= 0:
            return 'opacity:0;transform:translate(%spx,%spx) rotate(0deg) scale(0)' % (fmt(sx), fmt(sy))
        f = tw(t, RT0, RT1, 1.0, E_INOUT)
        (x, y), u = route_at(f)
        dxu = 2 * (1 - u) * (ROUTE_C[0] - sx) + 2 * u * (px - ROUTE_C[0])
        dyu = 2 * (1 - u) * (ROUTE_C[1] - sy) + 2 * u * (py - ROUTE_C[1])
        a = .35 * math.degrees(math.atan2(dyu, dxu))
        k = tw(t, RT0 - .12, RT0 + .08, 1, E_BACK) - tw(t, PIN, PIN + .22, 1, E_IN)
        return 'opacity:1;transform:translate(%spx,%spx) rotate(%sdeg) scale(%s)' % (fmt(x), fmt(y), fmt(a, 1), fmt(max(k, 0), 3))
    track('b-ticon', DB, ticon, cuts=[RT0 - .12, PIN + .25])
    for i in range(len(CITIES)):
        t0 = MI0 + .3 + .045 * i
        anim('b-mdot%d' % i, DB, [(0, 'transform:scale(0)'), (t0, 'transform:scale(0)', E_POP), (t0 + .3, 'transform:scale(1)'),
                                   (MO1, 'transform:scale(1)'), (MO1 + .001, 'transform:scale(0)')])
    anim('b-pin', DB, [(0, 'transform:scale(0)'), (PIN, 'transform:scale(0)', E_POP), (PIN + .34, 'transform:scale(1)'), (MO1, 'transform:scale(1)'), (MO1 + .001, 'transform:scale(0)')])

    # ---------------------------------------------------------- 6. pose par le client
    anim('b-inst', DB, [(0, 'opacity:0'), (ROOM_BACK, 'opacity:0'), (ROOM_BACK + .001, 'opacity:1'), (END0, 'opacity:1', E_SOFT), (END0 + .34, 'opacity:0')])
    # couvercle : il se soulève, pivote et va s'appuyer debout contre le mur, à droite de la caisse (la caisse se lit « ouverte »)
    # le couvercle est vu par la tranche sur la caisse (aplati), puis de face (ses planches) quand il est debout contre le mur
    C0, LEAN = (52.0, -44.5), (CRW + 23.0, -73.0, -86.0)

    def rlid(t):
        k0 = 5 / LIDD
        if EL(t, END0 + .4) >= 0:
            x, y, a, k = C0[0], C0[1], 0.0, k0
        else:
            y = C0[1] + tw(t, LID0, LID0 + .2, -20, E_OUT)
            a = tw(t, LID0, LID0 + .2, -6, E_OUT)
            u = tw(t, LID0 + .2, LID0 + .66, 1.0, E_INOUT)
            x = C0[0] + (LEAN[0] - C0[0]) * u
            y += (LEAN[1] - C0[1] + 20) * u - 30 * math.sin(math.pi * u)
            a += (LEAN[2] + 6) * u + kick(t, LID0 + .66, 2.2, 3.2, 9)
            k = k0 + (1 - k0) * tw(t, LID0 + .24, LID0 + .6, 1.0, E_SOFT)
        return 'transform:translate(%spx,%spx) rotate(%sdeg) scale(1,%s)' % (fmt(x), fmt(y), fmt(a, 1), fmt(k, 3))
    track('b-rlid', DB, rlid, cuts=[END0 + .4])
    anim('b-straw', DB, [(0, 'opacity:0;transform:translateY(5px)'), (LID0 + .06, 'opacity:0;transform:translateY(5px)', E_OUT),
                         (LID0 + .3, 'opacity:1;transform:translateY(0px)')])

    def hopper(cls_, t0, start, end, peak, a0, a1):
        def f(t):
            if EL(t, t0) < 0:
                return 'opacity:0;transform:translate(%spx,%spx) rotate(%sdeg) scale(1.12)' % (fmt(start[0]), fmt(start[1]), fmt(a0))
            x, y, u = hop(t, t0 + .04, t0 + .4, (end[0] - start[0], end[1] - start[1]), peak)
            y += kick(t, t0 + .4, 1.6, 4, 12)
            a = a0 + (a1 - a0) * E_SOFT(u)
            k = 1.6 * (.7 + tw(t, t0, t0 + .12, .3, E_OUT))
            return 'opacity:%s;transform:translate(%spx,%spx) rotate(%sdeg) scale(%s)' % (fmt(min(1, EL(t, t0) / .05)), fmt(start[0] + x), fmt(start[1] + y), fmt(a, 1), fmt(k, 3))
        track(cls_, DB, f, cuts=[t0])
    # posés au sol de part et d'autre de la caisse : le sachet à gauche (entre l'étiquette d'étape et la caisse), le guide
    # à droite, au pied du couvercle ; le pochoir AUBOIACIER et les flèches ↑↑ restent entièrement visibles
    hopper('b-bag', BAG0, (CRATE_R[0] + 50, 270), (CRATE_R[0] - 13, 391), 50, 8, -3)
    hopper('b-book', BOOK0, (CRATE_R[0] + 104, 270), (CRATE_R[0] + 226, 392), 58, -10, -5)

    # la visseuse du client entre par la droite, visse le garde-corps dans le tableau, puis ressort
    tip = (OX1 + 2, RAIL_WIN[1] + 39)

    def drill(t):
        x = tip[0] + 420 * (1 - tw(t, DR0, DR1, 1.0, E_OUT)) + tw(t, DR2, DR3, 420, E_IN)
        y = tip[1] + 14 * (1 - tw(t, DR0, DR1, 1.0, E_OUT)) - tw(t, DR2, DR3, 10, E_IN)
        a = -7 * (1 - tw(t, DR0, DR1, 1.0, E_OUT)) + tw(t, DR2, DR3, -6, E_IN)
        if EL(t, DR1) > 0 and EL(t, DR2) < 0:
            k = EL(t, DR1) * 30
            x += .9 * math.sin(k * 2.7) + tw(t, DR1, DR2, -2.4, E_SOFT)
            y += .6 * math.sin(k * 3.9)
        return 'transform:translate(%spx,%spx) rotate(%sdeg)' % (fmt(x), fmt(y), fmt(a, 1))
    track('b-drill', DB, drill, cuts=[DR0, DR3])
    zz = []
    for i in range(7):
        t0 = DR1 + .02 + i * .04
        zz += [(t0, 'opacity:%s' % ('1' if i % 2 == 0 else '.25'))]
    anim('b-dzz', DB, [(0, 'opacity:0'), (DR1, 'opacity:0')] + zz + [(DR2 - .01, 'opacity:0')])

    def irail(t):
        x = RAIL_IN[0] + tw(t, RA0 + .2, RA0 + .62, RAIL_WIN[0] - RAIL_IN[0], E_INOUT)
        dy_tot = RAIL_WIN[1] - RAIL_IN[1]
        y = (RAIL_IN[1] + tw(t, RA0, RA0 + .3, -112, E_OUT) + tw(t, RA0 + .22, RA0 + .62, dy_tot + 112 - 4, E_INOUT)
             + tw(t, RA0 + .62, RA0 + .74, 5.4, E_OUT) + tw(t, RA0 + .74, RA1, -1.4, E_SOFT))
        a = tw(t, RA0 + .05, RA0 + .3, -2.6, E_SOFT) + tw(t, RA0 + .3, RA0 + .62, 2.6, E_SOFT)
        return 'transform:translate(%spx,%spx) translate(90px,34.7px) rotate(%sdeg) translate(-90px,-34.7px)' % (fmt(x), fmt(y), fmt(a))
    track('b-irail', DB, irail)
    anim('b-sheen', DB, [(0, 'transform:translateX(0px)'), (CHK + .05, 'transform:translateX(0px)', E_SOFT), (CHK + .6, 'transform:translateX(124px)'), (CHK + .601, 'transform:translateX(0px)')])
    anim('b-ichk', DB, [(0, 'opacity:0;transform:scale(0)'), (CHK, 'opacity:0;transform:scale(0)', E_POP), (CHK + .36, 'opacity:1;transform:scale(1)')])
    anim('b-ichkp', DB, [(0, 'stroke-dashoffset:1px'), (CHK + .14, 'stroke-dashoffset:1px', E_OUTQ), (CHK + .42, 'stroke-dashoffset:0px')])


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




def nested(cx, cy, c, inner):
    """Groupe animé dont l'origine des transformations est (cx, cy)."""
    return '<g transform="translate(%s,%s)"><g%s><g transform="translate(%s,%s)">%s</g></g></g>' % (fmt(cx), fmt(cy), cls(c), fmt(-cx), fmt(-cy), inner)


def crate_defs(p):
    """Caisse en bois clair (repère : coin bas gauche, 104 × 42) : corps, pochoir, flèches ↑↑, couvercle, têtes de clous."""
    b = [R(0, -CRH, CRW, CRH, '#ead4a9')]
    for y in (-26.3, -15.7):
        b.append(R(0, y - .6, CRW, 1.2, '#cfb07c'))
    for (x, y, w) in ((16, -33, 24), (60, -31.5, 20), (26, -21, 30), (66, -10.5, 18), (14, -10, 16)):
        b.append(R(x, y, w, .7, '#ddc293', .35))
    b.append(R(0, -CRH, 7, CRH, '#dcbb86'))
    b.append(R(CRW - 7, -CRH, 7, CRH, '#dcbb86'))
    b.append(R(0, -CRH, CRW, 5, '#dfc08c'))
    b.append(R(0, -5, CRW, 5, '#d6b47e'))
    b.append(R(7, -37, 1, 32, 'rgba(43,35,32,.09)'))
    b.append(R(7, -37, CRW - 14, 1, 'rgba(43,35,32,.09)'))
    for (x, y) in ((3.5, -38.5), (3.5, -2.5), (100.5, -38.5), (100.5, -2.5), (52, -39.5), (52, -2.5)):
        b.append(Ci(x, y, .8, '#9a8466'))
    mk = ('<text x="11" y="-16.4" textLength="62" lengthAdjust="spacingAndGlyphs" font-family="-apple-system,BlinkMacSystemFont,&quot;Helvetica Neue&quot;,Arial,sans-serif" '
          'font-size="11" font-weight="800" fill="%s">AUBOIACIER</text>' % INK)
    ar = []
    for ax in (82.5, 89.5):
        ar.append(R(ax - .8, -28.5, 1.6, 9.5, INK))
        ar.append(poly([(ax - 3, -27.5), (ax, -32), (ax + 3, -27.5)], INK))
    ar.append(R(79.2, -18, 13.6, 1.6, INK))
    lid = R(-2, -47, CRW + 4, 5, '#dcbb86', 1) + R(-2, -47, CRW + 4, 1.3, '#efdcb6', .6) + R(0, -42, CRW, 1, 'rgba(43,35,32,.16)')
    heads = ''.join(R(x - 1.6, -48.2, 3.2, 1.2, '#6f6559', .4) for x in NAIL_X)
    return ('<g id="%s-cbody">%s</g><g id="%s-cmk" opacity=".86">%s</g><g id="%s-car" opacity=".86">%s</g>'
            '<g id="%s-clid">%s</g><g id="%s-cheads">%s</g>'
            '<g id="%s-cfull"><use href="#%s-cbody"/><use href="#%s-cmk"/><use href="#%s-car"/><use href="#%s-clid"/><use href="#%s-cheads"/></g>') % (
        p, ''.join(b), p, mk, p, ''.join(ar), p, lid, p, heads, p, p, p, p, p, p)


def nail():
    """Clou planté à moitié (sa tête dépasse du couvercle de 5) : origine sur le dessus du couvercle."""
    return R(-.45, -5, .9, 10, '#8d9298') + R(-1.6, -6.2, 3.2, 1.2, '#6f6559', .4)


def hammer():
    """Marteau : panne (face de frappe en y = 0), manche en chêne vers la droite (main en x = 24)."""
    return (R(-3.2, -12.5, 6.4, 12.5, '#5d6168', 1) + R(-3.2, -12.5, 6.4, 2.2, '#73777e', .8) +
            R(3, -7.6, 26, 3.2, OAK, 1.4) + R(19, -7.9, 10, 3.8, '#a9824f', 1.6))


def crate_in(p):
    """Caisse de l'atelier, découpée par la porte (dessinée avec l'établi) : elle glisse, couvercle, clous, pochoir."""
    g = ['<g transform="translate(%s,%s)"><g%s>' % (CRATE_W[0], CRATE_W[1], cls('b-cin'))]
    g.append(E(52, .5, 58, 2.6, 'rgba(43,35,32,.16)'))
    g.append('<use href="#%s-cbody"/>' % p)
    g.append(nested(41.5, -21, 'b-cmk', '<use href="#%s-cmk"/>' % p))
    g.append(nested(86, -24, 'b-car', '<use href="#%s-car"/>' % p))
    nails = ''.join('<g transform="translate(%s,-47)"><g%s>%s</g></g>' % (x, cls('b-nail%d' % i), nail()) for i, x in enumerate(NAIL_X))
    g.append('<g%s>%s<use href="#%s-clid"/></g>' % (cls('b-clid'), nails, p))
    g.append('<g%s>%s</g>' % (cls('b-ham'), hammer()))
    g.append('</g></g>')
    return ''.join(g)


def truck_b():
    """Petit porteur de transporteur, gris clair, SANS nom ni logo (≠ l'utilitaire sombre « AUBOIACIER » de l'atelier).
    Repère : arrière de la caisse au sol ; avance vers la droite. Hayon à l'arrière, porte arrière gauche visible."""
    b = []
    b.append(R(-2, -34, 254, 8, '#4a4e55', 1.5))
    b.append(R(118, -30, 36, 11, '#5d6168', 3))
    b.append(P('M23,-26A17,17 0 0 1 57,-26Z', '#2e3236'))
    b.append(P('M205,-26A17,17 0 0 1 239,-26Z', '#2e3236'))
    b.append(R(0, -146, 190, 112, '#e2e5e7', 3))
    b.append(R(-1, -147, 192, 4, '#eff1f2', 2))
    b.append(R(0, -143, 190, 3, 'rgba(43,35,32,.05)'))
    for x in (38, 76, 114, 152):
        b.append(R(x, -142, 1, 102, 'rgba(43,35,32,.07)'))
    b.append(R(0, -40, 190, 6, '#ccd1d4'))
    b.append(R(0, -146, 3.5, 112, '#c6cbce'))
    b.append(R(186.5, -146, 3.5, 112, '#d3d7da'))
    # cabine
    b.append(P('M192,-34V-104Q192,-108 196,-108H226Q231,-108 234,-103L250,-72Q254,-68 254,-62V-38Q254,-34 250,-34Z', '#d0d5d8'))
    b.append(P('M199,-101H225Q228,-101 230,-98L243,-75H199Z', '#b4bcc2'))
    b.append(poly([(206, -101), (213, -101), (203, -75), (199, -75), (199, -88)], '#c7cdd2'))
    b.append(R(197, -101, 1.2, 64, 'rgba(43,35,32,.18)'))
    b.append(R(208, -69, 7, 1.8, '#8a9096', .8))
    b.append(E(248, -86, 2.2, 4.2, '#8a9096'))
    b.append(R(248, -55, 6, 6, '#f1e3cb', 1.6))
    b.append(R(234, -41, 22, 8, '#9aa0a5', 2))
    for k in range(3):
        b.append(R(251, -66 + k * 3.6, 3, 1.4, '#a9afb4'))
    b.append(R(196, -36, 18, 3, '#7c8288', 1.2))
    # porte arrière (ouverte, rabattue contre le flanc ; elle pivote sur la charnière x = 0)
    d = (R(0, -144, 50, 106, '#d4d8db', 1.5) + R(0, -144, 50, 2.5, '#dfe2e4') + R(41, -140, 2.4, 98, '#9aa0a5', 1.2) +
         R(36, -96, 9, 2.6, '#80868c', 1.2) + R(0, -132, 3, 7, '#80868c') + R(0, -60, 3, 7, '#80868c') + R(48.5, -144, 1.5, 106, 'rgba(43,35,32,.14)'))
    b.append('<g%s>%s</g>' % (cls('b-tdoor'), d))
    # hayon (pivote sur l'arrière du plancher)
    # hayon : plateau épais (tôle larmée claire, chant sombre), bras de levage sous le châssis
    hay = (R(-HAY, 0, HAY, 8.5, '#767c82', 1.2) + R(-HAY, 0, HAY, 2.6, '#d3d7da', .8) +
           ''.join(R(-HAY + 8 + 12 * i, 4.2, 6, 1.1, '#5d6168', .5) for i in range(8)) +
           R(-HAY - 1, -2.6, 3.8, 11.1, '#4a4e55', 1) + R(-6, -1.2, 7, 10.5, '#4a4e55', 1.5))
    lift = '<g transform="translate(0,-34)"><g%s><g%s>%s</g></g></g>' % (cls('b-tlift'), cls('b-tfold'), hay)
    arm = ('<g transform="translate(0,-27)"><g%s>' % cls('b-tarm') +
           poly([(4, 0), (11, 0), (-6, 23), (-13, 23)], '#4a4e55') + poly([(15, 0), (21, 0), (5, 23), (-1, 23)], '#5d6168') + '</g></g>')

    def wheel(cx, c):
        w = [Ci(cx, -15, 15, '#1f1a18'), Ci(cx, -15, 8.6, '#8a8e94'), Ci(cx, -15, 6.6, '#767a80')]
        for i in range(5):
            a = i * 2 * math.pi / 5
            w.append(Ci(cx + 3.9 * math.cos(a), -15 + 3.9 * math.sin(a), 1.05, '#5d6168'))
        w.append(Ci(cx, -15, 1.8, '#a4a8ad'))
        return '<g%s>%s</g>' % (cls(c), ''.join(w))
    return ('<g%s>' % cls('b-truck') +
            poly([(-4, 0), (256, 0), (222, 8), (-38, 8)], 'rgba(43,35,32,.09)') + E(126, .2, 130, 3.6, 'rgba(43,35,32,.2)') +
            '<g%s>%s%s%s</g>' % (cls('b-tbody'), arm, ''.join(b), lift) + wheel(40, 'b-twr') + wheel(222, 'b-twf') + '</g>')


def ship_b(p):
    """Plan moyen du monde, devant l'atelier : la caisse (copie non découpée) puis le camion."""
    return ('<g transform="translate(%s,%s)"><g%s><use href="#%s-cfull"/></g></g>' % (CRATE_W[0], CRATE_W[1], cls('b-cout'), p) +
            '<g%s>%s</g>' % ('', truck_b()))


def map_b(p):
    """Carte de France (contour simplifié, vrais points lon/lat), la Loire, Saumur, le trajet jusque chez le client."""
    def path(pts, close=True):
        q = [proj(*a) for a in pts]
        return 'M' + ' L'.join('%s,%s' % (fmt(x, 1), fmt(y, 1)) for x, y in q) + (' Z' if close else '')
    fr, co = path(FRANCE), path(CORSE)
    sx, sy = SAUMUR
    dx, dy = DEST
    o = ['<g%s><g transform="translate(%s,%s)"><g%s>%s</g></g><g%s><g%s><g%s>' % (
        cls('b-map'), fmt(sx, 1), fmt(sy, 1), cls('b-mdisc'), Ci(0, 0, 500, '#ebe3d6'), cls('b-mcont'), cls('b-mz1'), cls('b-mz2'))]
    o.append('<g transform="translate(5,7)" fill="rgba(43,35,32,.07)"><path d="%s"/><path d="%s"/></g>' % (fr, co))
    o.append('<path d="%s" fill="%s"/><path d="%s" fill="%s"/>' % (fr, PAPER, co, PAPER))
    o.append('<path d="%s" fill="none" stroke="#c9d3d4" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>' % path(LOIRE, False))
    for i, (cx_, cy_) in enumerate(CITIES):
        o.append('<g transform="translate(%s,%s)"><g%s>%s</g></g>' % (fmt(cx_, 1), fmt(cy_, 1), cls('b-mdot%d' % i), Ci(0, 0, 3.2, GOLD, ' opacity=".5"')))
    o.append('<path%s d="M%s,%s Q%s,%s %s,%s" pathLength="1" fill="none" stroke="%s" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="1 1"/>' % (
        cls('b-route'), fmt(sx, 1), fmt(sy, 1), fmt(ROUTE_C[0], 1), fmt(ROUTE_C[1], 1), fmt(dx, 1), fmt(dy, 1), GOLD))
    o.append('<g transform="translate(%s,%s)"><g%s>%s</g></g>' % (fmt(sx, 1), fmt(sy, 1), cls('b-mpulse'), '<circle r="9" fill="none" stroke="%s" stroke-width="1.6"/>' % INK))
    o.append(Ci(sx, sy, 5.2, INK, ' stroke="%s" stroke-width="2"' % PAPER))
    o.append('<g%s><text x="%s" y="%s" text-anchor="end" class="aplat-mapl">Saumur</text></g>' % (cls('b-mlab'), fmt(sx - 6, 1), fmt(sy - 10, 1)))
    pin = ('<ellipse cx="0" cy="0" rx="6" ry="2" fill="rgba(43,35,32,.18)"/>'
           '<path d="M0,0C-3,-6 -10,-11 -10,-19A10,10 0 1 1 10,-19C10,-11 3,-6 0,0Z" fill="%s"/>'
           '<path d="M-5,-18.2L0,-23.4L5,-18.2V-13.6H-5Z" fill="%s"/><rect x="-1.3" y="-17" width="2.6" height="3.4" fill="%s"/>') % (INK, PAPER, INK)
    o.append('<g transform="translate(%s,%s)"><g%s><g class="aplat-tic">%s</g></g></g>' % (fmt(dx, 1), fmt(dy, 1), cls('b-pin'), pin))
    ic = ('<g transform="scale(1.6)">' + R(-11, -6, 14, 9, '#aab0b5', 1.2) + P('M3.6,-3.5H7.2Q8.4,-3.5 9,-2.4L10.6,.4V3H3.6Z', '#6c7278') +
          R(4.6, -2.4, 3, 1.8, '#c8ced2', .4) + Ci(-6.5, 3.4, 1.9, INK) + Ci(6.6, 3.4, 1.9, INK) + '</g>')
    o.append('<g%s><g class="aplat-tic">%s</g></g>' % (cls('b-ticon'), ic))
    o.append('</g></g></g></g>')
    return ''.join(o)


def bag():
    """Sachet de visserie (repère : bas, au centre) : sachet transparent à fermeture, grosses vis bien lisibles."""
    s = [E(0, .5, 15, 2, 'rgba(43,35,32,.12)')]
    s.append(P('M-13,0H13Q15,0 15,-2V-27H-15V-2Q-15,0 -13,0Z', '#e8edef', ' stroke="#aeb6bb" stroke-width="1"'))
    s.append(poly([(-15, -27), (-7, -27), (-15, -14)], 'rgba(255,255,255,.7)'))
    s.append(R(-15, -31.5, 30, 5, '#aeb6bb', 1.4))
    s.append(R(-15, -27.4, 30, 1.2, '#5d6168'))

    def screw(x, y, a):
        g = (R(-3.6, -1.6, 7.2, 2.8, '#4a4e55', 1.3) +
             poly([(-1.4, 1.2), (1.4, 1.2), (1.1, 10.4), (0, 13), (-1.1, 10.4)], '#80868c') +
             ''.join(R(-1.7, 3 + 2.3 * k, 3.4, .8, '#4a4e55', .3) for k in range(4)))
        return '<g transform="translate(%s,%s) rotate(%s)">%s</g>' % (x, y, a, g)
    s.append(screw(-7, -23, -26) + screw(1.5, -24, 8) + screw(9, -21.5, 34) + screw(-10, -8.5, -78))
    return ''.join(s)


def drill_svg():
    """Visseuse du client (repère : pointe de l'embout, outil tourné vers la gauche) ; traits de rotation animés."""
    d = [R(0, -1.3, 13, 2.6, '#9aa0a5', 1),
         poly([(12, -3.6), (22, -5.6), (22, 5.6), (12, 3.6)], '#5d6168'), R(19.6, -5.6, 1.6, 11.2, '#80868c'),
         R(22, -9, 40, 18, INK, 7), R(24, -9, 6, 18, GOLD),
         R(31, -7.4, 26, 1.8, 'rgba(255,255,255,.14)', .9),
         R(51, -4.5, 1.5, 9, '#4a4340', .7), R(55, -4.5, 1.5, 9, '#4a4340', .7),
         poly([(40, 6), (54, 6), (58, 33), (45, 33)], INK), R(39.2, 8.5, 4, 7.5, GOLD, 1.8),
         R(38, 32, 28, 10, '#3a3330', 2.5), R(38, 32, 28, 2.4, GOLD, 1.2)]
    zz = ('<g%s fill="none" stroke="%s" stroke-width="1.5" stroke-linecap="round">'
          '<path d="M13,-9 Q17,-12.5 21,-10"/><path d="M13,9 Q17,12.5 21,10"/><path d="M-3,-5 L-7,-8"/><path d="M-3,5 L-7,8"/></g>') % (cls('b-dzz'), INK)
    return '<g class="aplat-dk"><g transform="scale(.75)">%s%s</g></g>' % (''.join(d), zz)


LIDD = 40        # profondeur de la caisse : le couvercle vu de face fait 108 × 40


def lid_face():
    """Couvercle de la caisse vu de face (centré), planches, deux traverses clouées."""
    h = LIDD / 2
    g = [R(-54, -h, 108, LIDD, '#dcbb86', 1.5), R(-54, -h, 108, 2, '#efdcb6', 1)]
    for y in (-h + LIDD / 3, -h + 2 * LIDD / 3):
        g.append(R(-54, y - .6, 108, 1.2, '#c6a671'))
    for x in (-47, 40):
        g.append(R(x, -h, 7, LIDD, '#cfab74'))
        for y in (-h + 4, 0, h - 4):
            g.append(Ci(x + 3.5, y, .9, '#6f6559'))
    return ''.join(g)


def straw():
    """Papier de calage froissé qui dépasse de la caisse ouverte (repère de la caisse)."""
    t = []
    for (x0, x1, hs) in ((5, 36, (5, 8.5, 6, 9.5, 5.5, 7.5)), (34, 70, (6.5, 9, 5, 8, 10, 6)), (68, 99, (7, 5.5, 9, 6.5, 8.5, 4.5))):
        n = len(hs)
        pts = [(x0, -41.5)]
        for i, h in enumerate(hs):
            pts.append((x0 + (x1 - x0) * (i + .5) / n, -41.5 - h))
        pts.append((x1, -41.5))
        t.append(poly(pts, '#f4ecdd'))
        t.append(poly([(x0 + 3, -41.5), (x0 + (x1 - x0) * .4, -44.5), (x1 - 4, -41.5)], '#e4d7c0'))
    return ''.join(t)


def booklet():
    """Guide de pose (repère : bas, au centre)."""
    s = [E(1, .5, 17, 2, 'rgba(43,35,32,.12)')]
    s.append(R(-14.6, -40, 31, 40, '#e9e1d4', 2))
    s.append(R(-16, -40, 31, 40, PAPER, 2))
    s.append(R(-16, -40, 31, 9, GOLD, 2))
    s.append(R(-16, -33, 31, 2, GOLD))
    s.append(R(-10.6, -29.4, 20.2, 1.8, OAK, .7))
    for (x, y, w, h) in ((-10, -27.6, 19, .8), (-10, -19.4, 19, .8), (-10, -27.6, .8, 9), (-.9, -27.6, .8, 9), (8.2, -27.6, .8, 9)):
        s.append(R(x, y, w, h, INK))
    s.append('<path d="M-9.4,-27L-1.4,-19.6M-9.4,-19.6L-1.4,-27M-.3,-27L7.9,-19.6M-.3,-19.6L7.9,-27" stroke="%s" stroke-width=".7"/>' % INK)
    for k, w in enumerate((19, 14, 17)):
        s.append(R(-10, -15 + k * 4, w, 1.5, '#ddd5c8', .7))
    return ''.join(s)


def stamp_b(p):
    """Tampon vert « Commandé ✓ » posé sur le devis (encre légèrement usée : masque à petits points)."""
    rnd = random.Random(5)
    dots = ''.join('<circle cx="%s" cy="%s" r="%s" fill="#000"/>' % (fmt(rnd.uniform(-76, 76), 1), fmt(rnd.uniform(-22, 22), 1), fmt(rnd.uniform(.5, 1.3), 1)) for _ in range(34))
    mask = '<mask id="%s-ink" maskUnits="userSpaceOnUse" x="-90" y="-40" width="180" height="80"><rect x="-90" y="-40" width="180" height="80" fill="#fff"/>%s</mask>' % (p, dots)
    ink = ('<rect x="-76" y="-22" width="152" height="44" rx="8" fill="none" stroke="%s" stroke-width="2.8"/>'
           '<rect x="-70.5" y="-16.5" width="141" height="33" rx="4.5" fill="none" stroke="%s" stroke-width="1"/>'
           '<text x="-63" y="7" textLength="94" lengthAdjust="spacingAndGlyphs" class="aplat-stamptx">Commandé</text>'
           '<path d="M42,-.5 L48.5,6.5 L60,-8" fill="none" stroke="%s" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>') % (GREEN, GREEN, GREEN)
    return ('%s<g transform="translate(122,203) rotate(-8)"><g%s>%s</g><g%s><g mask="url(#%s-ink)">%s</g></g></g>' % (
        mask, cls('b-sflash'), '<rect x="-76" y="-22" width="152" height="44" rx="8" fill="none" stroke="%s" stroke-width="5" opacity=".35"/>' % GREEN,
        cls('b-stamp'), p, ink))


def scene_B(p):
    W = OX1 - OX0
    s = []
    s.append('<svg class="aplat-svg" viewBox="0 0 720 %d" role="img" aria-label="Film : vous prenez deux mesures, vous commandez au prix affiché, '
             'l\'atelier de Saumur fabrique le garde-corps, l\'emballe en caisse et l\'expédie par transporteur partout en France ; vous le posez vous-même.">' % VHB)
    s.append('<defs>%s<radialGradient id="%s-wall" cx="%s" cy="130" r="470" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f8f3ec"/><stop offset="1" stop-color="#ebe3d7"/></radialGradient>'
             '<linearGradient id="%s-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e1e5e2"/><stop offset="1" stop-color="#eee7da"/></linearGradient>'
             '<clipPath id="%s-b1"><rect x="%s" y="%s" width="%s" height="20"/></clipPath>'
             '<clipPath id="%s-b2"><rect x="%s" y="%s" width="20" height="%s"/></clipPath>'
             '<linearGradient id="%s-push" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2b2320" stop-opacity=".16"/><stop offset="1" stop-color="#2b2320" stop-opacity="0"/></linearGradient>'
             '<filter id="%s-blur" x="-30%%" y="-30%%" width="160%%" height="160%%"><feGaussianBlur stdDeviation="9"/></filter>%s</defs>' % (
                 world_defs(p), p, fmt(CXW), p, p, fmt(CASE1[0] + CW / 2), fmt(CASE1[1] + BDY - 10), fmt(OX1 + 4 - CASE1[0] - CW / 2),
                 p, fmt(L2X - 10), OY1 + SILL_T - 4, fmt(CASE2[1] - CW / 2 - (OY1 + SILL_T - 4)), p, p, crate_defs(p)))
    s.append('<g%s>' % cls('finb-cam'))

    # ---- le monde de l'atelier (temps 3 à 5) : même décor et même établi que le film C, sans l'utilitaire de l'atelier
    bench = '<g%s>%s</g>%s' % (cls('b-blift'), bench_parts('b', DB, OFF, HID_B, share=True), crate_in(p))
    s.append('<g%s>%s</g>' % (cls('b-wwrap'), world(p, 'b', VHB, bench=bench, house_rail=ship_b(p), van_on=False, xmax=800, castle=False)))

    # ---- la pièce (temps 1, 2 et 6), qui bouge d'un bloc avec sa caméra
    s.append('<g%s><g%s>' % (cls('b-rwrap'), cls('b-room')))
    XL, XW = -120, 960
    s.append(R(XL, 0, XW, VHB + 40, 'url(#%s-wall)' % p))
    s.append(R(XL, FLOOR, XW, VHB + 40 - FLOOR, '#dcc6a2'))
    XR, YB = XL + XW, VHB + 40
    for i in range(-12, 14):
        xt = CXW + i * 46
        xb = CXW + i * 46 * 1.45
        if not XL < xt < XR:
            continue
        yb = YB
        if not XL <= xb <= XR:     # lames coupées au bord de la pièce (rien ne dépasse sur l'atelier pendant le panoramique)
            xe = XR if xb > XR else XL
            yb = FLOOR + (YB - FLOOR) * (xe - xt) / (xb - xt)
            xb = xe
        s.append(P('M%s,%s L%s,%s' % (fmt(xt), FLOOR, fmt(xb), fmt(yb)), 'none', ' stroke="#cfb68f" stroke-width=".9"'))
    # ombre portée du bord droit de la pièce : pendant le panoramique, la pièce se lit comme un plan qui glisse sur l'atelier
    s.append(R(XR, 0, 26, YB, 'url(#%s-push)' % p))
    s.append(poly([(OX0, FLOOR), (OX1, FLOOR), (OX1 + 92, VHB + 40), (OX0 + 30, VHB + 40)], '#ead7b4', ' opacity=".85"'))
    s.append(R(XL, FLOOR - 11, XW, 11, '#f6f2ec'))
    s.append(R(XL, FLOOR - 11.4, XW, 1, '#e2d9cc'))
    s.append(R(XL, FLOOR, XW, 1.4, 'rgba(43,35,32,.08)'))
    px, pb = 84, FLOOR
    s.append(poly([(px - 23, pb), (px + 23, pb), (px - 31, pb + 22), (px - 93, pb + 22)], 'rgba(43,35,32,.05)'))
    for (ang, ln, wd) in ((-30, 78, 10), (-12, 104, 11), (8, 96, 10.5), (26, 72, 9.5), (-20, 60, 9), (2, 66, 9)):
        s.append('<g transform="translate(%s,%s) rotate(%s)">%s</g>' % (px, pb - 40, ang, E(0, -ln / 2, wd, ln / 2, '#aaa58c' if ang < 0 else '#bab59c')))
    s.append(P('M%s,%s H%s L%s,%s H%s Z' % (px - 22, pb - 42, px + 22, px + 17, pb, px - 17), '#3b3532'))
    s.append(R(px - 24, pb - 44, 48, 5, '#2b2320', 1.5))
    # fenêtre vue de l'intérieur : tableau, dormant, deux vantaux à petits bois, espagnolette dorée
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
    # mètre ruban
    s.append('<g clip-path="url(#%s-b1)"><g transform="translate(0,%s)"><g%s>%s</g></g></g>' % (p, fmt(CASE1[1] + BDY), cls('b-blade1'), tape_strip()))
    s.append('<g clip-path="url(#%s-b2)"><g transform="translate(%s,0)"><g%s>%s</g></g></g>' % (p, L2X, cls('b-blade2'), tape_strip(True)))
    s.append('<g%s>%s</g>' % (cls('b-case'), tape_case()))
    # cotes
    s.append('<g%s>%s%s</g>' % (cls('b-cext0'), R(OX0 - .6, Y1 - 9, 1.2, OY0 - Y1 + 5, INK), R(OX1 - .6, Y1 - 9, 1.2, OY0 - Y1 + 5, INK)))
    for x2 in (OX0, OX1):
        s.append('<path%s d="M%s,%s H%s" pathLength="1" stroke="%s" stroke-width="2" fill="none" stroke-dasharray="1 1"/>' % (cls('b-chalf0'), fmt(CXW), Y1, x2, INK))
    for x in (OX0, OX1):
        s.append('<path%s d="M%s,%s L%s,%s" stroke="%s" stroke-width="2.2" fill="none"/>' % (cls('b-ctick0'), fmt(x - 4.5), Y1 + 4.5, fmt(x + 4.5), Y1 - 4.5, INK))
    s.append('<g transform="translate(%s,%s)"><g class="aplat-zkb"><g%s>%s</g></g></g>' % (fmt(CXW), Y1 - 7, cls('b-cchip0'), chip_B(1, '1&#8239;000 mm', 132, dy=-16)))
    for y2 in (OY1, FLOOR):
        s.append('<path%s d="M%s,%s V%s" pathLength="1" stroke="%s" stroke-width="2" fill="none" stroke-dasharray="1 1"/>' % (cls('b-chalf1'), L2X, YM2, y2, INK))
    for y in (OY1, FLOOR):
        s.append('<path%s d="M%s,%s L%s,%s" stroke="%s" stroke-width="2.2" fill="none"/>' % (cls('b-ctick1'), L2X - 4.5, fmt(y + 4.5), L2X + 4.5, fmt(y - 4.5), INK))
    s.append('<g%s></g>' % cls('b-cext1'))
    s.append('<g transform="translate(%s,%s)"><g class="aplat-zkb"><g%s>%s</g></g></g>' % (L2X, YM2, cls('b-cchip1'), chip_B(2, '650 mm', 118)))
    # temps 6 : la caisse livrée, le garde-corps qui en sort et se pose, visserie, guide de pose, coche
    s.append('<g%s>' % cls('b-inst'))
    crate_at = '<g transform="translate(%s,%s) scale(%s)">' % (CRATE_R[0], CRATE_R[1], fmt(RS, 4))
    s.append(crate_at + R(0, -47, CRW, 2, '#dcbb86') + R(1.5, -45.2, CRW - 3, 3.4, '#b3925f') + '</g>')
    s.append('<g%s><g transform="scale(%s)"><g class="aplat-railshadow" transform="translate(-3.2,3.6)">%s</g>%s</g></g>' % (
        cls('b-irail'), fmt(RS, 4), railing_static(p), railing_static(p, sheen=True, sc='b')))
    s.append(crate_at)
    s.append('<g%s>%s</g>' % (cls('b-straw'), straw()))
    s.append('<g%s>%s</g>' % (cls('b-rlid'), lid_face()))
    s.append(E(52, .6, 60, 3, 'rgba(43,35,32,.14)'))
    s.append('<use href="#%s-cbody"/><use href="#%s-cmk"/><use href="#%s-car"/>' % (p, p, p))
    s.append('</g>')
    s.append('<g%s><g class="aplat-dk">%s</g></g>' % (cls('b-bag'), bag()))
    s.append('<g%s><g class="aplat-dk">%s</g></g>' % (cls('b-book'), booklet()))
    s.append('<g%s>%s</g>' % (cls('b-drill'), drill_svg()))
    s.append('<g transform="translate(%s,%s)"><g class="aplat-zkb"><g%s>%s<path%s d="M-5.2,.3 L-1.5,4 L5.5,-4" pathLength="1" stroke="%s" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 1"/></g></g></g>'
             % (OX1 + 24, fmt(RAIL_WIN[1] + 4), cls('b-ichk'), Ci(0, 0, 11.5, GREEN), cls('b-ichkp'), PAPER))
    s.append('</g>')
    s.append('</g>')
    # devis (la même carte que dans le film C) + tampon « Commandé »
    s.append('<g%s><g transform="translate(%s,%s)"><g class="aplat-dzb">%s</g></g></g>' % (
        cls('b-devis'), fmt(QX), fmt(QY), nested(QW / 2, QH / 2, 'b-dbump', quote_card(p, 'b', DB, T_ROLL, B_RST) + stamp_b(p))))
    s.append('</g>')
    # carte de France (temps 5, fin)
    s.append(map_b(p))
    s.append('</g>')
    s.append(fin_card(p, 'b', DB_N, F0_B))
    s.append('</svg>')
    return ''.join(s)


# ---------------------------------------------------------------- horloges des films (+ écran de fin, voir fin_card)
# Temps de lecture ajoutés juste après chaque image clé (instant d'origine, secondes ajoutées), choisis à des moments où
# aucun geste composé n'est à mi-course (seuls des amortis finissent de se poser). Cadences fixées lors du ralentissement
# (C : 24 s sans écran de fin, B : 1,03) ; les temps ajoutés ensuite allongent le film sans rien accélérer.
S0_C = (24.0 - 3.8) / DC
HOLDS_C = [(3.27, 1.15),    # 1 la cote 1 000 mm et la coche sont posées
           (5.95, 1.1),     # 2 le devis complet, 320 € souligné
           (9.95, 1.4),     # 3 le garde-corps fini sur l'établi (main courante posée)
           (10.44, .45),    # 4 l'utilitaire chargé (garde-corps sur le toit) devant l'atelier, avant de partir
           (14.9, .3)]      #   image finale (garde-corps posé)
FIN_P_C = WH - .03          # fin de l'image finale : fondu vers l'écran de fin (le panoramique de retour se fait dessous)
CLOCKS[DC] = (S0_C, HOLDS_C + fin_holds(S0_C, FIN_P_C, DC))
S0_B = 1.03
HOLDS_B = [(1.565, .55),    # 1 la cote ① 1 000 mm
           (2.895, .9),     #   les deux cotes posées, avant le recul de la caméra
           (4.605, 1.2),    # 2 le devis complet, 320 €, avant le tampon
           (5.2, 1.25),     #   « Commandé » tamponné
           (8.335, 1.5),    # 3 le garde-corps fini sur l'établi
           (8.995, .45),    # 4 le garde-corps soulevé au-dessus de sa caisse, avant de descendre dedans
           (10.565, 1.4),   #   la caisse fermée, AUBOIACIER et ↑↑ au pochoir
           (11.09, .5),     # 5 la caméra arrive devant le camion du transporteur, hayon baissé
           (11.53, .35),    #   la caisse posée sur le hayon
           (11.87, .25),    #   le hayon monté
           (12.79, .4),     #   portes fermées, hayon replié : le camion va partir
           (14.6, 1.45),    #   la carte de France : trajet Saumur -> client, épingle posée
           (16.01, 1.4),    # 6 la caisse ouverte, visserie et guide de pose au sol
           (16.885, .35),   #   le garde-corps posé dans la fenêtre, avant la visseuse
           (18.3, 1.5)]     #   image finale : garde-corps posé et vissé, coche verte
FIN_P_B = END0 - .002
CLOCKS[DB] = (S0_B, HOLDS_B + fin_holds(S0_B, FIN_P_B, DB))
DC_N, DB_N = new_dur(DC), new_dur(DB)
F0_C, F0_B = MT(FIN_P_C, CLOCKS[DC]), MT(FIN_P_B, CLOCKS[DB])


# ================================================================ page
def card(scene, tag, title, text, btn, sm=False, scls='', labels=''):
    return ('<article class="aplat-card%s"><div class="aplat-card-scene ' + scls + '">%s%s</div><div class="aplat-card-body">'
            '<span class="aplat-tag">%s</span><h2 class="aplat-card-title">%s</h2><p class="aplat-card-text">%s</p>'
            '<button type="button" class="aplat-btn">%s</button></div></article>') % (' aplat-sm' if sm else '', scene, labels, tag, title, text, btn)


CAPS = ["Nous venons prendre les cotes", "Vous recevez le prix exact", "Fabrication à l'atelier, à Saumur", "Pose de votre garde-corps"]
# étiquettes d'étape posées sur les cartes (HTML : le site les traduit) ; numéro doré, texte anthracite
LABELS_C = ["Nous venons mesurer", "Vous recevez le prix exact", "Fabrication à Saumur", "Pose par l'atelier"]
LABELS_B = ["Vous mesurez", "Le prix s'affiche, vous commandez", "Fabrication à Saumur", "Emballé avec soin", "Livré partout en France", "Vous le posez"]


def labels(kind, texts):
    return ''.join('<span class="aplat-et aplat-et%s%d"><b>%d</b> · %s</span>' % (kind, i, i + 1, t) for i, t in enumerate(texts))


def panel(scene, sm=False):
    bars = ''.join('<span class="aplat-bar"><i class="aplat-fill%d"></i></span>' % i for i in range(4))
    caps = ''.join('<p class="aplat-cap aplat-cap%d"><span class="aplat-capn">0%d</span>%s</p>' % (i, i + 1, c) for i, c in enumerate(CAPS))
    return ('<section class="aplat-panel%s"><h2 class="aplat-panel-title">Nous nous occupons de tout</h2>'
            '<p class="aplat-panel-sub">De la prise de cotes à la pose, un seul interlocuteur&nbsp;: l\'atelier.</p>'
            '<div class="aplat-film">%s</div><div class="aplat-progress">%s</div><div class="aplat-caps">%s</div></section>') % (' aplat-sm' if sm else '', scene, bars, caps)


def build_html_anims():
    # écrit directement dans le temps affiché du film C (DC_N) : chaque trait couvre tout son chapitre, pauses comprises,
    # et les légendes changent exactement au changement de chapitre du film, avec des fondus courts (jamais étirés).
    # Écran de fin : les 4 traits restent pleins, la légende 04 s'efface doucement ; au retour de la première image, les
    # traits s'effacent et repartent de zéro, la légende 01 revient.
    clk = CLOCKS[DC]
    k = clk[0]

    def N(x):
        return MT(x, clk)
    bounds = [(0, T2), (T2, T3), (T3, T4), (T4, LAND)]
    r0 = F0_C + FIN_L - FIN_REV
    for i, (a, b) in enumerate(bounds):
        anim('fill%d' % i, DC_N, [(0, 'opacity:1;transform:scaleX(0)'), (N(a), 'opacity:1;transform:scaleX(0)'), (N(b), 'opacity:1;transform:scaleX(1)'),
                                  (r0, 'opacity:1;transform:scaleX(1)', E_SOFT), (r0 + .32, 'opacity:0;transform:scaleX(1)'), (r0 + .33, 'opacity:0;transform:scaleX(0)'),
                                  (r0 + .34, 'opacity:1;transform:scaleX(0)')], mode='raw')
    # légendes : la sortante part vers le haut, l'entrante arrive dès qu'elle a disparu (pas de trou)
    hid, vis, gone = 'opacity:0;transform:translateY(10px)', 'opacity:1;transform:translateY(0px)', 'opacity:0;transform:translateY(-8px)'
    anim('cap0', DC_N, [(0, vis), (N(T2) - .25 * k, vis, E_SOFT), (N(T2) + .03 * k, gone), (N(T2) + .031 * k, hid), (r0 + .1, hid, E_OUT), (r0 + .55, vis)], mode='raw')
    ends = [N(T3), N(T4), F0_C + .75]
    starts = [N(T2), N(T3), N(T4)]
    for i in range(1, 4):
        st, en = starts[i - 1], ends[i - 1]
        fade = .55 if i == 3 else .28 * k
        anim('cap%d' % i, DC_N, [(0, hid), (st + .03 * k, hid, E_OUT), (st + .48 * k, vis), (en - fade, vis, E_SOFT), (en, gone), (en + .001, hid)], mode='raw')
    # étiquettes d'étape des cartes : film C (mêmes chapitres que les légendes du panneau) et film B (six étapes)
    step_labels('C', DC_N, [0, N(T2), N(T3), N(T4)], F0_C)
    cb = CLOCKS[DB]
    step_labels('B', DB_N, [0, MT(T_PAN, cb), MT(WHIP0, cb) + .1, MT(PK0, cb), MT(SP0, cb), MT(MO0 + .17, cb)], F0_B)


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
    # le film C dans la carte de l'atelier (comme sur le site), au bureau et au téléphone
    kC, qC = scene_C('kC'), scene_C('qC')
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
    tA = ('Sans rien mesurer', "L'atelier vient mesurer", 'Nous prenons les cotes chez vous, puis vous recevez le prix exact. Visite à partir de 19,99&nbsp;€.', 'Prendre rendez-vous →')
    tB = ('Prix immédiat', 'Je mesure moi-même', "Deux mesures au mètre, guidées pas à pas. Le prix s'affiche aussitôt, sans frais.", 'Saisir mes mesures →')
    lB, lC = labels('B', LABELS_B), labels('C', LABELS_C)
    cA = card(sA, *tA, scls='aplat-scA')
    cB = card(sB, *tB, scls='aplat-scB', labels=lB)
    cA2 = card(pA, *tA, sm=True, scls='aplat-scA')
    cB2 = card(pB, *tB, sm=True, scls='aplat-scB', labels=lB)
    cC = card('<div class="aplat-film">%s</div>' % kC, *tA, scls='aplat-scC', labels=lC)
    cC2 = card('<div class="aplat-film">%s</div>' % qC, *tA, sm=True, scls='aplat-scC', labels=lC)
    html = (TEMPLATE.replace('/*CSS*/', css).replace('<!--CARDS-->', cA + cB).replace('<!--PANEL-->', panel(sC)).replace('<!--CARDC-->', cC)
            .replace('<!--PHONE-->', cA2 + cB2 + panel(pC, sm=True) + cC2))
    with open(os.path.join(HERE, 'index.html'), 'w') as fh:
        fh.write(html)
    print('ok', len(html) // 1024, 'Ko (CSS %d Ko),' % (len(css.encode()) // 1024), len(kf2), 'animations ; film B %.3f s (écran de fin à %.3f), film C %.3f s (écran de fin à %.3f)' % (DB_N, F0_B, DC_N, F0_C))


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
/* clip-path (et pas seulement overflow + border-radius) : pendant l'écran de fin, la scène qui avance sous le papier ne
   laisse filer aucune ligne d'un pixel au bord haut du film quand le film tombe entre deux pixels */
.aplat-film{border-radius:16px;overflow:hidden;clip-path:inset(0 round 16px);background:#f5ecdf;transform:translateZ(0);container-type:inline-size}
.aplat-progress{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:18px}
.aplat-bar{display:block;height:3px;border-radius:2px;background:rgba(43,35,32,.12);overflow:hidden}
.aplat-bar i{display:block;height:100%;background:#2b2320;transform-origin:0 50%;transform:scaleX(0)}
.aplat-caps{position:relative;height:34px;margin-top:14px}
.aplat-cap{position:absolute;left:0;top:0;margin:0;display:flex;align-items:baseline;white-space:nowrap;
  font-family:"Crimson Text",Georgia,serif;font-weight:400;font-size:25px;line-height:1.2;color:#2b2320}
.aplat-capn{font:600 12px/1 -apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif;letter-spacing:.08em;color:#ad8148;margin-right:12px;transform:translateY(-3px)}
.aplat-cardc{margin:72px auto 0;display:flex;flex-direction:column;align-items:center}
.aplat-cardc-one{width:540px;max-width:100%}
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
.aplat-sm .aplat-film{border-radius:12px;clip-path:inset(0 round 12px)}
.aplat-sm .aplat-progress{margin-top:14px;gap:4px}
.aplat-sm .aplat-caps{height:28px;margin-top:10px}
.aplat-sm .aplat-cap{font-size:19.5px}
.aplat-sm .aplat-capn{font-size:11px;margin-right:9px;transform:translateY(-2px)}
.aplat-card-scene .aplat-film{border-radius:0;clip-path:inset(0 round 1px)}
/* étiquettes d'étape (HTML, traduites par le site) : en bas à gauche, dans le cadre de la scène ; la taille suit la carte */
.aplat-et{position:absolute;z-index:2;left:clamp(8px,2.3cqw,14px);bottom:clamp(8px,2.3cqw,14px);display:block;max-width:calc(100% - 16px);
  padding:.48em .95em .5em .82em;border-radius:999px;background:rgba(251,248,244,.92);color:#2b2320;white-space:nowrap;pointer-events:none;
  font:600 clamp(11px,2.45cqw,13.5px)/1.15 -apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif;letter-spacing:.005em;
  box-shadow:0 1px 2px rgba(43,35,32,.07),0 6px 16px -8px rgba(43,35,32,.32);opacity:0}
.aplat-et b{font-weight:700;color:#ad8148;font-variant-numeric:tabular-nums}
/* écran de fin : nom en capitales espacées (police des titres), « Métallerie · Saumur » en petit */
.aplat-fin-name{font-family:"Crimson Text",Georgia,serif;font-weight:600;font-size:40px;fill:#2b2320}
.aplat-fin-sub{font:500 13.5px -apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;letter-spacing:.26em;fill:#5d6168}
.aplat-railshadow{opacity:.13}.aplat-railshadow *{fill:#2b2320;stroke:none}
.aplat-sign{font:600 10.5px -apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;letter-spacing:3px;fill:#c9a36b}
.aplat-chiptx{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif;font-weight:600;fill:#fbf8f4;font-variant-numeric:tabular-nums}
.aplat-chipnum{font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;font-weight:700;fill:#2b2320}
.aplat-price{font-family:"Crimson Text",Georgia,serif;font-weight:600;font-variant-numeric:lining-nums tabular-nums}
.aplat-dlabel{font:600 9.5px -apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;letter-spacing:2px;fill:#ad8148}
.aplat-dtitle{font-family:"Crimson Text",Georgia,serif;font-weight:600;font-size:19px;fill:#2b2320}
.aplat-stamptx{font:700 19.5px -apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;letter-spacing:.3px;fill:#2f6b45}
.aplat-mapl{font-family:"Crimson Text",Georgia,serif;font-weight:600;font-size:20px;fill:#2b2320}
.aplat-dsmall{font:500 11px -apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;fill:#5d6168;font-variant-numeric:tabular-nums}
/* scènes affichées en petit (téléphone, colonne 360 px) : cotes, étiquettes et devis agrandis pour rester lisibles */
@container (max-width:520px){
  .aplat-scA .aplat-zk{transform:scale(1.3)}
  .aplat-film .aplat-zk{transform:scale(1.4)}
  .aplat-zkb{transform:scale(1.2)}
  /* devis agrandi ; assez bas pour que son coin ne sorte pas du cadre quand il pivote en entrant */
  .aplat-dz{transform:translate(-31px,-36px) scale(1.22)}
  .aplat-dz .aplat-dlabel{font-size:14.6px;letter-spacing:2.6px}
  .aplat-dz .aplat-dsmall{font-size:15.6px}
  /* devis de la carte B : agrandi autant que la hauteur le permet, petits textes à la même taille affichée que dans le film */
  /* (un peu moins grand qu'avant : son bas s'arrête au-dessus de l'étiquette d'étape, la plus longue « 2 · … ») */
  .aplat-dzb{transform:translate(-4px,-34px) scale(1.05)}
  .aplat-scB .aplat-mapl{font-size:27px}
  .aplat-scB .aplat-tic{transform:scale(1.4)}
  .aplat-scB .aplat-dk{transform:scale(1.25)}
  .aplat-scB .aplat-stamptx{font-size:20px}
  .aplat-dzb .aplat-dlabel{font-size:16.4px;letter-spacing:2.9px}
  .aplat-dzb .aplat-dsmall{font-size:17.5px}
  /* étiquette d'étape plus compacte en petit : elle ne touche ni le devis de B ni celui de C */
  .aplat-et{left:6px;bottom:6px;padding:.42em .8em .44em .7em}
  .aplat-dz .aplat-dsize,.aplat-dzb .aplat-dsize{transform:translateY(3px)}
  .aplat-fin-z{transform:translate(360px,190px) scale(1.22) translate(-360px,-190px)}
  .aplat-fin-sub{font-size:19px;letter-spacing:.2em;font-weight:600}
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

# mouvement réduit : l'image finale de chaque film (garde-corps posé), pas l'écran de fin ; l'étiquette de la dernière étape
REDUCED = r'''
@media (prefers-reduced-motion:reduce){
  .aplat-scA *{animation-delay:-6.2s!important;animation-play-state:paused!important}
  .aplat-scB *{animation-delay:-%ss!important;animation-play-state:paused!important}
  .aplat-panel *,.aplat-film *,.aplat-etC0,.aplat-etC1,.aplat-etC2,.aplat-etC3{animation-delay:-%ss!important;animation-play-state:paused!important}
}
''' % (fmt(MT(18.3, CLOCKS[DB]) + .2, 3), fmt(MT(14.4, CLOCKS[DC]), 3))

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
  <section class="aplat-cardc">
    <p class="aplat-phone-label">Carte de l'atelier · le film du parcours, comme sur le site</p>
    <div class="aplat-cardc-one"><!--CARDC--></div>
  </section>
  <section class="aplat-phone">
    <p class="aplat-phone-label">Aperçu téléphone · 360 px</p>
    <div class="aplat-phone-col"><!--PHONE--></div>
  </section>
</main>
<script>
(function(){
  var q = new URLSearchParams(location.search).get('t');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // fluidité : une scène hors de l'écran est mise en pause d'un bloc (ses animations restent synchronisées entre elles)
  // et repart où elle en était quand elle redevient visible ; le navigateur ne calcule que les films regardés.
  // Pause et reprise à un instant commun (startTime / currentTime explicites) : sinon le navigateur résout le départ des
  // animations « transform » une image plus tard que celui des tracés (stroke-dashoffset) et la scène se décale.
  var scenes = [].slice.call(document.querySelectorAll('.aplat-card-scene, .aplat-panel'));
  var off = [];
  function clock(list){
    for (var i = 0; i < list.length; i++) if (list[i].currentTime !== null) return list[i].currentTime;
    return 0;
  }
  function apply(el){
    var hide = off.indexOf(el) >= 0, list = el.getAnimations({subtree: true});
    if (!list.length) return;
    var t = clock(list), paused = list[0].playState === 'paused';
    if (hide && !paused) list.forEach(function(a){ a.pause(); a.currentTime = t; });
    else if (!hide && paused) {
      var now = document.timeline.currentTime;
      list.forEach(function(a){ a.startTime = now - t; });
    }
  }
  if (q === null && !reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){
        var i = off.indexOf(e.target);
        if (e.isIntersecting && i >= 0) off.splice(i, 1);
        if (!e.isIntersecting && i < 0) off.push(e.target);
        apply(e.target);
      });
    }, {rootMargin: '120px 0px'});
    scenes.forEach(function(el){ io.observe(el); });
  }
  document.fonts.ready.then(function(){
    if (q === null) return;
    var t = parseFloat(q) || 0;
    document.getAnimations().forEach(function(a){ a.pause(); a.currentTime = t * 1000; });
  });
  document.querySelector('.aplat-replay').addEventListener('click', function(){
    if (reduce) return;
    var now = document.timeline.currentTime;
    document.getAnimations().forEach(function(a){ a.startTime = now; });
    scenes.forEach(apply);
  });
})();
</script>
</body>
</html>
'''

if __name__ == '__main__':
    main()
