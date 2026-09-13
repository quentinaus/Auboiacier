"""Ramène le fond d'une photo de studio au blanc pur, en gardant l'ombre au sol.

Les rendus ont un sol gris qui fonce vers le bas : posée dans le cadre blanc de
la galerie, la photo se voit comme un rectangle. On divise le fond par sa
version très floutée (le dégradé du sol, sans les ombres) : le dégradé
disparaît, les ombres de contact — plus sombres que leur entourage — restent.
La pièce elle-même n'est pas touchée.

    python3 scripts/fond-blanc.py SRC DST
"""
import sys, numpy as np
from PIL import Image, ImageFilter

def hsv(a):
    a=a/255.0; mx=a.max(-1); mn=a.min(-1); d=mx-mn+1e-9
    return d/(mx+1e-9), mx

src,dst=sys.argv[1:3]
im=Image.open(src).convert("RGB"); a=np.asarray(im).astype(np.float32)
s,v=hsv(a)
fond=(s<0.12)&(v>0.55)
# Le fond seul, les trous (la pièce) bouchés par du blanc avant le flou : sinon
# les pieds noirs assombriraient le dégradé estimé autour d'eux.
f=a.copy(); f[~fond]=255
flou=np.asarray(Image.fromarray(f.astype(np.uint8)).filter(ImageFilter.GaussianBlur(60))).astype(np.float32)
# Le flou a mangé un peu de blanc près de la pièce : on le remonte au plus clair de lui-même.
ratio=np.clip(a/np.maximum(flou,1),0,1)
out=a.copy(); out[fond]=(255*ratio)[fond]
# Les bords extrêmes, eux, passent franchement au blanc.
H,W=a.shape[:2]; m=int(min(H,W)*0.02)
yy,xx=np.mgrid[0:H,0:W]
bord=np.minimum(np.minimum(yy,H-1-yy),np.minimum(xx,W-1-xx))/max(m,1)
alpha=np.clip(bord,0,1)[...,None]
out=np.where(fond[...,None],out*alpha+255*(1-alpha),out)
Image.fromarray(np.clip(out,0,255).astype(np.uint8)).save(dst,quality=90,optimize=True)
