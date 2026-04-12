"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LogoutPage() {
  const router = useRouter();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await supabase.auth.signOut();
        router.replace("/login");
      } catch (error: any) {
        setErr(error?.message || "Error al cerrar sesión");
      }
    })();
  }, [router]);

  return (
    <div className="page-wrapper" style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh"
    }}>
      <div className="card" style={{
        maxWidth: "400px",
        width: "100%",
        padding: "3rem 2rem",
        textAlign: "center"
      }}>
        <div style={{
          fontSize: "2rem",
          fontWeight: 700,
          color: "var(--color-primary)",
          marginBottom: "2rem"
        }}>
          FAGUS ED
        </div>

        {err ? (
          <>
            <div className="alert alert-error" style={{ marginBottom: "1.5rem" }}>
              {err}
            </div>
            <p style={{ color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
              Hubo un problema al cerrar sesión. Intenta de nuevo.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary"
              style={{ width: "100%" }}
            >
              Reintentar
            </button>
          </>
        ) : (
          <>
            <div style={{
              width: "40px",
              height: "40px",
              border: "3px solid var(--color-border)",
              borderTop: "3px solid var(--color-primary)",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 1.5rem"
            }}></div>
            <p style={{ color: "var(--color-text-muted)", margin: 0 }}>
              Cerrando sesión...
            </p>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

