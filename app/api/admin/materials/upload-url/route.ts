import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseServer } from "@/lib/supabaseServer";

async function assertAdmin() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: "Not authenticated" };

  const { data: prof } = await sb.from("profiles").select("role").eq("id", user.id).single();
  if (!prof || prof.role !== "admin") return { ok: false as const, status: 403, error: "Forbidden" };

  return { ok: true as const, userId: user.id };
}

export async function POST(req: Request) {
  const admin = await assertAdmin();
  if (!admin.ok) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const body = await req.json().catch(() => ({}));
  const resourceId = Number(body?.resourceId);
  const filename = String(body?.filename ?? "source.pdf");

  if (!Number.isFinite(resourceId)) {
    return NextResponse.json({ error: "Invalid resourceId" }, { status: 400 });
  }

  const safeName = filename.toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`;
  const path = `resource_${resourceId}/${safeName}`;

  const { data, error } = await supabaseAdmin.storage
    .from("raw_pdfs")
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to create signed upload url" }, { status: 500 });
  }

  // data: { signedUrl, path, token }
  return NextResponse.json({
    bucket: "raw_pdfs",
    path: data.path,
    signedUrl: data.signedUrl,
    token: data.token,
  });
}

