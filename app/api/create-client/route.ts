import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type CreateClientBody = {
  full_name: string;
  email: string;
  phone: string;
  goals: string[];
  primary_goal: string;
};

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null;

  if (!accessToken) {
    return NextResponse.json({ error: "Missing or invalid Authorization header." }, { status: 401 });
  }

  let body: CreateClientBody;
  try {
    body = (await request.json()) as CreateClientBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { full_name, email, phone, goals, primary_goal } = body;
  if (
    typeof full_name !== "string" ||
    typeof email !== "string" ||
    typeof phone !== "string" ||
    !Array.isArray(goals) ||
    typeof primary_goal !== "string"
  ) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
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

    if (user.email && email.trim().toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json({ error: "Email does not match authenticated user." }, { status: 403 });
    }

    const nowIso = new Date().toISOString();
    const { error: insertError } = await admin.from("clients").insert({
      id: user.id,
      full_name: full_name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      goals,
      primary_goal: primary_goal.trim(),
      subscription_status: "trial",
      trial_start: nowIso,
      created_at: nowIso,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    console.info("[create-client]", { userId: user.id, subscription_status: "trial" });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
