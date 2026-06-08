"use client";

import Link from "next/link";
import { Montserrat } from "next/font/google";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { useEffect, useState } from "react";

const FONT_STACK = "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-mont",
});

const TEAL = "#00C9A7";
const NAVY = "#0F1923";
const NAVY_DEEP = "#0A1219";

const testimonials = [
  {
    quote: "I had zero faith. Michael asked me to give him a chance — within two days he had an approval, three vehicles picked out, and got me the exact vehicle I wanted despite bad credit and being self-employed.",
    by: "Michelle P.",
    location: "Vancouver, BC",
  },
  {
    quote: "My credit was shot. Michael was incredibly patient with all my anxiety. As long as I make my payments on time, I'll have the vehicle I want in a year. Thank you for your kindness.",
    by: "Cassandra B.",
    location: "British Columbia",
  },
  {
    quote: "Second time working with Michael. He stayed within my comfort range for repayment and never made me feel less-than after my consumer proposal. The approval process was smooth — satisfactory deal.",
    by: "Igor S.",
    location: "British Columbia",
  },
];

const valueCards = [
  { icon: "◆", title: "Your Credit Blueprint", tag: "$497 value", body: "A personalized 24-month plan built from your Equifax bureau. Not a template. Your file, your plan, your path." },
  { icon: "△", title: "Monthly Action Plan", tag: "$197/yr value", body: "3 clear priorities every month, ranked by score impact. Always know what to do next." },
  { icon: "◇", title: "Recommended Credit Products", tag: "$199 value", body: "The exact cards that move your score fastest — with referral bonuses built in." },
  { icon: "◉", title: "Financial Planning Session", tag: "$199 value", body: "Access a licensed financial specialist through Brandon Kirk at Safe Wealth Planners." },
  { icon: "◈", title: "Direct Line to a Finance Director", tag: "Priceless", body: "Michael Filzwieser at Titanium Ford reviews your file personally. When your window opens — he gets you approved." },
  { icon: "●", title: "Personal Loan Access", tag: "No hard check", body: "Pre-qualify without a hard inquiry. We connect you with trusted lending partners when the timing is right." },
];

const scoreBars = [
  { month: "Jan", width: 22, color: "#ef4444" },
  { month: "Mar", width: 38, color: "#f97316" },
  { month: "Jun", width: 58, color: "#eab308" },
  { month: "Sep", width: 78, color: "#84cc16" },
  { month: "Dec", width: 95, color: TEAL },
];

