"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { canAccess, getUserPlan, PlanId } from "../../../lib/entitlements";

type ResourceRow = {
  id: number;
  title: string;
  description: string | null;
  required_plan: PlanId;
  created_at: string;
};

export default function RecursosPage() {
  const [userPlan, setUserPlan] = useState<PlanId>("free");
  const [items, setItems] = useState<ResourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

async function download(id: number) {
  try {
    const { data: sessionData, error: sErr } = await supabase.auth.getSession();
    if (sErr) {
      alert(`Session error: ${sErr.message}`);
	 return;
    }

    const token = sessionData.session?.access_token;
    if (!token) {
      alert("No hay sesión activa. Vuelve a iniciar sesión.");
      return;
    }

    const res = await fetch(`/api/resources/${id}/download`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    const text = await res.text();

    if (!res.ok) {
      // Intentamos parsear JSON si aplica
      try {
        const json = JSON.parse(text);
        alert(`Error ${res.status}: ${json.error ?? text}`);
      } catch {
        alert(`Error ${res.status}: ${text}`);
      }
      return;
    }

    const json = JSON.parse(text);
    if (!json.url) {
      alert("Respuesta OK pero sin url firmada.");
      return;
    }

    window.open(json.url, "_blank");
  } catch (e: any) {
    alert(`Download failed: ${e?.message ?? String(e)}`);
  }
}

  useEffect(() => {
  const run = async () => {
    setLoading(true);
    setErr(null);

    const plan = await getUserPlan();
    setUserPlan(plan);

    const { data, error } = await supabase
      .from("resources")
      .select("id, title, description, required_plan, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setErr(error.message);
      setItems([]);
      setLoading(false);
      return;
    }

    setItems((data ?? []) as ResourceRow[]);
    setLoading(false);
  };

  run();
}, []);


  const visible = useMemo(
    () => items.filter((r) => canAccess(userPlan, r.required_plan)),
    [items, userPlan]
  );

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Recursos</h1>
            <p className="mt-1 text-gray-600">Tu plan actual: <b>{userPlan}</b></p>
          </div>
        </div>

        {loading && <p className="mt-6 text-gray-600">Cargando...</p>}
        {err && <p className="mt-6 text-red-600">{err}</p>}

        {!loading && !err && (
          <div className="mt-6 grid gap-3">
            {visible.length === 0 ? (
              <div className="rounded-2xl border p-4">
                <p>No hay recursos disponibles para tu plan.</p>
              </div>
            ) : (
              visible.map((r) => (
                <div key={r.id} className="rounded-2xl border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold">{r.title}</h2>
                      {r.description && <p className="mt-1 text-gray-600">{r.description}</p>}
                      <p className="mt-2 text-sm text-gray-500">
                        Requiere: <b>{r.required_plan}</b>
                      </p>
                    </div>

                    <button
			type="button"
			className="rounded-xl bg-black text-white px-3 py-2 cursor-pointer"
			onClick={() => download(r.id)}
		    >
			Descargar
		   </button>

                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}


