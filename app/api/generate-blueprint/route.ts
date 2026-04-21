import { NextResponse } from "next/server";
import { generateBlueprintPlanFromParsedData } from "@/lib/generate-blueprint-claude";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

/** Appended to the Claude system prompt (base text lives in `@/lib/generate-blueprint-claude`). */
const INSTALLMENT_AND_UTILIZATION_RULE = `IMPORTANT: Installment loans (car loans, personal loans, mortgages) do NOT have credit utilization. Never recommend paying down an installment loan to reduce utilization percentage. For installment loans the advice should focus on: making on-time payments, keeping the account open, and noting it contributes positively to credit mix. Only apply utilization advice to revolving credit accounts like credit cards and lines of credit.`;

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

  const { data: row, error: fetchError } = await admin
    .from("blueprints")
    .select("id, client_id, raw_parse_data")
    .eq("id", blueprintId)
    .maybeSingle();

  if (fetchError || !row || row.client_id !== user.id) {
    return NextResponse.json({ error: "Blueprint not found." }, { status: 404 });
  }

  const raw = row.raw_parse_data;
  if (raw == null || (typeof raw === "object" && raw !== null && Object.keys(raw as object).length === 0)) {
    return NextResponse.json({ error: "Blueprint has no raw_parse_data to generate from." }, { status: 400 });
  }

  let plan: unknown;
  try {
    plan = await generateBlueprintPlanFromParsedData(raw, INSTALLMENT_AND_UTILIZATION_RULE);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Claude generation failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const now = new Date().toISOString();
  const { error: updateError } = await admin
    .from("blueprints")
    .update({
      blueprint_data: plan,
      status: "ready",
      updated_at: now,
    })
    .eq("id", blueprintId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, blueprint_id: blueprintId });
}
