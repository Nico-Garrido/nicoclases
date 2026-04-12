import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  // 1) Auth: debe ser admin
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: prof } = await sb.from("profiles").select("role").eq("id", user.id).single();
  if (!prof || prof.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2) Payload
  const body = await req.json().catch(() => ({}));
  const {
    title,
    description,
    program_code,
    level_code,
    subject_code,
    view_mode,
    download_allowed,
    available_from,
    available_to,
  } = body ?? {};

  if (!title || !program_code || !level_code || !view_mode) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (view_mode !== "images" && view_mode !== "file") {
    return NextResponse.json({ error: "Invalid view_mode" }, { status: 400 });
  }

  // 3) Insert draft en resources
  const { data, error } = await supabaseAdmin
    .from("resources")
    .insert({
      title,
      description: description ?? null,
      program_code,
      level_code,
      subject_code: subject_code ?? null,
      view_mode,
      download_allowed: !!download_allowed,
      published: false,
      available_from: available_from ?? new Date().toISOString(),
      available_to: available_to ?? null,
      page_count: null,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.id }, { status: 200 });
}

