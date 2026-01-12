import { supabase } from "./supabaseClient";

export type PlanId = "free" | "monthly" | "yearly";

const PLAN_RANK: Record<PlanId, number> = {
  free: 0,
  monthly: 1,
  yearly: 2,
};

export function canAccess(userPlan: PlanId, requiredPlan: PlanId) {
  return PLAN_RANK[userPlan] >= PLAN_RANK[requiredPlan];
}

export async function getUserPlan(): Promise<PlanId> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) return "free";

  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan_id, status, current_period_end, created_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    // Para MVP: si hay error, cae a free
    return "free";
  }

  const planId = data?.[0]?.plan_id as PlanId | undefined;
  return planId ?? "free";
}

