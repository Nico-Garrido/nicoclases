"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams, useRouter } from "next/navigation";

type RosterRow = {
  user_id: string;
  full_name: string | null;
  status: string;
  present?: boolean | null;
};

export default function TeacherClassDetail() {
  const router = useRouter();
  const params = useParams<{ slotId: string }>();
  const slotId = Number(params.slotId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("Clase");
  const [startAt, setStartAt] = useState<string | null>(null);

  const [roster, setRoster] = useState<RosterRow[]>([]);

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-CL", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/Santiago",
      }),
    []
  );

  async function loadData() {
    setLoading(true);
    setErr(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      router.replace("/login");
      return;
    }

    // Slot info
    const { data: slot, error: slotErr } = await supabase
      .from("class_slots")
      .select("id,start_at,zoom_meeting_url,offering_id")
      .eq("id", slotId)
      .single();

    if (slotErr) {
      setErr(slotErr.message);
      setLoading(false);
      return;
    }

    setZoomUrl(slot.zoom_meeting_url);
    setStartAt(slot.start_at);

    // Offering name
    const { data: offering, error: offErr } = await supabase
      .from("class_offerings")
      .select("name")
      .eq("id", slot.offering_id)
      .single();

    if (!offErr && offering?.name) setTitle(offering.name);

    // Roster: bookings del slot
    const { data: bookings, error: bookErr } = await supabase
      .from("bookings")
      .select("user_id,status")
      .eq("slot_id", slotId)
      .in("status", ["reserved", "confirmed", "no_show"]);

    if (bookErr) {
      setErr(bookErr.message);
      setLoading(false);
      return;
    }

    const userIds = (bookings ?? []).map((b: any) => b.user_id);
    if (userIds.length === 0) {
      setRoster([]);
      setLoading(false);
      return;
    }

    // Perfiles de esos alumnos (requiere policy de lectura por profesor)
    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("id,full_name")
      .in("id", userIds);

    if (profErr) {
      setErr("No pude leer perfiles de alumnos. Falta policy en profiles: " + profErr.message);
      setLoading(false);
      return;
    }

    const nameMap = new Map<string, string | null>();
    (profiles ?? []).forEach((p: any) => nameMap.set(p.id, p.full_name));

    // Attendance existente
    const { data: att, error: attErr } = await supabase
      .from("attendance")
      .select("student_id,present")
      .eq("slot_id", slotId);

    if (attErr) {
      // no bloquea
      console.warn(attErr);
    }

    const attMap = new Map<string, boolean>();
    (att ?? []).forEach((a: any) => attMap.set(a.student_id, a.present));

    const merged: RosterRow[] = (bookings ?? []).map((b: any) => ({
      user_id: b.user_id,
      full_name: nameMap.get(b.user_id) ?? null,
      status: b.status,
      present: attMap.has(b.user_id) ? attMap.get(b.user_id)! : null,
    }));

    merged.sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));

    setRoster(merged);
    setLoading(false);
  }

  useEffect(() => {
    if (!Number.isFinite(slotId)) {
      router.replace("/teacher");
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotId]);

  async function setPresent(studentId: string, present: boolean) {
    setSaving(true);
    setErr(null);

    const { error } = await supabase.rpc("mark_attendance", {
      p_slot_id: slotId,
      p_student_id: studentId,
      p_present: present,
    });

    setSaving(false);

    if (error) {
      setErr("No pude marcar asistencia (RPC mark_attendance): " + error.message);
      return;
    }

    setRoster((prev) =>
      prev.map((r) => (r.user_id === studentId ? { ...r, present } : r))
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "32px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>{title}</h1>
          {startAt && <div style={{ opacity: 0.85 }}>{formatter.format(new Date(startAt))}</div>}
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => router.push("/teacher")}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ccc", cursor: "pointer" }}
          >
            Volver
          </button>
          <a href="/logout">Cerrar sesión</a>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        {zoomUrl ? (
          <a
            href={zoomUrl}
            target="_blank"
            rel="noreferrer"
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #ccc", display: "inline-block" }}
          >
            Abrir Zoom
          </a>
        ) : (
          <div style={{ opacity: 0.75 }}>Este slot no tiene link de Zoom aún.</div>
        )}
      </div>

      {loading && <div style={{ marginTop: 16 }}>Cargando...</div>}
      {err && (
        <div style={{ marginTop: 16, background: "#fee", border: "1px solid #f99", padding: 10, borderRadius: 8 }}>
          {err}
        </div>
      )}

      {!loading && roster.length === 0 && (
        <div style={{ marginTop: 16, opacity: 0.8 }}>No hay estudiantes inscritos aún.</div>
      )}

      {!loading && roster.length > 0 && (
        <div style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 220px", padding: 12, fontWeight: 900, background: "#fafafa" }}>
            <div>Estudiante</div>
            <div>Estado</div>
            <div>Asistencia</div>
          </div>

          {roster.map((r) => (
            <div
              key={r.user_id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 160px 220px",
                padding: 12,
                borderTop: "1px solid #eee",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 800 }}>{r.full_name ?? r.user_id}</div>
                <div style={{ opacity: 0.7, fontSize: 12 }}>{r.user_id}</div>
              </div>

              <div style={{ textTransform: "capitalize" }}>{r.status}</div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  disabled={saving}
                  onClick={() => setPresent(r.user_id, true)}
                  style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ccc", cursor: "pointer" }}
                >
                  Presente
                </button>
                <button
                  disabled={saving}
                  onClick={() => setPresent(r.user_id, false)}
                  style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ccc", cursor: "pointer" }}
                >
                  Ausente
                </button>
                <span style={{ opacity: 0.8 }}>
                  {r.present === null || r.present === undefined ? "—" : r.present ? "✅" : "❌"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

