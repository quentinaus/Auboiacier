"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";

/**
 * Icône panier avec le nombre d'articles.
 * Ne reçoit qu'un libellé, jamais le dictionnaire complet : celui-ci partirait
 * entier dans le bundle du navigateur.
 */
export function CartButton({
  locale,
  label,
  variant = "light",
}: {
  locale: string;
  label: string;
  variant?: "light" | "dark";
}) {
  const { count, ready } = useCart();
  const dark = variant === "dark";

  return (
    <Link
      href={`/${locale}/panier`}
      aria-label={count > 0 ? `${label} (${count})` : label}
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
        dark ? "text-white/80 hover:text-white" : "text-[#5c5140] hover:text-[#2a2116]"
      }`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
        <path d="M6 7h12l-1 12H7L6 7Z" strokeLinejoin="round" />
        <path d="M9 7a3 3 0 0 1 6 0" strokeLinecap="round" />
      </svg>
      {/* Le compteur n'apparaît qu'une fois le panier lu : sinon l'affichage
          du serveur et celui du navigateur ne concordent pas. */}
      {ready && count > 0 && (
        <span
          className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium text-white"
          style={{ backgroundColor: "#2b2320" }}
        >
          {count}
        </span>
      )}
    </Link>
  );
}
