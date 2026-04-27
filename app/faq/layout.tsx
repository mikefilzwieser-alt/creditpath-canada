import { Montserrat } from "next/font/google";
import { SiteHeader } from "@/components/landing/SiteHeader";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-landing-montserrat",
});

export default function FaqLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className={`flex min-h-full flex-col bg-[var(--cp-bg-light)] text-[var(--cp-dark)] ${montserrat.variable}`}
    >
      <SiteHeader faqActive />
      {children}
      <footer className="mt-auto border-t border-[var(--cp-border)] bg-white py-8 text-center text-xs text-[var(--cp-muted)] sm:text-sm">
        <p className="font-medium text-[var(--cp-dark)]/80">
          Your Credit. Your Path. Your Future. · creditpathcanada.ca · © 2026 Credit Path Canada
        </p>
        <p className="mt-3">
          <a href="mailto:info@creditpathcanada.ca" className="font-semibold text-[var(--cp-teal)]">
            info@creditpathcanada.ca
          </a>
        </p>
      </footer>
    </div>
  );
}
