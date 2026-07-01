import Link from "next/link";
import { BrochureFooter } from "@/components/brochures/BrochureFooter";
import { ThreeRulesBlock } from "@/components/brochures/ThreeRulesBlock";
import { BROCHURE_CONTAINER, NAVY, NAVY_DEEP, TEAL } from "@/components/brochures/brochure-tokens";

const VALUE_ITEMS = [
  { tag: "[Value tag]", title: "[What's included item 1]", body: "[Placeholder copy]" },
  { tag: "[Value tag]", title: "[What's included item 2]", body: "[Placeholder copy]" },
  { tag: "[Value tag]", title: "[What's included item 3]", body: "[Placeholder copy]" },
  { tag: "[Value tag]", title: "[What's included item 4]", body: "[Placeholder copy]" },
  { tag: "[Value tag]", title: "[What's included item 5]", body: "[Placeholder copy]" },
  { tag: "[Value tag]", title: "[What's included item 6]", body: "[Placeholder copy]" },
];

const NEXT_STEPS = [
  { n: "01", title: "[What happens next — step 1]", body: "[Placeholder copy]" },
  { n: "02", title: "[What happens next — step 2]", body: "[Placeholder copy]" },
  { n: "03", title: "[What happens next — step 3]", body: "[Placeholder copy]" },
];

