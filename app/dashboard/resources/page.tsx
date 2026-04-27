"use client";

import { Montserrat } from "next/font/google";
import { useDashboardAuth } from "@/components/dashboard/DashboardShell";

const montserrat = Montserrat({ subsets: ["latin"], weight: ["600", "700", "800"] });

const TEAL = "#00C9A7";
const NAVY = "#0F1923";
const CARD_BORDER = "rgba(15, 25, 35, 0.08)";

type ResourceItem = { name: string; description: string; href: string };

const FEATURED_PLANNING: { title: string; items: ResourceItem[] } = {
  title: "Free Financial Planning",
  items: [
    {
      name: "Safe Wealth Planners — Brandon Kirk",
      description: "Book a free session with a licensed financial planner.",
      href: "https://calendly.com/brandonkirk/",
    },
  ],
};

const SECTIONS: { title: string; items: ResourceItem[] }[] = [
  {
    title: "Government & Official",
    items: [
      {
        name: "FCAC Financial Literacy",
        description: "Official guidance from the Financial Consumer Agency of Canada.",
        href: "https://www.canada.ca/en/financial-consumer-agency.html",
      },
      {
        name: "Equifax Canada",
        description: "One of Canada’s major consumer credit bureaus.",
        href: "https://www.equifax.ca",
      },
      {
        name: "TransUnion Canada",
        description: "One of Canada’s major consumer credit bureaus.",
        href: "https://www.transunion.ca",
      },
      {
        name: "Office of the Superintendent of Bankruptcy",
        description: "Federal insolvency and bankruptcy information.",
        href: "https://ised-isde.canada.ca",
      },
    ],
  },
  {
    title: "Free Credit Monitoring Tools",
    items: [
      {
        name: "Borrowell",
        description: "Free Equifax soft pull and credit monitoring.",
        href: "https://borrowell.com",
      },
      {
        name: "Credit Karma Canada",
        description: "Free TransUnion monitoring.",
        href: "https://www.creditkarma.ca",
      },
    ],
  },
  {
    title: "Credit Products",
    items: [
      {
        name: "Neo Financial",
        description: "Canada’s top credit-building card. Reports to Equifax.",
        href: "https://neo.cc/refer/G3Y6L5A9",
      },
      {
        name: "Tangerine Money-Back Credit Card",
        description: "Use referral code 79976711S1 for a $50 bonus.",
        href: "https://www.tangerine.ca",
      },
      {
        name: "Koho",
        description: "No credit check. Build credit with every purchase.",
        href: "https://www.koho.ca",
      },
    ],
  },
  {
    title: "Debt Relief",
    items: [
      {
        name: "Credit Counselling Society",
        description: "Non-profit credit counselling and debt help.",
        href: "https://www.nomoredebts.org",
      },
      {
        name: "Prosper Canada",
        description: "Financial literacy and resources for Canadians.",
        href: "https://prospercanada.org",
      },
      {
        name: "MNP Debt",
        description: "Licensed insolvency trustees and debt solutions.",
        href: "https://www.mnpdebt.ca",
      },
    ],
  },
];

export default function ResourcesPage() {
  const { user, loading: authLoading, headingFontClass } = useDashboardAuth();
  const h = headingFontClass || montserrat.className;

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4" style={{ color: NAVY }}>
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: `${TEAL} transparent ${TEAL} ${TEAL}` }}
          aria-label="Loading"
        />
        <p className={`text-sm opacity-70 ${h}`}>Loading…</p>
      </div>
    );
  }

  return (
    <div className={`mx-auto max-w-3xl space-y-10 px-1 pb-8 ${montserrat.className}`} style={{ color: NAVY }}>
      <header>
        <p className={`text-xs font-bold uppercase tracking-[0.2em] ${h}`} style={{ color: TEAL }}>
          Dashboard
        </p>
        <h1 className={`mt-2 text-2xl font-bold tracking-tight sm:text-3xl ${h}`}>Resources</h1>
        <p className={`mt-2 text-sm leading-relaxed opacity-70 ${h}`}>
          Trusted links for credit, monitoring, products, and planning. Opens in a new tab.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className={`text-lg font-bold ${h}`}>{FEATURED_PLANNING.title}</h2>
        <ul className="grid gap-4 sm:grid-cols-1">
          {FEATURED_PLANNING.items.map((item) => (
            <li
              key={item.href + item.name}
              className="flex flex-col gap-3 rounded-2xl border bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              style={{ borderColor: CARD_BORDER }}
            >
              <div className="min-w-0 flex-1">
                <p className={`font-bold ${h}`}>{item.name}</p>
                <p className={`mt-1 text-sm leading-relaxed opacity-75 ${h}`}>{item.description}</p>
              </div>
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex shrink-0 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold transition-opacity hover:opacity-90 ${h}`}
                style={{ backgroundColor: TEAL, color: NAVY }}
              >
                Visit →
              </a>
            </li>
          ))}
        </ul>
      </section>

      {SECTIONS.map((section) => (
        <section key={section.title} className="space-y-4">
          <h2 className={`text-lg font-bold ${h}`}>{section.title}</h2>
          <ul className="grid gap-4 sm:grid-cols-1">
            {section.items.map((item) => (
              <li
                key={item.href + item.name}
                className="flex flex-col gap-3 rounded-2xl border bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                style={{ borderColor: CARD_BORDER }}
              >
                <div className="min-w-0 flex-1">
                  <p className={`font-bold ${h}`}>{item.name}</p>
                  <p className={`mt-1 text-sm leading-relaxed opacity-75 ${h}`}>{item.description}</p>
                </div>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex shrink-0 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold transition-opacity hover:opacity-90 ${h}`}
                  style={{ backgroundColor: TEAL, color: NAVY }}
                >
                  Visit →
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
