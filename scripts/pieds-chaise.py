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

def masque_pieds(refs):
    """Alpha des pieds : sombre ET peu saturé sur chaque référence claire,
    d'un seul tenant avec le sol, plein à l'intérieur (les reflets du noir
    ne sont pas des trous), doux sur le bord."""
    m = np.ones(refs[0].shape[:2], np.float32)
    for a in refs:
        lum = a.mean(2); sat = a.max(2) - a.min(2)
        sombre = np.clip((130 - lum) / 60, 0, 1)      # noir → 1, gris moyen → 0
        neutre = np.clip((60 - sat) / 30, 0, 1)       # velours foncé mais coloré → 0
        m = np.minimum(m, sombre * neutre)
    m[:330, :] = 0
    coeur = (m > 0.45).astype(np.float32)
    coeur = composantes_reliees_au_sol(coeur)
    # Fermeture : les reflets clairs au milieu d'un tube redeviennent du tube.
    img = Image.fromarray((coeur * 255).astype(np.uint8))
    plein = np.asarray(img.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))).astype(np.float32) / 255
    plein = np.maximum(plein, coeur)
    # Le bord doux ne compte qu'à moins de 2 px du cœur.
    voisin = np.asarray(Image.fromarray((plein * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))).astype(np.float32) / 255
    return np.maximum(plein, m * voisin)

def calque(base, alpha, teinte):
    """Le pied dans sa teinte, avec le modelé de l'original : les reflets du
    rendu noir deviennent les reflets de la nouvelle couleur."""
    # Le grain JPEG du noir ne doit pas devenir des paillettes : on lisse.
    lum = np.asarray(Image.fromarray(base.mean(2).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.6))).astype(np.float32)
    t = np.clip((lum - 22) / 60, 0, 1)                    # 0 ombre, 1 reflet
    c = np.array(teinte, np.float32)
    clair = c.mean() > 150
    # Peinture poudre mate : un modelé discret, pas du chrome.
    ombre = 0.8 if clair else 0.62
    couleur = c[None, None, :] * (ombre + (1.08 - ombre) * t[..., None])
    couleur += 255 * (0.05 * t[..., None] ** 2)
    couleur = np.clip(couleur, 0, 255)
    # Sur le liseré anti-crénelé, le pixel d'origine mélange le noir du pied
    # et ce qu'il y a derrière (fond ou velours). On retrouve ce « derrière »
    # et on le remélange avec la teinte, plutôt que de poser la teinte sur du
    # noir : sans cela, un pied blanc garde un cerne sombre.
    a = alpha[..., None]
    noir = np.array([30, 30, 30], np.float32)
    derriere = np.clip((base - a * noir) / np.maximum(1 - a, 0.08), 0, 255)
    pixel = a * couleur + (1 - a) * derriere
    opaque = np.where(alpha > 0.04, 255, 0).astype(np.float32)
    out = np.dstack([pixel, opaque[..., None]]).astype(np.uint8)
    return Image.fromarray(out)

if __name__ == "__main__":
    refs = [charger(n) for n in REFERENCES]
    alpha = masque_pieds(refs)
    base = refs[0]
    for nom, rgb in TEINTES.items():
        calque(base, alpha, rgb).save(f"{DOSSIER}pieds-{nom}.png", optimize=True)
        print("pieds-" + nom)
