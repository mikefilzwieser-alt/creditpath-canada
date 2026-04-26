import Link from "next/link";
import { Montserrat } from "next/font/google";
import { TestimonialCarousel } from "@/components/landing/TestimonialCarousel";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Credit Path Canada — Rebuild Your Credit in 24 Months",
  description:
    "Canada's personalized credit rebuilding platform. Upload your bureau, get a custom 24-month Blueprint, and follow monthly actions to rebuild your score. First 30 days free.",
};

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-landing-montserrat",
});

const steps = [
  {
    n: 1,
    title: "Upload credit report",
    text: "Securely connect your bureau snapshot so every recommendation maps to your real profile.",
  },
  {
    n: 2,
    title: "Set your credit goals",
    text: "Tell us what you are rebuilding toward so your Blueprint stays goal-driven month after month.",
  },
  {
    n: 3,
    title: "Personalized blueprint",
    text: "Receive a structured 24-month plan with clear priorities based on your bureau—not generic tips.",
  },
  {
    n: 4,
    title: "Hit your goals",
    text: "Stay consistent with your monthly plan, track wins, and move the score up —on your timeline!",
  },
] as const;

const benefits = [
  {
    title: "Your Credit Blueprint",
    body: "Personalized 24-month plan built from your actual bureau data—not a one-size template.",
  },
  {
    title: "Monthly Action Plan",
    body: "Clear priorities every month, ranked by score impact so you always know what matters first.",
  },
  {
    title: "Personalized Blueprint",
    body: "Your bureau analyzed and turned into a clear month-by-month action plan built specifically for your credit profile.",
  },
  {
    title: "Powersport Financing Program",
    body: "Pathways and guidance aimed at helping you qualify for the powersport financing you want, with clear steps tied to your bureau picture.",
  },
  {
    title: "Debt Consolidation Referrals",
    body: "When consolidation fits your situation, we point you toward trusted referral options so you can simplify payments and rebuild with a clearer plan.",
  },
  {
    title: "Financial Freedom",
    body: "Hit your goals with confidence—stronger credit opens calmer choices, room to breathe, and a future that feels like yours again.",
  },
] as const;

