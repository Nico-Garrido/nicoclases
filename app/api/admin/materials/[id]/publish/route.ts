import { NextResponse } from "next/server";
import { supabaseAdminServer } from "@/lib/supabaseAdminServer";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> | { id: string } }) {
  const p = await (ctx.params as any);
  const id = Number(p.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const body = await req.json().catch(() => null);
  const published = Boolean(body?.published);

  const { error } = await supabaseAdminServer
    .from("resources")
    .update({ published })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

