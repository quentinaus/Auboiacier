import sys, numpy as np
from PIL import Image, ImageFilter

# La teinte moyenne visée pour chaque essence (celle des pastilles du site).
CIBLES = {"pin": (224,189,133), "hetre": (220,192,160), "chene": (193,154,94), "noyer": (107,69,44)}

def hsv(a):
    a=a/255.0; r,g,b=a[...,0],a[...,1],a[...,2]
    mx=a.max(-1); mn=a.min(-1); d=mx-mn+1e-9
    h=np.zeros_like(mx)
    m=(mx==r); h[m]=((g-b)[m]/d[m])%6
    m=(mx==g)&~(mx==r); h[m]=(b-r)[m]/d[m]+2
    m=(mx==b)&~(mx==r)&~(mx==g); h[m]=(r-g)[m]/d[m]+4
    return h/6.0, d/(mx+1e-9), mx

def runs_larges(ligne, mini):
    """Les plages contiguës de True d'au moins `mini` pixels, sur une ligne."""
    out=np.zeros_like(ligne)
    if not ligne.any(): return out
    d=np.diff(np.concatenate(([0],ligne.astype(np.int8),[0])))
    for i,j in zip(np.where(d==1)[0],np.where(d==-1)[0]):
        if j-i>=mini: out[i:j]=True
    return out

def silhouette(a):
    """Tout ce qui n'est pas le fond blanc du studio."""
    h,s,v=hsv(a)
    return (v<0.93)|(s>0.08)

