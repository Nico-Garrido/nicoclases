"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function Home() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) { router.replace("/login"); return; }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single();
      const r = profile?.role ?? "student";
      setRole(r);
      setName(profile?.full_name ?? null);
      if (r === "teacher" || r === "admin") router.replace("/teacher");
    })();
  }, [router]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 19) return "Buenas tardes";
    return "Buenas noches";
  };

  return (
    <div className="page-wrapper">

      {/* ── Navbar — Pure White ── */}
      <header className="navbar">
        <div className="navbar-inner">
          <a href="/" className="navbar-logo">
            <Image src="/logo-fagus-ed.svg" alt="Fagus-Ed" width={36} height={43} />
            <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--color-primary)", letterSpacing: "0.02em" }}>
              FAGUS <span style={{ fontWeight: 300, color: "var(--color-secondary)" }}>ED</span>
            </span>
          </a>

          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
            {role && <span className="badge badge-primary" style={{ textTransform: "capitalize" }}>{role}</span>}
            <a href="/logout" className="btn btn-secondary btn-sm">Cerrar sesión</a>
          </div>
        </div>
      </header>

      {/* ── Hero banner — Deep Ink Blue section ── */}
      <section className="section-dark" style={{ padding: "var(--space-2xl) var(--space-lg)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-lg)" }}>
          <div>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.85rem", margin: "0 0 0.35rem", letterSpacing: "0.04em" }}>
              {greeting()},
            </p>
            <h1 style={{ color: "#fff", fontSize: "2rem", margin: "0 0 0.5rem", fontWeight: 800 }}>
              {name ?? "Estudiante"} 👋
            </h1>
            <p style={{ color: "rgba(255,255,255,0.65)", margin: 0, fontSize: "0.95rem" }}>
              Bienvenido a tu plataforma Fagus-Ed Preuniversitario
            </p>
          </div>

          {/* Gold accent badge */}
          <div style={{
            background: "rgba(217,166,65,0.15)",
            border: "1px solid rgba(217,166,65,0.4)",
            borderRadius: "var(--radius-xl)",
            padding: "var(--space-md) var(--space-lg)",
            textAlign: "center",
          }}>
            <p style={{ color: "rgba(217,166,65,0.9)", fontSize: "0.7rem", margin: "0 0 0.2rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>Tu rol</p>
            <p style={{ color: "#fff", fontWeight: 700, margin: 0, fontSize: "1.05rem", textTransform: "capitalize" }}>
              {role ?? "…"}
            </p>
          </div>
        </div>
      </section>

      {/* ── Main content — Pure White ── */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "var(--space-xl) var(--space-lg)" }}>

        <h2 style={{ fontSize: "1.2rem", marginBottom: "var(--space-lg)", color: "var(--color-primary)" }}>
          Acceso rápido
        </h2>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "var(--space-lg)",
          marginBottom: "var(--space-xl)",
        }}>
          {/* Materiales */}
          <a href="/materials" className="card" style={{ textDecoration: "none", display: "block" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", marginBottom: "0.75rem" }}>
              <div style={{
                width: 50, height: 50, borderRadius: "var(--radius-lg)",
                background: "rgba(15,39,66,0.07)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.5rem", flexShrink: 0,
              }}>📚</div>
              <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Materiales</h3>
            </div>
            <p style={{ color: "var(--color-text-muted)", margin: 0, fontSize: "0.875rem", lineHeight: 1.55 }}>
              Accede a guías, resúmenes y material de estudio por asignatura.
            </p>
          </a>

          {/* PAES */}
          <a href="/paes" className="card" style={{ textDecoration: "none", display: "block" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", marginBottom: "0.75rem" }}>
              <div style={{
                width: 50, height: 50, borderRadius: "var(--radius-lg)",
                background: "rgba(31,138,138,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.5rem", flexShrink: 0,
              }}>🎯</div>
              <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Ensayos PAES</h3>
            </div>
            <p style={{ color: "var(--color-text-muted)", margin: 0, fontSize: "0.875rem", lineHeight: 1.55 }}>
              Practica con ensayos modelo y revisa tus resultados al instante.
            </p>
          </a>

          {/* Clases (próximamente) */}
          <div className="card card-featured" style={{ opacity: 0.65, cursor: "not-allowed" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", marginBottom: "0.75rem" }}>
              <div style={{
                width: 50, height: 50, borderRadius: "var(--radius-lg)",
                background: "rgba(217,166,65,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.5rem", flexShrink: 0,
              }}>👨‍🏫</div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Mis Clases</h3>
                <span className="badge badge-gold" style={{ marginTop: "0.2rem" }}>Próximamente</span>
              </div>
            </div>
            <p style={{ color: "var(--color-text-muted)", margin: 0, fontSize: "0.875rem", lineHeight: 1.55 }}>
              Reserva y accede a clases en vivo con profesores expertos.
            </p>
          </div>
        </div>

        {/* Info notice */}
        <div className="alert alert-info">
          <span>ℹ️</span>
          <span>
            La sección <strong>"Mis Clases"</strong> estará disponible pronto.
            Mientras tanto, explora los materiales y ensayos PAES.
          </span>
        </div>
      </main>

      {/* ── Footer — Deep Ink Blue ── */}
      <footer className="section-dark" style={{ marginTop: "var(--space-3xl)", padding: "var(--space-xl) var(--space-lg)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-md)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Image src="/logo-fagus-ed.svg" alt="Fagus-Ed" width={28} height={33}
              style={{ filter: "brightness(0) invert(1)", opacity: 0.85 }} />
            <span style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.85rem" }}>
              © {new Date().getFullYear()} Fagus-Ed Preuniversitario
            </span>
          </div>
          <a href="/logout" style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.8rem" }}>
            Cerrar sesión
          </a>
        </div>
      </footer>
    </div>
  );
}
