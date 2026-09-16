"""
Les échantillons de matière des fiches produit : une bille de peinture
thermolaquée par couleur de pieds, un disque de bois par essence.

Tout est calculé, rien n'est photographié : la bille est éclairée comme un
objet (lumière principale en haut à gauche, retour de lumière en bas, grain
de poudre), le bois est un fil dessiné par du bruit fractal, avec ses veines
et ses variations de teinte. Le résultat ressemble aux nuanciers des grandes
marques : une matière ronde, nette, sur fond transparent.

    python3 scripts/echantillons.py            # écrit public/images/echantillons/*.webp

Format WebP, pas PNG : ces pastilles sont posées en CSS background-image
(material-bubble.tsx), donc servies telles quelles, sans next/image. Un PNG
de bruit à 320 px pèse 60–100 Ko, le WebP à qualité 85 pèse 3–9 Ko pour un
rendu identique, transparence comprise. Ne pas descendre sous 80 : les
veines du bois montrent des artefacts en 64 px Retina.
"""

from __future__ import annotations

import math
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

TAILLE = 320  # px : affiché en 64–96 px, donc net sur écran Retina
SORTIE = os.path.join(os.path.dirname(__file__), "..", "public", "images", "echantillons")


def hexa(couleur: str) -> np.ndarray:
    c = couleur.lstrip("#")
    return np.array([int(c[i : i + 2], 16) for i in (0, 2, 4)], dtype=np.float64) / 255.0


def bruit(taille: int, echelle: float, graine: int) -> np.ndarray:
    """Un bruit lisse dans [0, 1] : du bruit blanc agrandi par interpolation bicubique."""
    rng = np.random.default_rng(graine)
    petit = max(2, int(taille / echelle))
    im = Image.fromarray((rng.random((petit, petit)) * 255).astype(np.uint8))
    im = im.resize((taille, taille), Image.BICUBIC)
    return np.asarray(im, dtype=np.float64) / 255.0


def fbm(taille: int, graine: int, octaves: int = 5, base: float = 64.0) -> np.ndarray:
    """Bruit fractal : plusieurs octaves de bruit lisse, chacune deux fois plus fine et deux fois plus faible."""
    total = np.zeros((taille, taille))
    amplitude, echelle, somme = 1.0, base, 0.0
    for i in range(octaves):
        total += amplitude * bruit(taille, echelle, graine + i * 101)
        somme += amplitude
        amplitude *= 0.5
        echelle /= 2.0
    return total / somme


def masque_disque(taille: int, marge: float = 2.0) -> np.ndarray:
    """1 dans le disque, 0 dehors, avec un bord adouci d'un pixel et demi."""
    y, x = np.mgrid[0:taille, 0:taille]
    cx = cy = (taille - 1) / 2.0
    r = taille / 2.0 - marge
    d = np.hypot(x - cx, y - cy)
    return np.clip(r + 0.75 - d, 0.0, 1.5) / 1.5


def enregistrer(rgb: np.ndarray, alpha: np.ndarray, chemin: str) -> None:
    rgba = np.dstack([np.clip(rgb, 0, 1) * 255, np.clip(alpha, 0, 1) * 255]).astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(chemin, "WEBP", quality=85, method=6)


# ---------------------------------------------------------------------------
#  Les billes de peinture
# ---------------------------------------------------------------------------

