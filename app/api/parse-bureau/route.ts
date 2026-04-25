import { NextResponse } from "next/server";
import { parsePdfBufferAndSaveBlueprintForUser } from "@/lib/parse-bureau-save-for-user";
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

  const result = await parsePdfBufferAndSaveBlueprintForUser(admin, user.id, pdfBuffer, {
    clientEmail: user.email ?? null,
  });

  if (!result.ok) {
    const status = result.error.includes("exceeds") ? 400 : 502;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, blueprintId: result.blueprintId });
}
