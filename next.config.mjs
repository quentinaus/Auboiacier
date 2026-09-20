/** @type {import('next').NextConfig} */

/**
 * En-têtes de sécurité, envoyés avec chaque page.
 * Volontairement sobres : rien ici ne bloque Stripe (le paiement se fait sur
 * le site de Stripe, pas dans un cadre chez nous) ni l'affichage des photos.
 * Pas de « Content-Security-Policy » : mal réglée, elle rend le site blanc.
 */
const enTetesDeSecurite = [
  // Le site ne peut pas être affiché dans le cadre d'un autre site : c'est ce
  // qui empêche qu'on recopie la boutique ailleurs pour piéger les visiteurs.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Quatre directives sans aucun risque d'affichage : elles n'encadrent ni les
  // images, ni les polices, ni les scripts. base-uri empêche qu'une balise
  // <base> injectée détourne toutes les adresses relatives du site,
  // form-action qu'un formulaire injecté poste vers l'extérieur, object-src
  // qu'un greffon soit chargé. Toujours pas de script-src : mal réglée, cette
  // directive-là rend le site blanc.
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
  // Le navigateur respecte le type annoncé et n'essaie pas de deviner : un
  // fichier déposé comme image ne peut pas être exécuté comme un programme.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // On dit d'où vient le visiteur, mais jamais la page exacte hors du site.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Le site ne demande ni caméra, ni micro, ni position : on ferme la porte.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // Toujours en HTTPS (Vercel le fait déjà ; ceci l'inscrit dans le navigateur).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig = {
  images: {
    // L'AVIF pèse 25 à 30 % de moins que le WebP à qualité égale, et sur ce
    // site le contenu EST la photo. Les navigateurs qui ne le comprennent pas
    // reçoivent le WebP, puis le JPEG : rien ne casse.
    formats: ["image/avif", "image/webp"],
    // Une photo de meuble ne change jamais : inutile de la refabriquer toutes
    // les quatre heures (le réglage par défaut de Next).
    minimumCacheTTL: 31536000,
  },
  async headers() {
    return [{ source: "/:path*", headers: enTetesDeSecurite }];
  },
  async redirects() {
    return [
      // La page des réalisations ne parle plus que des plafonds lumineux :
      // elle a déménagé sous /realisations. Redirection permanente pour ne
      // pas perdre le lien envoyé aux moteurs de recherche.
      {
        source: "/:lang(fr|en)/toiles-tendues/realisations",
        destination: "/:lang/realisations",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
