"""
Compression des images que le visiteur reçoit TELLES QUELLES.

Presque toutes les photos du site passent par next/image, qui les recadre,
les convertit en AVIF/WebP et les met en cache un an : le navigateur ne
télécharge jamais les fichiers de public/images tels qu'ils sont sur le
disque (salle-plafond-mikado.jpg, 314 Ko, arrive en 30 Ko AVIF). Les
recompresser ne ferait donc gagner qu'au dépôt, pas au visiteur : on ne
le fait pas.

Restent trois familles servies brutes, et c'est là que ce script agit :

  1. Les échantillons de matière (public/images/echantillons/) : affichés en
     CSS background-image par material-bubble.tsx, donc sans next/image. Un
     PNG de bruit de 320 × 320 pèse 60–104 Ko ; en WebP à qualité 85 il pèse
     3–9 Ko, transparence conservée, rendu identique à l'œil même en 64 px
     Retina. Une fiche chaise en affiche 21 : 1,8 Mo → 150 Ko. Le générateur
     (scripts/echantillons.py) écrit désormais directement du WebP ; ce
     script convertit ce qui resterait en PNG et supprime l'original, pour
     qu'il ne soit pas déployé pour rien.

  2. Les images de partage (partage-auboiacier.jpg et partage/*.jpg) : lues
     brutes par Facebook, LinkedIn, WhatsApp. scripts/images-partage.py les
     écrit déjà en JPEG q82 progressif ; ici on ne fait que vérifier, et on
     ne recompresse que si l'une d'elles n'est pas progressive ou dépasse
     160 Ko. Ré-enregistrer un JPEG à chaque passage l'abîmerait un peu plus
     à chaque fois : d'où le seuil, qui rend le script relançable sans risque.

  3. Un inventaire, pour information seulement, des fichiers de plus de
     300 Ko : ils passent tous par next/image, on les liste pour savoir où
     l'on en est, on n'y touche pas.

Ce que ce script NE FAIT PAS, volontairement :
  - public/images/chaises/*.jpg : ce sont les SOURCES de scripts/pieds-chaise.py
    (détourage par régression sur les quinze rendus) ; toute recompression
    fausserait le calcul des calques. Interdit.
  - Les PNG à transparence (plafond-cadre.png, chaises/pieds-v*-*.png) : ils
    passent par next/image, qui les sert en AVIF de quelques Ko. Leur poids
    sur disque relève du script qui les produit, pas d'une recompression.
  - Les 120 et quelques JPG du catalogue : voir plus haut.

    python3 scripts/compresser-images.py            # applique, puis résume
    python3 scripts/compresser-images.py --verifier # ne modifie rien, résume

Relançable à volonté : un second passage ne change rien. Ne dépend que de
Pillow (python3 -m pip install Pillow).
"""

from __future__ import annotations

import glob
import os
import sys

from PIL import Image

RACINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
IMAGES = os.path.join(RACINE, "public", "images")
ECHANTILLONS = os.path.join(IMAGES, "echantillons")

# WebP : sous 80, les textures de bois montrent des artefacts en 64 px Retina.
WEBP_QUALITE = 85
# JPEG de partage : la qualité de scripts/images-partage.py, et le poids
# au-delà duquel on estime qu'une image n'est pas passée par ce script.
JPEG_QUALITE = 82
PARTAGE_SEUIL = 160 * 1024
# Au-delà de ce poids, une image est listée dans l'inventaire (sans action).
INVENTAIRE_SEUIL = 300 * 1024


def ko(octets: int) -> str:
    return f"{octets / 1024:,.0f} Ko".replace(",", " ")


def taille_dossier(dossier: str) -> int:
    total = 0
    for racine, _, fichiers in os.walk(dossier):
        total += sum(os.path.getsize(os.path.join(racine, f)) for f in fichiers)
    return total


def relatif(chemin: str) -> str:
    return os.path.relpath(chemin, RACINE)


