"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { useDashboardAuth } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/lib/supabase";

const TEAL = "#00C9A7";
const NAVY = "#0F1923";
const MAX_BYTES = 10 * 1024 * 1024;

export default function DashboardUploadPage() {
  const router = useRouter();
  const { user, loading: authLoading, headingFontClass: h } = useDashboardAuth();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = useCallback((f: File | null) => {
    setError("");
    if (!f) {
      setFile(null);
      return;
    }
    const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setFile(null);
      setError("Please choose a PDF file only.");
      return;
    }
    if (f.size > MAX_BYTES) {
      setFile(null);
      setError("Maximum file size is 10MB.");
      return;
    }
    setFile(f);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) validateAndSetFile(f);
    },
    [validateAndSetFile],
  );

  const onFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      validateAndSetFile(f ?? null);
    },
    [validateAndSetFile],
  );

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4" style={{ color: NAVY }}>
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: `${TEAL} transparent ${TEAL} ${TEAL}` }}
          aria-label="Loading session"
        />
        <p className={`text-sm opacity-70 ${h}`}>Checking your session…</p>
      </div>
    );
  }

  const handleUploadAndParse = async () => {
    if (!file || !user) return;
    setError("");
    setProcessing(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setError("Your session expired. Please sign in again.");
        setProcessing(false);
        return;
      }

      const path = `${user.id}/${Date.now()}.pdf`;
      const { error: upErr } = await supabase.storage.from("bureaus").upload(path, file, {
        contentType: "application/pdf",
      });

      if (upErr) {
        setError(upErr.message);
        setProcessing(false);
        return;
      }

      const { data: signed, error: signErr } = await supabase.storage
        .from("bureaus")
        .createSignedUrl(path, 3600);

      if (signErr || !signed?.signedUrl) {
        setError(signErr?.message ?? "Could not create file URL.");
        setProcessing(false);
        return;
      }

      const parseRes = await fetch("/api/parse-bureau", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ fileUrl: signed.signedUrl }),
      });

      const parseJson = (await parseRes.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (!parseRes.ok) {
        setError(parseJson.error ?? "Parse request failed.");
        setProcessing(false);
        return;
      }

      router.push("/dashboard/blueprint");
    } catch {
      setError("Something went wrong. Please try again.");
      setProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8" style={{ color: NAVY }}>
      <div>
        <h1 className={`text-2xl font-bold tracking-tight sm:text-3xl ${h}`}>Upload bureau report</h1>
        <p className="mt-2 text-sm leading-relaxed opacity-75">
          Drag and drop your Borrowell / Equifax PDF, or browse to select. We&apos;ll parse it and prepare your
          blueprint.
        </p>
      </div>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          const next = e.relatedTarget;
          if (!next || !e.currentTarget.contains(next as Node)) {
            setDragOver(false);
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => !processing && inputRef.current?.click()}
        className="cursor-pointer rounded-2xl border-2 border-dashed bg-white px-6 py-14 text-center shadow-sm transition-colors"
        style={{
          borderColor: dragOver ? TEAL : "rgba(15, 25, 35, 0.15)",
          backgroundColor: dragOver ? "rgba(0, 201, 167, 0.06)" : "#fff",
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          disabled={processing}
          onChange={onFileInput}
        />
        <p className={`text-lg font-semibold ${h}`}>Drop PDF here</p>
        <p className="mt-2 text-sm opacity-70">PDF only · max 10MB</p>
        {file && (
          <p className={`mt-4 break-all text-sm font-medium ${h}`} style={{ color: TEAL }}>
            {file.name}
          </p>
        )}
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={!file || processing}
          onClick={(e) => {
            e.stopPropagation();
            void handleUploadAndParse();
          }}
          className="inline-flex min-h-[44px] min-w-[160px] items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-[#0F1923] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          style={{ backgroundColor: TEAL }}
        >
          {processing ? (
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#0F1923]/30 border-t-[#0F1923]"
                aria-hidden
              />
              Processing…
            </span>
          ) : (
            "Upload & parse"
          )}
        </button>
      </div>

      {processing ? (
        <p className="text-sm opacity-70">
          Uploading to secure storage, then analyzing your report. This can take a minute.
        </p>
      ) : null}
    </div>
  );
}
