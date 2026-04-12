"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type CreditRow = {
  id: number;
  cohort_id: number;
  subject_id: number;
  credits_included: number;
  credits_used: number;
};

type SlotRow = {
  id: number;
  start_at: string;
  end_at: string;
  offering_id: number;
  subject_id: number;
  cohort_id: number;
};

export default function PaesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [credits, setCredits] = useState<CreditRow[]>([]);
  const [slots, setSlots] = useState<SlotRow[]>([]);

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
      setMsg(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) {
        router.replace("/login");
        return;
      }

      // créditos del alumno
      const { data: c, error: cErr } = await supabase
        .from("paes_class_credits")
        .select("id,cohort_id,subject_id,credits_included,credits_used");

      if (cErr) {
        setErr("No pude leer créditos PAES: " + cErr.message);
        setLoading(false);
        return;
      }
      setCredits((c ?? []) as any);

      // slots futuros (PAES): usamos offerings que tengan subject_id NOT null
      const nowIso = new Date().toISOString();
      const { data: s, error: sErr } = await supabase
        .from("class_slots")
        .select("id,start_at,end_at,offering_id")
        .gte("start_at", nowIso)
        .order("start_at", { ascending: true });

      if (sErr) {
        setErr("No pude leer slots: " + sErr.message);
        setLoading(false);
        return;
      }

      // Necesitamos subject_id + cohort_id de offering:
      // (lo hacemos con otra query a class_offerings para esos offering_id)
      const offeringIds = Array.from(new Set((s ?? []).map((x: any) => x.offering_id)));
      if (offeringIds.length === 0) {
        setSlots([]);
        setLoading(false);
        return;
      }

      const { data: offs, error: offErr } = await supabase
        .from("class_offerings")
        .select("id,subject_id,cohort_id")
        .in("id", offeringIds);

      if (offErr) {
        setErr("No pude leer offerings: " + offErr.message);
        setLoading(false);
        return;
      }

      const meta = new Map<number, { subject_id: number | null; cohort_id: number }>();
      (offs ?? []).forEach((o: any) => meta.set(o.id, { subject_id: o.subject_id, cohort_id: o.cohort_id }));

      const paesSlots: SlotRow[] = (s ?? [])
        .map((row: any) => {
          const m = meta.get(row.offering_id);
          return {
            id: row.id,
            start_at: row.start_at,
            end_at: row.end_at,
            offering_id: row.offering_id,
            subject_id: (m?.subject_id ?? 0) as any,
            cohort_id: (m?.cohort_id ?? 0) as any,
          };
        })
        .filter((x) => x.subject_id); // solo PAES (subject_id != null)

      setSlots(paesSlots);
      setLoading(false);
    })();
  }, [router]);

  async function book(slotId: number) {
    setMsg(null);
    setErr(null);

    const { data, error } = await supabase.rpc("book_paes_slot", {
      p_slot_id: slotId,
    });

    if (error) {
      setErr(error.message);
      return;
    }

    setMsg("Reserva confirmada. booking_id: " + data);
    // refresca créditos
    const { data: c } = await supabase
      .from("paes_class_credits")
      .select("id,cohort_id,subject_id,credits_included,credits_used");
    setCredits((c ?? []) as any);
  }

  return (
    <div className="page-wrapper">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-inner">
          <div className="navbar-logo">
            <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--color-primary)" }}>FAGUS ED</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <a href="/" className="btn btn-secondary btn-sm">Panel</a>
            <a href="/logout" className="btn btn-secondary btn-sm">Cerrar sesión</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="section-dark" style={{ paddingTop: "3rem", paddingBottom: "3rem" }}>
        <div className="container">
          <h1>PAES – Reservar Clases</h1>
          <p>Sistema de reserva de clases PAES con gestión de créditos</p>
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

          {msg && (
            <div className="alert alert-success">
              {msg}
            </div>
          )}

          {!loading && (
            <>
              {/* Two-column grid: Credits + Slots */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "2rem",
              }} className="mobile-stack">

                {/* Mis Créditos Section */}
                <div>
                  <h2 style={{ color: "var(--color-primary)", marginBottom: "1.5rem" }}>Mis Créditos</h2>

                  {credits.length === 0 ? (
                    <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
                      <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🎓</div>
                      <p style={{ color: "var(--color-text-muted)", margin: 0 }}>Aún no tienes créditos asignados.</p>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: "1rem" }}>
                      {credits.map((c) => (
                        <div key={c.id} className="card">
                          <div style={{ marginBottom: "1rem" }}>
                            <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Cohort: <strong>{c.cohort_id}</strong></div>
                            <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>Sujeto: <strong>{c.subject_id}</strong></div>
                          </div>
                          <div style={{ marginBottom: "0.75rem" }}>
                            <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>
                              {c.credits_used} / {c.credits_included} créditos usados
                            </div>
                            <div style={{
                              width: "100%",
                              height: "8px",
                              backgroundColor: "var(--color-border)",
                              borderRadius: "4px",
                              overflow: "hidden"
                            }}>
                              <div style={{
                                height: "100%",
                                width: `${(c.credits_used / c.credits_included) * 100}%`,
                                backgroundColor: "var(--color-teal)",
                                transition: "width 0.3s ease"
                              }}></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Slots Disponibles Section */}
                <div>
                  <h2 style={{ color: "var(--color-primary)", marginBottom: "1.5rem" }}>Slots Disponibles</h2>

                  {slots.length === 0 ? (
                    <div className="card" style={{ textAlign: "center", padding: "2rem" }}>
                      <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>📅</div>
                      <p style={{ color: "var(--color-text-muted)", margin: 0 }}>No hay slots PAES futuros disponibles.</p>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: "1rem" }}>
                      {slots.map((s) => (
                        <div key={s.id} className="card">
                          <h3 style={{ color: "var(--color-primary)", marginBottom: "0.5rem" }}>
                            {formatter.format(new Date(s.start_at))}
                          </h3>
                          <div style={{
                            fontSize: "0.85rem",
                            color: "var(--color-text-muted)",
                            marginBottom: "1rem"
                          }}>
                            Cohort {s.cohort_id} • Subject {s.subject_id}
                          </div>
                          <button
                            onClick={() => book(s.id)}
                            className="btn btn-primary btn-sm"
                            style={{ width: "100%" }}
                          >
                            Reservar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .mobile-stack {
            grid-template-columns: 1fr !important;
          }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