export default function WelcomeBrochurePage() {
  return (
    <div className="min-h-full" style={{ background: "#F5F7FA", color: NAVY }}>
      <main>
        {/* Hero + founder */}
        <section
          style={{
            background: NAVY_DEEP,
            padding: "56px 24px 64px",
            position: "relative",
            overflow: "hidden",
            color: "#fff",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: "-200px",
              right: "-150px",
              width: "600px",
              height: "600px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(0,201,167,0.1) 0%, transparent 65%)",
              pointerEvents: "none",
            }}
          />
          <div className={`${BROCHURE_CONTAINER} relative z-[1]`}>
            <div className="grid gap-10 md:grid-cols-2 md:items-center">
              <div>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.28em",
                    textTransform: "uppercase",
                    color: TEAL,
                    marginBottom: 16,
                  }}
                >
                  Credit Path Canada
                </p>
                <h1
                  style={{
                    fontSize: "clamp(28px, 5vw, 44px)",
                    fontWeight: 800,
                    lineHeight: 1.08,
                    letterSpacing: "-0.03em",
                    marginBottom: 16,
                  }}
                >
                  Congratulations. You&apos;re in.
                </h1>
                <p style={{ fontSize: 15, lineHeight: 1.75, color: "rgba(255,255,255,0.7)", marginBottom: 24 }}>
                  [Placeholder — Your blueprint is ready — and we&apos;re in your corner every step of the way.]
                </p>
              </div>
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Michael Filzwieser</p>
                <p style={{ fontSize: 12, lineHeight: 1.7, color: "rgba(255,255,255,0.55)" }}>
                  Founder, Credit Path Canada
                  <br />
                  Finance Director, Titanium Ford
                </p>
                <p style={{ marginTop: 16, fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.5)" }}>
                  [Placeholder — founder block copy]
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What's included */}
        <section style={{ padding: "56px 24px" }}>
          <div className={BROCHURE_CONTAINER}>
            <h2 style={{ fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 800, marginBottom: 24, textAlign: "center" }}>
              What&apos;s included
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {VALUE_ITEMS.map((item, idx) => (
                <article
                  key={idx}
                  style={{
                    background: "#fff",
                    border: "1px solid rgba(15,25,35,0.08)",
                    borderRadius: 16,
                    padding: 24,
                    boxShadow: "0 4px 20px rgba(15,25,35,0.04)",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      borderRadius: 100,
                      padding: "4px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      background: "rgba(0,201,167,0.12)",
                      color: TEAL,
                      marginBottom: 12,
                    }}
                  >
                    {item.tag}
                  </span>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{item.title}</h3>
                  <p style={{ fontSize: 13, lineHeight: 1.65, color: "rgba(15,25,35,0.7)" }}>{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Founder's note */}
        <section style={{ background: "#fff", padding: "56px 24px", borderTop: "1px solid rgba(15,25,35,0.06)" }}>
          <div className={`${BROCHURE_CONTAINER} max-w-[720px]`}>
            <h2 style={{ fontSize: "clamp(20px, 2.4vw, 26px)", fontWeight: 800, marginBottom: 16 }}>Founder&apos;s note</h2>
            <p style={{ fontSize: 14, lineHeight: 1.75, color: "rgba(15,25,35,0.75)", marginBottom: 20 }}>
              [Placeholder — founder&apos;s note body copy]
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sig.jpg" alt="Michael Filzwieser signature" style={{ width: 120, opacity: 0.9 }} />
          </div>
        </section>

        {/* Book review CTA */}
        <section style={{ padding: "40px 24px" }}>
          <div className={`${BROCHURE_CONTAINER} max-w-[640px] text-center`}>
            <Link
              href="https://calendly.com/aec-michael/15min"
              style={{
                display: "inline-block",
                background: TEAL,
                color: NAVY,
                padding: "14px 32px",
                borderRadius: 100,
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              Book a 15-Min Credit Review
            </Link>
          </div>
        </section>

        {/* What happens next */}
        <section style={{ background: "#fff", padding: "56px 24px" }}>
          <div className={BROCHURE_CONTAINER}>
            <h2 style={{ fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 800, marginBottom: 28, textAlign: "center" }}>
              What happens next
            </h2>
            <div className="grid gap-5 md:grid-cols-3">
              {NEXT_STEPS.map((step) => (
                <article
                  key={step.n}
                  style={{
                    background: "#F8F6F1",
                    borderRadius: 16,
                    padding: 24,
                    border: "1px solid rgba(15,25,35,0.06)",
                  }}
                >
                  <p style={{ fontSize: 22, fontWeight: 800, color: TEAL, marginBottom: 12 }}>{step.n}</p>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{step.title}</h3>
                  <p style={{ fontSize: 13, lineHeight: 1.65, color: "rgba(15,25,35,0.7)" }}>{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Igor testimonial */}
        <section style={{ padding: "56px 24px" }}>
          <div
            className={`${BROCHURE_CONTAINER} max-w-[800px] text-center`}
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "32px 28px",
              border: "1px solid rgba(15,25,35,0.08)",
            }}
          >
            <p style={{ fontSize: 18, color: TEAL, marginBottom: 20 }} aria-hidden>
              ★★★★★
            </p>
            <p style={{ fontSize: "clamp(16px, 2vw, 19px)", fontWeight: 600, lineHeight: 1.55, marginBottom: 16 }}>
              [Placeholder — Igor Sarkisov testimonial quote]
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, color: TEAL }}>— Igor Sarkisov</p>
          </div>
        </section>

        <ThreeRulesBlock variant="light" />

        {/* Log in CTA */}
        <section style={{ background: NAVY_DEEP, padding: "56px 24px", color: "#fff", textAlign: "center" }}>
          <div className={`${BROCHURE_CONTAINER} max-w-[700px]`}>
            <h2 style={{ fontSize: "clamp(22px, 2.6vw, 30px)", fontWeight: 800, marginBottom: 16 }}>
              Our promise: Log in. See your actions. First 30 days completely free.
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.65)", marginBottom: 24 }}>
              [Placeholder — login CTA supporting copy]
            </p>
            <Link
              href="/login"
              style={{
                display: "inline-block",
                background: TEAL,
                color: NAVY,
                padding: "14px 32px",
                borderRadius: 100,
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              [Placeholder — Log In CTA]
            </Link>
          </div>
        </section>

        {/* Score moves promise */}
        <section style={{ background: NAVY, padding: "56px 24px", color: "#fff", textAlign: "center" }}>
          <div className={`${BROCHURE_CONTAINER} max-w-[800px]`}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: TEAL,
                marginBottom: 16,
              }}
            >
              Our promise
            </p>
            <h2 style={{ fontSize: "clamp(20px, 2.4vw, 28px)", fontWeight: 800, marginBottom: 16 }}>
              Your score moves — or we work for free.
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.75, color: "rgba(255,255,255,0.6)" }}>
              [Placeholder — score moves promise body copy]
            </p>
          </div>
        </section>
      </main>

      <BrochureFooter />
    </div>
  );
}
