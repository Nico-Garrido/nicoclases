import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseServer } from "@/lib/supabaseServer";

async function assertAdmin() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: "Not authenticated" };

  const { data: prof } = await sb.from("profiles").select("role").eq("id", user.id).single();
  if (!prof || prof.role !== "admin") return { ok: false as const, status: 403, error: "Forbidden" };

  return { ok: true as const };
}

export async function GET(req: Request) {
  const admin = await assertAdmin();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const url = new URL(req.url);
  const resourceId = Number(url.searchParams.get("resourceId"));
  if (!Number.isFinite(resourceId)) {
    return NextResponse.json({ error: "Invalid resourceId" }, { status: 400 });
  }

  const { data: r, error } = await supabaseAdmin
    .from("resources")
    .select("id, render_status, render_error, page_count, published")
    .eq("id", resourceId)
    .single();

  if (error || !r) return NextResponse.json({ error: error?.message ?? "Not found" }, { status: 404 });

  const { data: lastJob } = await supabaseAdmin
    .from("render_jobs")
    .select("status, error, updated_at, created_at")
    .eq("resource_id", resourceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ resource: r, lastJob: lastJob ?? null });
}

