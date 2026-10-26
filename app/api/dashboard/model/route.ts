import { NextResponse } from "next/server";
import { getModel, setModel } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Allowed Claude models offered in the selector.
export const MODELS = [
  { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5", note: "rapide · économique" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", note: "équilibré" },
  { id: "claude-opus-4-8", label: "Claude Opus 4.8", note: "max · plus cher" },
];

export async function GET() {
  const model = await getModel();
  return NextResponse.json({ model, models: MODELS });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const model = typeof body?.model === "string" ? body.model : "";
  if (!MODELS.some((m) => m.id === model)) {
    return NextResponse.json({ error: "modèle invalide" }, { status: 400 });
  }
  await setModel(model);
  return NextResponse.json({ ok: true, model });
}
