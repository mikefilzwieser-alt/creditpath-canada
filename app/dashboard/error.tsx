"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard route error]", error);
  }, [error]);

  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center"
      style={{ color: "#0F1923" }}
    >
      <p className="text-lg font-semibold">Something went wrong loading this page.</p>
      <p className="max-w-md text-sm text-[#0F1923]/70">
        You can try again — your session and data are still safe.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-xl px-6 py-3 text-sm font-bold text-[#0F1923]"
        style={{ backgroundColor: "#00C9A7" }}
      >
        Try again
      </button>
    </div>
  );
}
