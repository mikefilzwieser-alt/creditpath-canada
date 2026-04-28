import Link from "next/link";
import { Montserrat } from "next/font/google";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { TestimonialCarousel } from "@/components/landing/TestimonialCarousel";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Credit Path Canada — Landing V2",
  description: "Standalone landing page sandbox for comparison.",
};

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-landing-montserrat",
});

const steps = [
  {
    title: "Step 1 — Upload your credit report",
    body: "We analyze your actual Equifax bureau — every tradeline, every collection, every inquiry. Nothing generic. Everything built from your real file.",
  },
  {
    title: "Step 2 — Tell us what you're rebuilding toward",
    body: "A vehicle. A mortgage. A clean slate. Your blueprint stays focused on your goal — not a one-size-fits-all template.",
  },
  {
    title: "Step 3 — Get your personalized blueprint",
    body: "Your file analyzed and turned into a clear month-by-month action plan. 3 actions per month, ranked by score impact. You always know what matters most right now.",
  },
  {
    title: "Step 4 — Hit your goals",
    body: "Complete your monthly actions, unlock the next month, watch your score move. Month by month. No guesswork. No wasted moves.",
  },
] as const;

const valueCards = [
  {
    title: "Your Credit Blueprint",
    tag: "$497 value",
    body: "A personalized 24-month plan built from your actual bureau data. Not a template. Not generic advice. Your file, your plan, your path.",
  },
  {
    title: "Monthly Action Plan",
    tag: "$197/year value",
    body: "3 clear priorities every month, ranked by score impact. You always know what to do next and why it matters.",
  },
  {
    title: "Recommended Credit Products",
    tag: "Saves $200+",
    body: "The exact cards and products that will move your score fastest — with referral codes and bonuses built in.",
  },
  {
    title: "Free Financial Planning Session",
    tag: "$150 value",
    body: "Access to a licensed financial specialist through our partner Brandon Kirk at Safe Wealth Planners. One session, no cost, no obligation.",
  },
  {
    title: "Direct Line to a Finance Director",
    tag: "Priceless",
    body: "Michael Filzwieser at Titanium Ford reviews your file personally. When your window opens — he's ready to get you approved.",
  },
  {
    title: "Personal Loan Access",
    tag: "No hard credit check",
    body: "Pre-qualify for a personal loan without a hard inquiry touching your score. We connect you with trusted lending partners when the timing is right for your file.",
  },
] as const;

const testimonials = [
  {
    quote:
      "I have to admit I had zero faith. Michael asked me to give him a chance — and within two days he had an approval, three vehicles picked out, and got me the exact vehicle I wanted despite bad credit and being self-employed. So happy I gave him a chance.",
    by: "— Michelle P., Vancouver BC",
  },
  {
    quote:
      "My credit was shot and I wasn't sure how I was going to get back on the road. Michael was incredibly patient through all my anxiety and questions. He told me — make your payments on time and you'll be able to trade into the vehicle you actually want in a year. He was right.",
    by: "— Cassandra B., BC",
  },
  {
    quote:
      "I filed a consumer proposal four years ago. Michael never made me feel like that was the end of the road. The approval process was smooth, the deal was satisfying, and he was genuinely listening the whole time. Second time I've used him — won't be the last.",
    by: "— Igor S., BC",
  },
  {
    quote:
      "Single mother of three. They helped me get a vehicle that was reasonable in price, better than what I had, and delivered it to my driveway. I couldn't have gone to a better place.",
    by: "— Sherri N., BC",
  },
  {
    quote:
      "Michael went above and beyond. From the moment the deal started to the moment I had my keys — it was an impeccable experience. When you call, ask for Michael.",
    by: "— Emmanuel O., BC",
  },
  {
    quote:
      "Michael, Michaela, the two gentlemen we met in Saskatoon, and everyone else involved did absolutely amazing helping us get set up with a Christmas Miracle of the perfect car for my family. Can't thank you enough!",
    by: "— Kels O., Saskatchewan",
  },
] as const;

