# Plafond lumineux à toile tendue

Concerne les deux articles : **Lucarne** (rectangulaire) et **Halo** (rond).
Même construction, seule la forme du pourtour change.

Relevé avec Quentin le 26 septembre 2026, à partir de sa description et des
photos d'une ossature en cours de fabrication à l'atelier.

---

## Comment c'est fabriqué

Un **caisson** que l'atelier soude lui-même, fermé en haut par un panneau et
en bas par une toile tendue, avec les LED à l'intérieur qui éclairent la toile
par l'arrière.

1. **L'ossature** est une grille soudée en tube aluminium carré. Un cadre
   périphérique en bas, un second cadre par-dessus qui refait le pourtour, et
   des montants entre les deux qui donnent la profondeur du caisson. Des
   traverses régulières viennent rigidifier la grille.
2. **L'habillage** : des tôles d'aluminium découpées exactement à la cote font
   tout le tour du caisson. Elles sont **collées au double-face et rivetées**
   (rivets pop). La découpe à la cote exacte est ce qui donne des coupes
   propres.
3. **Le fond** (la face du haut, côté plafond) est un panneau composite
   aluminium/PVC.
4. **Les profilés de tension** de la toile sont ajoutés sur le pourtour, sur le
   dessus.
5. **Les LED** sont des rubans fins collés en lignes parallèles sur le fond.
6. **Les alimentations** sont des boîtiers Mean Well, un par groupe de rubans.

---

## Les matériaux, un par un

Les masses marquées **[mesuré]** viennent d'une étiquette, d'un catalogue
fournisseur ou d'un calcul exact sur une section connue. Celles marquées
**[estimé]** sont des ordres de grandeur à confirmer.

### Ossature

| | |
|---|---|
| **Matériau** | Tube aluminium carré **25 × 25 mm, épaisseur 3 mm** |
| **Masse** | **713 g/m** [mesuré] |
| **Calcul** | section de métal 25² − 19² = 264 mm² ; × 2 700 kg/m³ |
| **Assemblage** | soudé |
| **Pas des traverses** | **500 à 600 mm**, dans les deux sens (retenu : 550 mm) |

Composition de la longueur de tube :
- le cadre du bas **et** ses traverses, en grille ;
- le cadre du haut, périphérique seul ;
- les montants verticaux, de la hauteur du caisson, au même pas que les traverses.

### Habillage du pourtour

| | |
|---|---|
| **Matériau** | Tôle aluminium **2,5 mm**, découpée à la cote exacte |
| **Masse** | **6,75 kg/m²** [mesuré] — l'aluminium fait 2,70 kg/m² par mm |
| **Fixation** | double-face + rivets pop |
| **Surface concernée** | périmètre × profondeur du caisson |

> C'est **le poste qui explose avec la profondeur**. Sur un caisson de 600 mm,
> cet habillage pèse à lui seul autant que toute l'ossature.

### Fond du caisson

| | |
|---|---|
| **Matériau** | Panneau composite aluminium/PVC, **5 mm** |
| **Composition** | peaux d'aluminium ~0,3 mm, âme PVC |
| **Masse** | **≈ 5 kg/m²** [estimé] — à confirmer sur l'étiquette du panneau |

> ⚠️ **Point à vérifier.** Si les peaux d'aluminium faisaient 1 mm au lieu de
> 0,3, le panneau passerait à ~10 kg/m². Sur un plafond de 12 m², c'est **60 kg
> d'écart**. Quentin penche pour 0,3 mm, ce qui est la valeur courante des
> panneaux composites du commerce (type Dibond, Alucobond).

### Toile

| | |
|---|---|
| **Matériau** | Membrane PVC translucide, blanc diffusant, tendue |
| **Masse** | **240 g/m²** [mesuré — fourchette du marché 180 à 320] |
| **Harpon** | lèvre soudée au pourtour, ≈ 50 g/m [estimé] |
| **Fournisseur** | *à renseigner* |

Références relevées : Newmat NEW/LIGHT 221 g/m², iNove 230 g/m², Clipso 495 AT
235 g/m², maximum admissible Barrisol 215 g/m².

### Profilés de tension

| | |
|---|---|
| **Matériau** | Profilé aluminium de tension, sur le pourtour haut |
| **Masse** | **250 g/m** [mesuré — fourchette 130 à 450] |
| **Fournisseur** | *à renseigner* |

### Éclairage

| | |
|---|---|
| **Ruban** | Ruban LED fin, collé directement sur le fond |
| **Masse du ruban** | **20 g/m** [mesuré] — c'est le circuit imprimé qui pèse, pas les LED : 60, 120 ou 240 LED/m changent la masse de moins de 15 % |
| **Disposition** | lignes parallèles sur toute la surface du fond |
| **Entraxe** | **60 à 100 mm** selon les LED (Quentin) |

**Règle retenue : entraxe = profondeur du caisson ÷ 2.** C'est celle des
fabricants de plafonds tendus, et elle tombe juste sur la pratique de
l'atelier : un caisson de 180 mm donne un entraxe de 90 mm, soit exactement le
« 6 à 10 cm » décrit. Conséquence importante : **un caisson profond demande
beaucoup moins de ruban** qu'un caisson plat, parce que la lumière a la place
de se diffuser.

| Profondeur | Entraxe | Ruban par m² |
|---|---|---|
| 180 mm | 90 mm | 11,1 m/m² |
| 300 mm | 150 mm | 6,7 m/m² |
| 600 mm | 300 mm | 3,3 m/m² |

