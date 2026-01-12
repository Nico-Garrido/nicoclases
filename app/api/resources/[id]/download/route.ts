import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

type PlanId = "free" | "monthly" | "yearly";
const PLAN_RANK: Record<PlanId, number> = { free: 0, monthly: 1, yearly: 2 };

function canAccess(userPlan: PlanId, required: PlanId) {
  return PLAN_RANK[userPlan] >= PLAN_RANK[required];
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const resourceId = Number(id);

    if (!Number.isFinite(resourceId)) {
      return NextResponse.json({ error: "Bad resource id" }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const { data: userData } = await supabaseUser.auth.getUser();
    const user = userData.user;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: resource, error: rErr } = await supabaseAdmin
      .from("resources")
      .select("required_plan, storage_path")
      .eq("id", resourceId)
      .single();

    if (rErr || !resource) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }

    const { data: subs } = await supabaseAdmin
      .from("subscriptions")
      .select("plan_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1);

    const userPlan = ((subs?.[0]?.plan_id as PlanId) ?? "free");
    const required = resource.required_plan as PlanId;

    if (!canAccess(userPlan, required)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!resource.storage_path) {
      return NextResponse.json({ error: "No storage_path" }, { status: 400 });
    }

    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("resources")
      .createSignedUrl(resource.storage_path, 60);

    if (signErr || !signed?.signedUrl) {
      return NextResponse.json({ error: "Could not sign url" }, { status: 500 });
    }

    return NextResponse.json({ url: signed.signedUrl });
  } catch (e) {
    console.error("download route crash:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