export default function LandingV2Page() {
  const h = montserrat.className;

  return (
    <div className={`min-h-full bg-[#F5F7FA] text-[#0F1923] ${montserrat.variable}`}>
      <SiteHeader />
      <main>
        <section className="border-b border-black/10 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="border-l-4 border-[#00C9A7] pl-6 sm:pl-8">
              <p className={`text-xs font-bold uppercase tracking-[0.22em] text-[#00C9A7] ${h}`}>
                CANADA&apos;S CREDIT EDUCATION PLATFORM
              </p>
              <h1 className={`mt-4 max-w-5xl text-3xl font-bold leading-tight tracking-tight text-[#0F1923] sm:text-5xl ${h}`}>
                What if you knew exactly what to do with your credit — every month — based on your actual file?
              </h1>
              <p className={`mt-5 text-xl font-semibold text-[#00C9A7] ${h}`}>
                Not generic tips. Not a score app. A real plan.
              </p>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#0F1923]/80">
                Upload your bureau. Get a personalized blueprint built from your actual credit file. Follow 3 clear actions every month. Watch your score move.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-5">
                <Link
                  href="/onboarding"
                  className={`inline-flex rounded-xl bg-[#00C9A7] px-7 py-3 text-sm font-extrabold uppercase tracking-wide text-[#0F1923] shadow-[0_10px_32px_rgba(0,201,167,0.35)] ${h}`}
                >
                  GET MY BLUEPRINT →
                </Link>
                <Link href="/login" className={`text-base font-semibold text-[#0F1923] ${h}`}>
                  Sign in →
                </Link>
              </div>
              <div className={`mt-8 space-y-2.5 pb-1 text-sm text-[#00C9A7] ${h}`}>
                <p className="font-semibold">✓ Trusted by Canadians rebuilding their credit</p>
                <p className="font-medium">✓ Less than a coffee a week — $4.44</p>
                <p className="font-medium">✓ First 30 days free</p>
                <p className="font-medium">✓ Cancel anytime</p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-black/10 bg-[#0F1923] py-14 text-white sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className={`text-3xl font-bold leading-tight sm:text-4xl ${h}`}>
              You&apos;ve probably been told no more than once.
            </h2>
            <p className="mt-6 text-base leading-relaxed text-white/90">
              Maybe it was a car loan. A credit card. A mortgage pre-approval. Each rejection comes with a hard inquiry that damages your score — and nobody tells you what to actually do about it.
            </p>
            <p className="mt-5 text-base leading-relaxed text-white/90">
              You&apos;re not irresponsible. You&apos;re not a lost cause.{" "}
              <span style={{ color: "#00C9A7" }}>You were just never given a roadmap.</span>
            </p>
            <p className="mt-5 text-base leading-relaxed text-white/90">
              Every month you wait, your score isn&apos;t moving. Every application without a plan is another inquiry stacking up. That changes today.
            </p>
          </div>
        </section>

        <section className="border-b border-black/10 bg-white py-14 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className={`text-3xl font-bold text-[#0F1923] ${h}`}>How it works</h2>
            <p className="mt-2 max-w-2xl text-sm text-[#0F1923]/60">Four steps. One clear path forward.</p>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, idx) => (
                <div key={step.title} className="rounded-2xl border border-black/10 bg-white p-6 shadow-[0_8px_24px_rgba(15,25,35,0.04)]">
                  <span className={`inline-flex size-10 items-center justify-center rounded-full bg-[#00C9A7] text-sm font-bold text-[#0F1923] ${h}`}>
                    {idx + 1}
                  </span>
                  <h3 className={`mt-4 text-lg font-bold text-[#0F1923] ${h}`} style={{ fontSize: "18px", fontWeight: 600 }}>
                    {idx === 3 ? (
                      <>
                        Step 4 — <span style={{ color: "#00C9A7" }}>Hit your goals</span>
                      </>
                    ) : (
                      step.title
                    )}
                  </h3>
                  {idx === 0 ? (
                    <p className="mt-2 text-sm leading-relaxed text-[#0F1923]/75">
                      We analyze your actual Equifax bureau — every tradeline, every collection, every inquiry. Nothing generic. Everything built from your real file.
                    </p>
                  ) : idx === 1 ? (
                    <p className="mt-2 text-sm leading-relaxed text-[#0F1923]/75">
                      A vehicle. A mortgage. A clean slate. Your blueprint stays focused on your goal — not a one-size-fits-all template.
                    </p>
                  ) : idx === 2 ? (
                    <p className="mt-2 text-sm leading-relaxed text-[#0F1923]/75">
                      Your file analyzed and turned into a <span style={{ color: "#00C9A7" }}>clear month-by-month action plan</span>. 3 actions per month, ranked by score impact. You always know what matters most right now.
                    </p>
                  ) : idx === 3 ? (
                    <p className="mt-2 text-sm leading-relaxed text-[#0F1923]/75">{step.body}</p>
                  ) : (
                    <p className="mt-2 text-sm leading-relaxed text-[#0F1923]/75">{step.body}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-black/10 py-14 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className={`text-3xl font-bold text-[#0F1923] sm:text-4xl ${h}`}>Everything you need to rebuild with confidence.</h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {valueCards.map((card) => (
                <article key={card.title} className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className={`text-base font-bold text-[#0F1923] ${h}`}>{card.title}</h3>
                    <span className="rounded-full bg-[#00C9A7]/15 px-3 py-1 text-xs font-bold text-[#0F1923]">{card.tag}</span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-[#0F1923]/80">{card.body}</p>
                </article>
              ))}
            </div>
            <div className="mt-8 rounded-2xl border-2 border-[#00C9A7] bg-white p-6 shadow-sm md:mx-auto md:max-w-xl">
              <p className={`text-2xl font-extrabold text-[#0F1923] sm:text-3xl ${h}`}>
                Total value: <span style={{ color: "#00C9A7" }}>$1,000+</span>
              </p>
              <p className={`mt-1 text-xl font-extrabold text-[#00C9A7] ${h}`}>Your price: $4.44/week.</p>
            </div>
          </div>
        </section>

        <section className="border-b border-black/10 py-14 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <h2 className={`text-center text-3xl font-bold text-[#0F1923] sm:text-4xl ${h}`}>Less than a coffee a week.</h2>
            <p className="mx-auto mt-5 max-w-3xl text-center text-sm leading-relaxed text-[#0F1923]/80 sm:text-base">
              What does staying where you are actually cost you? A <span style={{ color: "#00C9A7" }}>580</span> credit score vs a{" "}
              <span style={{ color: "#00C9A7" }}>680</span> credit score on a $30,000 auto loan is the difference between 12% and
              6% interest. That&apos;s over <span style={{ color: "#00C9A7" }}>$9,000</span> out of your pocket over the life of the
              loan. Credit Path Canada costs $4.44 a week.
            </p>
            <div className="mx-auto mt-8 max-w-xl rounded-2xl border-2 border-[#00C9A7] bg-white p-7 shadow-sm">
              <p className={`text-center text-3xl font-bold text-[#0F1923] ${h}`}>$4.44/week · CAD</p>
              <p className="mt-1 text-center text-sm font-semibold text-[#0F1923]/65">Billed $8.88 biweekly · No contracts</p>
              <ul className="mt-6 space-y-2.5 text-sm text-[#0F1923]/85">
                <li>✓ Your personalized Credit Blueprint</li>
                <li>✓ 24-month program with monthly unlocks</li>
                <li>✓ Recommended credit products with referral bonuses</li>
                <li>✓ Free financial planning session</li>
                <li>✓ Direct access to a licensed Finance Director</li>
              </ul>
              <Link
                href="/onboarding"
                className={`mt-7 inline-flex w-full items-center justify-center rounded-xl bg-[#00C9A7] px-6 py-3 text-center text-base font-bold text-[#0F1923] ${h}`}
              >
                Start Free — 30 Days On Us →
              </Link>
              <p className="mt-3 text-center text-xs text-[#0F1923]/65">First 30 days free. Cancel anytime. No risk.</p>
            </div>
          </div>
        </section>

        <section className="border-b border-black/10 bg-white py-14 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className={`text-center text-3xl font-bold text-[#0F1923] sm:text-4xl ${h}`}>Real Canadians. Real outcomes. 🍁</h2>
            <TestimonialCarousel headingClass={h} />
          </div>
        </section>

        <section className="border-b border-black/10 bg-[#00C9A7] py-14 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <p className={`text-xl font-bold leading-relaxed text-[#0F1923] sm:text-2xl ${h}`}>
              Follow the program for 12 months and your score will move. If it doesn&apos;t — we work with you for free until it does.
            </p>
            <p className="mt-4 text-sm font-semibold text-[#0F1923]/75">Full guarantee terms available on request.</p>
          </div>
        </section>

        <section className="py-14 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <h2 className={`text-3xl font-bold text-[#0F1923] sm:text-4xl ${h}`}>Built by someone who sees this every day.</h2>
            <p className="mt-6 text-base leading-relaxed text-[#0F1923]/85">
              I&apos;m Michael Filzwieser — Finance Director at Titanium Ford, part of the Steve Marshall Auto Group. I see 30 credit applications a day. Twenty-nine get declined.
            </p>
            <p className="mt-5 text-base leading-relaxed text-[#0F1923]/85">
              For a long time I watched good people walk away with nothing — not because they couldn&apos;t be helped, but{" "}
              <span style={{ color: "#00C9A7" }}>because nobody gave them a clear plan.</span>
            </p>
            <p className="mt-5 text-base leading-relaxed text-[#0F1923]/85">
              I built Credit Path Canada because those 29 people deserved better than a rejection slip. They deserved a roadmap.
            </p>
            <div className="mt-8 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
              <img
                src="/michael-signature.png"
                alt="Michael Filzwieser signature"
                style={{ width: 120, height: "auto", display: "block", marginBottom: 14 }}
              />
              <p className={`text-lg font-bold text-[#0F1923] ${h}`}>— Michael Filzwieser</p>
              <p className="mt-1 text-xs text-[#0F1923]/50">
                As seen at Titanium Ford — Steve Marshall Auto Group · Serving BC for 60 years
              </p>
              <p className="mt-1 text-sm text-[#0F1923]/80">
                Finance Director · Titanium Ford · Founder, Credit Path Canada
              </p>
              <p className="mt-1 text-sm text-[#0F1923]/80">(604) 442-0894 · info@creditpathcanada.ca</p>
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
        <p className="mt-4 text-[var(--cp-muted)]">34 W 7th Ave #401, Vancouver, BC V5Y 1L6</p>
      </footer>
    </div>
  );
}