# ---------------------------------------------------------------------------
#  1. Échantillons : PNG → WebP
# ---------------------------------------------------------------------------
def echantillons(appliquer: bool) -> tuple[int, int]:
    """Convertit chaque PNG restant en WebP puis le supprime. Rend (avant, après)."""
    pngs = sorted(glob.glob(os.path.join(ECHANTILLONS, "*.png")))
    if not pngs:
        webps = glob.glob(os.path.join(ECHANTILLONS, "*.webp"))
        print(f"1. Échantillons : rien à faire, {len(webps)} WebP en place, aucun PNG.")
        return 0, 0
    avant = apres = 0
    for png in pngs:
        webp = png[:-4] + ".webp"
        avant += os.path.getsize(png)
        if appliquer:
            with Image.open(png) as im:
                # RGBA conservé : la bille reste ronde sur fond transparent.
                im.convert("RGBA").save(webp, "WEBP", quality=WEBP_QUALITE, method=6)
            os.remove(png)
            apres += os.path.getsize(webp)
            print(f"   {relatif(png)} → .webp  {ko(os.path.getsize(webp))}")
        else:
            print(f"   {relatif(png)} : à convertir ({ko(os.path.getsize(png))})")
    if appliquer:
        print(f"1. Échantillons : {len(pngs)} PNG convertis, {ko(avant)} → {ko(apres)}.")
    else:
        print(f"1. Échantillons : {len(pngs)} PNG à convertir ({ko(avant)}).")
    return avant, apres


# ---------------------------------------------------------------------------
#  2. Images de partage : JPEG progressif, sous le seuil
# ---------------------------------------------------------------------------
def partage(appliquer: bool) -> None:
    fichiers = [os.path.join(IMAGES, "partage-auboiacier.jpg")] + sorted(
        glob.glob(os.path.join(IMAGES, "partage", "*.jpg"))
    )
    refaits = 0
    for chemin in fichiers:
        if not os.path.exists(chemin):
            continue
        poids = os.path.getsize(chemin)
        with Image.open(chemin) as im:
            progressif = bool(im.info.get("progressive"))
            if progressif and poids <= PARTAGE_SEUIL:
                continue
            print(f"   {relatif(chemin)} : {ko(poids)}, {'progressif' if progressif else 'NON progressif'}")
            if appliquer:
                rgb = im.convert("RGB")
        if appliquer:
            # Même dimension, aucune retaille : seul l'encodage change.
            rgb.save(chemin, "JPEG", quality=JPEG_QUALITE, progressive=True, optimize=True)
            refaits += 1
            print(f"     → {ko(os.path.getsize(chemin))}")
    if refaits == 0:
        print(f"2. Partage : {len(fichiers)} JPEG déjà progressifs et sous {ko(PARTAGE_SEUIL)}, rien à faire.")
    else:
        print(f"2. Partage : {refaits} JPEG ré-encodés.")


# ---------------------------------------------------------------------------
#  3. Inventaire (lecture seule)
# ---------------------------------------------------------------------------
def inventaire() -> None:
    lourds = []
    for racine, _, fichiers in os.walk(IMAGES):
        for f in fichiers:
            chemin = os.path.join(racine, f)
            poids = os.path.getsize(chemin)
            if poids > INVENTAIRE_SEUIL:
                with Image.open(chemin) as im:
                    lourds.append((poids, relatif(chemin), im.size, im.mode))
    lourds.sort(reverse=True)
    print(f"3. Inventaire : {len(lourds)} fichiers de plus de {ko(INVENTAIRE_SEUIL)} (servis via next/image, on n'y touche pas) :")
    for poids, chemin, (l, h), mode in lourds:
        print(f"   {ko(poids):>8}  {l}×{h} {mode:<4} {chemin}")


def main(argv: list[str]) -> int:
    appliquer = "--verifier" not in argv
    total_avant = taille_dossier(IMAGES)
    print(f"public/images : {ko(total_avant)} avant.\n")
    echantillons(appliquer)
    partage(appliquer)
    inventaire()
    total_apres = taille_dossier(IMAGES)
    print(f"\npublic/images : {ko(total_apres)} après ({ko(total_avant - total_apres)} de moins).")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
