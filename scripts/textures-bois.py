"""
Textures de bois pour le croquis coté du configurateur (schema-cotes.tsx).

Deux images par essence, dans public/images/plateau/ :
  <essence>.jpg       la face, débitée sur dosse — les cernes y dessinent les
                      « cathédrales » d'une vraie planche, avec pores, fibres,
                      rayons et nœuds selon l'essence ;
  <essence>-bout.jpg  le bois de bout, vu sur la tranche : cernes en arcs
                      autour du cœur, et rayons qui en partent.

Tout est calculé : pas de photo à recadrer, pas de droits, et la même planche
à chaque chargement.

    python3 scripts/textures-bois.py
"""

from __future__ import annotations

import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

LARGEUR, HAUTEUR = 1600, 800
BOUT_L, BOUT_H = 1600, 200
DOSSIER = os.path.join(os.path.dirname(__file__), "..", "public", "images", "plateau")


def bruit(forme: tuple[int, int], echelle: float, rng: np.random.Generator) -> np.ndarray:
    """Un bruit lisse (-1..1) : du bruit blanc grossier, agrandi en bicubique."""
    h, w = forme
    ph, pw = max(2, int(h / echelle) + 2), max(2, int(w / echelle) + 2)
    petit = rng.random((ph, pw)) * 2 - 1
    im = Image.fromarray(((petit + 1) * 127.5).astype(np.uint8))
    return np.asarray(im.resize((w, h), Image.BICUBIC), dtype=np.float32) / 127.5 - 1


def fbm(forme, rng, echelles=(320, 160, 80, 40), poids=(1, 0.5, 0.25, 0.12)) -> np.ndarray:
    total = np.zeros(forme, dtype=np.float32)
    for e, p in zip(echelles, poids):
        total += p * bruit(forme, e, rng)
    return total / sum(poids)


