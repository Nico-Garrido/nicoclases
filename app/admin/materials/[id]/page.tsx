import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { UploadClient } from "./UploadClient";

export default async function AdminMaterialDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // Next 16: params puede comportarse como async, esto lo hace seguro
  const p = await Promise.resolve(params);
  const resourceId = Number(p.id);

  const sb = await supabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    return (
      <div className="page-wrapper">
        <div className="card" style={{ maxWidth: 600, margin: "60px auto", textAlign: "center" }}>
          <h1 style={{ color: "var(--color-error)" }}>No autenticado</h1>
          <p style={{ marginBottom: "1.5rem" }}>Debes iniciar sesión para continuar.</p>
          <Link href="/login" className="btn btn-primary">Ir a login</Link>
        </div>
      </div>
    );
  }

  const { data: prof } = await sb.from("profiles").select("role").eq("id", user.id).single();

  if (!prof || prof.role !== "admin") {
    return (
      <div className="page-wrapper">
        <div className="card" style={{ maxWidth: 600, margin: "60px auto", textAlign: "center" }}>
          <h1 style={{ color: "var(--color-error)" }}>Acceso denegado</h1>
          <p style={{ marginBottom: "1.5rem" }}>No tienes permiso para acceder a esta página.</p>
          <Link href="/" className="btn btn-primary">Volver al inicio</Link>
        </div>
      </div>
    );
  }

  if (!Number.isFinite(resourceId)) {
    return (
      <div className="page-wrapper">
        <div className="card" style={{ maxWidth: 600, margin: "60px auto", textAlign: "center" }}>
          <h1 style={{ color: "var(--color-error)" }}>ID inválido</h1>
          <p style={{ marginBottom: "1.5rem" }}>El identificador no es válido.</p>
          <Link href="/admin/materials" className="btn btn-primary">Volver a lista</Link>
        </div>
      </div>
    );
  }

  const { data: r, error: rErr } = await supabaseAdmin
    .from("resources")
    .select(
      "id,title,description,program_code,level_code,subject_code,view_mode,download_allowed,page_count,published,available_from,available_to,render_status,render_error,created_at"
    )
    .eq("id", resourceId)
    .single();

  if (rErr || !r) {
    return (
      <div className="page-wrapper">
        <div className="card" style={{ maxWidth: 600, margin: "60px auto", textAlign: "center" }}>
          <h1 style={{ color: "var(--color-error)" }}>No encontrado</h1>
          <p style={{ marginBottom: "1.5rem" }}>El material no existe.</p>
          <Link href="/admin/materials" className="btn btn-primary">Volver a lista</Link>
        </div>
      </div>
    );
  }

  const { count: pagesCount } = await supabaseAdmin
    .from("resource_pages")
    .select("id", { count: "exact", head: true })
    .eq("resource_id", r.id);

  const hasPages = (pagesCount ?? 0) > 0;

  return (
    <div className="page-wrapper">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-inner">
          <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
            <Link href="/admin/materials" style={{ color: "var(--color-teal)", textDecoration: "none", fontWeight: 600 }}>
              ← Volver a lista
            </Link>
            <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-primary)" }}>
              FAGUS ED Admin
            </span>
          </div>
          <Link href={`/materials/${r.id}`} className="btn btn-secondary btn-sm">
            Ver como alumno
          </Link>
        </div>
      </nav>

      {/* Hero section */}
      <section className="section-dark" style={{ paddingTop: "2.5rem", paddingBottom: "2.5rem" }}>
        <div className="container">
          <h1 style={{ marginBottom: "0.5rem", fontSize: "2rem" }}>{r.title}</h1>
          <p style={{ opacity: 0.85, marginBottom: 0, fontSize: "0.95rem" }}>
            ID: {r.id} · {r.program_code}/{r.level_code} · {r.view_mode} · {r.download_allowed ? "Descargable" : "Sin descargas"}
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="container" style={{ paddingTop: "2rem", paddingBottom: "2rem" }}>
        {/* Status pills */}
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <span className={`badge ${r.published ? "badge-success" : "badge-primary"}`}>
            {r.published ? "Publicado" : "Borrador"}
          </span>
          <span className={`badge ${r.render_status === "success" ? "badge-success" : r.render_status === "error" ? "badge-error" : "badge-teal"}`}>
            Render: {r.render_status ?? "pending"}
          </span>
          <span className="badge badge-primary">{pagesCount ?? 0} páginas</span>
        </div>

        {r.render_error && (
          <div className="alert alert-error" style={{ marginBottom: "1.5rem" }}>
            <strong>Error de renderizado:</strong> {r.render_error}
          </div>
        )}

        {/* Description */}
        {r.description && (
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ marginBottom: "0.75rem" }}>Descripción</h3>
            <p style={{ marginBottom: 0 }}>{r.description}</p>
          </div>
        )}

        {/* Upload section */}
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ marginBottom: "1rem" }}>Subir PDF</h3>
          <UploadClient resourceId={r.id} />
        </div>

        {/* Diagnostics */}
        <div className={`card ${hasPages ? "" : ""}`}>
          <h3 style={{ marginBottom: "1rem" }}>Diagnóstico</h3>
          {hasPages ? (
            <div className="alert alert-success">
              Este material ya tiene {pagesCount} página{pagesCount !== 1 ? "s" : ""} renderizada{pagesCount !== 1 ? "s" : ""}.
              Puedes publicarlo desde la lista de materiales.
            </div>
          ) : (
            <div className="alert alert-warning">
              Aún no hay páginas renderizadas. Sube un PDF arriba para encolar el render automático.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

