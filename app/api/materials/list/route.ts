import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const sb = await supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  const now = new Date().toISOString();

  // 1) Entitlements activos del usuario
  const { data: entitlements, error: entErr } = await supabaseAdmin
    .from("entitlements")
    .select("program_code, level_code, subject_code, starts_at, ends_at")
    .eq("user_id", user.id)
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gte.${now}`);

  if (entErr) {
    return NextResponse.json({ error: entErr.message }, { status: 500 });
  }

  if (!entitlements || entitlements.length === 0) {
    return NextResponse.json({ items: [] }, { status: 200 });
  }

  // 2) Resources publicados y vigentes
  const { data: resources, error: resErr } = await supabaseAdmin
    .from("resources")
    .select(
      "id,title,description,program_code,level_code,subject_code,view_mode,download_allowed,page_count,published,available_from,available_to,created_at"
    )
    .eq("published", true)
    .lte("available_from", now)
    .or(`available_to.is.null,available_to.gte.${now}`);

  if (resErr) {
    return NextResponse.json({ error: resErr.message }, { status: 500 });
  }

  // 3) Match entitlement ↔ resource
  const matched = (resources ?? []).filter((r: any) =>
    entitlements.some((e: any) => {
      const sameProgram = e.program_code === r.program_code;
      const sameLevel = e.level_code === r.level_code;

      // subject match flexible: si cualquiera es null, lo consideramos match
      const subjectOk =
        !e.subject_code || !r.subject_code || e.subject_code === r.subject_code;

      return sameProgram && sameLevel && subjectOk;
    })
  );

  // 4) Deduplicar por identidad lógica
  const seen = new Set<string>();
  const items: any[] = [];
  for (const r of matched) {
    const key = [
      r.title,
      r.program_code,
      r.level_code,
      r.subject_code ?? "",
      r.view_mode,
    ].join("|");

    if (!seen.has(key)) {
      seen.add(key);
      items.push(r);
    }
  }

  // 5) Filtrar recursos "rotos": si view_mode='images', exigir page_count > 0
  const validItems = items.filter((r: any) => {
    // Si es tipo "images", debe tener páginas renderizadas
    if (r.view_mode === "images") {
      return r.page_count && r.page_count > 0;
    }
    // Otros view_mode (ej. "file", "slides") se permiten sin page_count
    return true;
  });

  return NextResponse.json({ items: validItems }, { status: 200 });
}
