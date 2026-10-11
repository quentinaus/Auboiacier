import { NextResponse } from "next/server";
import { ouvrirSession } from "@/lib/compte";
import { accueilApresConnexion, lireLien, retourInterne } from "@/lib/compte-jetons";
import { origineEtrangere } from "@/lib/origine";

export const runtime = "nodejs";

/**
 * On arrive ici depuis sa boîte mail. Le jeton prouve qu'on contrôle
 * l'adresse — mais pas que la personne qui clique est celle qui a demandé le
 * lien. Le GET n'ouvre donc plus rien : il mène à la page qui affiche
 * l'adresse et demande un clic (compte/connexion/confirmer), et c'est ce
 * clic, en POST depuis notre propre page, qui ouvre la session.
 *
 * Les liens restent réutilisables pendant leurs quinze minutes (voir
 * DUREE_LIEN_S) : ouvert depuis l'application Mail d'un iPhone, le lien
 * s'ouvre dans une fenêtre qui ne partage pas ses témoins avec Safari, et le
 * client le rouvre depuis son navigateur.
 */
export async function GET(request: Request) {
  const parametres = new URL(request.url).searchParams;
  const locale = parametres.get("l") === "en" ? "en" : "fr";
  const cible = new URL(`/${locale}/compte/connexion/confirmer`, request.url);
  const jeton = parametres.get("j");
  if (jeton) cible.searchParams.set("j", jeton);
  const retour = retourInterne(parametres.get("s"));
  if (retour) cible.searchParams.set("s", retour);
  return NextResponse.redirect(cible);
}

export async function POST(request: Request) {
  // Seule notre page de confirmation a le droit d'ouvrir une session : un
  // formulaire posté depuis un autre site est refusé.
  if (origineEtrangere(request)) {
    return NextResponse.json({ error: "origin" }, { status: 403 });
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const locale = form.get("l") === "en" ? "en" : "fr";
  const jeton = lireLien(form.get("j"), Math.floor(Date.now() / 1000));

  // 303 : après un POST, le navigateur suit la redirection en GET.
  if (!jeton || !(await ouvrirSession(jeton.email))) {
    return NextResponse.redirect(new URL(`/${locale}/compte/connexion?erreur=lien`, request.url), 303);
  }
  const retour = retourInterne(form.get("s")) ?? accueilApresConnexion(locale);
  return NextResponse.redirect(new URL(retour, request.url), 303);
}
