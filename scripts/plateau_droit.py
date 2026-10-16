"""
Le plateau d'une table sur une photo de studio, relevé en LIGNES DROITES, et reteinté
proprement dans une autre essence.

Un plateau est une planche : vu en perspective, son contour est un polygone convexe à bords
droits. Ici chaque bord est une DROITE ajustée sur le vrai bord de la photo (là où le bois
touche le fond blanc, jamais là où un pied le touche), et chaque coin est l'INTERSECTION de
ses deux bords. Pas de détourage à main levée, pas de bosse aux pieds.

Le reteintage, lui, ne fait aucune retouche floue :
  - DANS le contour, le bois est reteinté ; sur les 4 premiers pixels le long d'un bord, il est
    remplacé par le bois voisin, pris 4 px plus à l'intérieur (un simple décalage) : plus de
    liseré de chêne ni de fondu blanc sur l'arête.
  - HORS du contour, sur 4 px, la photo est remplacée par ce qu'il y a 4 px plus loin (fond,
    pied) : plus de fondu de chêne autour du plateau.
  - Le bord du polygone est lissé (dessiné 4× plus grand puis réduit) : net, sans crénelage.

    contour_droit(masque, photo, brouillon)  → le polygone à bords droits
    reteinter_droit(photo, poly, essence)    → la photo, plateau dans l'autre essence
"""
import os
import numpy as np
import cv2

import recolor as rc  # hsv, CIBLES


# ----------------------------------------------------------------------------- contour

def _fond(photo):
    """Le fond blanc du studio (et rien d'autre : ni bois, ni pied, ni ombre marquée)."""
    h, s, v = rc.hsv(photo)
    return (v > 0.86) & (s < 0.10)


