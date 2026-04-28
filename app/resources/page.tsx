import type { Metadata } from "next";
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({ subsets: ["latin"], weight: ["600", "700", "800"] });

export const metadata: Metadata = {
  title: "Free Resources for Canadians Rebuilding Credit | Credit Path Canada",
  description:
    "Trusted links for financial planning, free credit monitoring, credit-building products, and debt support—curated for Canadians.",
};

const FREE_MONITORING = [
  { name: "Borrowell", href: "https://borrowell.com", desc: "Free Equifax credit monitoring." },
  { name: "Credit Karma Canada", href: "https://www.creditkarma.ca", desc: "Free TransUnion monitoring." },
] as const;

const CREDIT_BUILDING = [
  { name: "Neo Financial", href: "https://neo.cc/refer/G3Y6L5A9", desc: "Canada's top credit-building card." },
  {
    name: "Tangerine",
    href: "https://www.tangerine.ca",
    desc: "Use referral code 79976711S1 for a $50 bonus.",
  },
  { name: "Koho", href: "https://www.koho.ca", desc: "No credit check. Build credit with every purchase." },
  {
    name: "EQ Bank",
    href: "https://join.eqbank.ca/?code=MICHAEL1577",
    desc: "Reports to both Equifax and TransUnion. No credit check required.",
  },
] as const;

const DEBT_RELIEF = [
  { name: "Prosper Canada", href: "https://prospercanada.org", desc: "Free financial empowerment resources." },
  { name: "MNP Debt", href: "https://www.mnpdebt.ca", desc: "Licensed insolvency trustees." },
] as const;

export default function PublicResourcesPage() {
  const h = montserrat.className;

  return (
    <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <h1 className={`text-center text-3xl font-bold text-[var(--cp-dark)] sm:text-4xl ${h}`}>
        Free Resources for Canadians Rebuilding Credit
      </h1>
      <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-[var(--cp-muted)]">
        Hand-picked by Michael, Founder of Credit Path Canada. These are the exact tools and people we trust.
      </p>

      <section className="mt-10">
        <h2 className={`text-xl font-bold text-[var(--cp-dark)] ${h}`}>📅 Financial Planning</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col rounded-2xl border border-[var(--cp-teal)] bg-[var(--cp-teal)]/10 p-6 shadow-[0_8px_24px_rgba(15,25,35,0.06)]">
            <div className="mb-3">
              <span className="rounded-full bg-[var(--cp-teal)] px-3 py-1 text-xs font-bold text-[var(--cp-dark)]">
                Our top recommendation
              </span>
            </div>
            <h3 className={`text-lg font-bold leading-snug text-[var(--cp-dark)] ${h}`}>Safe Wealth Planners — Brandon Kirk</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--cp-dark)]/80">
              Book a free session with a licensed financial specialist.
            </p>
            <a
              href="https://calendly.com/brandonkirk/"
              target="_blank"
              rel="noopener noreferrer"
              className={`mt-4 inline-flex w-fit items-center rounded-xl bg-[var(--cp-teal)] px-4 py-2.5 text-sm font-bold text-[var(--cp-dark)] transition-opacity hover:opacity-90 ${h}`}
            >
              Visit →
            </a>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className={`text-xl font-bold text-[var(--cp-dark)] ${h}`}>📊 Free Credit Monitoring</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FREE_MONITORING.map((item) => (
            <div
              key={item.href + item.name}
              className="flex flex-col rounded-2xl border border-[var(--cp-border)] bg-white p-5 shadow-[0_8px_24px_rgba(15,25,35,0.06)]"
            >
              <h3 className={`text-lg font-bold leading-snug text-[var(--cp-dark)] ${h}`}>{item.name}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--cp-dark)]/80">{item.desc}</p>
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-4 inline-flex w-fit items-center rounded-xl bg-[var(--cp-teal)] px-4 py-2.5 text-sm font-bold text-[var(--cp-dark)] transition-opacity hover:opacity-90 ${h}`}
              >
                Visit →
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className={`text-xl font-bold text-[var(--cp-dark)] ${h}`}>💳 Credit Building Cards</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CREDIT_BUILDING.map((item) => (
            <div
              key={item.href + item.name}
              className="flex flex-col rounded-2xl border border-[var(--cp-border)] bg-white p-5 shadow-[0_8px_24px_rgba(15,25,35,0.06)]"
            >
              <h3 className={`text-lg font-bold leading-snug text-[var(--cp-dark)] ${h}`}>{item.name}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--cp-dark)]/80">{item.desc}</p>
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-4 inline-flex w-fit items-center rounded-xl bg-[var(--cp-teal)] px-4 py-2.5 text-sm font-bold text-[var(--cp-dark)] transition-opacity hover:opacity-90 ${h}`}
              >
                Visit →
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className={`text-xl font-bold text-[var(--cp-dark)] ${h}`}>🏛️ Debt Relief</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DEBT_RELIEF.map((item) => (
            <div
              key={item.href + item.name}
              className="flex flex-col rounded-2xl border border-[var(--cp-border)] bg-white p-5 shadow-[0_8px_24px_rgba(15,25,35,0.06)]"
            >
              <h3 className={`text-lg font-bold leading-snug text-[var(--cp-dark)] ${h}`}>{item.name}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--cp-dark)]/80">{item.desc}</p>
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-4 inline-flex w-fit items-center rounded-xl bg-[var(--cp-teal)] px-4 py-2.5 text-sm font-bold text-[var(--cp-dark)] transition-opacity hover:opacity-90 ${h}`}
              >
                Visit →
              </a>
            </div>
          ))}
        </div>
      </section>
      <div className="mt-10 text-center text-xs text-[var(--cp-muted)]">
        34 W 7th Ave #401, Vancouver, BC V5Y 1L6
      </div>
    </main>
  );
}
