"""
Calques de pieds pour la chaise velours.

Le site pose ces PNG transparents sur la photo du coloris (product-view.tsx) :
le client voit sa chaise avec la teinte de pieds choisie.

Les quinze rendus ont exactement la même géométrie ; seul le velours change.
On s'en sert deux fois :
  1. DÉTOURAGE : pour chaque pixel, la pente de régression de sa luminance
     contre celle du velours (à travers les 15 rendus) vaut ~0 sur le métal
     et le fond, ~1 sur le velours, ~0.2 sur les ombres portées sur le
     velours. Le métal = pente ≈ 0 et sombre, reflets bordés de noir bouchés
     par fermeture, d'un seul tenant avec le sol. Les lisières sont estimées
     en couverture (mélange fond/tube) puis nettoyées à ×2 et redescendues en
     LANCZOS.
  2. MODELÉ : tube mat = cylindre lambertien à faible amplitude, éclairage
     enveloppant (source large), occlusion sous l'assise lue dans le rendu ;
     on y superpose, très atténué, le résidu haute fréquence du rendu noir
     pour que les jonctions gardent leur structure réelle.

    python3 scripts/pieds-chaise.py            →  public/images/chaises/pieds-v2-<teinte>.png
    python3 scripts/pieds-chaise.py --apercus  →  … plus deux montages de contrôle dans /tmp

Dépendances : python3, numpy, Pillow (rien d'autre).
"""
import os, sys, time
import numpy as np
from PIL import Image, ImageFilter

DOSSIER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "images", "chaises") + "/"
SORTIE = DOSSIER
VELOURS = ["bleu-roi", "cendre", "champagne", "dune", "endive", "minuit", "noir", "ocre",
           "onyx", "paon", "prune", "sacramento", "terre-de-sienne", "vert-bouteille", "vieux-rose"]
TEINTES = {
    "noir": (28, 26, 24), "gris": (70, 69, 63), "chocolat": (70, 56, 49),
    "laiton": (140, 124, 63), "lin": (207, 201, 182), "blanc": (240, 239, 235),
    "brut": (138, 133, 120),
}
HAUT = 340          # rien de métallique au-dessus
SOL = 560           # les pieds touchent le sol en dessous
RAYON = 5.6         # demi-largeur du tube, px
# « -vN » : à chaque nouvelle génération, N augmente (et products.ts suit),
# sinon l'optimiseur d'images resservirait l'ancien calque sous le même nom.
PREFIXE = "pieds-v2-"

# ----------------------------------------------------------------- outils
def charger(nom):
    return np.asarray(Image.open(f"{DOSSIER}{nom}.jpg").convert("RGB")).astype(np.float32)

def u8(m):
    return Image.fromarray((np.clip(m, 0, 1) * 255).astype(np.uint8))

def maxf(m, k):
    return np.asarray(u8(m).filter(ImageFilter.MaxFilter(k))).astype(np.float32) / 255

def minf(m, k):
    return np.asarray(u8(m).filter(ImageFilter.MinFilter(k))).astype(np.float32) / 255

def flou(a, r):
    """Flou gaussien séparable d'une couche float (sigma = r px), numpy pur."""
    if r <= 0: return a.astype(np.float32)
    K = int(np.ceil(3 * r)); x = np.arange(-K, K + 1)
    k = np.exp(-x ** 2 / (2 * r * r)); k /= k.sum()
    def axe(v, ax):
        p = np.pad(v, [(K, K) if i == ax else (0, 0) for i in range(2)], mode="edge")
        out = np.zeros_like(v)
        for i, w in enumerate(k):
            sl = [slice(None)] * 2; sl[ax] = slice(i, i + v.shape[ax])
            out += w * p[tuple(sl)]
        return out
    return axe(axe(a.astype(np.float32), 0), 1)

def flou_masque(a, m, r):
    """Flou normalisé : ne mélange que les pixels où m > 0 (pas de bavure
    du fond dans le tube)."""
    num = flou(a * m, r); den = flou(m, r)
    return np.where(den > 1e-3, num / np.maximum(den, 1e-3), 0)

