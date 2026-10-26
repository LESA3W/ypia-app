import { NextResponse } from "next/server";
import { getProfile, setProfileField, deleteProfileField } from "@/lib/kv";
import { splitProfile, isCanonical } from "@/lib/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getProfile();
  const split = splitProfile(profile);
  return NextResponse.json({ profile, ...split });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const field = typeof body?.field === "string" ? body.field.trim() : "";
  if (!field) return NextResponse.json({ error: "field requis" }, { status: 400 });

  if (body?._delete === true) {
    if (isCanonical(field)) {
      return NextResponse.json({ error: "champ canonique non supprimable" }, { status: 400 });
    }
    await deleteProfileField(field);
    return NextResponse.json({ ok: true });
  }
  const value = typeof body?.value === "string" ? body.value : "";
  await setProfileField(field, value);
  return NextResponse.json({ ok: true });
}
