"""
Fabrique les photos des tables dans les autres essences de plateau (pin, hêtre, noyer).

Le plateau est un polygone à bords DROITS : ses coins sont donnés ci-dessous, à la main, pour
chaque prise de vue (relevés sur la photo aux pieds noirs), puis chaque bord est ajusté au pixel
sur le vrai bord de la photo et chaque coin recalculé comme l'intersection de ses deux bords
(scripts/plateau_droit.py). Le reteintage ne fait aucune retouche floue : bois dedans, photo
dehors, bords nets.

    python scripts/essences.py              → les photos
    python scripts/essences.py dossier/     → les photos + les contours tracés, pour contrôle
"""
import os, sys
import numpy as np
import cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import plateaux as P
import recolor as rc
import plateau_droit as D

ESSENCES = ["pin", "hetre", "noyer"]
TEINTES = ["noir", "gris", "chocolat", "laiton", "lin", "blanc"]
VERSION = "v11"

# Les coins du plateau, sur la photo aux pieds NOIRS, dans l'ordre du tour (x, y).
# Un plateau a 6 coins vus de trois quarts (une boîte) ; moins quand il sort du cadre.
COINS = {
    # Table Mikado, vue de face : le dessus en bande fine, le chant, les deux bouts.
    "mikado/devant": [(1593, 139), (35, 139), (35, 96), (208, 44), (1424, 42), (1594, 103)],
    # Table Mikado, vue de coupe (trois quarts) : sort du cadre à gauche.
    "mikado/coupe": [(1315, 217), (718, 331), (0, 180), (0, 104), (262, 97), (1320, 149)],
    # Table Croix, vue de bout.
    "table-croix-bout-v2": [(1071, 350), (143, 351), (143, 302), (302, 156), (896, 156), (1066, 299)],
    # Table Croix, vue de côté.
    "table-croix-cote-v2": [(1588, 191), (34, 191), (32, 157), (195, 95), (1421, 95), (1588, 157)],
    # Table Croix, détail de la soudure : seul un coin du plateau est dans le cadre.
    "table-croix-soudure-v1": [(1198, 140), (1085, 184), (841, 123), (417, 0), (1198, 0)],
    # Table Croix, vue détail : le coin avant repose sur le pied (le bas y est plat).
    "table-croix-detail-v1": [(1194, 0), (1194, 94), (596, 365), (517, 365), (0, 208), (0, 88), (640, 0)],
}


def decalage(base, a, marge=(20, 8)):
    """De combien (dx, dy) la photo `a` est décalée par rapport à `base` (même prise de vue,
    autre teinte de pieds) : les rendus ne sont pas calés au pixel près."""
    H = base.shape[0]
    sb = rc.silhouette(base)[:H // 2]
    sa = rc.silhouette(a)[:H // 2]
    meilleur, score = (0, 0), -1
    for dy in range(-marge[0], marge[0] + 1):
        for dx in range(-marge[1], marge[1] + 1):
            d = np.roll(np.roll(sa, dy, 0), dx, 1)
            inter = (sb & d).sum()
            union = (sb | d).sum()
            iou = inter / union if union else 0
            if iou > score:
                score, meilleur = iou, (dy, dx)
    dy, dx = meilleur
    return -dx, -dy


CACHE = os.environ.get("ESSENCES_CACHE")  # dossier où garder les masques (lents à calculer), pour itérer


def masque(cle, teinte, photo, autres):
    chemin = f"{CACHE}/{cle.replace('/', '-')}-{teinte}.npy" if CACHE else None
    if chemin and os.path.exists(chemin):
        return np.load(chemin)
    m, _ = rc.masque_plateau([photo] + list(autres))
    if chemin:
        os.makedirs(CACHE, exist_ok=True)
        np.save(chemin, m)
    return m


def contour(cle, photo, autres, dxy=(0, 0), teinte="noir"):
    m = masque(cle, teinte, photo, autres)
    brouillon = np.array(COINS[cle], np.float32) + np.array(dxy, np.float32)
    return D.contour_droit(m > 0.5, photo, brouillon)


def faire(photo, poly, sortie):
    for e in ESSENCES:
        P.ecrire(D.reteinter_droit(photo, poly, e), sortie.format(e), 90)


if __name__ == "__main__":
    dossier = sys.argv[1] if len(sys.argv) > 1 else None
    seulement = sys.argv[2].split(",") if len(sys.argv) > 2 else None   # ex. "mikado/devant/laiton,table-croix-bout-v2"
    # Table Mikado : deux vues, six teintes de pieds (les autres teintes départagent bois et pieds).
    for vue in ["devant", "coupe"]:
        ph = {t: P.lire(f"public/images/mikado/{vue}/{t}.jpg") for t in TEINTES}
        for t in TEINTES:
            if seulement and f"mikado/{vue}/{t}" not in seulement:
                continue
            dxy = (0, 0) if t == "noir" else decalage(ph["noir"], ph[t])
            poly = contour(f"mikado/{vue}", ph[t], [ph[u] for u in TEINTES if u != t], dxy, t)
            print(f"mikado/{vue}/{t}", dxy, np.round(poly).astype(int).tolist())
            faire(ph[t], poly, f"public/images/mikado/{vue}/{t}-{{}}-{VERSION}.jpg")
            if dossier:
                D.apercu(ph[t], poly, f"{dossier}/mikado-{vue}-{t}.png")
    # Table Croix : quatre vues, pieds noirs.
    for vue in ["bout-v2", "cote-v2", "soudure-v1", "detail-v1"]:
        if seulement and f"table-croix-{vue}" not in seulement:
            continue
        a = P.lire(f"public/images/table-croix-{vue}.jpg")
        poly = contour(f"table-croix-{vue}", a, [])
        print(f"table-croix-{vue}", np.round(poly).astype(int).tolist())
        faire(a, poly, f"public/images/table-croix-{vue}-{{}}-{VERSION}.jpg")
        if dossier:
            D.apercu(a, poly, f"{dossier}/croix-{vue}.png")
    print("ok")
