import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string; n: string }> }
) {
  const p = await ctx.params;
  const id = p?.id;
  const n = p?.n;

  const resourceId = Number(id);
  const pageNum = Number(n);

  if (!Number.isFinite(resourceId) || !Number.isFinite(pageNum) || pageNum < 1) {
    return NextResponse.json(
      { error: "Invalid params", got: { id, n } },
      { status: 400 }
    );
  }

  // 1) Usuario logeado
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // 1b) Check if user is admin
  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = prof?.role === "admin";

  // 2) Recurso
  const { data: resRow, error: resErr } = await supabaseAdmin
    .from("resources")
    .select("id, program_code, level_code, subject_code, published, available_from, available_to")
    .eq("id", resourceId)
    .single();

  if (resErr || !resRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only enforce published check for non-admins
  if (!resRow.published && !isAdmin) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date();
  if (resRow.available_from && new Date(resRow.available_from) > now) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (resRow.available_to && new Date(resRow.available_to) < now) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 3) Entitlements: programa/nivel + ventanas de tiempo (skip for admins)
  if (!isAdmin) {
    const { data: ent, error: entErr } = await supabaseAdmin
      .from("entitlements")
      .select("id, subject_code, starts_at, ends_at")
      .eq("user_id", user.id)
      .eq("program_code", resRow.program_code)
      .eq("level_code", resRow.level_code)
      .order("created_at", { ascending: false });

    if (entErr || !ent || ent.length === 0) {
      return NextResponse.json({ error: "No access" }, { status: 403 });
    }

    const timeOk = ent.some((e) => {
      const sOk = !e.starts_at || new Date(e.starts_at) <= now;
      const eOk = !e.ends_at || new Date(e.ends_at) >= now;
      return sOk && eOk;
    });

    if (!timeOk) {
      return NextResponse.json({ error: "No access" }, { status: 403 });
    }

    // Subject rule (NULL en recurso = general)
    if (resRow.subject_code) {
      const ok = ent.some((e) => e.subject_code === resRow.subject_code);
      if (!ok) return NextResponse.json({ error: "No access" }, { status: 403 });
    }
  }

  // 4) Buscar página (1-based confirmado)
  const { data: pageRow, error: pageErr } = await supabaseAdmin
    .from("resource_pages")
    .select("base_bucket, base_path")
    .eq("resource_id", resourceId)
    .eq("page_num", pageNum)
    .single();

  if (pageErr || !pageRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 5) Signed URL y redirect a la imagen
  const { data: signed, error: signErr } = await supabaseAdmin.storage
    .from(pageRow.base_bucket)
    .createSignedUrl(pageRow.base_path, 60);

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json({ error: "Cannot sign" }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}

