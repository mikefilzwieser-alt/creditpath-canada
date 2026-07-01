import { BrochureFooter } from "@/components/brochures/BrochureFooter";
import { ThreeRulesBlock } from "@/components/brochures/ThreeRulesBlock";
import { BROCHURE_CONTAINER, NAVY, NAVY_DEEP, TEAL } from "@/components/brochures/brochure-tokens";

const STEPS = [
  { n: "01", title: "[Step 1 — Reply]", body: "[Placeholder — reply step copy]" },
  { n: "02", title: "[Step 2 — Blueprint]", body: "[Placeholder — blueprint step copy]" },
  { n: "03", title: "[Step 3 — 3 actions]", body: "[Placeholder — monthly actions step copy]" },
  { n: "04", title: "[Step 4 — Review]", body: "[Placeholder — review step copy]" },
];

export default function DriveReadyBrochurePage() {
  return (
    <div className="min-h-full" style={{ background: NAVY_DEEP, color: "#fff" }}>
      <main>
        {/* Hero */}
        <section
          style={{
            background: NAVY_DEEP,
            padding: "56px 24px 64px",
            position: "relative",
            overflow: "hidden",
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
          <div className={`${BROCHURE_CONTAINER} relative z-[1] text-center`}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: TEAL,
                marginBottom: 20,
              }}
            >
              Drive Ready Program
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
              The vehicle you came for.
              <br />
              We&apos;ll get you there.
            </h1>
            <p
              style={{
                fontSize: "clamp(18px, 3vw, 24px)",
                fontWeight: 700,
                color: TEAL,
                marginBottom: 16,
              }}
            >
              Your name. Zero down. Approved.
            </p>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.75,
                color: "rgba(255,255,255,0.65)",
                maxWidth: 560,
                margin: "0 auto",
              }}
            >
              [Placeholder — Canada&apos;s Drive Ready Program is designed to get you approved — many clients in 8
              to 10 months.]
            </p>
          </div>
        </section>

        {/* Real results strip */}
        <section style={{ background: NAVY, padding: "20px 24px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className={`${BROCHURE_CONTAINER} text-center`}>
            <p style={{ fontSize: 13, fontWeight: 700, color: TEAL, letterSpacing: "0.04em" }}>
              [Placeholder — Our first graduates purchased in April and May.]
            </p>
          </div>
        </section>

        {/* Founder block */}
        <section style={{ background: NAVY, padding: "56px 24px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className={`${BROCHURE_CONTAINER} grid gap-10 md:grid-cols-[minmax(0,1fr)_1.4fr] md:items-center`}>
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/headshot.jpg"
                alt="Michael Filzwieser"
                style={{
                  width: "100%",
                  maxWidth: 380,
                  borderRadius: 16,
                  display: "block",
                  border: `3px solid ${TEAL}`,
                }}
              />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Michael Filzwieser</p>
              <p style={{ fontSize: 12, lineHeight: 1.7, color: "rgba(255,255,255,0.55)" }}>
                Founder, Credit Path Canada
                <br />
                Finance Director, Titanium Ford
                <br />
                TD&apos;s #1 dealer in Canada
              </p>
              <p style={{ marginTop: 20, fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,0.5)" }}>
                [Placeholder — founder intro copy]
              </p>
            </div>
          </div>
        </section>

        {/* Why this happened */}
        <section style={{ background: NAVY_DEEP, padding: "56px 24px" }}>
          <div className={BROCHURE_CONTAINER}>
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
              Why this happened
            </p>
            <h2
              style={{
                fontSize: "clamp(22px, 3vw, 32px)",
                fontWeight: 800,
                lineHeight: 1.12,
                letterSpacing: "-0.02em",
                marginBottom: 20,
              }}
            >
              The banks said no. We know exactly why.
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.75, color: "rgba(255,255,255,0.65)" }}>
              [Placeholder — why this happened body copy]
            </p>
          </div>
        </section>

        {/* Four steps */}
        <section style={{ background: NAVY, padding: "56px 24px" }}>
          <div className={BROCHURE_CONTAINER}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: TEAL,
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              Four steps
            </p>
            <h2
              style={{
                fontSize: "clamp(20px, 2.4vw, 28px)",
                fontWeight: 800,
                textAlign: "center",
                marginBottom: 32,
              }}
            >
              [Placeholder — four steps section headline]
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step) => (
                <article
                  key={step.n}
                  style={{
                    background: NAVY_DEEP,
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 16,
                    padding: 24,
                  }}
                >
                  <p style={{ fontSize: 22, fontWeight: 800, color: TEAL, marginBottom: 12 }}>{step.n}</p>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{step.title}</h3>
                  <p style={{ fontSize: 13, lineHeight: 1.65, color: "rgba(255,255,255,0.55)" }}>{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <ThreeRulesBlock variant="dark" />

        {/* Cassandra testimonial */}
        <section style={{ background: NAVY_DEEP, padding: "56px 24px" }}>
          <div className={`${BROCHURE_CONTAINER} max-w-[800px] text-center`}>
            <p style={{ fontSize: 18, color: TEAL, marginBottom: 24, letterSpacing: "0.1em" }} aria-hidden>
              ★★★★★
            </p>
            <h2
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: TEAL,
                marginBottom: 20,
              }}
            >
              Testimonial
            </h2>
            <p
              style={{
                fontSize: "clamp(16px, 2vw, 20px)",
                fontWeight: 600,
                lineHeight: 1.5,
                marginBottom: 20,
              }}
            >
              [Placeholder — Cassandra Brinson testimonial quote]
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, color: TEAL }}>— Cassandra Brinson</p>
          </div>
        </section>

        {/* Our promise */}
        <section style={{ background: NAVY, padding: "56px 24px" }}>
          <div className={`${BROCHURE_CONTAINER} max-w-[800px] text-center`}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: TEAL,
                marginBottom: 20,
              }}
            >
              Our promise
            </p>
            <h2
              style={{
                fontSize: "clamp(20px, 2.4vw, 28px)",
                fontWeight: 800,
                lineHeight: 1.18,
                marginBottom: 16,
              }}
            >
              Your score moves — or we work for free.
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.75, color: "rgba(255,255,255,0.6)" }}>
              [Placeholder — promise body copy]
            </p>
          </div>
        </section>

        {/* CTA block */}
        <section style={{ background: NAVY_DEEP, padding: "56px 24px", textAlign: "center" }}>
          <div className={`${BROCHURE_CONTAINER} max-w-[700px]`}>
            <h2
              style={{
                fontSize: "clamp(22px, 2.6vw, 32px)",
                fontWeight: 800,
                lineHeight: 1.08,
                letterSpacing: "-0.03em",
                marginBottom: 16,
              }}
            >
              Built for Canadian families <span style={{ color: TEAL }}>the system forgot.</span>
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.6)" }}>
              [Placeholder — closing CTA body copy]
            </p>
            <p
              style={{
                marginTop: 24,
                display: "inline-block",
                background: TEAL,
                color: NAVY,
                padding: "14px 32px",
                borderRadius: 100,
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              [Placeholder CTA]
            </p>
          </div>
        </section>
      </main>

      <BrochureFooter />
    </div>
  );
}
