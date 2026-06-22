import { Suspense, type ReactNode } from "react";
import { DM_Sans, Montserrat } from "next/font/google";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-dash-montserrat",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dash-dm-sans",
});

function DashboardRouteFallback() {
  return (
    <div className="flex min-h-[30vh] items-center justify-center p-6 text-sm text-[#0F1923]/60">
      Loading…
    </div>
  );
}

export default function DashboardLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className={`${montserrat.variable} ${dmSans.variable}`}>
      <DashboardShell
        headingFontClass={montserrat.className}
        bodyFontClass={dmSans.className}
      >
        <Suspense fallback={<DashboardRouteFallback />}>{children}</Suspense>
      </DashboardShell>
    </div>
  );
}
