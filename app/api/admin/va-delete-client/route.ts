import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isValidVaPortalPassword } from "@/lib/va-portal";

export const runtime = "nodejs";

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

  const { error: delClientErr } = await admin.from("clients").delete().eq("id", clientId);
  if (delClientErr) {
    return NextResponse.json({ error: delClientErr.message }, { status: 400 });
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
