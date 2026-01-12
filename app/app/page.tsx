"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.replace("/login");
        return;
      }

      setEmail(data.user.email ?? null);
    };

    run();
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold">Panel de estudiante</h1>
        <p className="mt-2 text-gray-600">Sesión activa: {email ?? "..."}</p>

        <div className="mt-6 flex gap-2">
          <a className="rounded-xl border px-3 py-2" href="/app/recursos">
            Recursos
          </a>
          <a className="rounded-xl border px-3 py-2" href="/app/clases">
            Clases
          </a>
          <button className="rounded-xl bg-black text-white px-3 py-2" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </div>
    </main>
  );
}

