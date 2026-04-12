"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type MaterialItem = {
  id: number;
  title: string;
  description: string | null;
  program_code: string;
  level_code: string;
  subject_code: string | null;
  view_mode: "images" | "file";
  download_allowed: boolean;
  page_count: number | null;
  published: boolean;
  available_from: string | null;
  available_to: string | null;
  created_at: string;
};

export default function MaterialsPage() {
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/materials/list", { cache: "no-store" });
        if (!res.ok) {
          setError(`Error: ${res.status}`);
          setLoading(false);
          return;
        }
        const json = await res.json();
        setItems(json.items ?? []);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="page-wrapper">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="navbar-logo">
            <span style={{ fontSize: 18, fontWeight: 700, color: "var(--color-primary)" }}>
              FAGUS ED
            </span>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            <Link href="/" style={{ color: "var(--color-text)" }}>Inicio</Link>
            <Link href="/logout" style={{ color: "var(--color-text)" }}>Cerrar sesión</Link>
          </div>
        </div>
      </nav>

      {/* Hero Banner */}
      <section className="section-dark" style={{ padding: "48px 16px" }}>
        <div className="container">
          <h1 style={{ fontSize: 36, fontWeight: 900, marginBottom: 12, color: "#fff" }}>
            Mis Materiales
          </h1>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.8)", marginBottom: 0 }}>
            Accede a tus cuadernillos y archivos educativos. Visible solo con plan activo.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="container" style={{ paddingTop: 48, paddingBottom: 48 }}>
        {loading && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 40,
                height: 40,
                border: "3px solid var(--color-border)",
                borderTop: "3px solid var(--color-primary)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 16px"
              }} />
              <p style={{ color: "var(--color-text-muted)" }}>Cargando materiales...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            <span>Error: {error}</span>
          </div>
        )}

        {!loading && items.length === 0 && !error && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
            <div className="card" style={{ maxWidth: 400, textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
              <h2 style={{ fontSize: 18 }}>Sin materiales disponibles</h2>
              <p style={{ color: "var(--color-text-muted)", marginBottom: 0 }}>
                No tienes material disponible en este momento o no está publicado aún.
              </p>
            </div>
          </div>
        )}

        {items.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 24
          }}>
            {items.map((m) => {
              const badge = `${m.program_code} · ${m.level_code}${m.subject_code ? ` · ${m.subject_code}` : ""}`;
              const kind = m.view_mode === "images" ? `Cuadernillo · ${m.page_count ?? "?"} pág` : "Archivo";
              const dl = m.download_allowed ? "Descargable" : "No descargable";

              return (
                <div
                  key={m.id}
                  className="card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 16
                  }}
                >
                  <div>
                    <h3 style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: "var(--color-primary)",
                      marginBottom: 8,
                      margin: "0 0 8px 0"
                    }}>
                      {m.title}
                    </h3>
                    <p style={{
                      color: "var(--color-text-muted)",
                      fontSize: 14,
                      lineHeight: 1.5,
                      margin: 0
                    }}>
                      {m.description ?? ""}
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span className="badge badge-primary">{badge}</span>
                    <span className="badge badge-teal">{kind}</span>
                    <span className="badge badge-gold">{dl}</span>
                  </div>

                  <div style={{ marginTop: "auto" }}>
                    <Link
                      href={`/materials/${m.id}`}
                      className="btn btn-primary btn-block"
                      style={{ textAlign: "center" }}
                    >
                      Abrir
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="section-dark" style={{ marginTop: 48 }}>
        <div className="container" style={{ padding: "32px 16px", textAlign: "center" }}>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, margin: 0 }}>
            © 2024 FAGUS ED. Todos los derechos reservados.
          </p>
        </div>
      </footer>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

