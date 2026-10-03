"""
Fabrique les photos de la Table Résine Époxy Mikado, vue de face, dans toutes les teintes de pieds :
le plateau résine (photos de Quentin, pieds noirs) posé sur les pieds de la Table Mikado.
    python scripts/table-resine.py "<dossier des photos résine, vue de devant>"
Les teintes de résine sans photo de face (rouge, turquoise) sont tirées de la bleue : seule la
couleur de la rivière change (reteinte), le bois et la forme restent ceux de la photo.
"""
import os, sys
import numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import plateaux as P

SOURCES = {"bleu-paillettes-or": "Gemini_Generated_Image_owie0xowie0xowie.jpg", "or-nacre": "Jaune 1 .jpg"}
# Teintes tirées de la bleue : (teinte en degrés, facteur de saturation, facteur de clarté).
RETEINTES = {"turquoise": (186, 0.80, 0.92), "rouge": (354, 1.05, 0.62)}
TEINTES = ["noir", "gris", "chocolat", "laiton", "lin", "blanc"]
VERSION = "v1"


def reteinter_resine(photo, teinte, ks, kv):
    """Change la couleur de la rivière bleue, sans toucher au bois : on ne déplace que la teinte des pixels bleus."""
    hsv = cv2.cvtColor(np.clip(photo, 0, 255).astype(np.uint8), cv2.COLOR_RGB2HSV).astype(np.float32)
    h, s, v = hsv[..., 0] * 2, hsv[..., 1] / 255, hsv[..., 2] / 255
    bleu = ((h > 185) & (h < 255) & (s > 0.22)).astype(np.float32)
    bleu = cv2.GaussianBlur(bleu, (0, 0), 1.2)
    h2 = np.where(bleu > 0.02, teinte, h)
    s2 = np.clip(s * (1 + (ks - 1) * bleu), 0, 1)
    v2 = np.clip(v * (1 + (kv - 1) * bleu), 0, 1)
    out = cv2.cvtColor(np.dstack([h2 / 2, s2 * 255, v2 * 255]).astype(np.uint8), cv2.COLOR_HSV2RGB).astype(np.float32)
    return photo * (1 - bleu[..., None]) + out * bleu[..., None]


if __name__ == "__main__":
    dossier = sys.argv[1]
    pieds = {t: P.lire(f"public/images/mikado/devant/{t}.jpg") for t in TEINTES}
    polys = {t: P.polygone_bois(pieds[t], [pieds[u] for u in TEINTES if u != t]) for t in TEINTES}
    plateaux = {k: P.lire(os.path.join(dossier, f)) for k, f in SOURCES.items()}
    for k, (teinte, ks, kv) in RETEINTES.items():
        plateaux[k] = reteinter_resine(plateaux["bleu-paillettes-or"], teinte, ks, kv)
    for k, a in plateaux.items():
        # Le contour se relève toujours sur la photo d'origine (la reteinte ne change pas la forme).
        ref = plateaux["bleu-paillettes-or"] if k in RETEINTES else a
        pr, valide = P.polygone_colore(ref), P.masque_colore(ref)
        for t in TEINTES:
            P.ecrire(P.poser(pieds[t], polys[t], a, pr, valide), f"public/images/table-resine/devant/{t}-{k}-{VERSION}.jpg", 86)
        print(k, "ok")
