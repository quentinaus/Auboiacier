import { NextResponse } from "next/server";
import { fermerSession } from "@/lib/compte";

export const runtime = "nodejs";

/** Se déconnecter : on efface le témoin, il n'y a rien d'autre à défaire. */
export async function POST() {
  await fermerSession();
  return NextResponse.json({ ok: true });
}