def lisse(v: np.ndarray, a: float, b: float) -> np.ndarray:
    t = np.clip((v - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def melange(fond: np.ndarray, couleur: tuple[int, int, int], k: np.ndarray) -> np.ndarray:
    """Pose `couleur` sur `fond` avec l'opacité k (0..1)."""
    c = np.array(couleur, dtype=np.float32)
    return fond * (1 - k[..., None]) + c * k[..., None]


def grain_fin(img: np.ndarray, rng: np.random.Generator, force: float) -> np.ndarray:
    """Le grain d'un bois poncé : un bruit très fin, à peine visible."""
    h, w = img.shape[:2]
    fin = rng.normal(0, 1, (h, w)).astype(np.float32)
    fin = np.asarray(
        Image.fromarray(((fin * 40) + 128).clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6)),
        dtype=np.float32,
    )
    return img + ((fin - 128) / 40 * force)[..., None]


def face(
    *,
    clair: tuple[int, int, int],
    fonce: tuple[int, int, int],
    pore: tuple[int, int, int],
    graine: int,
    cerne_mm: float,
    contraste: float,
    cathedrale: float,
    ondulation: float,
    pores: float,
    rayons: float,
    noeuds: list[tuple[float, float, float]],
) -> Image.Image:
    """
    La face d'une planche sur dosse : les cernes sont des arcs autour d'un cœur
    placé loin sous la planche — plus il est proche, plus les « cathédrales »
    s'ouvrent. Un déplacement fractal tord le tout pour que rien ne se répète.
    """
    rng = np.random.default_rng(graine)
    h, w = HAUTEUR, LARGEUR
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)

    # Le fil ondule, et contourne les nœuds.
    dx = fbm((h, w), rng, (900, 420, 200), (1, 0.5, 0.25)) * ondulation * 3.0
    dy = fbm((h, w), rng, (700, 320, 160), (1, 0.5, 0.25)) * ondulation * 0.8
    for kx, ky, kr in noeuds:
        d2 = (x - kx) ** 2 + ((y - ky) * 1.5) ** 2
        poids = np.exp(-d2 / (2 * (kr * 2.6) ** 2))
        dy += np.sign(y - ky) * kr * 1.5 * poids
        dx += (x - kx) / (kr * 2.0) * kr * 0.5 * poids
    xw, yw = x + dx, y + dy

    # Le cœur de la bille, sous la planche : la distance elliptique à ce point
    # donne les arcs (`cathedrale` = à quel point il est proche).
    cx = w * 0.5 + rng.uniform(-w * 0.2, w * 0.2)
    cy = h + 340 / max(cathedrale, 0.05)
    ex = 0.42
    d = np.sqrt(((xw - cx) * ex) ** 2 + (yw - cy) ** 2)

    # Bois de printemps (clair, large) et bois d'été (sombre, étroit) : une
    # onde asymétrique. Les cernes sont plus ou moins larges d'une année à
    # l'autre — on déplace la distance, on ne change PAS la période : une
    # fréquence qui varie referme des boucles au lieu de suivre le fil.
    d = d + fbm((h, w), rng, (1100, 520), (1, 0.45)) * cerne_mm * 0.55
    phase = d / cerne_mm
    onde = np.sin(2 * np.pi * phase)
    # La bande dense est fine ; sa force change d'un cerne à l'autre (certaines
    # années sont sèches) — d'où un numéro de cerne, et un tirage par numéro.
    numero = np.floor(phase)
    force = 0.35 + 0.65 * (0.5 + 0.5 * np.sin(numero * 12.9898 + graine))
    ete = lisse(onde, 0.55, 0.99) * force
    demi = lisse(onde, -0.4, 0.62) * 0.30 * force

    img = np.tile(np.array(clair, dtype=np.float32), (h, w, 1))
    img += (fbm((h, w), rng, (1400, 700), (1, 0.5)) * 7)[..., None]
    img = melange(img, fonce, (ete * 0.72 + demi) * contraste)

    # Les fibres : de longs traits très fins, dans le sens du fil déformé.
    # Trois pas différents, pour que le grain ne fasse pas une trame régulière.
    for pas, k_fonce, k_clair in ((5.5, 0.16, 0.08), (9.0, 0.10, 0.05), (2.7, 0.07, 0.04)):
        fil = np.sin(2 * np.pi * (yw / pas + fbm((h, w), rng, (160, 80), (1, 0.6)) * 4))
        img = melange(img, fonce, lisse(fil, 0.72, 1.0) * k_fonce)
        img = melange(img, (255, 248, 232), lisse(-fil, 0.8, 1.0) * k_clair)

    im = Image.fromarray(np.clip(grain_fin(img, rng, 3.0), 0, 255).astype(np.uint8))

    # Les pores : de très courts traits sombres, couchés dans le fil.
    calque = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d_ = ImageDraw.Draw(calque)
    for _ in range(int(pores * w * h / 10000)):
        px, py = int(rng.integers(0, w)), int(rng.integers(0, h))
        lg = int(rng.integers(6, 26))
        pente = float(dy[py, px] - dy[max(0, py - 40), px]) / 40 if py > 40 else 0.0
        d_.line(
            [(px, py), (px + lg, py + pente * lg)],
            fill=(*pore, int(rng.integers(26, 72))),
            width=1,
        )
    # Les rayons (maillures) : de fines virgules claires, en travers du fil.
    for _ in range(int(rayons * w * h / 10000)):
        px, py = int(rng.integers(0, w)), int(rng.integers(0, h))
        d_.line(
            [(px, py), (px + int(rng.integers(-2, 3)), py + int(rng.integers(3, 12)))],
            fill=(255, 246, 228, int(rng.integers(18, 52))),
            width=1,
        )
    im = Image.alpha_composite(im.convert("RGBA"), calque.filter(ImageFilter.GaussianBlur(0.35)))

    # Les nœuds : un cœur sombre, ses cernes serrés, l'auréole autour.
    calque = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d_ = ImageDraw.Draw(calque)
    for kx, ky, kr in noeuds:
        d_.ellipse([kx - kr * 2.4, ky - kr * 1.5, kx + kr * 2.4, ky + kr * 1.5], fill=(120, 82, 42, 40))
        for i in range(12, 0, -1):
            r = kr * i / 12
            d_.ellipse(
                [kx - r * 1.5, ky - r, kx + r * 1.5, ky + r],
                outline=(92, 58, 26, int(30 + (12 - i) * 12)),
                width=max(1, int(kr / 14)),
            )
        d_.ellipse([kx - kr * 0.62, ky - kr * 0.42, kx + kr * 0.62, ky + kr * 0.42], fill=(78, 48, 22, 210))
        d_.ellipse([kx - kr * 0.26, ky - kr * 0.17, kx + kr * 0.26, ky + kr * 0.17], fill=(48, 28, 12, 235))
    im = Image.alpha_composite(im, calque.filter(ImageFilter.GaussianBlur(0.9)))
    return im.convert("RGB")


