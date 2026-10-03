"""
Fabrique la vue de face de la Table Mikado Extérieur dans les six teintes de pieds :
les photos de face de la Table Mikado (mêmes pieds), dont le plateau reçoit ses lattes —
six joints droits tracés sur le dessus, resserrés vers le fond comme le veut la perspective.
    python scripts/table-exterieur.py
"""
import os, sys
import numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import plateaux as P

TEINTES = ["noir", "gris", "chocolat", "laiton", "lin", "blanc"]
LATTES = 7
K = 4  # dessin 4 fois plus grand, puis réduit : traits lissés


def coins(poly):
    """Les quatre coins du dessus du plateau : avant-gauche, fond-gauche, fond-droit, avant-droit."""
    g = poly[poly[:, 0] < poly[:, 0].min() + 30]
    d = poly[poly[:, 0] > poly[:, 0].max() - 30]
    ag, ad = g[np.argmin(g[:, 1])], d[np.argmin(d[:, 1])]
    fg = poly[(poly[:, 0] > ag[0] + 120) & (poly[:, 0] < ag[0] + 220)]
    fg = fg[np.argmin(fg[:, 0])]
    fd = np.array([ad[0] - 156, fg[1]], np.float32)   # la fuite du bord droit, relevée sur la photo
    return ag, fg, fd, ad


def latter(photo, poly):
    ag, fg, fd, ad = coins(poly)
    rapport = np.linalg.norm(ad - ag) / np.linalg.norm(fd - fg)   # avant plus large que le fond
    H, W = photo.shape[:2]
    trait = np.zeros((H * K, W * K), np.uint8)
    for i in range(1, LATTES):
        d = i / LATTES
        t = d / (d + (1 - d) * rapport)                # perspective : les lattes du fond paraissent plus fines
        a, b = ag + (fg - ag) * t, ad + (fd - ad) * t
        ep = max(1, int(round(K * (1.7 - 0.8 * t))))
        cv2.line(trait, tuple(np.round(a * K).astype(int)), tuple(np.round(b * K).astype(int)), 255, ep, cv2.LINE_AA)
    m = cv2.resize(trait, (W, H), interpolation=cv2.INTER_AREA).astype(np.float32)[..., None] / 255.0 * 0.78
    ombre = photo * 0.22
    return photo * (1 - m) + ombre * m


if __name__ == "__main__":
    # La vue d'angle (finition du plateau) : la photo à lattes d'origine (pieds noirs) est cadrée
    # exactement comme la vue d'angle de la Table Mikado. On garde donc son plateau à lattes,
    # découpé en lignes droites, et on le pose tel quel sur les pieds de chaque teinte.
    lattes = P.lire("public/images/table-exterieur-lattes.jpg")
    contour = P._polygone(P.masque_colore(lattes), dessous_droit=False)
    m = P.masque_poly(contour, lattes.shape, 2.0)
    # Sous le chant avant, le contour droit emporte un peu des pieds NOIRS de la photo d'origine :
    # on les retire (tout ce qui est noir, hors du bois, à gauche du coin avant du plateau).
    import recolor as rc
    h, sat, v = rc.hsv(lattes)
    noir = (v < 0.42) & (sat < 0.5) & ~P.masque_colore(lattes)
    noir[:, int(contour[np.argmax(contour[:, 1]), 0]) + 110:] = False
    noir = cv2.dilate(noir.astype(np.uint8), np.ones((7, 7), np.uint8)).astype(np.float32)
    m = (m * (1 - cv2.GaussianBlur(noir, (0, 0), 0.8)))[..., None]
    for t in TEINTES:
        pied = P.lire(f"public/images/mikado/coupe/{t}.jpg")
        P.ecrire(pied * (1 - m) + lattes * m, f"public/images/mikado-exterieur/angle/{t}-v3.jpg", 90)
    print("contour", contour.round().astype(int).tolist())
