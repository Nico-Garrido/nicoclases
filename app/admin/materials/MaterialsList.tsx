"use client";

export function MaterialsList({ items }: { items: any[] }) {
  async function togglePublish(id: number, next: boolean) {
    await fetch(`/api/admin/materials/${id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: next }),
    });
    window.location.reload();
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
      {items.map((r) => {
        const isImages = r.view_mode === "images";
        const pc = r.page_count ?? 0;
        const readyToPublish = !isImages || pc > 0;

        let statusValue = "Draft";
        let statusBadgeClass = "badge-primary";
        if (r.published) {
          statusValue = "Publicado";
          statusBadgeClass = "badge-success";
        } else if (isImages && pc === 0) {
          statusValue = "Pendiente";
          statusBadgeClass = "badge-gold";
        } else if (isImages && pc > 0) {
          statusValue = "Listo";
          statusBadgeClass = "badge-teal";
        }

        return (
          <div key={r.id} className="card">
            {/* Status badge */}
            <div style={{ marginBottom: "0.75rem" }}>
              <span className={`badge ${statusBadgeClass}`}>{statusValue}</span>
            </div>

            {/* Title */}
            <h3 style={{ marginBottom: "0.5rem", color: "var(--color-primary)" }}>
              {r.title}
            </h3>

            {/* Metadata */}
            <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
              <div>{r.program_code} / {r.level_code}</div>
              {r.subject_code && <div>{r.subject_code}</div>}
            </div>

            {/* Render info */}
            <div style={{ fontSize: "0.8rem", color: "var(--color-text-light)", marginBottom: "1rem" }}>
              <div>{r.view_mode} · {isImages ? `${pc} pág` : "descargable"}</div>
              <div>{r.download_allowed ? "Descargas permitidas" : "Sin descargas"}</div>
            </div>

            {/* Upload hint for pending pages */}
            {isImages && pc === 0 && (
              <div
                style={{
                  fontSize: "0.75rem",
                  padding: "0.5rem",
                  backgroundColor: "var(--color-surface-soft)",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "1rem",
                  color: "var(--color-text-muted)",
                  fontFamily: "monospace",
                  overflow: "auto",
                }}
              >
                {`npm run upload:booklet -- --resourceId ${r.id} "$HOME/Desktop/Archivo.pdf"`}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <a href={`/admin/materials/${r.id}`} className="btn btn-secondary btn-sm" style={{ textAlign: "center" }}>
                Editar / Subir PDF
              </a>

              <a href={`/materials/${r.id}`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ textAlign: "center" }}>
                Ver como alumno
              </a>

              <button
                disabled={!r.published && !readyToPublish}
                onClick={() => togglePublish(r.id, !r.published)}
                className={`btn btn-sm ${r.published ? "btn-gold" : "btn-primary"}`}
                style={{ width: "100%", cursor: !r.published && !readyToPublish ? "not-allowed" : "pointer" }}
              >
                {r.published ? "Despublicar" : "Publicar"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
