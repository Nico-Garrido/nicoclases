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

export async function POST(req: Request) {
  const admin = await assertAdmin();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const body = await req.json().catch(() => ({}));
  const resourceId = Number(body?.resourceId);
  const pdfBucket = String(body?.pdfBucket ?? "raw_pdfs");
  const pdfPath = String(body?.pdfPath ?? "");

  if (!Number.isFinite(resourceId) || !pdfPath) {
    return NextResponse.json({ error: "Missing/invalid params" }, { status: 400 });
  }

  // Encolar job
  const { error: jobErr } = await supabaseAdmin.from("render_jobs").insert({
    resource_id: resourceId,
    pdf_bucket: pdfBucket,
    pdf_path: pdfPath,
    status: "queued",
  });

  if (jobErr) return NextResponse.json({ error: jobErr.message }, { status: 500 });

  // Marcar resource como queued
  const { error: resErr } = await supabaseAdmin
    .from("resources")
    .update({ render_status: "queued", render_error: null, page_count: null, published: false })
    .eq("id", resourceId);

  if (resErr) return NextResponse.json({ error: resErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

