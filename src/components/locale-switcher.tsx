"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, type Locale } from "@/lib/i18n";

export function LocaleSwitcher({
  locale,
  variant = "light",
}: {
  locale: Locale;
  variant?: "light" | "dark";
}) {
  const pathname = usePathname();
  const rest = pathname.split("/").slice(2).join("/");
  const inactive = variant === "dark" ? "text-white/50" : "text-gray-500";
  const active = variant === "dark" ? "font-medium text-white" : "font-medium";

  return (
    <div className="flex items-center gap-2 text-sm">
      {locales.map((l) => (
        <Link
          key={l}
          href={`/${l}${rest ? `/${rest}` : ""}`}
          aria-current={l === locale ? "true" : undefined}
          className={l === locale ? active : inactive}
        >
          {l.toUpperCase()}
        </Link>
      ))}
    </div>
  );
}