def voisins3(a, f):
    """Applique f (np.minimum / np.maximum / somme) sur le voisinage 3×3."""
    p = np.pad(a, 1, mode="edge")
    out = a.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dy == 0 and dx == 0: continue
            out = f(out, p[1 + dy:1 + dy + a.shape[0], 1 + dx:1 + dx + a.shape[1]])
    return out

def connexe(masque, graine):
    g = graine & masque
    for _ in range(2000):
        n = (maxf(g.astype(np.float32), 3) > 0.5) & masque
        if np.array_equal(n, g): break
        g = n
    return g

def remplir_depuis_dehors(valeurs, connu, iterations):
    """Propage vers l'intérieur la valeur des pixels connus les plus proches
    (moyenne 3×3 des voisins connus) : 'ce qu'il y a derrière le tube'."""
    v = np.where(connu[..., None] if valeurs.ndim == 3 else connu, valeurs, 0).astype(np.float32)
    w = connu.astype(np.float32)
    for _ in range(iterations):
        if valeurs.ndim == 3:
            sv = np.stack([voisins3(v[..., k], np.add) for k in range(3)], -1)
        else:
            sv = voisins3(v, np.add)
        sw = voisins3(w, np.add)
        nouveau = (w == 0) & (sw > 0)
        if valeurs.ndim == 3:
            v[nouveau] = sv[nouveau] / sw[nouveau][:, None]
        else:
            v[nouveau] = sv[nouveau] / sw[nouveau]
        w[nouveau] = 1
    return v

def distance_au_bord(dedans, iterations=10):
    """Distance chanfrein (1, √2) au premier pixel hors du tube, en px,
    pour les pixels dedans. 0 dehors."""
    inf = 1e4
    d = np.where(dedans, inf, 0.0).astype(np.float32)
    for _ in range(iterations):
        p = np.pad(d, 1, mode="constant", constant_values=0)
        H, W = d.shape
        n = d.copy()
        for dy, dx, c in ((-1, 0, 1), (1, 0, 1), (0, -1, 1), (0, 1, 1),
                          (-1, -1, 1.4142), (-1, 1, 1.4142), (1, -1, 1.4142), (1, 1, 1.4142)):
            n = np.minimum(n, p[1 + dy:1 + dy + H, 1 + dx:1 + dx + W] + c)
        d = np.where(dedans, n, 0)
    # le centre d'un pixel de bord est à ½ px de la frontière
    return np.where(dedans, np.minimum(d, 999) + 0.5, 0)

# ------------------------------------------------------------- détourage
def analyser(renders):
    """Luminance médiane (robuste au bruit JPEG) et pente de chaque pixel
    contre la luminance du velours, à travers les rendus."""
    L = renders.mean(-1)                               # N×H×W
    velours = renders[:, 380:450, 600:800].mean((1, 2, 3))
    v = velours - velours.mean()
    pente = (L * v[:, None, None]).sum(0) / (v ** 2).sum()
    med = np.median(renders, 0)
    return med, med.mean(-1), pente

