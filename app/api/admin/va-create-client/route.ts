import { NextResponse } from "next/server";
import { runBlueprintGenerationForBlueprint } from "@/lib/blueprint-run-generation";
import { parsePdfBufferAndSaveBlueprintForUser } from "@/lib/parse-bureau-save-for-user";
import { sendCpcWelcomeEmail } from "@/lib/send-cpc-welcome-email";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isValidVaPortalPassword } from "@/lib/va-portal";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;

function last4PhoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 4) return digits.slice(-4);
  return digits.padStart(4, "0");
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const portalPassword = String(form.get("portal_password") ?? "");
  if (!isValidVaPortalPassword(portalPassword)) {
    return NextResponse.json({ error: "Invalid VA portal password." }, { status: 401 });
  }

  const full_name = String(form.get("full_name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const phone = String(form.get("phone") ?? "").trim();
  const primary_goal = String(form.get("primary_goal") ?? "").trim();
  const assigned_va = String(form.get("assigned_va") ?? "").trim();
  const free_trial = String(form.get("free_trial") ?? "false") === "true";
  const pdf = form.get("pdf");

  if (!full_name || !email || !phone || !primary_goal || !assigned_va) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  if (!(pdf instanceof File) || pdf.size === 0) {
    return NextResponse.json({ error: "Equifax bureau PDF is required." }, { status: 400 });
  }

  const isPdf = pdf.type === "application/pdf" || pdf.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return NextResponse.json({ error: "PDF file only." }, { status: 400 });
  }
  if (pdf.size > MAX_BYTES) {
    return NextResponse.json({ error: "PDF exceeds 10MB." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Server is not configured for admin database access." }, { status: 503 });
  }

  const temporaryPassword = `CPC${last4PhoneDigits(phone)}`;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      full_name,
      phone,
      primary_goal,
      assigned_va,
      free_trial,
    },
  });

  if (createErr || !created.user) {
    return NextResponse.json(
      { error: createErr?.message ?? "Could not create auth user (email may already be registered)." },
      { status: 400 },
    );
  }

  const userId = created.user.id;

  const nowIso = new Date().toISOString();
  const clientRow: Record<string, unknown> = {
    id: userId,
    full_name,
    email,
    phone,
    goals: [primary_goal],
    primary_goal,
    assigned_va,
    free_trial,
    subscription_status: "trial",
    trial_start: nowIso,
  };

  const { error: clientErr } = await admin.from("clients").insert(clientRow);
  if (clientErr) {
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: clientErr.message }, { status: 400 });
  }

  console.info("[va-create-client]", {
    userId,
    subscription_status: clientRow.subscription_status,
  });

  const buf = Buffer.from(await pdf.arrayBuffer());
  const path = `${userId}/${Date.now()}.pdf`;
  const { error: upErr } = await admin.storage.from("bureaus").upload(path, buf, {
    contentType: "application/pdf",
  });

  if (upErr) {
    await admin.from("clients").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: `Storage upload failed: ${upErr.message}` }, { status: 400 });
  }

  const parseResult = await parsePdfBufferAndSaveBlueprintForUser(admin, userId, buf, { clientEmail: email });
  if (!parseResult.ok) {
    await admin.storage.from("bureaus").remove([path]);
    await admin.from("clients").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: parseResult.error }, { status: 502 });
  }

  const genResult = await runBlueprintGenerationForBlueprint(admin, userId, parseResult.blueprintId);
  if (!genResult.ok) {
    await admin.storage.from("bureaus").remove([path]);
    await admin.from("clients").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: genResult.error }, { status: 502 });
  }

  const emailResult = await sendCpcWelcomeEmail(email, full_name, temporaryPassword);

  return NextResponse.json({
    ok: true,
    client_name: full_name,
    temporary_password: temporaryPassword,
    blueprint_id: parseResult.blueprintId,
    welcome_email_sent: emailResult.sent,
    welcome_email_error:
      emailResult.sent ? null : emailResult.reason === "missing_api_key" ? "RESEND_API_KEY not set" : emailResult.detail,
  });
}