def bout(
    *,
    clair: tuple[int, int, int],
    fonce: tuple[int, int, int],
    graine: int,
    cerne_mm: float,
    contraste: float,
    rayons: float,
) -> Image.Image:
    """Le bois de bout : les cernes en arcs autour du cœur, et les rayons."""
    rng = np.random.default_rng(graine + 100)
    h, w = BOUT_H, BOUT_L
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = w * 0.5, h * 3.4  # le cœur, bien sous la tranche
    d = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)
    d = d + fbm((h, w), rng, (400, 200, 100), (1, 0.5, 0.25)) * 9
    ete = lisse(np.sin(2 * np.pi * d / (cerne_mm * 1.25)), 0.1, 0.95)

    img = np.tile(np.array(clair, dtype=np.float32), (h, w, 1))
    img += (fbm((h, w), rng, (600, 300), (1, 0.5)) * 6)[..., None]
    img = melange(img, fonce, ete * 0.78 * contraste)
    # Les rayons partent du cœur : de fines lignes claires, radiales.
    angle = np.arctan2(y - cy, x - cx)
    raies = np.sin(angle * 340 + fbm((h, w), rng, (200, 100), (1, 0.5)) * 3)
    img = melange(img, (255, 246, 226), lisse(raies, 0.9, 1.0) * rayons)
    return Image.fromarray(np.clip(grain_fin(img, rng, 2.4), 0, 255).astype(np.uint8))


ESSENCES = {
    "chene": dict(
        clair=(219, 186, 132), fonce=(146, 101, 50), pore=(72, 44, 18), graine=7,
        cerne_mm=58, contraste=0.85, cathedrale=1.0, ondulation=9,
        pores=9.0, rayons=3.0, noeuds=[(470, 300, 30), (1160, 560, 20)],
    ),
    "pin": dict(
        clair=(240, 216, 166), fonce=(184, 130, 68), pore=(120, 78, 34), graine=11,
        cerne_mm=38, contraste=1.0, cathedrale=1.35, ondulation=11,
        pores=1.2, rayons=0.5, noeuds=[(400, 250, 40), (980, 600, 32), (1370, 200, 24)],
    ),
    "hetre": dict(
        clair=(233, 209, 180), fonce=(180, 141, 104), pore=(122, 88, 56), graine=5,
        cerne_mm=52, contraste=0.5, cathedrale=0.7, ondulation=6,
        pores=2.0, rayons=9.0, noeuds=[],
    ),
    "noyer": dict(
        clair=(140, 101, 66), fonce=(62, 38, 22), pore=(38, 22, 12), graine=3,
        cerne_mm=64, contraste=0.9, cathedrale=1.15, ondulation=14,
        pores=7.0, rayons=0.6, noeuds=[(820, 380, 26)],
    ),
}


def main() -> None:
    os.makedirs(DOSSIER, exist_ok=True)
    for nom, params in ESSENCES.items():
        chemin = os.path.join(DOSSIER, f"{nom}.jpg")
        face(**params).save(chemin, "JPEG", quality=84, optimize=True, progressive=True)

        cheminb = os.path.join(DOSSIER, f"{nom}-bout.jpg")
        bout(
            clair=params["clair"],
            fonce=params["fonce"],
            graine=params["graine"],
            cerne_mm=params["cerne_mm"],
            contraste=params["contraste"],
            rayons=min(0.35, params["rayons"] / 25),
        ).save(cheminb, "JPEG", quality=84, optimize=True, progressive=True)
        print(nom, os.path.getsize(chemin) // 1024, "Ko +", os.path.getsize(cheminb) // 1024, "Ko")


if __name__ == "__main__":
    main()
