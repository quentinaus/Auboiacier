"""
Calques de pieds pour la chaise velours.

Les quinze rendus de la chaise ont exactement la même géométrie : seul le
velours change. On relève donc UNE fois le piétement (noir, sur les fonds
clairs où il se détache le mieux), et on en tire un calque PNG transparent
par teinte de pieds, ombré comme l'original. Le site pose ce calque sur la
photo du coloris choisi : le client voit sa chaise, avec ses pieds.

    python3 scripts/pieds-chaise.py   →  public/images/chaises/pieds-<teinte>.png
"""
import numpy as np
from PIL import Image, ImageFilter

DOSSIER = "public/images/chaises/"
# Les chaises claires : le noir des pieds y est sans ambiguïté.
REFERENCES = ["endive", "champagne", "dune", "cendre", "ocre"]
# Les velours francs : ce qui reste gris sur chacun n'est pas du velours.
SATUREES = ["endive", "ocre", "bleu-roi", "vert-bouteille", "prune", "paon"]
# Les teintes du nuancier (products.ts, METAL_FINISH.swatch).
TEINTES = {
    "noir": (28, 26, 24), "gris": (70, 69, 63), "chocolat": (70, 56, 49),
    "laiton": (140, 124, 63), "lin": (207, 201, 182), "blanc": (240, 239, 235),
    "brut": (138, 133, 120),
}

def charger(nom):
    return np.asarray(Image.open(f"{DOSSIER}{nom}.jpg").convert("RGB")).astype(np.float32)

def composantes_reliees_au_sol(coeur):
    """Ne garde du masque que ce qui touche les pieds au sol : les ombres
    profondes d'une couture du velours, sombres elles aussi, sont ailleurs."""
    graine = np.zeros_like(coeur)
    graine[560:, :] = coeur[560:, :]
    graine_img = Image.fromarray((graine * 255).astype(np.uint8))
    coeur_img = Image.fromarray((coeur * 255).astype(np.uint8))
    for _ in range(400):
        suivant = Image.fromarray(np.minimum(np.asarray(graine_img.filter(ImageFilter.MaxFilter(3))), np.asarray(coeur_img)))
        if np.array_equal(np.asarray(suivant), np.asarray(graine_img)):
            break
        graine_img = suivant
    return np.asarray(graine_img).astype(np.float32) / 255

def masque_pieds(refs, saturees):
    """Alpha des pieds : sombre ET peu saturé sur chaque référence claire,
    plus le reflet clair du tube (gris sur tous les velours francs, collé au
    noir), d'un seul tenant avec le sol, plein à l'intérieur, au contour
    lissé (le grain JPEG dentelle le bord brut)."""
    m = np.ones(refs[0].shape[:2], np.float32)
    for a in refs:
        lum = a.mean(2); sat = a.max(2) - a.min(2)
        sombre = np.clip((130 - lum) / 60, 0, 1)      # noir → 1, gris moyen → 0
        neutre = np.clip((60 - sat) / 30, 0, 1)       # velours foncé mais coloré → 0
        m = np.minimum(m, sombre * neutre)
    m[:330, :] = 0
    coeur = (m > 0.45)
    # Le reflet sur le dessus du tube : gris (pas velours), pas fond (trop
    # clair), et à moins de 4 px du noir.
    gris = np.ones_like(m, bool)
    for a in saturees:
        gris &= (a.max(2) - a.min(2)) < 45
    gris &= refs[0].mean(2) < 205
    pres = np.asarray(Image.fromarray((coeur * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))) > 0
    coeur = (coeur | (gris & pres)).astype(np.float32)
    coeur = composantes_reliees_au_sol(coeur)
    # Fermeture : ce qui reste de reflet au milieu d'un tube redevient du tube.
    img = Image.fromarray((coeur * 255).astype(np.uint8))
    plein = np.asarray(img.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))).astype(np.float32) / 255
    plein = np.maximum(plein, coeur)
    # Contour lissé : flou puis seuil doux, ~2 px d'anti-crénelage.
    lisse = flou(plein * 255, 1.7) / 255
    return np.clip((lisse - 0.38) / 0.24, 0, 1)

def flou(a, r):
    """Flou gaussien d'un tableau float (une couche)."""
    return np.asarray(Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float32)

def plus_proche(points, candidats, valeurs=None):
    """Pour chaque point (N×2), l'indice du candidat (M×2) le plus proche —
    par paquets, en numpy pur (pas de scipy sur cette machine)."""
    idx = np.empty(len(points), np.int64); dist = np.empty(len(points), np.float32)
    for i in range(0, len(points), 2000):
        p = points[i:i + 2000]
        d2 = ((p[:, None, 0] - candidats[None, :, 0]) ** 2 + (p[:, None, 1] - candidats[None, :, 1]) ** 2)
        j = d2.argmin(1)
        idx[i:i + 2000] = j; dist[i:i + 2000] = np.sqrt(d2[np.arange(len(p)), j])
    return idx, dist

