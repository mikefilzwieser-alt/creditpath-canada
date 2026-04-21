import { NextResponse } from "next/server";
import { parseBureauPdfWithClaude } from "@/lib/parse-bureau-claude";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

type ParseBureauBody = {
  fileUrl?: string;
};

function assertTrustedBureauFileUrl(fileUrl: string, userId: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
  }
  let u: URL;
  try {
    u = new URL(fileUrl);
  } catch {
    throw new Error("Invalid file URL.");
  }
  const base = new URL(baseUrl);
  if (u.hostname !== base.hostname) {
    throw new Error("File URL host does not match this project.");
  }
  const needle = `/bureaus/${userId}/`;
  if (!u.pathname.includes(needle)) {
    throw new Error("File URL does not belong to this user.");
  }
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const accessToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : null;

  if (!accessToken || !authHeader) {
    return NextResponse.json({ error: "Missing or invalid Authorization header." }, { status: 401 });
  }

  let body: ParseBureauBody;
  try {
    body = (await request.json()) as ParseBureauBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const fileUrl = typeof body.fileUrl === "string" ? body.fileUrl.trim() : "";
  if (!fileUrl || !fileUrl.startsWith("https://")) {
    return NextResponse.json({ error: "fileUrl is required (HTTPS Supabase signed URL)." }, { status: 400 });
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
    assertTrustedBureauFileUrl(fileUrl, user.id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid file URL.";
    return NextResponse.json({ error: msg }, { status: 403 });
  }

  let pdfBuffer: Buffer;
  try {
    const pdfRes = await fetch(fileUrl);
    if (!pdfRes.ok) {
      return NextResponse.json(
        { error: `Could not download PDF (${pdfRes.status}).` },
        { status: 400 },
      );
    }
    const arrayBuf = await pdfRes.arrayBuffer();
    pdfBuffer = Buffer.from(arrayBuf);
  } catch {
    return NextResponse.json({ error: "Failed to download PDF from storage." }, { status: 502 });
  }

  if (pdfBuffer.length > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "PDF exceeds 10MB." }, { status: 400 });
  }

  const pdfBase64 = pdfBuffer.toString("base64");

  let parsed: unknown;
  try {
    parsed = await parseBureauPdfWithClaude(pdfBase64);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Claude parse failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const row = {
    client_id: user.id,
    month_number: 1,
    status: "processing",
    raw_parse_data: parsed,
    updated_at: new Date().toISOString(),
  };

  const { data: inserted, error: insertError } = await admin
    .from("blueprints")
    .insert(row)
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  const blueprintId = inserted?.id as string | undefined;
  if (blueprintId) {
    const now = new Date().toISOString();
    const { error: readyError } = await admin
      .from("blueprints")
      .update({ status: "ready", updated_at: now })
      .eq("id", blueprintId);

    if (readyError) {
      return NextResponse.json({ error: readyError.message }, { status: 400 });
    }

    const origin = new URL(request.url).origin;
    try {
      await fetch(`${origin}/api/generate-blueprint`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({ blueprint_id: blueprintId }),
      });
    } catch {
      /* blueprint_data may be filled on next manual run */
    }
  }

  return NextResponse.json({ ok: true, blueprintId: inserted?.id ?? null });
}
