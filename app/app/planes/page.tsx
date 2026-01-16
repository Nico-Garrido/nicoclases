"use client";

import { supabase } from "../../../lib/supabaseClient";

export default function PlanesPage() {
  async function subscribeMonthly() {
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user?.id || !user?.email) {
      alert("Debes iniciar sesión para suscribirte.");
      return;
    }

    const res = await fetch("/api/mp/create-monthly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id,
        payer_email: user.email,
      }),
    });

    const json = await res.json();

if (!res.ok) {
  alert(JSON.stringify(json, null, 2));
  return;
}


    // Redirige a Mercado Pago
    window.location.href = json.init_point;
  }

  return (
    <main className="max-w-xl mx-auto mt-16 p-6 rounded-xl border border-neutral-800">
      <h1 className="text-2xl font-bold mb-4">Planes</h1>

      <div className="rounded-lg border border-neutral-700 p-4">
        <h2 className="text-xl font-semibold">Plan Mensual</h2>
        <p className="text-sm text-neutral-400 mt-1">
          Acceso completo a todos los recursos y clases.
        </p>

        <p className="text-lg font-bold mt-3">$9.990 CLP / mes (test)</p>

        <button
          onClick={subscribeMonthly}
          className="mt-4 px-4 py-2 rounded-lg bg-black text-white hover:opacity-80"
        >
          Suscribirme mensual
        </button>
      </div>
    </main>
  );
}

