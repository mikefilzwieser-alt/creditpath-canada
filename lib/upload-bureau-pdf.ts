import { supabase } from "@/lib/supabase";

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Same pipeline as Dashboard → Upload: store PDF in `bureaus` bucket, then POST to `/api/parse-bureau`.
 * Call only when you have an authenticated user session (`accessToken` + `userId`).
 */
export async function uploadBureauPdfAndParse(
  file: File,
  userId: string,
  accessToken: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return { ok: false, error: "Please choose a PDF file only." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Maximum file size is 10MB." };
  }

  const path = `${userId}/${Date.now()}.pdf`;
  const { error: upErr } = await supabase.storage.from("bureaus").upload(path, file, {
    contentType: "application/pdf",
  });

  if (upErr) {
    return { ok: false, error: upErr.message };
  }

  const { data: signed, error: signErr } = await supabase.storage.from("bureaus").createSignedUrl(path, 3600);

  if (signErr || !signed?.signedUrl) {
    return { ok: false, error: signErr?.message ?? "Could not create file URL." };
  }

  const parseRes = await fetch("/api/parse-bureau", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ fileUrl: signed.signedUrl }),
  });

  const parseJson = (await parseRes.json().catch(() => ({}))) as { error?: string };
  if (!parseRes.ok) {
    return { ok: false, error: parseJson.error ?? "Parse request failed." };
  }

  return { ok: true };
}
