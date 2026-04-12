import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // usa tu service role client existente

export async function POST(req: Request) {
  const body = await req.json();

  const {
    title,
    description,
    program_code,
    level_code,
    subject_code,
    view_mode,            // "images" | "file"
    download_allowed,     // boolean
    available_from,
    available_to,
    plan_codes,           // string[]
  } = body ?? {};

  if (!title || !program_code || !level_code || !view_mode) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // 1) crear resource en draft
  const { data: resRow, error: resErr } = await supabaseAdmin
    .from("resources")
    .insert({
      title,
      description: description ?? null,
      program_code,
      level_code,
      subject_code: subject_code ?? null,
      view_mode,
      download_allowed: Boolean(download_allowed),
      published: false,
      available_from: available_from ?? new Date().toISOString(),
      available_to: available_to ?? null,
      page_count: view_mode === "images" ? 0 : null,
      resource_type: "file",
    })
    .select("id")
    .single();

  if (resErr) return NextResponse.json({ error: resErr.message }, { status: 500 });

  const resourceId = resRow.id;

  // 2) asociar a planes
  if (Array.isArray(plan_codes) && plan_codes.length > 0) {
    const rows = plan_codes.map((c: string) => ({ plan_code: c, resource_id: resourceId }));
    const { error: prErr } = await supabaseAdmin.from("plan_resources").insert(rows);
    if (prErr) return NextResponse.json({ error: prErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, resourceId }, { status: 200 });
}

