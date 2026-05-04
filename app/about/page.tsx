"use client";

import Link from "next/link";
import { Montserrat } from "next/font/google";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { useState } from "react";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
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
                ABOUT CREDIT PATH CANADA
              </p>
              <h1 className={`mt-4 text-3xl font-bold leading-tight tracking-tight text-[#0F1923] sm:text-5xl ${h}`}>
                Built for the people the banks keep saying no to.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-relaxed text-[#0F1923]/80">
                I'm a Finance Director at a dealership. Every day, I see 30 people walk in looking for a vehicle. Most get turned away — not because they're bad with money, but because nobody ever taught them how credit works.
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-black/10 bg-[#0F1923] py-14 text-white sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className={`text-2xl font-bold sm:text-3xl ${h}`}>
              They don't teach this in school.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-white/85">
              Your bank won't explain it. Most credit services charge you hundreds of dollars to do what you could do yourself — if someone just showed you how.
            </p>
            <p className="mt-5 text-base leading-relaxed text-white/85">
              That's what Credit Path Canada is. We analyze your actual Equifax bureau, build you a personalized month-by-month action plan, and walk you through every step. No guesswork. No generic advice.{" "}
              <span style={{ color: TEAL }}>A real plan built from your real file.</span>
            </p>
            <p className="mt-5 text-base leading-relaxed text-white/85">
              Every client who follows the program moves their score. Every point matters. Every door that opens is one the system tried to keep closed.
            </p>
          </div>
        </section>

        <section className="border-b border-black/10 bg-white py-14 sm:py-20">
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

        <section className="border-b border-black/10 py-14 sm:py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className={`text-3xl font-bold text-[#0F1923] sm:text-4xl ${h}`}>
              The person behind the platform.
            </h2>
            <div className="mt-8 border-l-[6px] border-[#00C9A7] pl-6 sm:pl-8">
              <p className="text-base leading-relaxed text-[#0F1923]/85">
                I got tired of watching good people get turned away. Not because they weren't creditworthy — but because no one ever gave them a clear plan to get there.
              </p>
              <p className="mt-5 text-base leading-relaxed text-[#0F1923]/85">
                I built Credit Path Canada so that every Canadian who walks away with a rejection slip today has a real path forward — one built from their actual file, not generic internet advice.
              </p>
              <p className="mt-5 text-base leading-relaxed text-[#0F1923]/85">
                This isn't a side project. I review client files personally. When your window opens — I'm the one who gets you approved.
              </p>
              <div className="mt-8">
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
                  Founder, Credit Path Canada · Finance Director · Titanium Ford
                </p>
                <p className="mt-1 text-xs text-[#0F1923]/50">
                  Steve Marshall Auto Group · Serving BC for 60 years
                </p>
                <p className="mt-1 text-sm text-[#0F1923]/80">
                  (604) 442-0894 ·{" "}
                  <a href="mailto:info@creditpathcanada.ca" style={{ color: NAVY, textDecoration: "underline" }}>
                    info@creditpathcanada.ca
                  </a>
                </p>
              </div>
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
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
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
