import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isValidVaPortalPassword } from "@/lib/va-portal";

export const runtime = "nodejs";

async function deleteClientAndChildren(admin: SupabaseClient, clientId: string): Promise<{ error: string | null }> {
  const { error: e1 } = await admin.from("action_completions").delete().eq("client_id", clientId);
  if (e1) return { error: e1.message };

  const { error: e2 } = await admin.from("monthly_plans").delete().eq("client_id", clientId);
  if (e2) return { error: e2.message };

  const { error: e3 } = await admin.from("monthly_uploads").delete().eq("client_id", clientId);
  if (e3) return { error: e3.message };

  const { error: e4 } = await admin.from("blueprints").delete().eq("client_id", clientId);
  if (e4) return { error: e4.message };

  const { error: e5 } = await admin.from("goals").delete().eq("client_id", clientId);
  if (e5) return { error: e5.message };

  const { error: e6 } = await admin.from("clients").delete().eq("id", clientId);
  if (e6) return { error: e6.message };

  return { error: null };
}

type Body = {
  portal_password?: string;
  client_id?: string;
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
  if (!clientId) {
    return NextResponse.json({ error: "Missing client_id." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Server is not configured for admin database access." }, { status: 503 });
  }

  const { error: cascadeErr } = await deleteClientAndChildren(admin, clientId);
  if (cascadeErr) {
    return NextResponse.json({ error: cascadeErr }, { status: 400 });
  }

  const { error: delUserErr } = await admin.auth.admin.deleteUser(clientId);
  if (delUserErr) {
    console.warn("[va-delete-client] auth deleteUser:", delUserErr.message);
    return NextResponse.json(
      {
        ok: true,
        warning: "Client row was removed, but deleting the auth user failed (they may have been removed already).",
      },
      { status: 200 },
    );
  }

  return NextResponse.json({ ok: true });
}
