import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { syncMonthlyProgressForUser } from "@/lib/sync-monthly-progress";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : null;

  if (!accessToken || !authHeader) {
    return NextResponse.json({ error: "Missing or invalid Authorization header." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Server is not configured for admin database access." },
      { status: 503 },
    );
  }

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(accessToken);

  if (userError || !user) {
    return NextResponse.json(
      { error: userError?.message ?? "Invalid or expired session." },
      { status: 401 },
    );
  }

  try {
    const result = await syncMonthlyProgressForUser(admin, user.id);
    return NextResponse.json({
      ok: true,
      updated: result.updated,
      advancedToMonth: result.advancedToMonth,
      theme: result.theme,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Sync failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
