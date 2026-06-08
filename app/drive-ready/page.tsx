"use client";

import Link from "next/link";
import { Montserrat } from "next/font/google";
import { SiteHeader } from "@/components/landing/SiteHeader";

const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-mont" });

const TEAL = "#00C9A7";
const NAVY = "#0F1923";
const NAVY_DEEP = "#0A1219";

export default function DriveReadyPage() {
  const m = montserrat.className;

  return (
    <div className={`${montserrat.variable} min-h-full`} style={{ background: NAVY_DEEP, color: "#fff" }}>
      <div style={{ background: "#fff" }}><SiteHeader /></div>

      <main className={m}>

        {/* HERO */}
        <section style={{ background: NAVY_DEEP, padding: "56px 24px 72px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: "-200px", right: "-150px", width: "600px", height: "600px", borderRadius: "50%", background: `radial-gradient(circle, rgba(0,201,167,0.1) 0%, transparent 65%)`, pointerEvents: "none" }}></div>

          <div style={{ maxWidth: 900, margin: "0 auto", position: "relative", zIndex: 1, textAlign: "center" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color: TEAL, marginBottom: 20 }}>
              Canada's Drive Ready Program 🍁
            </p>

            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(0,201,167,0.08)", border: "1px solid rgba(0,201,167,0.22)", borderRadius: 100, padding: "7px 14px", marginBottom: 28 }}>
              <div style={{ width: 6, height: 6, background: TEAL, borderRadius: "50%" }}></div>
              <span style={{ fontSize: 11, fontWeight: 700, color: TEAL, letterSpacing: "0.06em", textTransform: "uppercase" }}>First graduates approved · April & May 2026</span>
            </div>

            <h1 style={{ fontSize: "clamp(28px, 3.4vw, 44px)", fontWeight: 800, lineHeight: 1.04, letterSpacing: "-0.03em", color: "#fff", marginBottom: 24 }}>
              Your name.<br/>Zero down.<br/><span style={{ color: TEAL }}>Approved.</span>
            </h1>

            <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.65)", marginBottom: 36, maxWidth: 600, margin: "0 auto 36px" }}>
              Canada's Drive Ready Program gets you approved for a car loan — in <strong style={{ color: TEAL }}>8–10 months</strong>, <strong style={{ color: TEAL }}>guaranteed.</strong>
            </p>

            <Link href="/onboarding" style={{ background: TEAL, color: NAVY, padding: "18px 44px", borderRadius: 100, fontSize: 13, fontWeight: 800, textDecoration: "none", letterSpacing: "0.08em", textTransform: "uppercase", display: "inline-block", transition: "transform 0.2s" }} onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-2px) scale(1.02)")} onMouseOut={(e) => (e.currentTarget.style.transform = "translateY(0) scale(1)")}>
              Start My Drive Ready Program
            </Link>

            <p style={{ marginTop: 16, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>30 days free · ~50¢/day after · Cancel anytime</p>
          </div>
        </section>

        {/* MICHAEL */}
        <section style={{ background: NAVY, padding: "56px 24px", borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ maxWidth: 1080, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 60, alignItems: "center" }} className="michael-grid">
            <div>
              <img src="/headshot.jpg" alt="Michael Filzwieser" style={{ width: "100%", maxWidth: 380, borderRadius: 16, display: "block", border: `3px solid ${TEAL}` }} />
              <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
                <a href="https://titaniumford-michaelf-5stars.netlify.app/" target="_blank" rel="noopener noreferrer" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 100, padding: "8px 16px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", textDecoration: "none", letterSpacing: "0.06em", textTransform: "uppercase" }}>⭐ 5 Star Reviews</a>
                <a href="https://calendly.com/aec-michael/15min" style={{ background: "rgba(0,201,167,0.1)", border: `1px solid rgba(0,201,167,0.25)`, borderRadius: 100, padding: "8px 16px", fontSize: 11, fontWeight: 700, color: TEAL, textDecoration: "none", letterSpacing: "0.06em", textTransform: "uppercase" }}>📅 Free Consultation</a>
              </div>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: TEAL, marginBottom: 16 }}>The banks said no</p>
              <h2 style={{ fontSize: "clamp(20px, 2.4vw, 28px)", fontWeight: 800, lineHeight: 1.12, letterSpacing: "-0.02em", color: "#fff", marginBottom: 24 }}>
                I see why every day. <span style={{ color: TEAL }}>And I built the answer.</span>
              </h2>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.65)", marginBottom: 18 }}>
                I'm Michael Filzwieser — Finance Director at Titanium Ford, part of TD's #1 dealer group in Canada. Applications get declined daily because <strong style={{ color: "#fff" }}>nobody gave them a plan.</strong>
              </p>
              <p style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.65)" }}>
                The Drive Ready Program is the blueprint: <span style={{ color: TEAL, fontWeight: 600 }}>a personalized credit plan that gets you approved.</span>
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
          <div style={{ maxWidth: 1080, margin: "0 auto" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: TEAL, marginBottom: 16, textAlign: "center" }}>The Drive Ready Program</p>
            <h2 style={{ fontSize: "clamp(20px, 2.4vw, 28px)", fontWeight: 800, lineHeight: 1.12, letterSpacing: "-0.02em", color: "#fff", marginBottom: 48, textAlign: "center" }}>
              Four steps. <span style={{ color: TEAL }}>Here's what happens.</span>
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
              {[
                { n: "01", t: "Sign up — we take care of everything", b: "We create your login and upload your Equifax.", h: "Don't lift a finger." },
                { n: "02", t: "Get your personalized blueprint", b: "We soft-pull your Equifax — every tradeline analyzed.", h: "Built from your live file." },
                { n: "03", t: "3 actions — every month, that's it.", b: "Ranked by what moves your score fastest.", h: "Always know exactly what to do." },
                { n: "04", t: "The day everything changes.", b: "Michael reviews and gets you approved.", h: "Your name. Zero down." },
              ].map((step) => (
                <div key={step.n} style={{ background: NAVY, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16, padding: 24, transition: "transform 0.25s ease, border-color 0.25s ease" }} onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.borderColor = "rgba(0,201,167,0.25)"; }} onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}>
                  <p style={{ fontSize: 22, fontWeight: 800, color: TEAL, marginBottom: 12, letterSpacing: "-0.02em" }}>{step.n}</p>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 8 }}>{step.t}</h3>
                  <p style={{ fontSize: 13, lineHeight: 1.65, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>{step.b}</p>
                  <p style={{ fontSize: 13, lineHeight: 1.65, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>{step.h}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RULES */}
        <section style={{ background: NAVY, padding: "56px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: TEAL, marginBottom: 16, textAlign: "center" }}>Non-negotiables</p>
            <h2 style={{ fontSize: "clamp(20px, 2.4vw, 28px)", fontWeight: 800, lineHeight: 1.12, letterSpacing: "-0.02em", color: "#fff", marginBottom: 40, textAlign: "center" }}>
              Three rules. <span style={{ fontWeight: 300, color: "rgba(255,255,255,0.6)" }}>No exceptions.</span>
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ background: "rgba(239,68,68,0.04)", border: "1.5px solid rgba(239,68,68,0.25)", borderRadius: 14, padding: "18px 22px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                <span style={{ fontSize: 18 }}>🔕</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "#ef4444", marginBottom: 4 }}>Zero new applications</p>
                  <p style={{ fontSize: 13, lineHeight: 1.65, color: "rgba(255,255,255,0.55)" }}>Do not apply anywhere <span style={{ color: "#ef4444", fontWeight: 700 }}>without contacting us.</span> Hard inquiries do damage.</p>
                </div>
              </div>

              <div style={{ background: NAVY_DEEP, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "18px 22px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                <span style={{ fontSize: 18 }}>⏰</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Pay on time. Every single time.</p>
                  <p style={{ fontSize: 13, lineHeight: 1.65, color: "rgba(255,255,255,0.55)" }}>Set up <span style={{ color: TEAL, fontWeight: 700 }}>pre-authorized payments on every account.</span> No exceptions.</p>
                </div>
              </div>

              <div style={{ background: NAVY_DEEP, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "18px 22px", display: "flex", gap: 14, alignItems: "flex-start" }}>
                <span style={{ fontSize: 18 }}>📊</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 4 }}>Stay under 30% utilization</p>
                  <p style={{ fontSize: 13, lineHeight: 1.65, color: "rgba(255,255,255,0.55)" }}>Keep every card <strong style={{ color: "#fff" }}>under 30% of its limit.</strong> Going over drops your score, anytime.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIAL */}
        <section style={{ background: NAVY_DEEP, padding: "56px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
            <div style={{ fontSize: 18, color: TEAL, marginBottom: 24, letterSpacing: "0.1em" }}>★★★★★</div>
            <p style={{ fontSize: "clamp(16px, 1.8vw, 20px)", fontWeight: 600, lineHeight: 1.5, color: "#fff", marginBottom: 28, letterSpacing: "-0.01em" }}>
              "My credit (was) shot and I wasn't sure how I was going to get back into a vehicle. Michael took great care of me — incredibly patient with all my anxiety. As long as I make my payments on time… <span style={{ color: TEAL, fontWeight: 700 }}>(I had) the vehicle I wanted in a year.</span>"
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, color: TEAL }}>— Cassandra Brinson</p>
          </div>
        </section>

        {/* GUARANTEE */}
        <section style={{ background: NAVY, padding: "56px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: TEAL, marginBottom: 20 }}>Our promise</p>
            <h2 style={{ fontSize: "clamp(20px, 2.4vw, 28px)", fontWeight: 800, lineHeight: 1.18, letterSpacing: "-0.02em", color: "#fff", marginBottom: 20 }}>
              Your score moves — <span style={{ color: TEAL }}>or we work for free.</span>
            </h2>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.6)" }}>
              Follow the program for 12 months, and if your score doesn't move — we work with you at no charge until you're <span style={{ color: TEAL, fontWeight: 700 }}>approved.</span>
            </p>
          </div>
        </section>

        {/* CTA */}
        <section style={{ background: NAVY_DEEP, padding: "56px 24px", textAlign: "center" }}>
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <h2 style={{ fontSize: "clamp(22px, 2.6vw, 32px)", fontWeight: 800, lineHeight: 1.08, letterSpacing: "-0.03em", color: "#fff", marginBottom: 16 }}>
              Built for Canadian families <span style={{ color: TEAL }}>the system forgot.</span>
            </h2>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.6)", marginBottom: 36 }}>
              Your vehicle is still out there. Let's go get it.
            </p>
            <Link href="/onboarding" style={{ background: TEAL, color: NAVY, padding: "18px 44px", borderRadius: 100, fontSize: 14, fontWeight: 800, textDecoration: "none", letterSpacing: "0.08em", textTransform: "uppercase", display: "inline-block", transition: "transform 0.2s" }} onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-2px) scale(1.02)")} onMouseOut={(e) => (e.currentTarget.style.transform = "translateY(0) scale(1)")}>
              Start My Drive Ready Program
            </Link>
            <p style={{ marginTop: 14, fontSize: 12, color: "rgba(0,201,167,0.65)" }}>
              <strong style={{ color: TEAL }}>~50¢/day</strong> after your free trial · Cancel anytime · No contracts
            </p>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ background: NAVY_DEEP, padding: "32px 24px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: TEAL, letterSpacing: "0.12em", textTransform: "uppercase" }}>Credit Path Canada — Drive Ready Program</p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 10 }}>(604) 442-0894 · info@creditpathcanada.ca</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>34 W 7th Ave #401, Vancouver BC V5Y 1L6</p>
          <div style={{ marginTop: 16, display: "flex", gap: 12, justifyContent: "center" }}>
            <a href="/privacy-policy" style={{ fontSize: 11, color: TEAL, textDecoration: "none" }}>Privacy Policy</a>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
            <a href="/user-agreement" style={{ fontSize: 11, color: TEAL, textDecoration: "none" }}>User Agreement</a>
          </div>
        </footer>

      </main>

      <style jsx>{`
        @media (max-width: 768px) {
          .michael-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
