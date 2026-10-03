"""
Sépare le plateau du piétement sur une photo de studio (fond blanc), en LIGNES DROITES,
et pose un autre plateau à sa place.

Un plateau est une planche : vu en perspective, son contour est un polygone convexe à
bords droits. On le relève donc comme l'enveloppe convexe du plateau trouvé par la
couleur, simplifiée en quelques sommets — jamais un détourage à main levée.

    polygone_bois(photo, autres_teintes_de_pieds)  → contour du plateau de chêne
    polygone_colore(photo)                         → contour d'un plateau quelconque (résine…)
                                                     sur des pieds noirs
    poser(pied, poly_pied, plateau, poly_plateau)  → la photo du pied avec ce plateau
    reteinter(photo, poly, essence)                → le même plateau dans une autre essence

Python avec numpy, Pillow et OpenCV (cv2).
"""
import os, sys
import numpy as np
import cv2
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import recolor as rc  # masque_plateau, hsv, CIBLES


def lire(chemin):
    return np.asarray(Image.open(chemin).convert("RGB")).astype(np.float32)


def ecrire(a, chemin, qualite=88):
    os.makedirs(os.path.dirname(chemin), exist_ok=True)
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).save(chemin, quality=qualite, optimize=True)


def _plus_grand(masque):
    """Le plus grand morceau d'un seul tenant."""
    n, lab, stats, _ = cv2.connectedComponentsWithStats(masque.astype(np.uint8), 8)
    if n <= 1:
        return masque
    k = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    return lab == k


def _polygone(masque, eps=1.5, dessous_droit=True):
    """L'enveloppe convexe d'un masque, réduite à ses vrais sommets (bords droits).
    `dessous_droit` : le dessous du plateau est UNE droite, d'un coin bas à l'autre. C'est là que
    les pieds touchent le bois : un reflet chaud en haut d'un pied ferait sinon une bosse."""
    pts = cv2.findNonZero(_plus_grand(masque).astype(np.uint8))
    hull = cv2.convexHull(pts).reshape(-1, 2).astype(np.float32)
    if dessous_droit:
        bd = int(np.argmax(hull[:, 0] + hull[:, 1]))      # coin bas-droit
        bg = int(np.argmin(hull[:, 0] - hull[:, 1]))      # coin bas-gauche
        n = len(hull)
        # Les sommets situés sous la droite bas-gauche → bas-droit sont des bosses : on les retire.
        (x1, y1), (x2, y2) = hull[bg], hull[bd]
        garde = []
        for i, (x, y) in enumerate(hull):
            if i in (bd, bg):
                garde.append(i)
                continue
            t = (x - x1) / (x2 - x1) if x2 != x1 else 0
            sous = 0 < t < 1 and y > y1 + t * (y2 - y1) - 0.5
            if not sous:
                garde.append(i)
        hull = hull[garde]
    return cv2.approxPolyDP(hull.reshape(-1, 1, 2), eps, True).reshape(-1, 2).astype(np.float32)


def polygone_bois(photo, autres=()):
    """Le plateau de chêne d'une photo. `autres` : la même vue dans ses autres teintes de pieds
    (elles départagent le bois du plateau d'un pied laiton ou chocolat)."""
    m, _ = rc.masque_plateau([photo] + list(autres))
    return _polygone(m > 0.5)


def masque_colore(photo):
    """Le plateau d'une photo aux pieds NOIRS, en masque plein : tout ce qui a une couleur
    (bois, résine), par opposition au fond blanc, aux ombres grises et aux pieds noirs.
    Les trous (un reflet blanc sur la résine, un nœud noir) sont rebouchés."""
    h, s, v = rc.hsv(photo)
    m = ((s > 0.13) & (v > 0.12)).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    m = _plus_grand(cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8)) > 0).astype(np.uint8)
    contours, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    plein = np.zeros_like(m)
    cv2.drawContours(plein, contours, -1, 1, cv2.FILLED)
    return plein > 0


def polygone_colore(photo):
    """Le contour droit du plateau d'une photo aux pieds noirs."""
    return _polygone(masque_colore(photo))