def masque_pieds(lum, pente):
    metal = pente < 0.12
    sombre = metal & (lum < 120)
    sombre[:HAUT, :] = False
    # reflets gris (jusqu'à presque blanc) collés au noir du tube
    gris = metal & (lum < 190) & (maxf(sombre.astype(np.float32), 5) > 0.5)
    m = sombre | gris
    # fermeture : le reflet spéculaire (jusqu'à 225 !) est toujours bordé de noir
    plein = (minf(maxf(m.astype(np.float32), 5), 5) > 0.5) | m
    plein[:HAUT, :] = False
    graine = np.zeros_like(plein); graine[SOL:, :] = True
    plein = connexe(plein, graine)
    # --- lisière : couverture estimée dans une bande de 2 px dehors / 1 px dedans
    dil = maxf(plein.astype(np.float32), 5) > 0.5
    ero = minf(plein.astype(np.float32), 3) > 0.5
    bande = dil & ~ero
    dehors = ~dil
    lum_derriere = remplir_depuis_dehors(lum, dehors, 4)
    pente_derriere = remplir_depuis_dehors(pente, dehors, 4)
    cov_lum = np.clip((lum_derriere - lum) / np.maximum(lum_derriere - 40, 20), 0, 1)
    cov_pente = np.clip(1 - pente / np.maximum(pente_derriere, 0.05), 0, 1)
    w = np.clip((pente_derriere - 0.2) / 0.4, 0, 1)          # velours derrière
    cov = (1 - w) * cov_lum + w * (0.5 * cov_lum + 0.5 * cov_pente)
    cov = np.where(plein, np.maximum(cov, 0.5), cov)          # reflet touchant le bord
    alpha0 = np.where(bande, cov, ero.astype(np.float32))
    # --- ×2 : seuil, léger lissage, seuil, puis LANCZOS ×1 : bord net et régulier
    H, W = alpha0.shape
    haut = np.asarray(Image.fromarray(alpha0).resize((W * 2, H * 2), Image.BICUBIC))
    b = (haut > 0.5).astype(np.float32)
    b = (flou(b, 1.2) > 0.5).astype(np.float32)
    alpha = np.asarray(Image.fromarray(b).resize((W, H), Image.LANCZOS)).astype(np.float32)
    alpha = np.clip(alpha, 0, 1)
    alpha[alpha < 0.02] = 0
    return alpha, dehors, lum_derriere, pente_derriere

# --------------------------------------------------------------- modelé
def modele(alpha, lum):
    dedans = alpha > 0.5
    d = distance_au_bord(dedans)
    d = flou(d, 0.9)
    h = np.clip(d / RAYON, 0, 1)                  # 0 lisière → 1 axe du tube
    gy, gx = np.gradient(flou(d, 1.4))
    n = np.sqrt(gx ** 2 + gy ** 2) + 1e-6
    lat = 1 - h                                   # composante latérale de la normale d'un cylindre
    nx, ny = -gx / n * lat, -gy / n * lat
    nz = np.sqrt(np.clip(1 - nx ** 2 - ny ** 2, 0, 1))
    # lumière principale : haut-gauche, devant ; source large → éclairage enveloppant
    lx, ly, lz = -0.55, -0.45, 0.70
    ndl = nx * lx + ny * ly + nz * lz
    enveloppe = 0.25
    diffus = np.clip((ndl + enveloppe) / (1 + enveloppe), 0, 1)
    # ciel de studio : plus clair vers le haut
    ciel = 0.5 + 0.5 * nz + 0.15 * (-ny)
    # le tube dans l'ombre de l'assise : on le lit dans le rendu noir
    expo = flou_masque(lum, dedans.astype(np.float32), 8)
    occlusion = np.clip((expo - 10) / 30, 0, 1)
    occlusion = 0.62 + 0.38 * occlusion
    # résidu haute fréquence du rendu noir : la structure réelle, sans son brillant
    lisse = flou_masque(lum, dedans.astype(np.float32), 3)
    residu = np.where(dedans, lum - lisse, 0)
    detail = np.clip(residu * 0.3, -18, 8)
    detail = flou_masque(detail, dedans.astype(np.float32), 0.7)
    # ... mais seulement aux jonctions (là où la forme est plus large qu'un
    # tube) : sur un tube droit, le résidu n'apporte que le filet brillant du
    # noir laqué et des tirets périodiques (blocs JPEG) — du « bambou ».
    jonction = maxf((d > 0.85 * RAYON).astype(np.float32), 9)
    jonction = flou(jonction, 2.5)
    detail = detail * jonction
    # liseré d'occlusion : le dernier px (contact, grazing) perd ~12 %
    lisere = 1 - 0.14 * np.clip(1 - d / 2.0, 0, 1)
    return dict(diffus=diffus, ciel=ciel, nz=nz, occlusion=occlusion, detail=detail, lisere=lisere, lat=lat)