export default function HomepageV2() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const m = montserrat.className;

  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className={`${montserrat.variable} min-h-full`} style={{ background: NAVY_DEEP, color: "#fff" }}>
      <div style={{ background: "#fff" }}><SiteHeader /></div>

      <main className={m} style={{ fontFamily: FONT_STACK }}>

        {/* HERO */}
        <section style={{ background: NAVY_DEEP, padding: "56px 24px 72px", position: "relative", overflow: "hidden", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ position: "absolute", top: "-200px", right: "-150px", width: "600px", height: "600px", borderRadius: "50%", background: `radial-gradient(circle, rgba(0,201,167,0.08) 0%, transparent 65%)`, pointerEvents: "none" }}></div>

          <div style={{ maxWidth: 1180, margin: "0 auto", position: "relative", zIndex: 1 }}>

            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(0,201,167,0.08)", border: "1px solid rgba(0,201,167,0.22)", borderRadius: 100, padding: "7px 14px", marginBottom: 32 }}>
              <div style={{ width: 6, height: 6, background: TEAL, borderRadius: "50%" }}></div>
              <span style={{ fontSize: 11, fontWeight: 700, color: TEAL, letterSpacing: "0.06em", textTransform: "uppercase" }}>First graduates approved · April & May 2026</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }} className="hero-grid">
              <div>
                <h1 style={{ fontFamily: FONT_STACK, fontSize: "clamp(26px, 3vw, 40px)", fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.03em", color: "#fff", marginBottom: 20 }}>
                  What if you finally knew <span style={{ color: TEAL }}>exactly what to do</span> with your credit?
                </h1>

                <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.7)", marginBottom: 28, fontWeight: 500 }}>
                  Not generic tips. Not a score app. <span style={{ color: TEAL, fontWeight: 700 }}>A real plan.</span>
                </p>

                <div style={{ display: "flex", gap: 32, alignItems: "center", marginBottom: 40 }}>
                  <div>
                    <div style={{ fontSize: 36, fontWeight: 800, color: "#fff", lineHeight: 1, letterSpacing: "-0.03em" }}>580</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4, letterSpacing: "0.06em" }}>vs 680 score</div>
                  </div>
                  <div style={{ color: TEAL, fontSize: 24 }}>→</div>
                  <div>
                    <div style={{ fontSize: 36, fontWeight: 800, color: TEAL, lineHeight: 1, letterSpacing: "-0.03em" }}>$9,000<span style={{ fontSize: 32 }}>+</span></div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4, letterSpacing: "0.06em" }}>saved on a $30K auto loan</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                  <Link href="/onboarding" style={{ background: TEAL, color: NAVY, padding: "16px 32px", borderRadius: 100, fontSize: 13, fontWeight: 800, textDecoration: "none", letterSpacing: "0.06em", textTransform: "uppercase", display: "inline-block", transition: "transform 0.2s" }} onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-2px) scale(1.02)")} onMouseOut={(e) => (e.currentTarget.style.transform = "translateY(0) scale(1)")}>
                    Get My Blueprint
                  </Link>
                  <Link href="/login" style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600, textDecoration: "none", padding: "16px 8px" }}>Sign in →</Link>
                </div>

                <p style={{ marginTop: 16, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>30 days free · ~50¢/day after · Cancel anytime</p>
              </div>

              <div>
                <div style={{ background: NAVY, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 20, padding: 32, boxShadow: "0 24px 48px rgba(0,0,0,0.3)" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>Your Score Projection</p>

                  {scoreBars.map((bar, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.5)", width: 32 }}>{bar.month}</span>
                      <div style={{ flex: 1, height: 10, background: "rgba(255,255,255,0.05)", borderRadius: 6, overflow: "hidden", position: "relative" }}>
                        <div style={{ width: `${bar.width}%`, height: "100%", background: bar.color, borderRadius: 6, transition: "width 1.2s ease" }}></div>
                      </div>
                    </div>
                  ))}

                  <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Target</span>
                    <span style={{ fontSize: 22, fontWeight: 800, color: TEAL, letterSpacing: "-0.02em" }}>680</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MICHAEL */}
        <section style={{ background: NAVY, padding: "56px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 60, alignItems: "center" }} className="michael-grid">
            <div>
              <img src="/headshot.jpg" alt="Michael Filzwieser" style={{ width: "100%", maxWidth: 380, borderRadius: 16, display: "block", border: `3px solid ${TEAL}` }} />
              <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
                <a href="https://titaniumford-michaelf-5stars.netlify.app/" target="_blank" rel="noopener noreferrer" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 100, padding: "8px 16px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", textDecoration: "none", letterSpacing: "0.06em", textTransform: "uppercase" }}>⭐ 5 Star Reviews</a>
                <a href="https://calendly.com/aec-michael/15min" style={{ background: "rgba(0,201,167,0.1)", border: `1px solid rgba(0,201,167,0.25)`, borderRadius: 100, padding: "8px 16px", fontSize: 11, fontWeight: 700, color: TEAL, textDecoration: "none", letterSpacing: "0.06em", textTransform: "uppercase" }}>📅 Free Consultation</a>
              </div>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: TEAL, marginBottom: 16 }}>Meet the founder</p>
              <h2 style={{ fontFamily: FONT_STACK, fontSize: "clamp(20px, 2.4vw, 28px)", fontWeight: 800, lineHeight: 1.12, letterSpacing: "-0.02em", color: "#fff", marginBottom: 24 }}>
                I see 30 applications a day. <span style={{ color: TEAL }}>Twenty-nine get declined.</span>
              </h2>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.65)", marginBottom: 18 }}>
                I'm Michael Filzwieser — Finance Director at Titanium Ford, part of TD's #1 dealer group in Canada. For years I watched good people walk away with nothing — not because they couldn't be helped, but because <strong style={{ color: "#fff" }}>nobody gave them a clear plan.</strong>
              </p>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.65)" }}>
                I built Credit Path Canada because those 29 people deserved better than a rejection slip. <span style={{ color: TEAL, fontWeight: 600 }}>They deserved a roadmap.</span>
              </p>
              <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Michael Filzwieser</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Founder, Credit Path Canada · Finance Director, Titanium Ford · TD's #1 dealer in Canada</p>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section style={{ background: NAVY_DEEP, padding: "56px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ maxWidth: 1180, margin: "0 auto" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: TEAL, marginBottom: 16 }}>How it works</p>
            <h2 style={{ fontFamily: FONT_STACK, fontSize: "clamp(20px, 2.4vw, 28px)", fontWeight: 800, lineHeight: 1.12, letterSpacing: "-0.02em", color: "#fff", marginBottom: 48, maxWidth: 700 }}>
              Four steps. <span style={{ color: TEAL }}>One clear path forward.</span>
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
              {[
                { n: "01", t: "Upload your credit report", b: "We analyze your Equifax bureau — every tradeline, every collection, every inquiry. Built from your real file." },
                { n: "02", t: "Get matched to your goal", b: "A vehicle. A mortgage. A clean slate. Your blueprint stays focused on your specific outcome — never a template." },
                { n: "03", t: "Get your blueprint", b: "Your file analyzed and turned into a clear month-by-month plan. 3 priorities, ranked by score impact." },
                { n: "04", t: "Hit your goals", b: "Complete your actions, unlock the next month, watch your score move. Month by month. No guesswork." },
              ].map((step) => (
                <div key={step.n} style={{ background: NAVY, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24, transition: "transform 0.25s ease, border-color 0.25s ease" }} onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = "rgba(0,201,167,0.25)"; }} onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}>
                  <p style={{ fontSize: 22, fontWeight: 800, color: TEAL, marginBottom: 12, letterSpacing: "-0.02em" }}>{step.n}</p>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{step.t}</h3>
                  <p style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.55)" }}>{step.b}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* VALUE STACK */}
        <section style={{ background: NAVY, padding: "56px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ maxWidth: 1180, margin: "0 auto" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: TEAL, marginBottom: 16 }}>What you get</p>
            <h2 style={{ fontFamily: FONT_STACK, fontSize: "clamp(20px, 2.4vw, 28px)", fontWeight: 800, lineHeight: 1.12, letterSpacing: "-0.02em", color: "#fff", marginBottom: 48, maxWidth: 700 }}>
              Everything you need to <span style={{ color: TEAL }}>move your score.</span>
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
              {valueCards.map((card) => (
                <div key={card.title} style={{ background: NAVY_DEEP, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 28, transition: "transform 0.25s ease, border-color 0.25s ease" }} onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = "rgba(0,201,167,0.25)"; }} onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <span style={{ fontSize: 22, color: TEAL }}>{card.icon}</span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: TEAL, letterSpacing: "0.08em", textTransform: "uppercase", background: "rgba(0,201,167,0.1)", padding: "4px 10px", borderRadius: 100 }}>{card.tag}</span>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{card.title}</h3>
                  <p style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.55)" }}>{card.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICE ANCHOR */}
        <section style={{ background: NAVY_DEEP, padding: "56px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: TEAL, marginBottom: 16 }}>The math is undeniable</p>
            <h2 style={{ fontFamily: FONT_STACK, fontSize: "clamp(20px, 2.4vw, 28px)", fontWeight: 800, lineHeight: 1.12, letterSpacing: "-0.02em", color: "#fff", marginBottom: 40 }}>
              A 580 vs 680 score on a $30,000 auto loan:
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }} className="anchor-grid">
              <div style={{ background: NAVY, border: "1px solid rgba(239,68,68,0.2)", borderRadius: 16, padding: 28 }}>
                <p style={{ fontSize: 32, fontWeight: 800, color: "#ef4444", lineHeight: 1, letterSpacing: "-0.03em", marginBottom: 8 }}>580</p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 20 }}>12% interest</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: "#ef4444", letterSpacing: "-0.02em" }}>~$13,000+</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>in interest paid</p>
              </div>
              <div style={{ background: NAVY, border: `1px solid rgba(0,201,167,0.25)`, borderRadius: 16, padding: 28 }}>
                <p style={{ fontSize: 32, fontWeight: 800, color: TEAL, lineHeight: 1, letterSpacing: "-0.03em", marginBottom: 8 }}>680</p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 20 }}>6% interest</p>
                <p style={{ fontSize: 20, fontWeight: 800, color: TEAL, letterSpacing: "-0.02em" }}>~$4,000</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>in interest paid</p>
              </div>
            </div>

            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>
              Difference: <span style={{ fontSize: 16, fontWeight: 800, color: TEAL, letterSpacing: "-0.02em" }}>$9,000+</span> out of your pocket.
            </p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Credit Path Canada costs ~50¢/day.</p>
          </div>
        </section>

        {/* TESTIMONIAL */}
        <section style={{ background: NAVY, padding: "56px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: TEAL, marginBottom: 32 }}>Real Canadians. Real outcomes.</p>
            <div style={{ fontSize: 18, color: TEAL, marginBottom: 24, letterSpacing: "0.1em" }}>★★★★★</div>
            <p style={{ fontSize: "clamp(16px, 1.8vw, 20px)", fontWeight: 600, lineHeight: 1.5, color: "#fff", marginBottom: 28, letterSpacing: "-0.01em" }}>
              "{testimonials[activeTestimonial]?.quote}"
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, color: TEAL }}>{testimonials[activeTestimonial]?.by}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{testimonials[activeTestimonial]?.location}</p>
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 28 }}>
              {testimonials.map((_, i) => (
                <button key={i} onClick={() => setActiveTestimonial(i)} aria-label={`Show testimonial ${i + 1}`} style={{ width: i === activeTestimonial ? 24 : 8, height: 8, borderRadius: 100, background: i === activeTestimonial ? TEAL : "rgba(255,255,255,0.2)", border: "none", cursor: "pointer", transition: "all 0.3s" }} />
              ))}
            </div>
          </div>
        </section>

        {/* GUARANTEE */}
        <section style={{ background: NAVY_DEEP, padding: "56px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: TEAL, marginBottom: 20 }}>Our promise</p>
            <h2 style={{ fontFamily: FONT_STACK, fontSize: "clamp(20px, 2.4vw, 28px)", fontWeight: 800, lineHeight: 1.18, letterSpacing: "-0.02em", color: "#fff", marginBottom: 20 }}>
              Follow the program for 12 months and your score will move.
            </h2>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.6)" }}>
              If it doesn't — we work with you <span style={{ color: TEAL, fontWeight: 600 }}>at no charge until you're approved.</span>
            </p>
          </div>
        </section>

        {/* CTA */}
        <section style={{ background: NAVY, padding: "56px 24px", textAlign: "center" }}>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <h2 style={{ fontFamily: FONT_STACK, fontSize: "clamp(22px, 2.6vw, 32px)", fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.03em", color: "#fff", marginBottom: 16 }}>
              Your blueprint is <span style={{ color: TEAL }}>3 minutes away.</span>
            </h2>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.6)", marginBottom: 36 }}>
              30 days free. Cancel anytime. ~50¢/day after.
            </p>
            <Link href="/onboarding" style={{ background: TEAL, color: NAVY, padding: "18px 44px", borderRadius: 100, fontSize: 14, fontWeight: 800, textDecoration: "none", letterSpacing: "0.08em", textTransform: "uppercase", display: "inline-block", transition: "transform 0.2s" }} onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-2px) scale(1.02)")} onMouseOut={(e) => (e.currentTarget.style.transform = "translateY(0) scale(1)")}>
              Get My Blueprint
            </Link>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ background: NAVY_DEEP, padding: "32px 24px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: TEAL, letterSpacing: "0.12em", textTransform: "uppercase" }}>Credit Path Canada</p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 10 }}>(604) 442-0894 · info@creditpathcanada.ca</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>34 W 7th Ave #401, Vancouver BC V5Y 1L6</p>
          <div style={{ marginTop: 16, display: "flex", gap: 12, justifyContent: "center" }}>
            <a href="/privacy-policy" style={{ fontSize: 11, color: TEAL, textDecoration: "none" }}>Privacy Policy</a>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
            <a href="/user-agreement" style={{ fontSize: 11, color: TEAL, textDecoration: "none" }}>User Agreement</a>
          </div>
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 16 }}>© 2026 Credit Path Canada · Part of the Steve Marshall Auto Group</p>
        </footer>

      </main>

      <style jsx>{`
        @media (max-width: 768px) {
          .hero-grid, .michael-grid, .anchor-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
