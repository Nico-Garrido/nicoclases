"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewMaterialPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [programCode, setProgramCode] = useState("IGCSE_0625");
  const [levelCode, setLevelCode] = useState("1MED");
  const [subjectCode, setSubjectCode] = useState("");
  const [viewMode, setViewMode] = useState<"images" | "file">("images");
  const [downloadAllowed, setDownloadAllowed] = useState(false);
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableTo, setAvailableTo] = useState("");

  async function onCreate() {
    setErr(null);
    setLoading(true);
    try {
      const payload = {
        title,
        description: description || null,
        program_code: programCode,
        level_code: levelCode,
        subject_code: subjectCode || null,
        view_mode: viewMode,
        download_allowed: downloadAllowed,
        available_from: availableFrom ? new Date(availableFrom).toISOString() : null,
        available_to: availableTo ? new Date(availableTo).toISOString() : null,
      };

      const res = await fetch("/api/admin/materials/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);

      // Por ahora volvemos a la lista (en el paso 4.2 haremos /admin/materials/[id] para subir archivo)
      router.push("/admin/materials");
      router.refresh();
    } catch (e: any) {
      setErr(e?.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-wrapper">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-inner">
          <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
            <Link href="/admin/materials" style={{ color: "var(--color-teal)", textDecoration: "none", fontWeight: 600 }}>
              ← Volver
            </Link>
            <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-primary)" }}>
              FAGUS ED Admin
            </span>
          </div>
        </div>
      </nav>

      {/* Hero section */}
      <section className="section-dark" style={{ paddingTop: "2.5rem", paddingBottom: "2.5rem" }}>
        <div className="container">
          <h1 style={{ marginBottom: 0, fontSize: "2rem" }}>Nuevo Material</h1>
        </div>
      </section>

      {/* Content */}
      <div style={{ paddingTop: "2rem", paddingBottom: "3rem", display: "flex", justifyContent: "center" }}>
        <div className="card" style={{ maxWidth: 700, width: "100%" }}>
          {err && (
            <div className="alert alert-error" style={{ marginBottom: "1.5rem" }}>
              {err}
            </div>
          )}

          <div style={{ display: "grid", gap: "1.5rem" }}>
            {/* Title */}
            <div className="form-group">
              <label className="form-label">Título *</label>
              <input
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Guía de Estudio Matemáticas"
              />
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label">Descripción</label>
              <textarea
                className="form-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Detalles opcionales sobre el material"
              />
            </div>

            {/* Program, Level, Subject */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Programa *</label>
                <select
                  className="form-input"
                  value={programCode}
                  onChange={(e) => setProgramCode(e.target.value)}
                >
                  <option value="IGCSE_0654">IGCSE_0654</option>
                  <option value="IGCSE_0625">IGCSE_0625</option>
                  <option value="PAES_CIENCIAS">PAES_CIENCIAS</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Nivel *</label>
                <input
                  className="form-input"
                  value={levelCode}
                  onChange={(e) => setLevelCode(e.target.value)}
                  placeholder="Ej: 1MED"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Asignatura (opcional)</label>
                <input
                  className="form-input"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  placeholder="Ej: MAT"
                />
              </div>
            </div>

            {/* View Mode and Download */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Tipo de visualización *</label>
                <select
                  className="form-input"
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value as any)}
                >
                  <option value="images">Cuadernillo (imágenes renderizadas)</option>
                  <option value="file">Archivo (descargable)</option>
                </select>
              </div>

              <div className="form-group" style={{ display: "flex", alignItems: "flex-end", gap: "0.75rem" }}>
                <input
                  type="checkbox"
                  id="download-allowed"
                  checked={downloadAllowed}
                  onChange={(e) => setDownloadAllowed(e.target.checked)}
                  style={{ width: 20, height: 20, cursor: "pointer" }}
                />
                <label htmlFor="download-allowed" style={{ cursor: "pointer", marginBottom: 0 }}>
                  Permitir descarga
                </label>
              </div>
            </div>

            {/* Availability dates */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Disponible desde (opcional)</label>
                <input
                  className="form-input"
                  type="datetime-local"
                  value={availableFrom}
                  onChange={(e) => setAvailableFrom(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Disponible hasta (opcional)</label>
                <input
                  className="form-input"
                  type="datetime-local"
                  value={availableTo}
                  onChange={(e) => setAvailableTo(e.target.value)}
                />
              </div>
            </div>

            {/* Submit button */}
            <button
              disabled={loading || !title || !programCode || !levelCode}
              onClick={onCreate}
              className="btn btn-primary btn-block"
              style={{ marginTop: "0.5rem" }}
            >
              {loading ? "Creando…" : "Crear draft"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

