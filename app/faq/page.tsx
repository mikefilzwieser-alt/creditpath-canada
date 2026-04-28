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
  {
    q: "How is this different from a credit repair company?",
    a: "We're a credit education platform — not a repair service. We don't make promises about removing accurate information from your file. We give you a personalized month-by-month plan built from your actual bureau so you can rebuild the right way, at the right pace.",
  },
  {
    q: "Do I need good credit to join?",
    a: "No. Credit Path Canada is built specifically for people with damaged or limited credit. The worse your starting point, the more the program can help you.",
  },
  {
    q: "What if I have a Consumer Proposal?",
    a: "We work with Consumer Proposal clients. Month 1 of the program is designed specifically for protective actions — no new credit applications, pre-authorized payments, and stabilizing your file. We know exactly what works and what doesn't during a proposal.",
  },
  {
    q: "How does the blueprint get built?",
    a: "You upload your Equifax credit report. Our system analyzes every tradeline, collection, and inquiry on your file and builds a personalized month-by-month action plan ranked by score impact. Nothing generic — everything based on your real file.",
  },
  {
    q: "What does the $4.44/week actually pay for?",
    a: "Your personalized 24-month Credit Blueprint, monthly action plan updates, recommended credit products with referral bonuses, access to a free financial planning session with Brandon Kirk, and a direct line to Michael Filzwieser — Finance Director at Titanium Ford — when your approval window opens.",
  },
  {
    q: "Will this program work for me?",
    a: "If you follow the monthly actions, keep your accounts in good standing, and stay consistent — your score will move. Our program is built around your actual bureau data, not generic tips. The clients who see the best results are the ones who show up every month.",
  },
] as const;

export default function FaqPage() {
  const h = montserrat.className;

  return (
    <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
      <h1 className={`text-center text-3xl font-bold text-[var(--cp-dark)] sm:text-4xl ${h}`}>FAQ</h1>
      <div className="mt-10 space-y-4">
        {ITEMS.map((item) => (
          <details
            key={item.q}
            className="group rounded-2xl border border-[var(--cp-border)] bg-[var(--cp-bg-light)] p-5 shadow-sm"
          >
            <summary className={`cursor-pointer list-none pr-6 text-lg font-bold text-[var(--cp-dark)] ${h}`}>
              {item.q}
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-[var(--cp-dark)]/80">{item.a}</p>
          </details>
        ))}
      </div>
      <section className="mt-12 rounded-2xl border border-[var(--cp-border)] bg-white p-6 text-center shadow-sm">
        <h2 className={`text-2xl font-bold text-[var(--cp-dark)] ${h}`}>Still have questions?</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-[var(--cp-dark)]/80">
          Reach out to Michael directly — he&apos;s happy to walk you through your situation personally.
        </p>
        <a
          href="mailto:michaelf@titaniumford.ca"
          className={`mt-5 inline-flex items-center justify-center rounded-xl bg-[var(--cp-teal)] px-5 py-3 text-sm font-bold text-[var(--cp-dark)] ${h}`}
        >
          Contact Michael →
        </a>
        <p className="mt-4 text-sm font-semibold text-[var(--cp-dark)]/75">(604) 442-0894</p>
      </section>
      <div className="mt-10 text-center text-xs text-[var(--cp-muted)]">34 W 7th Ave #401, Vancouver, BC V5Y 1L6</div>
    </main>
  );
}
