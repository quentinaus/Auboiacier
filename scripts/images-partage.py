"""
Les images de partage (Facebook, WhatsApp, LinkedIn, X…), au format que les
réseaux attendent : 1200 × 630, soit 1,91:1.

Les photos de l'atelier ont chacune leur format — carré pour les plafonds,
portrait pour le cheval, très allongé pour la Mikado — et un réseau qui
reçoit une photo hors format la rogne n'importe comment : le panneau coupé
en deux, la sculpture tronquée aux deux tiers. On fabrique donc ici, une fois
pour toutes, une déclinaison propre par page concernée, plus l'image par
défaut du site avec son bandeau au nom de l'atelier.

    python3 scripts/images-partage.py     # écrit public/images/partage/*.jpg
                                          # et public/images/partage-auboiacier.jpg

Ne dépend que de Pillow. La police des titres du site (Hoefler Text, voir
src/app/globals.css) est cherchée sur le Mac ; à défaut, Georgia, puis la
police par défaut de Pillow.
"""

from __future__ import annotations

import os

from PIL import Image, ImageDraw, ImageFont

LARGEUR, HAUTEUR = 1200, 630
QUALITE = 82
BORDEAUX = (0x6D, 0x2C, 0x2C)
FOND = (0xFB, 0xF9, 0xF6)
ENCRE = (0x2B, 0x23, 0x20)
GRIS = (0x6F, 0x63, 0x57)

RACINE = os.path.join(os.path.dirname(__file__), "..")
IMAGES = os.path.join(RACINE, "public", "images")
SORTIE = os.path.join(IMAGES, "partage")

POLICES = [
    "/System/Library/Fonts/Supplemental/Hoefler Text.ttc",
    "/System/Library/Fonts/Supplemental/Iowan Old Style.ttc",
    "/System/Library/Fonts/Supplemental/Georgia.ttf",
]


