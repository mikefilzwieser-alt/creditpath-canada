import { Suspense, type ReactNode } from "react";
import { Montserrat } from "next/font/google";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-actions-v2-montserrat",
});

function ActionsV2Fallback() {
  return (
    <div className="flex min-h-[30vh] items-center justify-center p-6 text-sm text-[#0F1923]/60">
      Loading…
    </div>
  );
}

export default function ActionsV2Layout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className={`${montserrat.variable} ${montserrat.className}`}>
      <DashboardShell headingFontClass={montserrat.className} bodyFontClass={montserrat.className}>
        <Suspense fallback={<ActionsV2Fallback />}>{children}</Suspense>
      </DashboardShell>
    </div>
  );
}