### Alimentation

| | |
|---|---|
| **Référence** | **Mean Well ELG-150-24DA-3Y** [mesuré — photo de l'étiquette] |
| **Caractéristiques** | 150 W · sortie 24 V · 6,25 A · entrée 100-240 V · IP67 · variation DALI |
| **Masse** | **950 g** [mesuré — fiche constructeur] |
| **Dimensions** | 219 × 63 × 35,5 mm |
| **Nombre** | **un boîtier pour environ 14 m de ruban** (Quentin) — soit ≈ 10,7 W/m, cohérent avec un ruban fin |

### Divers

| | |
|---|---|
| Câblage, borniers | ≈ 150 g/m² [estimé] |
| Visserie, colle, double-face, rivets | ≈ 350 g/m² [estimé] |

---

## Ce que ça donne

Poids de la pièce nue, **hors emballage et hors palette**.

| Cotes (mm) | Surface | Tube | Ruban | Alim. | **Poids réel** | *Site aujourd'hui* |
|---|---|---|---|---|---|---|
| 300 × 300 × 180 | 0,09 m² | 3,1 m | 1 m | 1 | **6 kg** | *5 kg* |
| 1400 × 1400 × 180 | 1,96 m² | 18,6 m | 22 m | 2 | **35 kg** | *16 kg* |
| 2330 × 1200 × 200 | 2,80 m² | 22,7 m | 28 m | 2 | **46 kg** | *21 kg* |
| 2330 × 1200 × 600 | 2,80 m² | 27,9 m | 9 m | 1 | **68 kg** | *21 kg* |
| 4000 × 500 × 180 | 2,00 m² | 23,9 m | 22 m | 2 | **44 kg** | *16 kg* |
| 4000 × 3000 × 180 | 12,00 m² | 66,5 m | 133 m | 10 | **150 kg** | *76 kg* |
| 4000 × 3000 × 600 | 12,00 m² | 77,0 m | 40 m | 3 | **188 kg** | *76 kg* |
| Ø 4000 × 180 (Halo) | 12,57 m² | 75,0 m | 140 m | 10 | **157 kg** | *79 kg* |

### Détail d'un plafond de 2 330 × 1 200 × 200 mm

| Poste | Poids | Part |
|---|---|---|
| Ossature tube 25 × 25 × 3 | 16,1 kg | 35 % |
| Panneau composite du fond | 14,0 kg | 30 % |
| Habillage tôle alu 2,5 mm | 9,5 kg | 21 % |
| Alimentations + câblage | 2,3 kg | 5 % |
| Profilés de tension | 1,8 kg | 4 % |
| Toile + harpon | 1,0 kg | 2 % |
| Visserie, colle, rivets | 1,0 kg | 2 % |
| Ruban LED | 0,6 kg | 1 % |
| **TOTAL** | **46,3 kg** | |

**Trois postes font 86 % du poids** : l'ossature, le fond et l'habillage. La
toile et les LED, que l'on croit spontanément importantes, pèsent 4 % à elles
deux.

---

## Pourquoi le calcul du site est faux

`src/lib/products.ts`, fonction `poidsColisKg` :

```
poids = 6 × surface_m² + 4
```

Trois défauts, dans l'ordre de gravité :

1. **La profondeur du caisson est ignorée.** Elle est bien lue dans le code
   (variable `T`) puis jamais utilisée pour les lumières. Un caisson de 600 mm
   pèse 50 % de plus qu'un de 200 mm et le site annonce le même chiffre.
2. **Le périmètre est ignoré.** Un caisson est un objet de bord, pas de
   surface. À 2 m² égaux, un 1400 × 1400 fait 5,6 m de périmètre et un
   4000 × 500 en fait 9 m.
3. **Le coefficient est deux fois trop faible**, même sur la forme la plus
   favorable.

---

## Conséquence sur la livraison — à traiter

La livraison est plafonnée à **90 €** (`LIVRAISON_MAX_CENTS`,
`src/lib/deplacement.ts`). Quand ce plafond a été posé, le prix des **tables** a
été relevé de 13 % pour l'absorber — **celui des lumières ne l'a pas été**.

Un plafond de 4 × 3 m pèse réellement **188 kg** : c'est une palette, pas un
colis, et il part pour 90 € au maximum. La différence est payée par l'atelier.

Décision à prendre lors de la revue générale des prix : relever le prix des
lumières, ou leur appliquer un plafond de livraison distinct.

---

## Questions ouvertes

- [ ] **Combien de boîtiers d'alimentation** sur un plafond de 2,33 × 1,20 m ?
      Le modèle en prévoit 2. Si c'est 1 ou 3, l'entraxe retenu est à corriger.
- [ ] **L'étiquette du panneau composite** : épaisseur des peaux d'aluminium
      (0,3 mm ou 1 mm). C'est le seul point qui vaut encore ±60 kg sur un grand
      plafond.
- [ ] **Le grammage exact de la toile** et son fournisseur.
- [ ] **Y a-t-il un emballage** (cadre bois, palette, film) à ajouter au poids
      annoncé au transporteur ? Le tableau ci-dessus donne la pièce nue.
- [ ] **Un plafond fini a-t-il déjà été pesé ?** Même un ordre de grandeur
      vérifierait tout le modèle d'un coup.