def police(taille: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for chemin in POLICES:
        if os.path.exists(chemin):
            return ImageFont.truetype(chemin, taille)
    return ImageFont.load_default()


def ouvrir(nom: str) -> Image.Image:
    return Image.open(os.path.join(IMAGES, nom)).convert("RGB")


def enregistrer(image: Image.Image, chemin: str) -> None:
    assert image.size == (LARGEUR, HAUTEUR), image.size
    os.makedirs(os.path.dirname(chemin), exist_ok=True)
    image.save(chemin, "JPEG", quality=QUALITE, optimize=True, progressive=True)
    print(f"{os.path.relpath(chemin, RACINE)}  {os.path.getsize(chemin) // 1024} Ko")


def remplir(image: Image.Image, largeur: int, hauteur: int, centre_y: float = 0.5) -> Image.Image:
    """Redimensionne pour couvrir largeur × hauteur, puis rogne ; `centre_y`
    (0 = haut, 1 = bas) dit quelle partie de la photo garder."""
    echelle = max(largeur / image.width, hauteur / image.height)
    grande = image.resize((round(image.width * echelle), round(image.height * echelle)), Image.LANCZOS)
    x = (grande.width - largeur) // 2
    y = round((grande.height - hauteur) * centre_y)
    return grande.crop((x, y, x + largeur, y + hauteur))


def sur_fond_blanc(nom: str, cote: int, centre_y: float) -> Image.Image:
    """Photo de studio carrée, sur fond blanc : on la réduit à `cote` px et on
    la pose au milieu d'un fond blanc 1200 × 630 — le fond de la photo et
    celui de l'image se confondent, l'objet reste entier."""
    photo = ouvrir(nom).resize((cote, cote), Image.LANCZOS)
    haut = round((cote - HAUTEUR) * centre_y)
    bande = photo.crop((0, haut, cote, haut + HAUTEUR))
    image = Image.new("RGB", (LARGEUR, HAUTEUR), (255, 255, 255))
    image.paste(bande, ((LARGEUR - cote) // 2, 0))
    return image


def bandeau(image: Image.Image, texte: str, hauteur_bandeau: int = 90) -> Image.Image:
    """Bandeau bordeaux en bas, texte blanc en serif : l'aperçu dit qui parle."""
    ImageDraw.Draw(image).rectangle(
        (0, HAUTEUR - hauteur_bandeau, LARGEUR, HAUTEUR), fill=BORDEAUX
    )
    dessin = ImageDraw.Draw(image)
    fonte = police(38)
    boite = dessin.textbbox((0, 0), texte, font=fonte)
    x = (LARGEUR - (boite[2] - boite[0])) // 2 - boite[0]
    y = HAUTEUR - hauteur_bandeau + (hauteur_bandeau - (boite[3] - boite[1])) // 2 - boite[1]
    dessin.text((x, y), texte, font=fonte, fill=(255, 255, 255))
    return image


def image_defaut() -> Image.Image:
    """Salle à manger sous le plafond lumineux, avec le bandeau de l'atelier."""
    photo = remplir(ouvrir("salle-plafond-large.jpg"), LARGEUR, HAUTEUR - 90, centre_y=0.45)
    image = Image.new("RGB", (LARGEUR, HAUTEUR), BORDEAUX)
    image.paste(photo, (0, 0))
    return bandeau(image, "Auboiacier — Atelier de métallerie, Saumur")


def image_artisanat() -> Image.Image:
    """La Mikado dans une pièce à vivre : la table et la lectrice au centre."""
    return remplir(ouvrir("mikado/ambiance.jpg"), LARGEUR, HAUTEUR, centre_y=0.55)


def image_sculptures() -> Image.Image:
    """Le cheval est un portrait : on le pose à gauche, entier, et le titre à
    droite sur le fond du site."""
    image = Image.new("RGB", (LARGEUR, HAUTEUR), FOND)
    photo = ouvrir("sculpture-cheval-v2.jpg")
    largeur_photo = round(photo.width * HAUTEUR / photo.height)
    image.paste(photo.resize((largeur_photo, HAUTEUR), Image.LANCZOS), (0, 0))

    dessin = ImageDraw.Draw(image)
    gauche = largeur_photo + 64
    largeur_texte = LARGEUR - gauche - 56
    y = 150
    dessin.rectangle((gauche, y, gauche + 40, y + 2), fill=BORDEAUX)
    y += 34
    for ligne, taille, couleur in (
        ("Sculptures", 74, ENCRE),
        ("en acier", 74, ENCRE),
    ):
        dessin.text((gauche, y), ligne, font=police(taille), fill=couleur)
        y += round(taille * 1.12)
    y += 22
    fonte = police(30)
    for ligne in ("Pièces uniques, soudées à la main", "à Saumur, Maine-et-Loire."):
        dessin.text((gauche, y), ligne, font=fonte, fill=GRIS)
        y += 42
    # Le nom de l'atelier, en bas à droite du panneau, comme une signature.
    fonte = police(30)
    boite = dessin.textbbox((0, 0), "Auboiacier", font=fonte)
    dessin.text((gauche, HAUTEUR - 72 - boite[3]), "Auboiacier", font=fonte, fill=BORDEAUX)
    assert largeur_texte > 400
    return image


def image_lucarne() -> Image.Image:
    return sur_fond_blanc("lumiere/panneau-dessous-carre.jpg", 980, centre_y=0.5)


def image_halo() -> Image.Image:
    return sur_fond_blanc("lumiere/rond-dessous-carre.jpg", 980, centre_y=0.5)


if __name__ == "__main__":
    enregistrer(image_defaut(), os.path.join(IMAGES, "partage-auboiacier.jpg"))
    enregistrer(image_artisanat(), os.path.join(SORTIE, "artisanat.jpg"))
    enregistrer(image_sculptures(), os.path.join(SORTIE, "sculptures.jpg"))
    enregistrer(image_lucarne(), os.path.join(SORTIE, "lucarne.jpg"))
    enregistrer(image_halo(), os.path.join(SORTIE, "halo.jpg"))
