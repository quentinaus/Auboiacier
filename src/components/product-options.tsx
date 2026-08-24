"use client";

import { useState } from "react";
import type { Product, ProductSwatch } from "@/lib/products";
import type { Dictionary } from "@/app/[lang]/dictionaries";

const ACCENT = "#6d2c2c";

function formatDelta(delta: number, locale: "fr" | "en") {
  if (!delta) return locale === "fr" ? "Inclus" : "Included";
  const sign = delta > 0 ? "+" : "−";
  return `${sign}${Math.abs(delta).toLocaleString("fr-FR")} €`;
}

function SwatchGroup({
  label,
  options,
  selected,
  onSelect,
  locale,
  showDelta = false,
}: {
  label: string;
  options: ProductSwatch[];
  selected: string;
  onSelect: (id: string) => void;
  locale: "fr" | "en";
  showDelta?: boolean;
}) {
  const current = options.find((o) => o.id === selected);
  return (
    <div>
      <span className="text-xs font-medium uppercase tracking-widest text-[#8a7a6f]">
        {label}
        {current && (
          <span className="ml-2 normal-case tracking-normal text-[#2a2116]">
            {current.label}
          </span>
        )}
      </span>
      <div className="mt-2 flex flex-wrap gap-3">
        {options.map((o) => {
          const isSelected = o.id === selected;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onSelect(o.id)}
              aria-pressed={isSelected}
              aria-label={o.label}
              className="group flex flex-col items-center gap-1.5"
            >
              <span
                className="block rounded-full border-2 p-0.5 transition-colors"
                style={{ borderColor: isSelected ? ACCENT : "transparent" }}
              >
                <span
                  className={`block overflow-hidden rounded-full border border-black/15 shadow-inner ${
                    showDelta ? "h-11 w-11" : "h-9 w-9"
                  }`}
                  style={{
                    backgroundColor: o.swatch,
                    backgroundImage: o.grain,
                    backgroundSize: "cover",
                  }}
                />
              </span>
              {showDelta && (
                <span
                  className={`text-[10px] tabular-nums ${
                    isSelected ? "text-[#2a2116]" : "text-[#8a7a6f]"
                  }`}
                >
                  {formatDelta(o.priceDelta ?? 0, locale)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ProductOptions({
  product,
  t,
  locale,
}: {
  product: Product;
  t: Dictionary["artisanat"];
  locale: "fr" | "en";
}) {
  const [sizeId, setSizeId] = useState(product.sizes[0].id);
  // Essence de référence par défaut (écart nul), pas la première de la liste.
  const [woodId, setWoodId] = useState(
    (product.woods.find((w) => !w.priceDelta) ?? product.woods[0])?.id ?? ""
  );
  const [metalId, setMetalId] = useState(product.metals[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const size = product.sizes.find((s) => s.id === sizeId) ?? product.sizes[0];
  const wood = product.woods.find((w) => w.id === woodId);
  const woodDelta = wood?.priceDelta ?? 0;
  const total = size.price + woodDelta;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-2xl font-medium" style={{ color: ACCENT }}>
        {total.toLocaleString("fr-FR")} €
      </p>

      <div>
        <span className="text-xs font-medium uppercase tracking-widest text-[#8a7a6f]">
          {t.sizeLabel}
        </span>
        <div className="mt-2 flex flex-col gap-2">
          {product.sizes.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSizeId(s.id)}
              aria-pressed={s.id === sizeId}
              className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors ${
                s.id === sizeId
                  ? "border-[#6d2c2c] bg-[#6d2c2c]/5 text-[#2a2116]"
                  : "border-[#e5ddd3] text-[#5c5140] hover:border-[#8a7a6f]"
              }`}
            >
              <span>{s.label}</span>
              <span className="font-medium tabular-nums">
                {(s.price + woodDelta).toLocaleString("fr-FR")} €
              </span>
            </button>
          ))}
        </div>
      </div>

      {product.woods.length > 0 && (
        <SwatchGroup
          label={t.woodLabel}
          options={product.woods}
          selected={woodId}
          onSelect={setWoodId}
          locale={locale}
          showDelta
        />
      )}
      {product.metals.length > 0 && (
        <SwatchGroup
          label={product.metalLabel ? product.metalLabel[locale] : t.metalLabel}
          options={product.metals}
          selected={metalId}
          onSelect={setMetalId}
          locale={locale}
        />
      )}

      <div className="flex items-end gap-4">
        <div>
          <span className="text-xs font-medium uppercase tracking-widest text-[#8a7a6f]">
            {t.quantityLabel}
          </span>
          <div className="mt-2 flex items-center rounded-lg border border-[#e5ddd3]">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="px-3 py-2 text-[#5c5140] hover:text-[#2a2116]"
              aria-label="-"
            >
              −
            </button>
            <span className="min-w-8 text-center text-sm">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="px-3 py-2 text-[#5c5140] hover:text-[#2a2116]"
              aria-label="+"
            >
              +
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setAdded(true)}
          className="flex-1 rounded-full px-6 py-3.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: ACCENT }}
        >
          {added ? t.added : t.addToCart}
        </button>
      </div>

      <p className="text-xs uppercase tracking-widest text-[#8a7a6f]">{t.madeInFrance}</p>
    </div>
  );
}