export default function HomePage() {
  const h = montserrat.className;

  return (
    <div
      className={`flex min-h-full flex-col bg-[var(--cp-bg-light)] text-[var(--cp-dark)] ${montserrat.variable}`}
    >
      <header
        style={{
          backgroundColor: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: "1152px",
            margin: "0 auto",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <Link href="/" style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <img
              src="/logo.png"
              alt="Credit Path Canada"
              style={{ height: "60px", width: "auto", display: "block" }}
            />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Link href="/login" style={{ fontSize: "14px", fontWeight: 500, color: "#0F1923" }}>
              Sign in
            </Link>
            <Link
              href="/onboarding"
              style={{
                backgroundColor: "#00C9A7",
                color: "#0F1923",
                padding: "8px 20px",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-[var(--cp-border)] bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] md:items-center md:gap-12 md:py-24">
            <div className="border-l-4 border-[var(--cp-teal)] pl-6 md:pl-8">
              <p className={`text-xs font-bold uppercase tracking-[0.22em] text-[var(--cp-teal)] ${h}`}>
                Canada&apos;s Credit Education Platform
              </p>
              <h1 className={`mt-4 text-4xl font-bold leading-tight tracking-tight text-[var(--cp-dark)] sm:text-5xl ${h}`}>
                Your personalized path back to strong credit.
              </h1>
              <p className={`mt-4 text-lg font-semibold text-[var(--cp-dark)] sm:text-xl ${h}`}>
                <span style={{ color: "#00C9A7" }}>Your Credit. Your Path. Your Future.</span>
              </p>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--cp-dark)]/80">
                Upload your bureau. Set your goals. Follow your personalized 24-month Blueprint with clear monthly
                actions — no guesswork, no gimmicks.
              </p>
              <div className="mt-10 pb-2">
                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    href="/onboarding"
                    className={`inline-flex rounded-2xl bg-[var(--cp-teal)] px-8 py-4 text-lg font-extrabold uppercase tracking-wide text-[var(--cp-dark)] shadow-[0_10px_40px_rgba(0,201,167,0.45)] ring-2 ring-[var(--cp-teal)]/80 transition-all hover:scale-[1.02] hover:opacity-95 hover:shadow-[0_14px_48px_rgba(0,201,167,0.5)] ${h}`}
                  >
                    GET MY BLUEPRINT
                  </Link>
                  <Link
                    href="/login"
                    className={`inline-flex rounded-xl border border-[var(--cp-border)] bg-white px-6 py-3 text-base font-bold text-[var(--cp-dark)] transition-colors hover:bg-[var(--cp-bg-light)] ${h}`}
                  >
                    Sign in
                  </Link>
                </div>
                <div className={`mt-10 flex flex-col gap-2.5 text-sm text-[var(--cp-teal)] ${h}`}>
                  <p className="font-semibold leading-snug">✓ Trusted by Canadians rebuilding their credit.</p>
                  <p className="font-medium leading-snug">✓ Less than a coffee per week — $4.44</p>
                  <p className="font-medium leading-snug">✓ First 30 days free</p>
                  <p className="font-medium leading-snug">✓ Cancel anytime</p>
                </div>
              </div>
            </div>
            <div className="hidden rounded-2xl border border-[var(--cp-border)] bg-[var(--cp-bg-light)] p-8 shadow-[0_12px_36px_rgba(15,25,35,0.08)] md:block md:p-9 md:py-10">
              <p className={`text-base font-bold text-[var(--cp-teal)] ${h}`}>Why Credit Path Canada</p>
              <p className="mt-4 text-base leading-relaxed text-[var(--cp-dark)]/75">Built for Canadians 🍁</p>
              <p className="mt-2 text-base leading-relaxed text-[var(--cp-dark)]/75">{"By Canadians  🍁"}</p>
              <p className="mt-2 text-base leading-relaxed text-[var(--cp-dark)]/75">
                Who want a clear, month-by-month plan — not another generic score app.
              </p>
            </div>
          </div>
        </section>

        {/* Pain */}
        <section className="border-b border-[var(--cp-border)] bg-[var(--cp-dark)] py-16 text-white sm:py-24">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <h2 className={`text-3xl font-extrabold leading-tight sm:text-4xl md:text-5xl ${h}`}>
              Tired of being told no?
            </h2>
            <p className="mt-8 text-lg leading-relaxed text-white/90 sm:text-xl">
              Every rejection is another{" "}
              <span className="font-bold text-[var(--cp-teal)]">hard inquiry</span>. Every month you wait is another
              month your score <span className="font-bold text-[var(--cp-teal)]">isn&apos;t moving</span>. The problem
              isn&apos;t you — it was that{" "}
              <span className="font-bold text-[var(--cp-teal)]">nobody gave you a roadmap</span>.{" "}
              <span className="font-bold text-[var(--cp-teal)]">Until now.</span>
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="border-b border-[var(--cp-border)] py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className={`text-3xl font-bold text-[var(--cp-dark)] ${h}`}>How it works</h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--cp-muted)]">
              Four steps from bureau upload to a living plan you can follow every month.
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step) => (
                <div
                  key={step.n}
                  className="rounded-2xl border border-[var(--cp-border)] bg-white p-6 shadow-[0_8px_24px_rgba(15,25,35,0.04)]"
                >
                  <span
                    className={`inline-flex size-10 items-center justify-center rounded-full bg-[var(--cp-teal)] text-sm font-bold text-[var(--cp-dark)] ${h}`}
                  >
                    {step.n}
                  </span>
                  <h3 className={`mt-4 text-lg font-bold text-[var(--cp-dark)] ${h}`} style={{ fontSize: "15px" }}>{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--cp-dark)]/75">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What you get */}
        <section className="border-b border-[var(--cp-border)] bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className={`text-3xl font-bold text-[var(--cp-dark)] ${h}`}>What you get</h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--cp-muted)]">
              Everything you need to rebuild with confidence.
            </p>
            <div className="mx-auto mt-10 grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {benefits.map((card) => {
                const isFinancialFreedom = card.title === "Financial Freedom";
                return (
                  <div
                    key={card.title}
                    className="rounded-2xl border border-[var(--cp-border)] bg-[var(--cp-bg-light)] p-6 shadow-sm"
                  >
                    <h3
                      className={`text-lg font-bold leading-snug ${h} ${
                        isFinancialFreedom ? "text-[#00C9A7]" : "text-[var(--cp-dark)]"
                      }`}
                    >
                      {card.title}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed">
                      {isFinancialFreedom ? (
                        <>
                          <span className="text-[#00C9A7]">Hit your goals with confidence</span>
                          <span className="text-[#0F1923]">
                            —stronger credit opens calmer choices, room to breathe, and a future that feels like yours
                            again.
                          </span>
                        </>
                      ) : (
                        <span className="text-[var(--cp-dark)]/80">{card.body}</span>
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="border-b border-[var(--cp-border)] py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className={`text-center text-3xl font-bold text-[var(--cp-dark)] ${h}`}>Testimonials</h2>
            <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-[var(--cp-muted)]">
              Real Canadians 🍁 Real score movement
            </p>
            <TestimonialCarousel headingClass={h} />
            <p className="mt-6 text-center text-xs text-[var(--cp-muted)]">
              Results may vary. Testimonials are illustrative examples of potential outcomes.
            </p>
          </div>
        </section>

        {/* Guarantee */}
        <section className="border-b border-[var(--cp-border)] bg-[var(--cp-teal)] py-14 sm:py-20">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className={`text-2xl font-extrabold leading-tight text-[var(--cp-dark)] sm:text-3xl ${h}`}>
              Trusted by Canadians rebuilding their credit.
            </h2>
            <p className="mt-5 text-base font-semibold leading-relaxed text-[var(--cp-dark)]/90 sm:text-lg">
              Show up every month and your credit will move.
            </p>
            <p className="mx-auto mt-8 max-w-3xl text-left text-xs font-bold leading-snug text-[var(--cp-dark)]/75">
              Guarantee requires: 12 consecutive months of active subscription; completion of all monthly actions with
              documented proof submitted through the portal; minimum 2 credit cards open and reporting for the full
              12-month period; zero missed payments across all accounts; zero new collections; all credit card balances
              maintained under 30% utilization at all times; consistent income level throughout the program period (any
              reduction in income voids eligibility); credit score improvement measured from enrollment baseline only;
              guarantee claim must be submitted within 30 days of completing month 12. Credit Path Canada reserves the
              right to request supporting documentation for any guarantee claim. Results may vary. This guarantee
              applies to credit score improvement only and does not guarantee approval for any specific credit product or
              loan.
            </p>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-lg px-4 sm:px-6">
            <h2 className={`text-center text-3xl font-bold text-[var(--cp-dark)] ${h}`}>Pricing</h2>
            <div className="mt-10 rounded-2xl border-2 border-[var(--cp-teal)] bg-white p-8 shadow-[0_12px_40px_rgba(15,25,35,0.08)]">
              <p className={`text-center text-4xl font-bold text-[var(--cp-dark)] ${h}`}>$4.44</p>
              <p className="text-center text-sm font-semibold text-[var(--cp-muted)]">per week · CAD</p>
              <p className={`mt-3 text-center text-base text-[#0F1923] ${h}`}>
                Less than a coffee per week. No contracts.
              </p>
              <p className={`mt-4 text-center text-sm font-bold text-[var(--cp-teal)] ${h}`}>
                First 30 days free · Cancel anytime
              </p>
              <ul className="mt-6 space-y-3 text-sm text-[var(--cp-dark)]/85">
                <li className="flex gap-2">
                  <span className="font-bold text-[var(--cp-teal)]">✓</span>
                  Your Credit Blueprint
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-[var(--cp-teal)]">✓</span>
                  24-month program
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-[var(--cp-teal)]">✓</span>
                  Monthly unlocks
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-[var(--cp-teal)]">✓</span>
                  Recommended credit products
                </li>
              </ul>
              <Link
                href="/onboarding"
                className={`mt-8 flex w-full items-center justify-center rounded-xl bg-[var(--cp-teal)] px-6 py-3.5 text-center text-base font-bold text-[var(--cp-dark)] transition-opacity hover:opacity-90 ${h}`}
              >
                Start free — 30 days on us
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-[var(--cp-border)] bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <h2 className={`text-center text-3xl font-bold text-[var(--cp-dark)] ${h}`}>FAQ</h2>
            <div className="mt-8 space-y-4">
              {[
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
              ].map((item) => (
                <div
                  key={item.q}
                  className="rounded-2xl border border-[var(--cp-border)] bg-[var(--cp-bg-light)] p-5 shadow-sm"
                >
                  <h3 className={`text-lg font-bold text-[var(--cp-dark)] ${h}`}>{item.q}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--cp-dark)]/80">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--cp-border)] bg-white py-8 text-center text-xs text-[var(--cp-muted)] sm:text-sm">
        <p className="font-medium text-[var(--cp-dark)]/80">
          Your Credit. Your Path. Your Future. · creditpathcanada.ca · © 2026 Credit Path Canada
        </p>
        <p style={{ textAlign: "center", fontSize: 14, color: "#888", marginTop: 16 }}>
          Questions? Reach us at{" "}
          <a href="mailto:info@creditpathcanada.ca" style={{ color: "#00C9A7" }}>
            info@creditpathcanada.ca
          </a>
        </p>
      </footer>
    </div>
  );
}
