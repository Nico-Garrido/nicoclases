import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sb = await supabaseServer();

  const {
    data: { user },
    error: userErr,
  } = await sb.auth.getUser();

  if (userErr || !user) redirect("/login");

  const { data: prof, error: profErr } = await sb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profErr || !prof || prof.role !== "admin") {
    return (
      <div className="page-wrapper">
        <div className="card" style={{ maxWidth: 600, margin: "60px auto", textAlign: "center" }}>
          <h1 style={{ color: "var(--color-error)", marginBottom: "1rem" }}>Acceso denegado</h1>
          <p style={{ marginBottom: "1.5rem" }}>No tienes permiso para acceder al panel de administración.</p>
          <a href="/" className="btn btn-primary">Volver al inicio</a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

