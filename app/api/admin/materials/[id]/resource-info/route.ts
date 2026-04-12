import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const p = await ctx.params;
  const id = p?.id;
  const resourceId = Number(id);

  if (!Number.isFinite(resourceId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // 1) Usuario logeado
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 2) Verificar que es admin
  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!prof || prof.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3) Obtener información del recurso (bypassing published check)
  const { data: r, error } = await supabaseAdmin
    .from("resources")
    .select("id,title,description,view_mode,download_allowed,page_count,published,render_status")
    .eq("id", resourceId)
    .single();

  if (error || !r) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ resource: r });
}