def recaler(base, a, marge=(20,8)):
    """Décale `a` pour que sa silhouette se superpose au mieux à celle de
    `base`, dans le tiers haut de l'image (le plateau). Les pieds, eux,
    changent de couleur mais pas la géométrie : ils suivent."""
    H,W=base.shape[:2]
    sb=silhouette(base)[:H//2]; sa=silhouette(a)[:H//2]
    meilleur=(0,0); score=-1
    for dy in range(-marge[0],marge[0]+1):
        for dx in range(-marge[1],marge[1]+1):
            d=np.roll(np.roll(sa,dy,0),dx,1)
            inter=(sb&d).sum(); union=(sb|d).sum()
            iou=inter/union if union else 0
            if iou>score: score,meilleur=iou,(dy,dx)
    dy,dx=meilleur
    out=np.roll(np.roll(a,dy,0),dx,1)
    # Ce que le décalage fait entrer par l'autre bord devient du fond blanc.
    if dy>0: out[:dy]=255
    elif dy<0: out[dy:]=255
    if dx>0: out[:,:dx]=255
    elif dx<0: out[:,dx:]=255
    return out

def masque_plateau(refs):
    """Le plateau, dessous compris : tout le bois d'un seul tenant avec la
    bande où le bois couvre le plus d'image (le dessus et le chant avant).
    `refs` : la même prise de vue dans TOUTES ses teintes de pieds. Un pixel
    n'est du plateau que s'il est bois sur chacune — les pieds laiton ou
    chocolat sont bois sur leur photo, gris ou blancs sur les autres, et le
    reflet chaud d'un pied gris n'est chaud que sur la sienne."""
    H,W=refs[0].shape[:2]
    # Les rendus d'une même prise de vue ne sont pas calés au pixel près
    # (jusqu'à 12 px d'écart d'une teinte de pieds à l'autre sur la vue de
    # face) : on recale chaque photo-juge sur la première avant de croiser,
    # sinon le bord du plateau tombe hors du masque.
    refs=[refs[0]]+[recaler(refs[0],a) for a in refs[1:]]
    bois=np.ones((H,W),dtype=bool)
    for a in refs:
        h,s,v=hsv(a)
        bois&=(h>14/360)&(h<46/360)&(s>0.14)&(v>0.10)
    # On bouche le grain sombre et les reflets : fermeture morphologique.
    im=Image.fromarray((bois*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))
    bois=np.asarray(im)>127
    # La graine : les lignes où une large plage de bois couvre l'image.
    mini=int(W*0.12)
    larges=np.array([runs_larges(bois[y],mini) for y in range(H)])
    couv=larges.mean(1)
    seuil=couv.max()*0.35
    graine=np.zeros((H,W),dtype=bool)
    lignes=np.where(couv>seuil)[0]
    graine[lignes]=larges[lignes]
    # Puis on laisse la graine gagner tout le bois qui la touche, de proche
    # en proche : le chant, le dessous vu entre les pieds, le coin en pointe.
    m=graine&bois
    for _ in range(600):
        im=Image.fromarray((m*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))
        m2=(np.asarray(im)>127)&bois
        if (m2==m).all(): break
        m=m2
    # Les miettes isolées de moins de 400 px² partent avec une ouverture.
    im=Image.fromarray((m*255).astype(np.uint8)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5))
    m=np.asarray(im)>127
    # Le bord : les deux ou trois pixels de fondu entre le bois et ce qu'il y
    # a derrière ne passent pas le test strict (trop pâles, trop peu
    # colorés), et laissaient un fin liseré de chêne sous le chant. On les
    # rattrape dans une couronne de 3 px autour du plateau, en ne gardant
    # que ce qui a encore un peu de bois dedans — jugé sur les photos aux
    # pieds sans couleur (gris, blanc, noir, lin), où un pied ne peut pas
    # passer pour du bois.
    couronne=(np.asarray(Image.fromarray((m*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9)))>127)&~m
    bas=slice(H*2//3,H)
    juges=[a for a in refs if np.median(hsv(a[bas])[1])<0.12] or refs[:1]
    # Ce fondu n'est repris que là où le bois se perd dans le FOND blanc :
    # clair sur toutes les photos-juges à la fois. Là où le bois touche un
    # pied, le pixel est sombre sur au moins une d'elles (pieds noirs ou
    # gris) : on n'y touche pas, sinon la teinte déborde sur le pied.
    fond=np.ones((H,W),dtype=bool)
    teinte=np.zeros((H,W),dtype=bool)
    for a in juges:
        h,s,v=hsv(a)
        fond&=(v>0.72)
        teinte|=(h>8/360)&(h<50/360)&(s>0.05)
    m=m|(couronne&fond&teinte)
    # Le bord s'adoucit, sans grossir : un pixel de plus déborderait sur les pieds.
    im=Image.fromarray((m*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))
    return np.asarray(im).astype(np.float32)/255.0, (int(lignes[0]), int(lignes[-1]))

def recolor(src, dst, cible, references=()):
    """`references` : la même prise de vue dans ses autres teintes de pieds,
    pour relever le plateau. Sans elles, la photo se sert d'elle-même."""
    im=Image.open(src).convert("RGB")
    a=np.asarray(im).astype(np.float32)
    refs=[a]+[np.asarray(Image.open(r).convert("RGB")).astype(np.float32) for r in references]
    m,bande=masque_plateau(refs)
    w=m>0.5
    if w.mean()<0.01: raise SystemExit("pas de plateau trouvé: "+src)
    lum=(0.299*a[...,0]+0.587*a[...,1]+0.114*a[...,2])/255.0
    lm=float(lum[w].mean())
    cible=np.array(cible,dtype=np.float32)
    lt=float((0.299*cible[0]+0.587*cible[1]+0.114*cible[2])/255.0)
    # La luminance du chêne est ramenée à celle de l'essence visée par une
    # courbe gamma : le grain reste, rien ne sature (0 et 1 restent fixes).
    g=np.log(lt)/np.log(lm)
    l2=np.clip(lum,1e-4,1)**g
    # Puis la couleur : noir → teinte cible (à la luminance moyenne) → blanc.
    bas=cible[None,None,:]*(l2[...,None]/lt)
    haut=cible[None,None,:]+(255-cible[None,None,:])*((l2[...,None]-lt)/(1-lt))
    out=np.where(l2[...,None]<=lt,bas,haut)
    # Un soupçon de la variation de teinte d'origine, pour ne pas aplatir le bois.
    out=np.clip(0.88*out+0.12*a*(cible/np.maximum(a[w].mean(0),1)),0,255)
    res=a*(1-m[...,None])+out*m[...,None]
    Image.fromarray(res.astype(np.uint8)).save(dst,quality=88,optimize=True)
    return bande

if __name__=="__main__":
    src,dst,bois=sys.argv[1:4]
    print(recolor(src,dst,CIBLES[bois],sys.argv[4:]))

# Usage, pour régénérer toutes les variantes (penser à augmenter le « -vN »
# des noms de fichiers ET dans src/lib/products.ts, sinon l'optimiseur
# d'images ressert l'ancienne version pendant un an) :
#   python3 scripts/recolor.py SRC DST pin|hetre|noyer [AUTRES_TEINTES_DE_PIEDS...]