def profondeur(alpha):
    """Distance euclidienne au bord du tube, en pixels : 0 sur la lisière,
    le rayon au centre. Lisse, donc les normales le sont aussi."""
    coeur = alpha > 0.5
    dedans = np.argwhere(coeur)
    ext = np.zeros_like(coeur)
    ext[1:, :] |= coeur[:-1, :] & ~coeur[1:, :]; ext[:-1, :] |= coeur[1:, :] & ~coeur[:-1, :]
    ext[:, 1:] |= coeur[:, :-1] & ~coeur[:, 1:]; ext[:, :-1] |= coeur[:, 1:] & ~coeur[:, :-1]
    bord = np.argwhere(ext)                                  # juste dehors
    _, dist = plus_proche(dedans, bord)
    d = np.zeros(alpha.shape, np.float32)
    d[dedans[:, 0], dedans[:, 1]] = dist
    return d

def modele_cylindre(alpha, base):
    """Le relief d'un tube peint : on le recalcule proprement à partir de la
    forme (le rendu noir est trop bruité pour en tirer un modelé propre).
    Normale = pente de la distance au bord ; lumière en haut à gauche, devant."""
    d = profondeur(alpha)
    d = flou(d * 24, 2.0) / 24
    r = 5.5
    h = np.clip(d / r, 0, 1)
    gy, gx = np.gradient(d)
    n = np.sqrt(gx ** 2 + gy ** 2) + 1e-6
    incl = np.sqrt(np.clip(1 - h ** 2, 0, 1))         # 1 sur la lisière, 0 au sommet
    nx, ny = -gx / n * incl, -gy / n * incl
    nz = np.sqrt(np.clip(1 - nx ** 2 - ny ** 2, 0, 1))
    lx, ly, lz = -0.40, -0.50, 0.77
    diffus = np.clip(nx * lx + ny * ly + nz * lz, 0, 1)
    spec = np.clip(nx * -0.3 + ny * -0.6 + nz * 0.74, 0, 1) ** 12
    # Sous l'assise, le tube est dans l'ombre : on le lit dans le rendu.
    lum = flou(base.mean(2), 6)
    occlusion = np.clip((lum - 18) / 50, 0.55, 1)
    return diffus, spec, occlusion

def derriere_le_tube(alpha, base):
    """Ce qu'il y a derrière la lisière du tube (fond ou velours) : la couleur
    du pixel hors masque le plus proche. Sert à recomposer le bord."""
    lisiere = np.argwhere((alpha > 0.03) & (alpha < 0.97))
    dehors = np.argwhere(alpha < 0.03)
    # Seuls les pixels dehors à moins de 4 px de la lisière comptent.
    voisin = np.asarray(Image.fromarray(((alpha > 0.03) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))) > 0
    dehors = dehors[voisin[dehors[:, 0], dehors[:, 1]]]
    idx, _ = plus_proche(lisiere, dehors)
    out = base.copy()
    out[lisiere[:, 0], lisiere[:, 1]] = base[dehors[idx, 0], dehors[idx, 1]]
    return flou_rgb(out, 1.0)

def flou_rgb(a, r):
    return np.dstack([flou(a[..., k], r) for k in range(3)])

def calque(base, alpha, teinte):
    """Le pied dans sa teinte, avec un modelé de tube peint en poudre."""
    diffus, spec, occlusion = modele_cylindre(alpha, base)
    c = np.array(teinte, np.float32)
    clair = c.mean() > 150
    if clair:
        facteur = (0.70 + 0.34 * diffus) * (0.75 + 0.25 * occlusion)
    else:
        facteur = (0.55 + 0.50 * diffus) * occlusion
    couleur = c[None, None, :] * facteur[..., None] + 255 * (0.10 if clair else 0.18) * spec[..., None]
    couleur = np.clip(couleur, 0, 255)
    # Sur le liseré anti-crénelé, la teinte se remélange avec ce qu'il y a
    # derrière le tube : sans cela, un pied clair garde un cerne noir.
    a = alpha[..., None]
    pixel = a * couleur + (1 - a) * derriere_le_tube(alpha, base)
    opaque = np.where(alpha > 0.03, 255, 0).astype(np.float32)
    out = np.dstack([pixel, opaque[..., None]]).astype(np.uint8)
    return Image.fromarray(out)

if __name__ == "__main__":
    refs = [charger(n) for n in REFERENCES]
    alpha = masque_pieds(refs, [charger(n) for n in SATUREES])
    base = refs[0]
    for nom, rgb in TEINTES.items():
        calque(base, alpha, rgb).save(f"{DOSSIER}pieds-{nom}.png", optimize=True)
        print("pieds-" + nom)
