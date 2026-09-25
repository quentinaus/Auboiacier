import { NextResponse } from "next/server";
import { compteConfigure, normaliserEmail, signerLien } from "@/lib/compte-jetons";
import { sendEmail } from "@/lib/email";
import { creerLimite } from "@/lib/limite-debit";
import { siteOrigin } from "@/lib/stripe";

export const runtime = "nodejs";
export const maxDuration = 20;

/**
 * Le lien de connexion par e-mail, pour qui n'a pas de compte Google — c'est
 * une bonne partie de la clientèle d'un artisan.
 *
 * Cette adresse envoie un e-mail à une adresse qu'on lui donne : c'est un
 * envoi de courrier offert au premier venu. D'où la limite, serrée.
 */
const tropDeDemandes = creerLimite({ fenetreMs: 10 * 60 * 1000, maximum: 5 });

export async function POST(request: Request) {
  if (!compteConfigure()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  if (tropDeDemandes(request, Date.now())) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { email, locale: langue } = (corps ?? {}) as Record<string, unknown>;
  const locale = langue === "en" ? "en" : "fr";
  const adresse = normaliserEmail(email);
  if (!adresse) return NextResponse.json({ error: "bad_email" }, { status: 400 });

  const jeton = signerLien(adresse, Math.floor(Date.now() / 1000));
  if (!jeton) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const lien = `${siteOrigin()}/api/compte/lien/ouvrir?j=${encodeURIComponent(jeton)}&l=${locale}`;

  await sendEmail({
    to: adresse,
    subject: locale === "en" ? "Your Auboiacier sign-in link" : "Votre lien de connexion Auboiacier",
    text: (locale === "en"
      ? [
          "Here is your link to open your Auboiacier account area:",
          "",
          lien,
          "",
          "It works for 15 minutes. Open it in your browser.",
          "If you did not ask for it, ignore this e-mail — nothing has been opened.",
          "",
          "Auboiacier — wood, steel & light",
        ]
      : [
          "Voici votre lien pour ouvrir votre espace Auboiacier :",
          "",
          lien,
          "",
          "Il fonctionne pendant 15 minutes. Ouvrez-le dans votre navigateur.",
          "Si vous ne l'avez pas demandé, ignorez cet e-mail : rien n'a été ouvert.",
          "",
          "Auboiacier — bois, acier & lumière",
        ]
    ).join("\n"),
  });

  // Toujours la même réponse, que l'envoi ait abouti ou non : dire « cette
  // adresse n'existe pas » transformerait cette page en annuaire de clients.
  return NextResponse.json({ ok: true });
}
