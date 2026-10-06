import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { Visuel } from "./visuel";
import { serif } from "@/lib/fonts";
import { Apparition } from "@/components/apparition";

/**
 * Le bandeau pleine largeur en deux moitiés : un panneau sombre qui porte le
 * titre et le propos, une photo qui montre le détail dont on parle. C'est le
 * même dessin que « Le détail qui change tout » sur la page des verrières —
 * une seule pièce à régler pour qu'il reste identique partout.
 *
 * Façon Apple (Quentin, 06/10/2026 : « plus premium, moins IA ») : un grand
 * titre, un texte lisible, un seul bouton plein (blanc sur le panneau sombre),
 * la mention en phrase normale — plus de petites capitales espacées.
 */
export function BandeauDetail({
  titre,
  corps,
  mention,
  cta,
  photo,
  photoAGauche = false,
  className = "",
  locale,
}: {
  /** La langue de la page : celle de la mention « Image d'illustration » posée sur la photo. */
  locale: Locale;
  titre: string;
  /** Un ou plusieurs paragraphes. */
  corps: string | string[];
  /** La petite ligne sous le texte : « Fabriqué en France, à Saumur ». */
  mention?: string;
  cta?: { href: string; label: string };
  photo: { src: string; alt: string; position?: string };
  /** La photo à gauche du texte plutôt qu'à droite. */
  photoAGauche?: boolean;
  className?: string;
}) {
  const paragraphes = Array.isArray(corps) ? corps : [corps];
  return (
    <section className={`grid md:grid-cols-2 ${className}`}>
      <div className={`flex items-center bg-[#2b2320] px-6 py-16 sm:px-10 md:px-14 md:py-28 lg:px-20 ${photoAGauche ? "md:order-2" : ""}`}>
        <Apparition className="mx-auto w-full max-w-md">
          <h2 className={`${serif.className} text-[2rem] text-balance leading-[1.05] tracking-[-0.018em] text-white sm:text-[2.5rem] md:text-[3rem]`}>
            {titre}
          </h2>
          {paragraphes.map((p, i) => (
            <p key={i} className={`text-[16px] leading-[1.55] text-white/80 md:text-[17px] ${i === 0 ? "mt-6" : "mt-4"}`}>
              {p}
            </p>
          ))}
          {cta && (
            <Link href={cta.href} className="btn-clair mt-10">
              {cta.label}
            </Link>
          )}
          {mention && (
            <p className={`${cta ? "mt-8" : "mt-10"} text-[14px] leading-[1.45] text-white/60 md:text-[15px]`}>{mention}</p>
          )}
        </Apparition>
      </div>
      <div className={`relative min-h-[60vh] md:min-h-[80vh] ${photoAGauche ? "md:order-1" : ""}`}>
        <Visuel
          locale={locale}
          src={photo.src}
          alt={photo.alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          style={{ objectPosition: photo.position }}
          className="object-cover"
        />
      </div>
    </section>
  );
}
