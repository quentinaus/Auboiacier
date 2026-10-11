// Prévient Bing (et les moteurs qui partagent IndexNow : Yandex, Seznam, Naver…) que les pages du site
// ont changé, sans attendre que leurs robots repassent. Google ne lit pas IndexNow : pour lui, c'est le plan
// du site, déclaré dans la Search Console.
//
//   npm run indexnow
//
// À lancer APRÈS une mise en ligne (le site publié doit déjà servir la clé) :
// 1. trouve la clé : le fichier public/<32 caractères hexadécimaux>.txt, qui contient ces mêmes caractères
//    (une clé IndexNow est publique par nature : elle prouve seulement que le site est à nous) ;
// 2. vérifie que https://auboiacier.fr/<clé>.txt la sert bien, sinon s'arrête (IndexNow refuserait) ;
// 3. lit https://auboiacier.fr/sitemap.xml et en tire toutes les adresses (<loc>) ;
// 4. les envoie en une fois à https://api.indexnow.org/indexnow (POST JSON {host, key, keyLocation, urlList}).
//
// Réponses : 200 ou 202 = reçu ; 403 = clé introuvable en ligne ; 422 = adresses hors du site ; 429 = trop
// souvent (ne pas relancer en boucle : une fois par mise en ligne suffit).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RACINE = fileURLToPath(new URL("..", import.meta.url));
export const SITE = "https://auboiacier.fr";
export const PLAN_DU_SITE = `${SITE}/sitemap.xml`;
export const POINT_INDEXNOW = "https://api.indexnow.org/indexnow";
/** Au plus 10 000 adresses par envoi (règle d'IndexNow). */
const MAX_ADRESSES = 10_000;

/**
 * La clé IndexNow du site : le seul public/<clé>.txt dont le nom (32 signes hexadécimaux) est aussi le contenu.
 * @returns {string}
 */
export function cleIndexNow(dossierPublic = join(RACINE, "public")) {
  const cles = readdirSync(dossierPublic)
    .map((nom) => /^([0-9a-f]{32})\.txt$/.exec(nom)?.[1])
    .filter((cle) => cle && readFileSync(join(dossierPublic, `${cle}.txt`), "utf8").trim() === cle);
  if (cles.length !== 1) {
    throw new Error(`Il faut une seule clé IndexNow dans public/ (fichier <clé>.txt contenant la clé) : ${cles.length} trouvée(s).`);
  }
  return cles[0];
}

/** Les adresses d'un plan du site (les <loc>, sans doublon), restreintes au site lui-même. */
export function adressesDuPlan(xml, site = SITE) {
  // Les entités XML d'une adresse ; « &amp; » en dernier, pour ne pas décoder deux fois.
  const adresses = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) =>
    m[1].replaceAll("&apos;", "'").replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&")
  );
  return [...new Set(adresses)].filter((adresse) => adresse === site || adresse.startsWith(`${site}/`));
}

/** Le corps de l'envoi à IndexNow. */
export function corpsIndexNow(cle, adresses, site = SITE) {
  return { host: new URL(site).host, key: cle, keyLocation: `${site}/${cle}.txt`, urlList: adresses };
}

async function lire(adresse) {
  const reponse = await fetch(adresse, { headers: { "user-agent": "auboiacier-indexnow" }, redirect: "follow" });
  if (!reponse.ok) throw new Error(`${adresse} : réponse ${reponse.status}`);
  return reponse.text();
}

async function principal() {
  const cle = cleIndexNow();
  const enLigne = (await lire(`${SITE}/${cle}.txt`).catch(() => "")).trim();
  if (enLigne !== cle) {
    console.error(`La clé n'est pas encore en ligne (${SITE}/${cle}.txt) : publier le site d'abord, puis relancer.`);
    process.exit(1);
  }
  const adresses = adressesDuPlan(await lire(PLAN_DU_SITE));
  if (adresses.length === 0) {
    console.error(`Aucune adresse dans ${PLAN_DU_SITE} : rien envoyé.`);
    process.exit(1);
  }
  if (adresses.length > MAX_ADRESSES) {
    console.error(`${adresses.length} adresses : IndexNow en accepte ${MAX_ADRESSES} par envoi. Rien envoyé.`);
    process.exit(1);
  }
  const reponse = await fetch(POINT_INDEXNOW, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify(corpsIndexNow(cle, adresses)),
  });
  const texte = (await reponse.text()).trim();
  if (reponse.status === 200 || reponse.status === 202) {
    console.log(`IndexNow : ${adresses.length} adresses envoyées (réponse ${reponse.status}).`);
    return;
  }
  console.error(`IndexNow a répondu ${reponse.status}${texte ? ` : ${texte}` : ""}.`);
  process.exit(1);
}

// Lancé par « npm run indexnow » (et pas quand un test importe ce fichier).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal().catch((erreur) => {
    console.error(erreur instanceof Error ? erreur.message : erreur);
    process.exit(1);
  });
}
