import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const accessToken = process.env.MP_ACCESS_TOKEN!;
    if (!accessToken) return NextResponse.json({ ok: false }, { status: 500 });

    const payload = await req.json();

    // Mercado Pago suele enviar data.id o id (depende del evento/config)
    const preapprovalId = payload?.data?.id ?? payload?.id;
    if (!preapprovalId) {
      // Respondemos OK para que MP no reintente por payloads que no usamos
      return NextResponse.json({ ok: true });
    }

    // Buscamos el estado real consultando a MP
    const mpRes = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const mpJson = await mpRes.json();

    if (!mpRes.ok) {
      console.error("MP fetch preapproval failed:", mpJson);
      return NextResponse.json({ ok: true });
    }

    const userId = mpJson.external_reference; // lo seteamos como user_id
    const status = mpJson.status; // authorized / paused / cancelled / pending...

    if (!userId) return NextResponse.json({ ok: true });

    // Map simple a tu modelo
    const mappedStatus =
      status === "authorized" ? "active" :
      status === "cancelled" ? "cancelled" :
      status === "paused" ? "paused" :
      "pending";

    // Upsert por mp_preapproval_id o por user_id (elige uno). Aquí: por mp_preapproval_id.
const newPlan = mappedStatus === "active" ? "monthly" : undefined;

await supabaseAdmin
  .from("subscriptions")
  .update({
    status: mappedStatus,
    ...(newPlan ? { plan_id: newPlan } : {}),
  })
  .eq("mp_preapproval_id", preapprovalId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("webhook crash:", e);
    return NextResponse.json({ ok: true });
  }
}

