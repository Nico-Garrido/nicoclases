import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { user_id, payer_email } = await req.json();

    if (!user_id || !payer_email) {
      return NextResponse.json({ error: "Missing user_id or payer_email" }, { status: 400 });
    }

    const accessToken = process.env.MP_ACCESS_TOKEN!;
    const baseUrl = process.env.APP_BASE_URL!;

    if (!accessToken || !baseUrl) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    // Suscripción mensual simple (sin preapproval_plan), con auto_recurring
    const body = {
      reason: "NicoClases - Plan Mensual",
      external_reference: String(user_id), // clave para mapear en webhook
      payer_email: String(payer_email),
      back_url: `${baseUrl}/app/planes`,   // a donde vuelve el usuario tras autorizar
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: 9990, // CLP (ajusta el precio)
        currency_id: "CLP",
      },
      status: "pending",
    };

    const mpRes = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const mpJson = await mpRes.json();

    if (!mpRes.ok) {
      return NextResponse.json({ error: "MP error", details: mpJson }, { status: 500 });
    }

    // Guardamos el ID de la suscripción creada (pending) si quieres rastrearla
    await supabaseAdmin.from("subscriptions").insert({
      user_id,
      plan_id: "monthly",
      status: "pending",
      mp_preapproval_id: mpJson.id,
    });

    // init_point es el link para que el usuario autorice la suscripción
    return NextResponse.json({ init_point: mpJson.init_point, id: mpJson.id });
  } catch (e: any) {
    console.error("create-monthly crash:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

