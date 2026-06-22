"use client";

import Link from "next/link";
import { Montserrat } from "next/font/google";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { useState } from "react";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-landing-montserrat",
});

const TEAL = "#00C9A7";
const NAVY = "#0F1923";

export default function AboutPage() {
  const h = montserrat.className;
  const [signatureSrc, setSignatureSrc] = useState("/michael-signature.png");

  return (
    <div className={`min-h-full bg-[#F5F7FA] text-[#0F1923] ${montserrat.variable}`}>
      <SiteHeader aboutActive />
      <main>
        <section className="border-b border-black/10 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="border-l-[6px] border-[#00C9A7] pl-6 sm:pl-8">
              <p className={`text-xs font-bold uppercase tracking-[0.22em] text-[#00C9A7] ${h}`}>
                Credit education for the people the system forgot
              </p>
              <h1 className={`mt-4 text-3xl font-bold leading-tight tracking-tight text-[#0F1923] sm:text-5xl ${h}`}>
                Built for the people the banks keep saying no to.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-relaxed text-[#0F1923]/80">
                I&apos;m a Finance Director at a dealership. Every day I watch good people get turned away — not because they&apos;re bad with money, but because no one ever showed them how credit works. So I built the plan I wished I could hand every one of them.
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-black/10 bg-[#F5F7FA] py-14 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
              <h2 className={`text-2xl font-bold text-[#0F1923] sm:text-3xl ${h}`}>How it works</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[
                  {
                    title: "We read your real Equifax file",
                    copy: "Not generic advice — your actual bureau.",
                  },
                  {
                    title: "You get a month-by-month plan",
                    copy: "A few simple steps each month. No guesswork.",
                  },
                  {
                    title: "I work with you when your window opens",
                    copy: "I review every file personally.",
                  },
                ].map((step, index) => (
                  <div key={step.title} className="rounded-2xl bg-[#F5F7FA] p-5">
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${h}`}
                      style={{ backgroundColor: TEAL, color: NAVY }}
                    >
                      {index + 1}
                    </span>
                    <h3 className={`mt-4 text-base font-bold text-[#0F1923] ${h}`}>{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#0F1923]/70">{step.copy}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-black/10 bg-white py-12 sm:py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                { stat: "30", label: "Credit applications seen daily at Titanium Ford" },
                { stat: "29", label: "Declined on average — every single day" },
                { stat: "24", label: "Month personalized rebuild program" },
              ].map((item) => (
                <div
                  key={item.stat}
                  className="rounded-2xl border border-black/10 bg-[#F5F7FA] p-6 text-center shadow-sm"
                >
                  <p className={`text-5xl font-bold ${h}`} style={{ color: TEAL }}>
                    {item.stat}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-[#0F1923]/75">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-black/10 bg-[#F5F7FA] py-10">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <p className="border-l-[6px] border-[#00C9A7] bg-white px-6 py-5 text-base italic leading-relaxed text-[#0F1923]/85 shadow-sm">
              Every client who follows the program moves their score. Every point matters. Every door that opens is one the system tried to keep closed.
            </p>
          </div>
        </section>

        <section className="border-b border-black/10 py-14 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className={`text-3xl font-bold text-[#0F1923] sm:text-4xl ${h}`}>
              The person behind the platform.
            </h2>
            <div className="mt-8 border-l-[6px] border-[#00C9A7] pl-6 sm:pl-8">
              <p className="text-base leading-relaxed text-[#0F1923]/85">
                I got tired of watching good people get turned away. Not because they weren&apos;t creditworthy — but because no one ever gave them a clear plan to get there.
              </p>
              <p className="mt-5 text-base leading-relaxed text-[#0F1923]/85">
                I built Credit Path Canada so that every Canadian who walks away with a rejection slip today has a real path forward — one built from their actual file, not generic internet advice.
              </p>
              <p className="mt-5 text-base font-bold leading-relaxed text-[#0F1923]">
                This isn&apos;t a side project. I review client files personally. When your window opens — I&apos;m the one who gets you approved.
              </p>
              <div className="mt-8 rounded-3xl border border-black/10 bg-white p-6 shadow-sm">
                <img
                  src="/headshot.jpg"
                  alt="Michael Filzwieser"
                  fetchPriority="high"
                  loading="eager"
                  style={{ width: 120, height: 120, objectFit: "cover", borderRadius: "50%", display: "block", marginBottom: 20, border: `3px solid ${TEAL}` }}
                />
                <img
                  src={signatureSrc}
                  alt="Michael Filzwieser signature"
                  onError={() => setSignatureSrc("/michael-signature.jpg")}
                  fetchPriority="high"
                  loading="eager"
                  style={{ width: 120, height: "auto", display: "block", marginBottom: 14, border: "0", background: "transparent" }}
                />
                <p className={`text-lg font-bold text-[#0F1923] ${h}`}>Michael Filzwieser</p>
                <p className="mt-1 text-sm text-[#0F1923]/80">
                  Founder, Credit Path Canada · Finance Director, Titanium Ford
                </p>
                <div className="mt-4 flex flex-col gap-1 text-sm text-[#0F1923]/70 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
                  <span>Steve Marshall Auto Group · serving BC for 60 years</span>
                  <span>(604) 442-0894</span>
                  <a href="mailto:info@creditpathcanada.ca" style={{ color: NAVY, textDecoration: "underline" }}>
                    info@creditpathcanada.ca
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-black/10 bg-white py-14 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
            <p className={`text-xs font-bold uppercase tracking-[0.22em] text-[#00C9A7] ${h}`}>
              What we stand for
            </p>
            <h2 className={`mx-auto mt-4 max-w-3xl text-3xl font-bold leading-tight text-[#0F1923] sm:text-4xl ${h}`}>
              We give Canadians who were told no a real plan to get to yes.
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-[#0F1923]/70">
              Affordable. Honest. Step by step — built from your real file by someone who sees thousands of applications a year.
            </p>
            <div className="mt-8 grid gap-5 text-left md:grid-cols-3">
              {[
                {
                  title: "Truth",
                  copy: "We tell you what you need to know, not what you want to hear. Credit takes months, not days — and the truth is the fastest path to results.",
                },
                {
                  title: "Integrity",
                  copy: "Every recommendation passes one test: would we give this advice to our own family. Our reputation is the only thing we won't compromise.",
                },
                {
                  title: "We stay when others leave",
                  copy: "When the banks said no, every dealer disappeared. We answer the text. We pick up the phone. The system failed you once — we won't be the second wall you hit.",
                },
              ].map((value) => (
                <div
                  key={value.title}
                  className="rounded-2xl border border-black/10 bg-[#F5F7FA] p-6 shadow-sm"
                >
                  <h3 className={`text-lg font-bold text-[#0F1923] ${h}`}>{value.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#0F1923]/75">{value.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-black/10 bg-[#F5F7FA] py-10">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <p className="text-xs leading-relaxed text-[#0F1923]/50">
              Credit Path Canada provides educational credit guidance and personalized action planning. We are not a licensed credit repair agency, insolvency trustee, or financial advisor. Results vary based on individual circumstances. Content is for educational purposes only and does not constitute financial, legal, or tax advice.
            </p>
          </div>
        </section>

        <section className="py-14 sm:py-20">
          <div
            className="mx-auto max-w-3xl rounded-3xl bg-white px-6 py-10 text-center shadow-sm sm:px-10"
            style={{ border: `1.5px solid ${TEAL}` }}
          >
            <h2 className={`text-3xl font-bold text-[#0F1923] sm:text-4xl ${h}`}>
              Your blueprint is waiting.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#0F1923]/75">
              First 30 days free. Cancel anytime. Less than a coffee a week.
            </p>
            <Link
              href="/onboarding"
              className={`mt-8 inline-flex rounded-xl bg-[#00C9A7] px-8 py-4 text-base font-bold text-[#0F1923] shadow-[0_10px_32px_rgba(0,201,167,0.35)] ${h}`}
            >
              Get My Blueprint →
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/10 bg-white py-8 text-center text-xs text-[#0F1923]/50">
        <p className="font-medium text-[#0F1923]/80">
          Your Credit. Your Path. Your Future. · creditpathcanada.ca · © 2026 Credit Path Canada
        </p>
        <p className="mt-4">34 W 7th Ave #401, Vancouver, BC V5Y 1L6</p>
      </footer>
    </div>
  );
}
