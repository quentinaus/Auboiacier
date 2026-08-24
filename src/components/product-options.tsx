"use client";

import { useState } from "react";
import type { Product } from "@/lib/products";
import type { Dictionary } from "@/app/[lang]/dictionaries";

export function ProductOptions({
  product,
  t,
}: {
  product: Product;
  t: Dictionary["artisanat"];
}) {
  const [sizeId, setSizeId] = useState(product.sizes[0].id);
  const [materialId, setMaterialId] = useState(product.materials[0].id);
  const [added, setAdded] = useState(false);

  const size = product.sizes.find((s) => s.id === sizeId) ?? product.sizes[0];

  return (
    <div className="flex flex-col gap-6">
      <p className="text-2xl font-medium">{size.price} €</p>

      <div>
        <span className="text-xs font-medium uppercase tracking-widest text-[#8a7a5f]">
          {t.sizeLabel}
        </span>
        <div className="mt-2 flex flex-wrap gap-2">
          {product.sizes.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSizeId(s.id)}
              className={`rounded-full border px-4 py-2 text-sm ${
                s.id === sizeId
                  ? "border-[#2a2116] bg-[#2a2116] text-white"
                  : "border-[#e7dccb] text-[#5c5140] hover:border-[#8a7a5f]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="text-xs font-medium uppercase tracking-widest text-[#8a7a5f]">
          {t.materialLabel}
        </span>
        <div className="mt-2 flex flex-wrap gap-3">
          {product.materials.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMaterialId(m.id)}
              title={m.label}
              className={`h-9 w-9 rounded-full border-2 ${
                m.id === materialId ? "border-[#2a2116]" : "border-transparent"
              }`}
            >
              <span
                className="block h-full w-full rounded-full"
                style={{ backgroundColor: m.swatch }}
              />
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setAdded(true)}
        className="rounded-full bg-[#2a2116] px-6 py-3 text-sm font-medium text-white hover:bg-[#463724]"
      >
        {added ? t.added : t.addToCart}
      </button>
    </div>
  );
}
