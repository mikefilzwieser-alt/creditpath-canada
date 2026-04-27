import type { Metadata } from "next";
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({ subsets: ["latin"], weight: ["600", "700", "800"] });

export const metadata: Metadata = {
  title: "Free Resources for Canadians Rebuilding Credit | Credit Path Canada",
  description:
    "Trusted links for financial planning, free credit monitoring, credit-building products, and debt support—curated for Canadians.",
};

const LINKS = [
  {
    name: "Safe Wealth Planners — Brandon Kirk",
    href: "https://calendly.com/brandonkirk/",
    desc: "Free financial planning session.",
  },
  {
    name: "Borrowell",
    href: "https://borrowell.com",
    desc: "Free Equifax credit monitoring.",
  },
  {
    name: "Credit Karma Canada",
    href: "https://www.creditkarma.ca",
    desc: "Free TransUnion monitoring.",
  },
  {
    name: "Neo Financial",
    href: "https://neo.cc/refer/G3Y6L5A9",
    desc: "Canada's top credit-building card.",
  },
  {
    name: "Tangerine",
    href: "https://www.tangerine.ca",
    desc: "Use referral code 79976711S1 for a $50 bonus.",
  },
  {
    name: "Koho",
    href: "https://www.koho.ca",
    desc: "No credit check. Build credit with every purchase.",
  },
  {
    name: "Prosper Canada",
    href: "https://prospercanada.org",
    desc: "Free financial empowerment resources.",
  },
  {
    name: "MNP Debt",
    href: "https://www.mnpdebt.ca",
    desc: "Licensed insolvency trustees.",
  },
] as const;

export default function PublicResourcesPage() {
  const h = montserrat.className;

  return (
    <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <h1 className={`text-center text-3xl font-bold text-[var(--cp-dark)] sm:text-4xl ${h}`}>
        Free Resources for Canadians Rebuilding Credit
      </h1>
      <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-[var(--cp-muted)]">
        Trusted links to help you monitor, plan, and rebuild—opens in a new tab.
      </p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {LINKS.map((item) => (
          <div
            key={item.href + item.name}
            className="flex flex-col rounded-2xl border border-[var(--cp-border)] bg-white p-5 shadow-[0_8px_24px_rgba(15,25,35,0.06)]"
          >
            <h2 className={`text-lg font-bold leading-snug text-[var(--cp-dark)] ${h}`}>{item.name}</h2>
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
    </main>
  );
}
