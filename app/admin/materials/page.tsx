import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { MaterialsList } from "./MaterialsList";
import Link from "next/link";

export default async function AdminMaterialsPage() {
  const { data, error } = await supabaseAdmin
    .from("resources")
    .select(
      "id,title,program_code,level_code,subject_code,view_mode,download_allowed,page_count,published,created_at"
    )
    .order("id", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div className="page-wrapper">
        <div className="card" style={{ maxWidth: 600, margin: "60px auto", textAlign: "center" }}>
          <h1 style={{ color: "var(--color-error)", marginBottom: "1rem" }}>Error cargando materiales</h1>
          <pre style={{ whiteSpace: "pre-wrap", textAlign: "left", overflow: "auto" }}>{error.message}</pre>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="navbar-logo">
            <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-primary)" }}>
              FAGUS ED / Admin
            </span>
          </div>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <Link href="/admin/materials/new" className="btn btn-primary btn-sm">
              Nuevo material
            </Link>
            <Link href="/" style={{ color: "var(--color-teal)", textDecoration: "none" }}>
              Cerrar sesión
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero section */}
      <section className="section-dark" style={{ paddingTop: "3rem", paddingBottom: "3rem" }}>
        <div className="container">
          <h1 style={{ marginBottom: "0.5rem", fontSize: "2.2rem" }}>Gestión de Materiales</h1>
          <p style={{ opacity: 0.85, marginBottom: 0 }}>
            Publica solo si el cuadernillo está listo (para <b>images</b>, <b>page_count</b> debe ser &gt; 0).
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="container" style={{ paddingTop: "3rem", paddingBottom: "3rem" }}>
        <MaterialsList items={data ?? []} />
      </div>
    </div>
  );
}

