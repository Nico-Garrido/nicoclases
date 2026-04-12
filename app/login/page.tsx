"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Image from "next/image";

type Role = "student" | "teacher" | "admin";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [msg, setMsg]           = useState<string | null>(null);

  async function redirectByRole(userId: string) {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Tiempo de espera agotado. Intenta de nuevo.")), 10000)
    );
    const q = supabase.from("profiles").select("role").eq("id", userId).single();
    const { data, error } = await Promise.race([q, timeout]);
    if (error) throw new Error(error.message);
    const role = (data?.role as Role) ?? "student";
    if (role === "teacher" || role === "admin") router.replace("/teacher");
    else router.replace("/");
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (user) {
        try { await redirectByRole(user.id); }
        catch (e: any) { setMsg(e?.message ?? "No se pudo redirigir"); }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Tiempo de espera agotado (10s)")), 10000)
      );
      const p = supabase.auth.signInWithPassword({ email, password });
      const result = await Promise.race([p, timeout]);
      // @ts-ignore
      if (result.error) throw new Error(result.error.message);
      // @ts-ignore
      const user = result.data?.user;
      if (!user) throw new Error("Inicio de sesión exitoso pero no se recibió el usuario");
      await redirectByRole(user.id);
    } catch (err: any) {
      setMsg(err?.message ?? "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrapper">

      {/* ── Left panel: Deep Ink Blue brand section ── */}
      <div className="auth-brand">
        {/* Logo */}
        <div style={{ zIndex: 1, textAlign: "center" }}>
          <Image
            src="/logo-fagus-ed.svg"
            alt="Fagus-Ed Logo"
            width={130}
            height={155}
            priority
            style={{ filter: "brightness(0) invert(1)" }}
          />
        </div>

        {/* Divider */}
        <div style={{ width: 56, height: 2, background: "rgba(217,166,65,0.7)", zIndex: 1 }} />

        {/* Tagline */}
        <div style={{ textAlign: "center", zIndex: 1, maxWidth: 320 }}>
          <p style={{ color: "#fff", fontSize: "1.15rem", fontWeight: 600, margin: 0, lineHeight: 1.4 }}>
            Tu camino hacia la universidad comienza aquí
          </p>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.875rem", marginTop: "0.875rem" }}>
            Accede a materiales, clases y recursos diseñados para tu éxito en la PAES.
          </p>
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", zIndex: 1, width: "100%", maxWidth: 300 }}>
          {[
            { icon: "📚", label: "Material exclusivo por asignatura" },
            { icon: "🎯", label: "Ensayos y ejercicios PAES" },
            { icon: "👨‍🏫", label: "Clases con profesores expertos" },
          ].map(({ icon, label }) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", gap: "0.75rem",
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "var(--radius-lg)",
              padding: "0.6rem 1rem",
              fontSize: "0.85rem",
              color: "rgba(255,255,255,0.85)",
            }}>
              <span style={{ fontSize: "1rem" }}>{icon}</span>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel: Pure White form ── */}
      <div className="auth-form-panel">
        <div style={{ width: "100%", maxWidth: 420 }}>

          {/* Mobile-only logo (shown when brand panel is hidden) */}
          <div style={{ textAlign: "center", marginBottom: "2rem" }} className="mobile-only">
            <Image src="/logo-fagus-ed.svg" alt="Fagus-Ed" width={80} height={95} />
          </div>

          {/* Heading */}
          <div style={{ marginBottom: "2rem" }}>
            <h1 style={{ fontSize: "1.875rem", margin: 0 }}>Bienvenido</h1>
            <p style={{ color: "var(--color-text-muted)", marginTop: "0.4rem", fontSize: "0.95rem" }}>
              Ingresa tus credenciales para acceder
            </p>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                className="form-input"
                type="email"
                required
                autoComplete="email"
                placeholder="nombre@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <label className="form-label" htmlFor="password">Contraseña</label>
                <a href="#" style={{ fontSize: "0.78rem", color: "var(--color-teal)" }}>
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <input
                id="password"
                className={`form-input${msg ? " error" : ""}`}
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {msg && (
              <div className="alert alert-error" style={{ marginBottom: "1.25rem" }}>
                <span>⚠️</span>
                <span>{msg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-block btn-lg"
              style={{ marginTop: "0.25rem" }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: "1rem", height: "1rem",
                    border: "2px solid rgba(255,255,255,0.35)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    animation: "fagus-spin 0.7s linear infinite",
                    display: "inline-block",
                    flexShrink: 0,
                  }} />
                  Ingresando…
                </>
              ) : "Ingresar"}
            </button>
          </form>

          {/* Footer link */}
          <p style={{
            textAlign: "center", marginTop: "2.5rem",
            fontSize: "0.82rem", color: "var(--color-text-muted)"
          }}>
            ¿Necesitas ayuda?{" "}
            <a href="mailto:contacto@fagus-ed.cl" style={{ color: "var(--color-teal)" }}>
              Contáctanos
            </a>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fagus-spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .mobile-only { display: block !important; }
        }
        .mobile-only { display: none; }
      `}</style>
    </div>
  );
}