def bille(
    couleur: str,
    *,
    metal: float = 0.0,
    brillance: float = 0.35,
    grain: float = 0.05,
    brosse: float = 0.0,
    graine: int = 1,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Une sphère éclairée. `metal` fait tirer le reflet vers la couleur de la
    matière (le laiton reflète en doré, la peinture reflète en blanc),
    `brillance` dose le reflet, `grain` le sablé de la poudre, `brosse` les
    stries d'un acier brossé.
    """
    n = TAILLE
    base = hexa(couleur)
    y, x = np.mgrid[0:n, 0:n]
    cx = cy = (n - 1) / 2.0
    r = n / 2.0 - 2.0
    nx = (x - cx) / r
    ny = (y - cy) / r
    dedans = nx * nx + ny * ny <= 1.0
    nz = np.sqrt(np.clip(1.0 - nx * nx - ny * ny, 0.0, 1.0))

    # Le grain de la poudre perturbe un peu la normale : la lumière accroche.
    if grain > 0:
        gx = (bruit(n, 1.6, graine) - 0.5) * grain
        gy = (bruit(n, 1.6, graine + 7) - 0.5) * grain
        nx2, ny2 = nx + gx, ny + gy
    else:
        nx2, ny2 = nx, ny
    if brosse > 0:
        # Des stries horizontales : un bruit très étiré dans le sens du brossage.
        rng = np.random.default_rng(graine + 3)
        lignes = rng.random((n, 1)) * np.ones((1, n))
        lignes = np.asarray(Image.fromarray((lignes * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6)), dtype=np.float64) / 255.0
        ny2 = ny2 + (lignes - 0.5) * brosse
    norme = np.sqrt(nx2 * nx2 + ny2 * ny2 + nz * nz) + 1e-9
    nx2, ny2, nz2 = nx2 / norme, ny2 / norme, nz / norme

    # Lumière principale en haut à gauche, un retour doux en bas à droite,
    # et une lumière d'ambiance qui vient du ciel (plus claire en haut).
    def lumiere(lx: float, ly: float, lz: float) -> tuple[np.ndarray, np.ndarray]:
        l = np.array([lx, ly, lz])
        l = l / np.linalg.norm(l)
        diffus = np.clip(nx2 * l[0] + ny2 * l[1] + nz2 * l[2], 0.0, 1.0)
        # Blinn-Phong : la bissectrice entre la lumière et l'œil (0,0,1).
        h = l + np.array([0.0, 0.0, 1.0])
        h = h / np.linalg.norm(h)
        spec = np.clip(nx2 * h[0] + ny2 * h[1] + nz2 * h[2], 0.0, 1.0)
        return diffus, spec

    d1, s1 = lumiere(-0.55, -0.7, 0.75)
    d2, s2 = lumiere(0.6, 0.8, 0.35)
    ciel = 0.5 + 0.5 * np.clip(-ny2, -1, 1)

    luminosite = np.mean(base)
    # Une couleur sombre garde des reflets visibles ; une claire ne doit pas cramer.
    ambiance = 0.30 + 0.38 * luminosite
    eclairage = ambiance * (0.75 + 0.5 * ciel) + (0.80 - 0.35 * luminosite) * d1 + 0.18 * d2
    rgb = base[None, None, :] * eclairage[:, :, None]

    reflet_couleur = base * metal + np.ones(3) * (1 - metal)
    dur = 34.0 if metal > 0.5 else 28.0
    reflet = brillance * (s1 ** dur) + brillance * 0.5 * (s1 ** 6) * (0.6 if metal > 0.5 else 0.35) + brillance * 0.25 * (s2 ** 24)
    rgb += reflet_couleur[None, None, :] * reflet[:, :, None]

    # Le bord de la bille s'assombrit (Fresnel inversé : c'est une matière mate).
    bord = np.clip(1.0 - nz2, 0, 1) ** 2.2
    rgb *= (1.0 - (0.45 - 0.2 * luminosite) * bord)[:, :, None]
    # Un léger sablé de teinte pour ne pas avoir un aplat numérique.
    if grain > 0:
        rgb *= (1.0 + (bruit(n, 1.3, graine + 11) - 0.5) * 0.08)[:, :, None]

    alpha = masque_disque(n)
    rgb = np.where(dedans[:, :, None], rgb, base[None, None, :])
    return rgb, alpha


# ---------------------------------------------------------------------------
#  Les disques de bois
# ---------------------------------------------------------------------------

def bois(
    clair: str,
    moyen: str,
    sombre: str,
    *,
    veines: float = 9.0,
    ondulation: float = 0.9,
    contraste: float = 1.0,
    noeuds: int = 0,
    graine: int = 1,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Le fil du bois : des cernes verticales (des sinus), déformées par un bruit
    fractal, avec des variations de teinte plus larges (les planches, les
    zones de duramen) et, pour le chêne rustique, des nœuds.
    """
    n = TAILLE
    y, x = np.mgrid[0:n, 0:n]
    u = x / n
    v = y / n

    # Les cernes : leur écartement varie lentement (les années grasses et les
    # maigres), et le fil ondule à grande échelle — c'est ce qui dessine les
    # « cathédrales » d'une planche sur dosse.
    espacement = 0.7 + 0.6 * fbm(n, graine + 300, octaves=2, base=260.0)
    deformation = (fbm(n, graine, octaves=3, base=230.0) - 0.5) * ondulation
    fin = (fbm(n, graine + 50, octaves=4, base=50.0) - 0.5) * 0.35
    phase = u * veines * espacement + deformation + fin + v * 0.2
    f = phase - np.floor(phase)
    # Le bois d'été : une ligne fine et sombre ; autour, un dégradé doux.
    ligne = np.exp(-((f - 0.5) ** 2) / (2 * 0.07 ** 2))
    doux = np.exp(-((f - 0.5) ** 2) / (2 * 0.22 ** 2))
    cernes = np.clip(0.6 * ligne + 0.45 * doux, 0, 1)
    # Les fibres : un bruit très fin, étiré verticalement.
    fibres = np.asarray(
        Image.fromarray((np.random.default_rng(graine + 9).random((n, n // 5)) * 255).astype(np.uint8)).resize((n, n), Image.BILINEAR),
        dtype=np.float64,
    ) / 255.0
    fibres = np.asarray(Image.fromarray((fibres * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7)), dtype=np.float64) / 255.0
    teinte = fbm(n, graine + 200, octaves=3, base=200.0)  # les grandes zones de couleur

    c_clair, c_moyen, c_sombre = hexa(clair), hexa(moyen), hexa(sombre)
    t = np.clip(0.5 * cernes * contraste + 0.22 * (fibres - 0.5) * contraste + 0.5 * (teinte - 0.5) + 0.3, 0, 1)
    rgb = np.where(
        (t < 0.5)[:, :, None],
        c_clair[None, None, :] * (1 - t * 2)[:, :, None] + c_moyen[None, None, :] * (t * 2)[:, :, None],
        c_moyen[None, None, :] * (1 - (t - 0.5) * 2)[:, :, None] + c_sombre[None, None, :] * ((t - 0.5) * 2)[:, :, None],
    )

    if noeuds:
        rng = np.random.default_rng(graine + 77)
        for _ in range(noeuds):
            kx, ky = rng.uniform(0.25, 0.75, size=2) * n
            rayon = rng.uniform(0.06, 0.11) * n
            d = np.hypot(x - kx, (y - ky) * 0.75)
            anneaux = 0.5 + 0.5 * np.sin(d / rayon * 9.0)
            noyau = np.clip(1 - d / rayon, 0, 1)
            assombri = (0.55 + 0.25 * anneaux) * noyau ** 0.6 + (1 - noyau ** 0.6)
            rgb = rgb * assombri[:, :, None] * (1 - 0.12 * noyau)[:, :, None] + c_sombre[None, None, :] * (0.2 * noyau ** 3)[:, :, None]

    # Un éclairage doux : plus clair en haut à gauche, comme la bille.
    eclairage = 1.0 + 0.10 * (0.5 - v) + 0.06 * (0.5 - u)
    rgb = rgb * eclairage[:, :, None]
    # Un vernis discret : un très léger reflet en haut.
    rgb += (0.06 * np.clip(0.35 - v, 0, 1) / 0.35)[:, :, None]
    # Le bord du disque légèrement ombré pour donner l'épaisseur d'un échantillon.
    cx = cy = (n - 1) / 2.0
    dist = np.hypot(x - cx, y - cy) / (n / 2.0)
    rgb *= (1.0 - 0.18 * np.clip(dist - 0.86, 0, 1) / 0.14)[:, :, None]
    return rgb, masque_disque(n)


# ---------------------------------------------------------------------------
#  Les disques de velours
# ---------------------------------------------------------------------------

def velours(couleur: str, *, graine: int = 1) -> tuple[np.ndarray, np.ndarray]:
    """
    Un velours : la couleur vit par son poil. Le sens du poil change la
    lumière par grandes zones molles (les plis du tissu), un grain très fin
    fait le duvet, et une bande claire en travers donne le lustre du velours.
    """
    n = TAILLE
    base = hexa(couleur)
    y, x = np.mgrid[0:n, 0:n]
    u, v = x / n, y / n
    # Les plis : de larges vagues de lumière, un peu penchées.
    plis = fbm(n, graine, octaves=3, base=150.0)
    plis = 0.75 + 0.5 * plis
    # Le duvet : un bruit fin, légèrement étiré dans le sens du poil.
    duvet = np.asarray(
        Image.fromarray((np.random.default_rng(graine + 5).random((n // 2, n)) * 255).astype(np.uint8)).resize((n, n), Image.BILINEAR),
        dtype=np.float64,
    ) / 255.0
    duvet = np.asarray(Image.fromarray((duvet * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.9)), dtype=np.float64) / 255.0
    # Le lustre : une bande douce en diagonale, plus claire, comme la lumière
    # qui glisse sur le poil couché.
    diag = (u * 0.6 + v * 0.8)
    lustre = np.exp(-((diag - 0.45) ** 2) / (2 * 0.16 ** 2))
    luminosite = np.mean(base)
    eclairage = plis * (1.0 + 0.10 * (duvet - 0.5)) * (1.0 + 0.16 * lustre) * (1.0 + 0.12 * (0.5 - v))
    rgb = base[None, None, :] * eclairage[:, :, None]
    # Le velours renvoie un reflet légèrement désaturé sur les crêtes.
    rgb += (0.10 * (1 - luminosite) * lustre * duvet)[:, :, None] * np.ones(3)[None, None, :]
    # Le bord du disque, ombré : l'échantillon a une épaisseur.
    cx = cy = (n - 1) / 2.0
    dist = np.hypot(x - cx, y - cy) / (n / 2.0)
    rgb *= (1.0 - 0.22 * np.clip(dist - 0.84, 0, 1) / 0.16)[:, :, None]
    return rgb, masque_disque(n)


VELOURS = {
    "bleu-roi": "#304d78", "sacramento": "#365055", "vert-bouteille": "#706e3b", "endive": "#cec68d",
    "paon": "#1f5c64", "minuit": "#3d4563", "prune": "#693d4d", "vieux-rose": "#915f57",
    "terre-de-sienne": "#844c2c", "ocre": "#a0722c", "champagne": "#bfa37b", "noir": "#454544",
    "onyx": "#4a4b52", "dune": "#b99971", "cendre": "#746a67",
}

ECHANTILLONS: dict[str, tuple] = {
    # Peintures thermolaquées mates (les pieds) — et l'acier brut verni.
    "metal-noir": ("bille", dict(couleur="#26241f", grain=0.06, brillance=0.30, graine=1)),
    "metal-gris": ("bille", dict(couleur="#5b5c5a", grain=0.07, brillance=0.32, graine=2)),
    "metal-chocolat": ("bille", dict(couleur="#5a4438", grain=0.07, brillance=0.30, graine=3)),
    "metal-laiton": ("bille", dict(couleur="#b39a55", metal=0.85, grain=0.03, brillance=0.55, graine=4)),
    "metal-lin": ("bille", dict(couleur="#dcd6c3", grain=0.06, brillance=0.22, graine=5)),
    "metal-blanc": ("bille", dict(couleur="#f2f0ea", grain=0.05, brillance=0.20, graine=6)),
    "metal-acier-brut": ("bille", dict(couleur="#8a8a86", metal=0.5, grain=0.02, brillance=0.45, brosse=0.10, graine=7)),
    # Les essences.
    "bois-pin": ("bois", dict(clair="#f1dcae", moyen="#dcb878", sombre="#b48546", veines=6.0, ondulation=2.6, contraste=0.9, graine=11)),
    "bois-hetre": ("bois", dict(clair="#ecd5b8", moyen="#dbbc99", sombre="#bd946d", veines=10.0, ondulation=1.6, contraste=0.5, graine=12)),
    "bois-chene": ("bois", dict(clair="#dcb983", moyen="#c3985d", sombre="#8b6032", veines=7.0, ondulation=3.2, contraste=1.0, graine=13)),
    "bois-noyer": ("bois", dict(clair="#80593a", moyen="#5b3b25", sombre="#2f1d0e", veines=7.5, ondulation=3.0, contraste=1.05, graine=14)),
    # Les velours des chaises.
    **{f"velours-{nom}": ("velours", dict(couleur=c, graine=20 + i)) for i, (nom, c) in enumerate(VELOURS.items())},
}


def main(seulement: list[str]) -> None:
    os.makedirs(SORTIE, exist_ok=True)
    for nom, (genre, params) in ECHANTILLONS.items():
        if seulement and nom not in seulement:
            continue
        rgb, alpha = bille(**params) if genre == "bille" else velours(**params) if genre == "velours" else bois(**params)
        chemin = os.path.join(SORTIE, f"{nom}.webp")
        enregistrer(rgb, alpha, chemin)
        print(nom, "->", os.path.relpath(chemin))


if __name__ == "__main__":
    main(sys.argv[1:])
