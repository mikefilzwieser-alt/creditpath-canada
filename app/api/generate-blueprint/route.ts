import { NextResponse } from "next/server";
import { runBlueprintGenerationForBlueprint } from "@/lib/blueprint-run-generation";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type Body = {
  blueprint_id?: string;
  blueprintId?: string;
};

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null;

  if (!accessToken) {
    return NextResponse.json({ error: "Missing or invalid Authorization header." }, { status: 401 });
  }

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const blueprintId =
    typeof body.blueprint_id === "string" && body.blueprint_id.trim()
      ? body.blueprint_id.trim()
      : typeof body.blueprintId === "string" && body.blueprintId.trim()
        ? body.blueprintId.trim()
        : null;

  if (!blueprintId) {
    return NextResponse.json({ error: "blueprint_id is required." }, { status: 400 });
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

  const result = await runBlueprintGenerationForBlueprint(admin, user.id, blueprintId);
  if (!result.ok) {
    const status = result.error === "Blueprint not found." ? 404 : result.error.includes("raw_parse") ? 400 : 502;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, blueprint_id: blueprintId, skipped: result.skipped });
}