def couleur_tube(teinte, M):
    c = np.array(teinte, np.float32)
    L = c.mean()
    # ombrage lambertien doux ; l'amplitude reste celle d'une peinture mate
    ombrage = 0.45 + 0.16 * M["ciel"] + 0.40 * M["diffus"]
    ombrage = ombrage * M["occlusion"] * M["lisere"]
    # une peinture mate foncée ne se lit que par un léger velouté sur les flancs
    sheen = (M["lat"] ** 2) * np.clip(M["diffus"], 0, 1) * (14 * (1 - L / 255) + 3)
    rgb = c[None, None, :] * ombrage[..., None] + sheen[..., None]
    # détail réel, dosé selon la clarté (une teinte claire l'absorbe moins)
    rgb = rgb + M["detail"][..., None] * (0.35 + 0.65 * L / 255)
    return np.clip(rgb, 0, 255)

# ------------------------------------------------------------ composition
def calque(alpha, rgb, derriere, velours_derriere):
    """PNG RGBA. Sur le fond (identique dans tous les rendus) la lisière est
    recomposée opaque avec la couleur du fond : exact. Sur le velours (qui
    change), on garde alpha = couverture et on pré-compense en couleur ce
    que le noir du tube d'origine laisse sous le calque."""
    a = alpha[..., None]
    vel = velours_derriere[..., None]
    # fond : opaque + mélange
    c_fond = a * rgb + (1 - a) * derriere
    a_fond = np.where(alpha > 0, 1.0, 0.0)[..., None]
    # velours : alpha' = a, couleur compensée (c' = rgb + (1-a)·derrière_médian)
    c_vel = np.clip(rgb + (1 - a) * derriere, 0, 255)
    a_vel = a
    c = np.where(vel > 0.5, c_vel, c_fond)
    aa = np.where(vel > 0.5, a_vel, a_fond)
    aa = np.where(alpha >= 0.995, 1.0, aa[..., 0])[..., None]
    c = np.where(alpha[..., None] >= 0.995, rgb, c)
    out = np.dstack([c, aa * 255]).astype(np.uint8)
    return Image.fromarray(out)

# ---------------------------------------------------------------- montages
def apercus(sortie):
    def composer(velours, teinte):
        b = Image.open(f"{DOSSIER}{velours}.jpg").convert("RGBA")
        b.alpha_composite(Image.open(f"{sortie}{PREFIXE}{teinte}.png"))
        return b.convert("RGB")
    combos = [("bleu-roi", "blanc"), ("vert-bouteille", "laiton"), ("noir", "lin"),
              ("prune", "gris"), ("endive", "chocolat"), ("cendre", "brut")]
    site = Image.new("RGB", (3 * 560, 2 * 560), "white")
    for i, (v, t) in enumerate(combos):
        vig = composer(v, t).crop((298, 0, 1066, 768)).resize((560, 560), Image.LANCZOS)
        site.paste(vig, ((i % 3) * 560, (i // 3) * 560))
    site.save("/tmp/pieds-apercu-site.png")
    zoom = Image.new("RGB", (1000, 1600), "white")
    for i, (v, t) in enumerate(combos[:2]):
        z = composer(v, t).crop((450, 330, 950, 730)).resize((1000, 800), Image.LANCZOS)
        zoom.paste(z, (0, i * 800))
    zoom.save("/tmp/pieds-apercu-zoom.png")

if __name__ == "__main__":
    t0 = time.time()
    renders = np.stack([charger(n) for n in VELOURS])
    med, lum, pente = analyser(renders)
    alpha, dehors, lum_derriere, pente_derriere = masque_pieds(lum, pente)
    derriere = remplir_depuis_dehors(med, dehors, 6)
    velours_derriere = (remplir_depuis_dehors(pente, dehors, 6) > 0.3).astype(np.float32)
    M = modele(alpha, lum)
    print("analyse %.1f s" % (time.time() - t0))
    for nom, teinte in TEINTES.items():
        rgb = couleur_tube(teinte, M)
        calque(alpha, rgb, derriere, velours_derriere).save(f"{SORTIE}{PREFIXE}{nom}.png", optimize=True)
        print("pieds-" + nom)
    if "--apercus" in sys.argv:
        apercus(SORTIE)
    print("total %.1f s" % (time.time() - t0))