def masque_poly(poly, forme, marge=0.0):
    """Le masque d'un polygone, bords lissés (dessiné 4 fois plus grand puis réduit).
    `marge` : pixels ajoutés vers l'extérieur (pour recouvrir le liseré de l'ancien plateau)."""
    H, W = forme[:2]
    k = 4
    grand = np.zeros((H * k, W * k), np.uint8)
    p = poly.copy()
    if marge:
        c = p.mean(0)
        d = p - c
        p = c + d * (1 + marge / np.maximum(np.linalg.norm(d, axis=1, keepdims=True), 1))
    cv2.fillPoly(grand, [np.round(p * k).astype(np.int32)], 255)
    return cv2.resize(grand, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0


def _cadre(poly):
    """Le rectangle qui entoure le contour : (gauche, haut, droite, bas)."""
    return float(poly[:, 0].min()), float(poly[:, 1].min()), float(poly[:, 0].max()), float(poly[:, 1].max())


def poser(pied, poly_pied, plateau, poly_plateau, valide=None, marge=2.0):
    """La photo `pied`, son plateau remplacé par celui de `plateau` (même prise de vue).
    Le nouveau plateau est amené sur l'ancien (même cadre : décalage et mise à l'échelle,
    sans déformation), puis rogné au contour droit de l'ancien.
    `valide` : le masque plein du plateau source (masque_colore). Tout ce qui n'en fait pas
    partie — le fond blanc dans un coin arrondi, le haut d'un pied — est remplacé par le bois
    voisin, prolongé : rien d'étranger ne peut apparaître dans le contour après le recalage."""
    H, W = pied.shape[:2]
    if valide is None:
        valide = masque_poly(poly_plateau, plateau.shape) > 0.98
    # Le fond blanc de la source, relevé depuis le bord de l'image (un plateau qui sort du cadre
    # laisse une bande blanche le long du bord) : il ne fait jamais partie du plateau.
    hs, ss, vs = rc.hsv(plateau)
    blanc = ((vs > 0.9) & (ss < 0.08)).astype(np.uint8)
    blanc[:4] = 1; blanc[-4:] = 1; blanc[:, :4] = 1; blanc[:, -4:] = 1
    n, lab = cv2.connectedComponents(blanc, connectivity=4)
    fond = lab == lab[0, 0]
    ok = valide & ~(cv2.dilate(fond.astype(np.uint8), np.ones((7, 7), np.uint8)) > 0)
    ok = cv2.erode(ok.astype(np.uint8), np.ones((5, 5), np.uint8))
    bande = cv2.dilate(ok, np.ones((121, 121), np.uint8)) - ok
    src = cv2.inpaint(np.clip(plateau, 0, 255).astype(np.uint8), bande, 5, cv2.INPAINT_TELEA).astype(np.float32)
    g1, h1, d1, b1 = _cadre(poly_plateau)
    g2, h2, d2, b2 = _cadre(poly_pied)
    sx, sy = (d2 - g2) / (d1 - g1), (b2 - h2) / (b1 - h1)
    M = np.float32([[sx, 0, g2 - sx * g1], [0, sy, h2 - sy * h1]])
    amene = cv2.warpAffine(src, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    m = masque_poly(poly_pied, pied.shape, marge)[..., None]
    return pied * (1 - m) + amene * m


def reteinter(photo, poly, essence, marge=0.6):
    """Le plateau de chêne reteinté dans une autre essence, dans son contour droit."""
    m = masque_poly(poly, photo.shape, marge)
    w = m > 0.5
    a = photo
    lum = (0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]) / 255.0
    lm = float(lum[w].mean())
    cible = np.array(rc.CIBLES[essence], dtype=np.float32)
    lt = float((0.299 * cible[0] + 0.587 * cible[1] + 0.114 * cible[2]) / 255.0)
    g = np.log(lt) / np.log(lm)
    l2 = np.clip(lum, 1e-4, 1) ** g
    bas = cible[None, None, :] * (l2[..., None] / lt)
    haut = cible[None, None, :] + (255 - cible[None, None, :]) * ((l2[..., None] - lt) / (1 - lt))
    out = np.where(l2[..., None] <= lt, bas, haut)
    out = np.clip(0.88 * out + 0.12 * a * (cible / np.maximum(a[w].mean(0), 1)), 0, 255)
    return a * (1 - m[..., None]) + out * m[..., None]


def apercu(photo, poly, chemin):
    """La photo avec son contour tracé en rouge, pour vérifier à l'œil."""
    im = cv2.cvtColor(np.clip(photo, 0, 255).astype(np.uint8), cv2.COLOR_RGB2BGR)
    cv2.polylines(im, [np.round(poly).astype(np.int32)], True, (0, 0, 255), 1, cv2.LINE_AA)
    for x, y in poly:
        cv2.circle(im, (int(round(x)), int(round(y))), 4, (255, 0, 0), -1)
    os.makedirs(os.path.dirname(chemin), exist_ok=True)
    cv2.imwrite(chemin, im)