def _points_du_bord(masque, fond):
    """Les pixels du contour extérieur du plateau : la silhouette (tout ce qui n'est pas le fond
    blanc) de la tache qui contient le plateau. La silhouette, et pas le seul bois coloré :
    l'arête pâle du chant en fait partie. Les pieds en font partie aussi, mais leurs points
    sont loin des côtés du plateau ou ont un pied dehors : l'ajustement les ignore."""
    sil = (~fond).astype(np.uint8)
    sil = cv2.morphologyEx(sil, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    n, lab = cv2.connectedComponents(sil, connectivity=8)
    # La tache qui recouvre le mieux le plateau.
    ids, cnt = np.unique(lab[masque], return_counts=True)
    k = int(ids[np.argmax(cnt)]) if len(ids) else 0
    if k == 0:
        m = masque.astype(np.uint8)
    else:
        m = ((lab == k) | masque).astype(np.uint8)
    contours, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    return max(contours, key=cv2.contourArea).reshape(-1, 2).astype(np.float32)


def _sur_le_cadre(a, b, W, H, marge=2.0):
    """Un côté posé sur le bord de l'image (le plateau sort du cadre) : il reste tel quel."""
    for k, lim in ((0, 0), (0, W - 1), (1, 0), (1, H - 1)):
        if abs(a[k] - lim) <= marge and abs(b[k] - lim) <= marge:
            return True
    return False


def _fusionner_alignes(poly, angle_max=5.0, mini=8.0, fond=None):
    """Deux côtés presque alignés (< angle_max degrés) ne font qu'une droite ; un côté minuscule
    (< mini px) est un pan coupé laissé par le relevé : on le retire aussi.
    `fond` : le fond blanc de la photo. Un sommet dont l'extérieur n'est pas du fond (un pied
    touche le plateau là) est une bosse du relevé, pas un coin : il part dès qu'il est un peu
    aligné (< 3 × angle_max). Un vrai coin, lui, a du fond blanc dehors."""
    p = [np.asarray(q, np.float64) for q in poly]
    centre = np.mean(p, 0)
    change = True
    while change and len(p) > 4:
        change = False
        n = len(p)
        for i in range(n):
            a, b, c = p[i - 1], p[i], p[(i + 1) % n]
            u, v = b - a, c - b
            lu, lv = np.linalg.norm(u), np.linalg.norm(v)
            if lv < mini:
                del p[(i + 1) % n]
                change = True
                break
            if lu < mini:
                del p[i]
                change = True
                break
            ang = np.degrees(np.arccos(np.clip(np.dot(u, v) / (lu * lv), -1, 1)))
            seuil = angle_max
            if fond is not None:
                dehors = b - centre
                dehors /= max(np.linalg.norm(dehors), 1e-6)
                q = np.round(b + 5 * dehors).astype(int)
                H, W = fond.shape
                if 0 <= q[0] < W and 0 <= q[1] < H and not fond[q[1], q[0]]:
                    seuil = 3 * angle_max
            if ang < seuil:
                del p[i]
                change = True
                break
    return np.array(p, np.float32)


def _ajuster(bord, a, b, fond, W, H, tol=8.0, retrait=0.08):
    """La droite ajustée sur les points du bord proches du côté a→b (hors de ses deux bouts),
    et dont l'extérieur, 4 px plus loin, est bien du fond blanc (pas un pied). Rend (point,
    direction) ou None s'il n'y a pas assez de points."""
    d = b - a
    L = float(np.linalg.norm(d))
    if L < 1e-6:
        return None
    u = d / L
    n = np.array([-u[1], u[0]], np.float32)           # normale (orientée vers l'extérieur ci-dessous)
    rel = bord - a
    t = rel @ u
    dist = rel @ n
    pres = (np.abs(dist) <= tol) & (t > retrait * L) & (t < (1 - retrait) * L)
    pts = bord[pres]
    if len(pts) < 8:
        return None
    # Le côté est parcouru dans un sens : l'extérieur du polygone convexe est d'un côté connu.
    # On le repère sur le centre du polygone, passé par l'appelant via `fond` seulement : ici on
    # teste les deux côtés et on garde celui où c'est blanc.
    ok = []
    for s in (1, -1):
        q = np.round(pts + 4 * s * n).astype(int)
        q[:, 0] = np.clip(q[:, 0], 0, W - 1)
        q[:, 1] = np.clip(q[:, 1], 0, H - 1)
        ok.append(fond[q[:, 1], q[:, 0]])
    blanc = ok[0] if ok[0].sum() >= ok[1].sum() else ok[1]
    pts = pts[blanc]
    if len(pts) < 8:
        return None
    vx, vy, x0, y0 = cv2.fitLine(pts.reshape(-1, 1, 2), cv2.DIST_HUBER, 0, 0.01, 0.01).ravel()
    return np.array([x0, y0], np.float32), np.array([vx, vy], np.float32)


def _intersection(l1, l2):
    (p1, d1), (p2, d2) = l1, l2
    det = d1[0] * (-d2[1]) - (-d2[0]) * d1[1]
    if abs(det) < 1e-9:
        return None
    w = p2 - p1
    t = (w[0] * (-d2[1]) - (-d2[0]) * w[1]) / det
    return p1 + t * d1


def contour_droit(masque, photo, brouillon):
    """Le polygone à bords droits du plateau.
    `masque` : le bois du plateau (masque_plateau) ; `photo` : la prise de vue (pour le fond) ;
    `brouillon` : un premier polygone (l'enveloppe convexe) qui dit combien de côtés et où."""
    H, W = photo.shape[:2]
    fond = _fond(photo)
    bord = _points_du_bord(masque, fond)
    # Les coins sont donnés à la main : on les garde tous, seul chaque bord est ajusté.
    poly = np.asarray(brouillon, np.float32)
    n = len(poly)
    droites = []
    for i in range(n):
        a, b = poly[i], poly[(i + 1) % n]
        if _sur_le_cadre(a, b, W, H):
            droites.append((a.astype(np.float32), ((b - a) / max(np.linalg.norm(b - a), 1e-6)).astype(np.float32)))
            continue
        aj = _ajuster(bord, a, b, fond, W, H)
        droites.append(aj if aj is not None else (a.astype(np.float32), ((b - a) / max(np.linalg.norm(b - a), 1e-6)).astype(np.float32)))
    coins = []
    for i in range(n):
        x = _intersection(droites[i - 1], droites[i])
        coins.append(x if x is not None else poly[i])
    coins = np.array(coins, np.float32)
    # Un coin qui aurait filé loin (deux droites presque parallèles) : on garde le brouillon.
    loin = np.linalg.norm(coins - poly, axis=1) > 25
    coins[loin] = poly[loin]
    return _fusionner_alignes(coins, angle_max=1.5, mini=3.0)


# ----------------------------------------------------------------------------- reteintage

def masque_lisse(poly, forme, k=4):
    H, W = forme[:2]
    grand = np.zeros((H * k, W * k), np.uint8)
    cv2.fillPoly(grand, [np.round(poly * k).astype(np.int32)], 255, lineType=cv2.LINE_AA)
    return cv2.resize(grand, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32) / 255.0


def _normales_interieures(poly):
    """La normale unitaire de chaque côté, tournée vers l'intérieur du polygone."""
    c = poly.mean(0)
    out = []
    n = len(poly)
    for i in range(n):
        a, b = poly[i], poly[(i + 1) % n]
        d = b - a
        d /= max(np.linalg.norm(d), 1e-6)
        nn = np.array([-d[1], d[0]], np.float32)
        if np.dot(c - a, nn) < 0:
            nn = -nn
        out.append(nn)
    return out


def _distance_aux_cotes(poly, forme):
    """Pour chaque pixel : la distance au côté le plus proche et l'index de ce côté."""
    H, W = forme[:2]
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    P = np.stack([xs, ys], -1)
    n = len(poly)
    best = np.full((H, W), np.inf, np.float32)
    idx = np.zeros((H, W), np.int32)
    for i in range(n):
        a, b = poly[i], poly[(i + 1) % n]
        d = b - a
        L2 = max(float(d @ d), 1e-6)
        t = np.clip(((P - a) @ d) / L2, 0, 1)
        proj = a + t[..., None] * d
        dist = np.linalg.norm(P - proj, axis=-1)
        mieux = dist < best
        best[mieux] = dist[mieux]
        idx[mieux] = i
    return best, idx


def _decaler(photo, zone, vecteur):
    """Dans `zone`, la photo prise `vecteur` pixels plus loin (échantillonnage bilinéaire)."""
    H, W = photo.shape[:2]
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    mx = np.clip(xs + vecteur[0], 0, W - 1)
    my = np.clip(ys + vecteur[1], 0, H - 1)
    deplace = cv2.remap(photo, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    return np.where(zone[..., None], deplace, photo)


def _teinter(a, zone, essence):
    """Le bois reteinté (mapping sur la luminance, hautes lumières adoucies)."""
    lum = (0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]) / 255.0
    lm = float(np.clip(lum[zone].mean(), 0.05, 0.95))
    cible = np.array(rc.CIBLES[essence], dtype=np.float32)
    lt = float((0.299 * cible[0] + 0.587 * cible[1] + 0.114 * cible[2]) / 255.0)
    g = np.log(lt) / np.log(lm)
    l2 = np.clip(lum, 1e-4, 1) ** g
    bas = cible[None, None, :] * (l2[..., None] / lt)
    # Les reflets : compressés (exposant 1.5), pour qu'une arête claire de chêne ne devienne pas
    # blanche sur du noyer.
    k = np.clip((l2[..., None] - lt) / (1 - lt), 0, 1) ** 1.5
    haut = cible[None, None, :] + (255 - cible[None, None, :]) * k
    out = np.where(l2[..., None] <= lt, bas, haut)
    moy = np.maximum(a[zone].mean(0), 1)
    return np.clip(0.88 * out + 0.12 * a * (cible / moy), 0, 255)


def _gradient_unitaire(dt):
    gx = cv2.Sobel(dt, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(dt, cv2.CV_32F, 0, 1, ksize=3)
    n = np.maximum(np.sqrt(gx * gx + gy * gy), 1e-6)
    return gx / n, gy / n


def _decaler_le_long(photo, zone, gx, gy, saut):
    """Dans `zone`, la photo prise `saut` pixels plus loin dans la direction (gx, gy)."""
    H, W = photo.shape[:2]
    ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    mx = np.clip(xs + saut * gx, 0, W - 1)
    my = np.clip(ys + saut * gy, 0, H - 1)
    deplace = cv2.remap(photo, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    return np.where(zone[..., None], deplace, photo)


def reteinter_droit(photo, poly, essence, bande=4.0, saut=4.5, bande_out=2.5, saut_out=3.0):
    """La photo, son plateau (dans `poly`) reteinté dans `essence`, bords nets.
    Le long du contour, dedans comme dehors, la photo est remplacée par ce qu'il y a `saut` px
    plus loin EN S'ÉLOIGNANT du contour (le gradient de la distance au contour : droit sur un
    bord, en diagonale dans un coin, jamais à travers l'autre bord du coin)."""
    H, W = photo.shape[:2]
    M = masque_lisse(poly, photo.shape)
    dedans = M > 0.5
    d_in = cv2.distanceTransform(dedans.astype(np.uint8), cv2.DIST_L2, 5)
    d_out = cv2.distanceTransform((~dedans).astype(np.uint8), cv2.DIST_L2, 5)
    gx_in, gy_in = _gradient_unitaire(d_in)
    gx_out, gy_out = _gradient_unitaire(d_out)
    # Les côtés posés sur le bord de l'image n'ont pas de fondu : on ne les retouche pas.
    cadre = np.zeros((H, W), bool)
    n = len(poly)
    for i in range(n):
        a, b = poly[i], poly[(i + 1) % n]
        if _sur_le_cadre(a, b, W, H):
            cv2.line(cadre.view(np.uint8), tuple(np.round(a).astype(int)), tuple(np.round(b).astype(int)), 1, int(2 * bande + 3))
    bois = _decaler_le_long(photo, dedans & (d_in <= bande) & ~cadre, gx_in, gy_in, saut)
    # Dehors, la bande est plus fine : juste le fondu du chêne (2 px), pour ne pas décaler le haut des pieds.
    fond_photo = _decaler_le_long(photo, ~dedans & (d_out <= bande_out) & ~cadre, gx_out, gy_out, saut_out)
    teinte = _teinter(bois, dedans, essence)
    return fond_photo * (1 - M[..., None]) + teinte * M[..., None]


def apercu(photo, poly, chemin):
    im = cv2.cvtColor(np.clip(photo, 0, 255).astype(np.uint8), cv2.COLOR_RGB2BGR)
    cv2.polylines(im, [np.round(poly).astype(np.int32)], True, (0, 0, 255), 1, cv2.LINE_AA)
    for x, y in poly:
        cv2.circle(im, (int(round(x)), int(round(y))), 4, (255, 0, 0), -1)
    os.makedirs(os.path.dirname(chemin), exist_ok=True)
    cv2.imwrite(chemin, im)
