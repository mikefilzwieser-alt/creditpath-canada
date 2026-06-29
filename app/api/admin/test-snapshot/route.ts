import { NextResponse } from "next/server";
import { writeMonthlySnapshot } from "@/lib/monthly-snapshots";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isValidVaPortalPassword } from "@/lib/va-portal";

export const runtime = "nodejs";

type Body = {
  portal_password?: string;
  client_id?: string;
  blueprint_id?: string;
  program_month?: number;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!isValidVaPortalPassword(body.portal_password)) {
    return NextResponse.json({ error: "Invalid VA portal password." }, { status: 401 });
  }

  const clientId = typeof body.client_id === "string" ? body.client_id.trim() : "";
  const blueprintId = typeof body.blueprint_id === "string" ? body.blueprint_id.trim() : "";
  const programMonth = Number(body.program_month);

  if (!clientId || !Number.isFinite(programMonth)) {
    return NextResponse.json(
      { error: "client_id and program_month are required." },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Server is not configured for admin database access." }, { status: 503 });
  }

  try {
    const row = await writeMonthlySnapshot(admin, clientId, programMonth);
    if (blueprintId && row.blueprint_id !== blueprintId) {
      return NextResponse.json(
        {
          error: "Snapshot wrote for latest blueprint, but it did not match supplied blueprint_id.",
          supplied_blueprint_id: blueprintId,
          row,
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true, row });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Snapshot write failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
