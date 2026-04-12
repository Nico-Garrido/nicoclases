"use client";

import { useEffect, useState } from "react";

type Phase = "idle" | "uploading" | "queued" | "processing" | "ready" | "error";

export function UploadClient({ resourceId }: { resourceId: number }) {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [msg, setMsg] = useState("");
  const [pdfPath, setPdfPath] = useState<string | null>(null);

  async function safeJson(res: Response) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  async function refreshStatus() {
    const res = await fetch(`/api/admin/materials/render-status?resourceId=${resourceId}`, {
      cache: "no-store",
    });
    const json = await safeJson(res);

    if (!res.ok) {
      setPhase("error");
      setMsg(`render-status -> HTTP ${res.status} ${json ? JSON.stringify(json) : ""}`);
      return;
    }

    const rs = json?.resource?.render_status as string | undefined;
    const err = json?.resource?.render_error as string | undefined;
    const pc = json?.resource?.page_count as number | null | undefined;

    if (err) {
      setPhase("error");
      setMsg(`render error: ${err}`);
      return;
    }

    if (rs === "queued") {
      setPhase("queued");
      setMsg("En cola…");
      return;
    }

    if (rs === "processing") {
      setPhase("processing");
      setMsg("Procesando…");
      return;
    }

    if (rs === "ready") {
      setPhase("ready");
      setMsg(`Listo (${pc ?? "?"} páginas)`);
      return;
    }

    // Si no hay estado aún
    setPhase("idle");
    setMsg("");
  }

  useEffect(() => {
    if (phase !== "queued" && phase !== "processing") return;
    const t = setInterval(() => {
      refreshStatus().catch(() => {});
    }, 2000);
    return () => clearInterval(t);
  }, [phase]);

  async function uploadAndEnqueue() {
    if (!file) {
      setPhase("error");
      setMsg("Selecciona un PDF primero.");
      return;
    }

    setPhase("uploading");
    setMsg("Click recibido. Creando URL de subida…");

    // 1) pedir URL firmada
    const urlRes = await fetch("/api/admin/materials/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resourceId, filename: "source.pdf" }),
    });

    const urlJson = await safeJson(urlRes);
    setMsg(`upload-url -> HTTP ${urlRes.status} ${urlJson ? JSON.stringify(urlJson) : ""}`);

    if (!urlRes.ok) {
      setPhase("error");
      return;
    }

    const signedUrl = urlJson?.signedUrl as string | undefined;
    const path = urlJson?.path as string | undefined;

    if (!signedUrl || !path) {
      setPhase("error");
      setMsg(`upload-url -> respuesta inválida: ${urlJson ? JSON.stringify(urlJson) : "null"}`);
      return;
    }

    setPdfPath(path);

    // 2) subir PDF directo a storage
    setMsg("Subiendo PDF (PUT signedUrl)…");

    const putRes = await fetch(signedUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/pdf" },
      body: file,
    });

    setMsg(`PUT -> HTTP ${putRes.status}`);

    if (!putRes.ok) {
      setPhase("error");
      return;
    }

    // 3) encolar job
    setMsg("PDF subido. Encolando render…");

    const enqRes = await fetch("/api/admin/materials/enqueue-render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resourceId, pdfBucket: "raw_pdfs", pdfPath: path }),
    });

    const enqJson = await safeJson(enqRes);
    setMsg(`enqueue -> HTTP ${enqRes.status} ${enqJson ? JSON.stringify(enqJson) : ""}`);

    if (!enqRes.ok) {
      setPhase("error");
      return;
    }

    setPhase("queued");
    setMsg("En cola…");
    await refreshStatus();
  }

  const busy = phase === "uploading" || phase === "queued" || phase === "processing";

  console.log("UploadClient mounted for resource", resourceId);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>
          Sube un PDF para procesarlo. Se envía a <code style={{ backgroundColor: "var(--color-surface-soft)", padding: "0.2rem 0.4rem", borderRadius: "0.25rem" }}>raw_pdfs</code> y se encola automáticamente para renderizar páginas.
        </p>

        <div style={{ marginBottom: "1rem" }}>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              setPhase("idle");
              setMsg(f ? `PDF seleccionado: ${f.name}` : "");
            }}
            className="form-input"
            style={{ cursor: "pointer" }}
          />
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              uploadAndEnqueue().catch((err) => {
                setPhase("error");
                setMsg(String(err?.message ?? err));
              });
            }}
            disabled={!file || busy}
            className="btn btn-primary btn-sm"
          >
            {phase === "uploading" ? "Subiendo…" : "Subir y Encolar"}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              refreshStatus().catch((err) => {
                setPhase("error");
                setMsg(String(err?.message ?? err));
              });
            }}
            className="btn btn-secondary btn-sm"
          >
            Refrescar estado
          </button>
        </div>
      </div>

      {/* Status display */}
      {phase === "error" ? (
        <div className="alert alert-error">
          <strong>Error:</strong> {msg}
        </div>
      ) : phase === "ready" ? (
        <div className="alert alert-success">
          {msg}
        </div>
      ) : (phase === "queued" || phase === "processing") ? (
        <div className="alert alert-info">
          {msg}
        </div>
      ) : msg ? (
        <div style={{ padding: "0.75rem", fontSize: "0.9rem", color: "var(--color-text-muted)" }}>
          {msg}
        </div>
      ) : null}

      {pdfPath && (
        <div style={{ marginTop: "0.75rem", padding: "0.5rem", backgroundColor: "var(--color-surface-soft)", borderRadius: "var(--radius-md)", fontSize: "0.8rem", color: "var(--color-text-muted)", fontFamily: "monospace" }}>
          raw_pdfs/{pdfPath}
        </div>
      )}
    </div>
  );
}

