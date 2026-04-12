"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";

type ResourceRow = {
  id: number;
  title: string;
  description: string | null;
  view_mode: "file" | "images";
  download_allowed: boolean;
  page_count: number | null;
};

export default function MaterialViewer() {
  const router = useRouter();
  const params = useParams();

  const idParam = Array.isArray((params as any)?.id)
  ? (params as any).id[0]
  : (params as any)?.id;

  const resourceId = Number(idParam);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [res, setRes] = useState<ResourceRow | null>(null);
  const [page, setPage] = useState(1);
  const [maxPage, setMaxPage] = useState(1);
  const [isAdminPreview, setIsAdminPreview] = useState(false);

  const imgSrc = useMemo(() => {
    if (!idParam) return "";
    if (!Number.isFinite(resourceId)) return "";
    return `/api/materials/${resourceId}/page/${page}`;
  }, [idParam, resourceId, page]);

  useEffect(() => {
    
    if (!idParam) return;
    if (!Number.isFinite(resourceId)) return;
    (async () => {
      setLoading(true);
      setErr(null);

      // 1) Sesión
      const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) {
        setErr("Error leyendo sesión.");
        setLoading(false);
        return;
      }
      if (!sessionData.session?.user) {
        router.replace("/login");
        return;
      }

      // 2) Validación ID
      if (!Number.isFinite(resourceId)) {
        setErr("ID inválido.");
        setLoading(false);
        return;
      }

      // 2b) Obtener rol del usuario
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", sessionData.session.user.id)
        .single();

      const userIsAdmin = profile?.role === "admin";
      setIsAdminPreview(userIsAdmin);

      // 3) Cargar recurso (incluye page_count)
      let r: ResourceRow | null = null;
      let rErr: any = null;

      if (userIsAdmin) {
        // Admin: fetch from admin endpoint to bypass RLS
        const res = await fetch(`/api/admin/materials/${resourceId}/resource-info`);
        if (!res.ok) {
          rErr = { message: "Failed to fetch resource" };
        } else {
          const data = await res.json();
          r = data.resource as ResourceRow;
        }
      } else {
        // Regular user: use supabase client
        const result = await supabase
          .from("resources")
          .select("id,title,description,view_mode,download_allowed,page_count")
          .eq("id", resourceId)
          .single();
        r = result.data as ResourceRow | null;
        rErr = result.error;
      }

      if (rErr || !r) {
        if (userIsAdmin) {
          setErr("Este material no está publicado pero puedes previsualizarlo como admin.");
        } else {
          setErr("No encontrado o sin acceso.");
        }
        setLoading(false);
        return;
      }

      const rr = r as ResourceRow;
      setRes(rr);

      // 4) Si es PDF descargable, redirige a download (presentaciones)
      if (rr.view_mode === "file" && rr.download_allowed) {
        window.location.href = `/api/resources/${rr.id}/download`;
        return;
      }

      // 5) Si es cuadernillo (images), usa page_count (SIN consultar resource_pages)
      if (rr.view_mode === "images") {
        // ✅ Validación crítica: si view_mode='images' pero NO tiene páginas renderizadas
        // Skip this validation for admins previewing unpublished materials
        if (!userIsAdmin && (!rr.page_count || rr.page_count <= 0)) {
          setErr("Este material aún no tiene páginas disponibles. Intenta más tarde.");
          setLoading(false);
          return;
        }
        setMaxPage(Math.max(1, rr.page_count || 1));
        setPage(1);
      }

      setLoading(false);
    })();
  }, [resourceId, router]);

  return (
    <div className="page-wrapper">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-inner">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link
              href="/materials"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: "var(--color-teal)",
                textDecoration: "none",
                fontWeight: 600
              }}
            >
              ← Volver
            </Link>
            <h1 style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--color-primary)",
              margin: 0
            }}>
              {res?.title ?? "Material"}
            </h1>
          </div>
          <Link href="/logout" style={{ color: "var(--color-text)" }}>
            Salir
          </Link>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
        {/* Admin Preview Banner */}
        {isAdminPreview && !loading && (
          <div className="alert" style={{
            background: "rgba(217,166,65,0.1)",
            borderColor: "var(--color-gold)",
            color: "var(--color-primary-dark)",
            marginBottom: 24
          }}>
            <span style={{ fontSize: 18, marginRight: 8 }}>⚠️</span>
            <span>
              <strong>Vista previa de administrador</strong> — Este material no está publicado en la plataforma.
            </span>
          </div>
        )}

        {/* Title & Description */}
        {res && !loading && (
          <div style={{ marginBottom: 32 }}>
            <h1 style={{
              fontSize: 28,
              fontWeight: 700,
              color: "var(--color-primary)",
              marginBottom: 12
            }}>
              {res.title}
            </h1>
            {res.description && (
              <p style={{
                fontSize: 16,
                color: "var(--color-text-muted)",
                marginBottom: 0
              }}>
                {res.description}
              </p>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 400
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{
                width: 48,
                height: 48,
                border: "3px solid var(--color-border)",
                borderTop: "3px solid var(--color-primary)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 16px"
              }} />
              <p style={{ color: "var(--color-text-muted)" }}>Cargando material...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {err && (
          <div className="alert alert-error">
            {err}
          </div>
        )}

        {/* Image Viewer */}
        {!loading && !err && res?.view_mode === "images" && (
          <>
            {/* Navigation and Page Counter */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              marginBottom: 24,
              flexWrap: "wrap"
            }}>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="btn btn-secondary"
                >
                  ◀ Anterior
                </button>

                <button
                  disabled={page >= maxPage}
                  onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
                  className="btn btn-primary"
                >
                  Siguiente ▶
                </button>
              </div>

              <div style={{
                background: "var(--color-primary)",
                color: "#fff",
                padding: "6px 16px",
                borderRadius: "var(--radius-full)",
                fontSize: 14,
                fontWeight: 600,
                whiteSpace: "nowrap"
              }}>
                Página {page} de {maxPage}
              </div>
            </div>

            {/* Image Container */}
            <div className="card" style={{
              padding: 0,
              overflow: "hidden",
              background: "var(--color-surface-soft)"
            }}>
              <img
                src={imgSrc}
                alt={`Página ${page}`}
                style={{
                  width: "100%",
                  display: "block",
                  height: "auto"
                }}
              />
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

