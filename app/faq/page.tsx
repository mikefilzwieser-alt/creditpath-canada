import type { Metadata } from "next";
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({ subsets: ["latin"], weight: ["600", "700", "800"] });

export const metadata: Metadata = {
  title: "FAQ | Credit Path Canada",
  description:
    "Answers about credit pulls, data safety, Borrowell reports, results timelines, and cancellation for Credit Path Canada.",
};

const ITEMS = [
  {
    q: "Will this hurt my credit score?",
    a: "Never. We never pull your credit. You upload your own report — zero hard inquiries from us.",
  },
  {
    q: "Is my data safe?",
    a: "Credit Path Canada is a Canadian financial education platform built specifically for Canadians rebuilding their credit. Your bureau data is encrypted, never sold, and never shared. We do not pull your credit — ever.",
  },
  {
    q: "What if I can't get my Borrowell report?",
    a: "Contact us and we will help you get it another way. We have solutions for every situation.",
  },
  {
    q: "How fast will I see results?",
    a: "Most clients see meaningful movement within the first 3 months of following the program consistently. The full 24-month program is designed to take you from where you are today to prime credit territory.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. No contracts, no penalties. Cancel before day 30 and you will never be charged.",
  },
] as const;

export default function FaqPage() {
  const h = montserrat.className;

  return (
    <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
      <h1 className={`text-center text-3xl font-bold text-[var(--cp-dark)] sm:text-4xl ${h}`}>FAQ</h1>
      <div className="mt-10 space-y-4">
        {ITEMS.map((item) => (
          <div
            key={item.q}
            className="rounded-2xl border border-[var(--cp-border)] bg-[var(--cp-bg-light)] p-5 shadow-sm"
          >
            <h2 className={`text-lg font-bold text-[var(--cp-dark)] ${h}`}>{item.q}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--cp-dark)]/80">{item.a}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
