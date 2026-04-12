"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type SlotRow = {
  slot_id: number;
  start_at: string;
  end_at: string;
  zoom_meeting_url: string | null;
  offering_name: string;
};

export default function TeacherDashboard() {
  const router = useRouter();
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-CL", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Santiago",
      }),
    []
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        router.replace("/login");
        return;
      }

      // Verifica rol
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileErr) {
        setErr(profileErr.message);
        setLoading(false);
        return;
      }

      const role = profile?.role as string;
      if (role !== "teacher" && role !== "admin") {
        router.replace("/");
        return;
      }

      // Offerings del profesor
      const { data: offerings, error: offErr } = await supabase
        .from("class_offerings")
        .select("id,name")
        .eq("teacher_id", user.id);

      if (offErr) {
        setErr(offErr.message);
        setLoading(false);
        return;
      }

      const offeringMap = new Map<number, string>();
      (offerings ?? []).forEach((o: any) => offeringMap.set(o.id, o.name));

      const offeringIds = (offerings ?? []).map((o: any) => o.id);
      if (offeringIds.length === 0) {
        setSlots([]);
        setLoading(false);
        return;
      }

      // Slots próximos
      const nowIso = new Date().toISOString();
      const { data: slotRows, error: slotErr } = await supabase
        .from("class_slots")
        .select("id,start_at,end_at,zoom_meeting_url,offering_id")
        .in("offering_id", offeringIds)
        .gte("start_at", nowIso)
        .order("start_at", { ascending: true });

      if (slotErr) {
        setErr(slotErr.message);
        setLoading(false);
        return;
      }

      const normalized: SlotRow[] =
        (slotRows ?? []).map((s: any) => ({
          slot_id: s.id,
          start_at: s.start_at,
          end_at: s.end_at,
          zoom_meeting_url: s.zoom_meeting_url,
          offering_name: offeringMap.get(s.offering_id) ?? "Clase",
        })) ?? [];

      setSlots(normalized);
      setLoading(false);
    })();
  }, [router]);

  return (
    <div className="page-wrapper">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="navbar-logo">
            <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--color-primary)" }}>FAGUS ED</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span className="badge badge-primary">Profesor</span>
            <a href="/logout" className="btn btn-secondary btn-sm">Cerrar sesión</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="section-dark" style={{ paddingTop: "3rem", paddingBottom: "3rem" }}>
        <div className="container">
          <h1>Panel Profesor</h1>
          <p>Próximas clases (hora Chile)</p>
        </div>
      </section>

      {/* Main Content */}
      <div className="page-wrapper" style={{ paddingTop: "3rem", paddingBottom: "3rem" }}>
        <div className="container">
          {loading && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
              <div style={{
                width: "40px",
                height: "40px",
                border: "3px solid var(--color-border)",
                borderTop: "3px solid var(--color-primary)",
                borderRadius: "50%",
                animation: "spin 1s linear infinite"
              }}></div>
            </div>
          )}

          {err && (
            <div className="alert alert-error">
              {err}
            </div>
          )}

          {!loading && !err && slots.length === 0 && (
            <div style={{ textAlign: "center" }}>
              <div className="card" style={{ maxWidth: "400px", margin: "0 auto", padding: "2rem" }}>
                <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>📅</div>
                <h3 style={{ marginBottom: "0.5rem" }}>No hay clases próximas asignadas</h3>
                <p style={{ color: "var(--color-text-muted)", margin: 0 }}>Las clases aparecerán aquí cuando se asignen slots.</p>
              </div>
            </div>
          )}

          {!loading && !err && slots.length > 0 && (
            <div style={{ display: "grid", gap: "1.5rem" }}>
              {slots.map((s) => (
                <div key={s.slot_id} className="card">
                  <h3 style={{ color: "var(--color-primary)", marginBottom: "0.5rem" }}>{s.offering_name}</h3>
                  <div style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
                    🕐 {formatter.format(new Date(s.start_at))}
                  </div>

                  <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    <button
                      onClick={() => router.push(`/teacher/class/${s.slot_id}`)}
                      className="btn btn-primary btn-sm"
                    >
                      Ver lista / asistencia
                    </button>

                    {s.zoom_meeting_url ? (
                      <a
                        href={s.zoom_meeting_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-teal btn-sm"
                      >
                        Abrir Zoom
                      </a>
                    ) : (
                      <span style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", alignSelf: "center" }}>
                        Sin link Zoom
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Section */}
      <section className="section-dark" style={{ paddingTop: "2rem", paddingBottom: "2rem", marginTop: "3rem" }}>
        <div className="container" style={{ textAlign: "center", fontSize: "0.9rem" }}>
          <p style={{ margin: 0, opacity: 0.8 }}>© 2024 FAGUS ED. Todos los derechos reservados.</p>
        </div>
      </section>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

