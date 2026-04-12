import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const sb = await supabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();

  return NextResponse.json({
    user: user
      ? {
          id: user.id,
          email: user.email,
        }
      : null,
  });
}

