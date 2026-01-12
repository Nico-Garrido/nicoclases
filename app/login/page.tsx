"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function signUp() {
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg("Cuenta creada. Si Supabase exige confirmación, revisa tu correo.");
  }

  async function signIn() {
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    router.push("/app");
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border p-6">
        <h1 className="text-2xl font-semibold">Nico Clases</h1>
        <p className="mt-1 text-sm text-gray-500">Accede a recursos y clases.</p>

        <div className="mt-6 space-y-3">
          <label className="block">
            <span className="text-sm text-gray-600">Email</span>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="tuemail@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </label>

          <label className="block">
            <span className="text-sm text-gray-600">Contraseña</span>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="••••••••"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          {msg && (
            <div className="rounded-xl border px-3 py-2 text-sm text-red-600">
              {msg}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              className="flex-1 rounded-xl border px-3 py-2 disabled:opacity-50"
              onClick={signUp}
              disabled={loading || !email || !password}
            >
              {loading ? "Procesando..." : "Crear cuenta"}
            </button>

            <button
              className="flex-1 rounded-xl bg-black text-white px-3 py-2 rounded-xl disabled:opacity-50"
              onClick={signIn}
              disabled={loading || !email || !password}
            >
              {loading ? "Procesando..." : "Ingresar"}
            </button>
          </div>

          <p className="text-xs text-gray-500 pt-2">
            Consejo: para pruebas rápidas, puedes desactivar temporalmente la
            confirmación de correo en Supabase Auth.
          </p>
        </div>
      </div>
    </main>
  );
}


