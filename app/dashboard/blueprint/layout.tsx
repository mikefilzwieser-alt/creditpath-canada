import { Suspense, type ReactNode } from "react";

export const dynamic = "force-dynamic";

function BlueprintFallback() {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-sm"
      style={{ color: "#0F1923" }}
    >
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
        style={{ borderColor: "#00C9A7 transparent #00C9A7 #00C9A7" }}
        aria-hidden
      />
      <span className="opacity-70">Loading…</span>
    </div>
  );
}

export default function BlueprintLayout({ children }: { children: ReactNode }) {
  return <Suspense fallback={<BlueprintFallback />}>{children}</Suspense>;
}
