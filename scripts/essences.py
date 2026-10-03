"""
Fabrique les photos des tables dans les autres essences de plateau (pin, hêtre, noyer).
Le plateau est relevé comme un polygone à bords DROITS (scripts/plateaux.py), reteinté d'un
seul tenant, et le liseré de chêne qui dépasserait est effacé : la même teinte partout.
    python scripts/essences.py
"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import plateaux as P
import recolor as rc

ESSENCES = ["pin", "hetre", "noyer"]
TEINTES = ["noir", "gris", "chocolat", "laiton", "lin", "blanc"]
VERSION = "v7"


def contour(photo, autres, dessous_droit):
    m, _ = rc.masque_plateau([photo] + list(autres))
    return P._polygone(m > 0.5, dessous_droit=dessous_droit)


def faire(photo, poly, sortie):
    for e in ESSENCES:
        P.ecrire(P.nettoyer_dessus(P.reteinter(photo, poly, e), poly), sortie.format(e), 90)


if __name__ == "__main__":
    # Table Mikado : deux vues, six teintes de pieds (les autres teintes départagent bois et pieds).
    for vue, droit in [("devant", True), ("coupe", False)]:
        ph = {t: P.lire(f"public/images/mikado/{vue}/{t}.jpg") for t in TEINTES}
        for t in TEINTES:
            poly = contour(ph[t], [ph[u] for u in TEINTES if u != t], droit)
            faire(ph[t], poly, f"public/images/mikado/{vue}/{t}-{{}}-{VERSION}.jpg")
            P.apercu(ph[t], poly, f"{sys.argv[1]}/mikado-{vue}-{t}.png") if len(sys.argv) > 1 else None
    # Table Croix : quatre vues, pieds noirs.
    for vue, droit in [("bout-v2", True), ("cote-v2", True), ("soudure-v1", False), ("detail-v1", False)]:
        a = P.lire(f"public/images/table-croix-{vue}.jpg")
        poly = contour(a, [], droit)
        faire(a, poly, f"public/images/table-croix-{vue}-{{}}-{VERSION}.jpg")
        P.apercu(a, poly, f"{sys.argv[1]}/croix-{vue}.png") if len(sys.argv) > 1 else None
    print("ok")
