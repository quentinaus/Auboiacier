import { NextResponse } from "next/server";
import { fermerSession } from "@/lib/compte";
import { origineEtrangere } from "@/lib/origine";

export const runtime = "nodejs";

/** Se déconnecter : on efface le témoin, il n'y a rien d'autre à défaire. */
export async function POST(request: Request) {
  // Un autre site ne doit pas pouvoir déconnecter nos clients à leur insu.
  if (origineEtrangere(request)) {
    return NextResponse.json({ error: "origin" }, { status: 403 });
  }
  await fermerSession();
  return NextResponse.json({ ok: true });
}
