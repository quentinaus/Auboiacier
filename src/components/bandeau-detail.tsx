import Image from "next/image";
import Link from "next/link";
import { serif } from "@/lib/fonts";

/**
 * Le bandeau pleine largeur en deux moitiés : un panneau sombre qui porte le
 * titre et le propos, une photo qui montre le détail dont on parle. C'est le
 * même dessin que « Le détail qui change tout » sur la page des verrières —
 * une seule pièce à régler pour qu'il reste identique partout.
 */
export function BandeauDetail({
  titre,
  corps,
  mention,
  cta,
  photo,
  photoAGauche = false,
  className = "",
}: {
  titre: string;
  /** Un ou plusieurs paragraphes. */
  corps: string | string[];
  /** La petite ligne en capitales, sous le texte : « Fabriqué à la main en France ». */
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
      <div className={`flex items-center bg-[#2b2320] px-8 py-16 md:px-16 md:py-24 ${photoAGauche ? "md:order-2" : ""}`}>
        <div className="mx-auto max-w-md">
          <h2 className={`${serif.className} text-3xl text-white md:text-4xl`}>{titre}</h2>
          {paragraphes.map((p, i) => (
            <p key={i} className={`leading-relaxed text-white/80 ${i === 0 ? "mt-6" : "mt-4"}`}>
              {p}
            </p>
          ))}
          {cta && (
            <Link
              href={cta.href}
              className="mt-8 inline-block rounded-full border border-white/40 px-7 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition-colors hover:border-white hover:bg-white hover:text-[#2b2320]"
            >
              {cta.label}
            </Link>
          )}
          {mention && (
            <p className="mt-10 text-[11px] uppercase tracking-[0.18em] text-white/50">{mention}</p>
          )}
        </div>
      </div>
      <div className={`relative min-h-[60vh] md:min-h-[80vh] ${photoAGauche ? "md:order-1" : ""}`}>
        <Image
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
