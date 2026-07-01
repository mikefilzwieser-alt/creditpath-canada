import Link from "next/link";
import { BrochureFooter } from "@/components/brochures/BrochureFooter";
import { ThreeRulesBlock } from "@/components/brochures/ThreeRulesBlock";
import { BROCHURE_CONTAINER, NAVY, NAVY_DEEP, TEAL } from "@/components/brochures/brochure-tokens";

const STEPS = [
  {
    n: "01",
    title: "Reply — we take care of everything",
    body: "We create your login and upload your Equifax. Don't lift a finger.",
  },
  {
    n: "02",
    title: "Get your personalized blueprint",
    body: "We soft-pull your Equifax report — every tradeline — built from your live file.",
  },
  {
    n: "03",
    title: "3 actions — every month, that's it",
    body: "Ranked by what moves your score fastest.",
  },
  {
    n: "04",
    title: "The day everything changes",
    body: "Michael reviews your file and works to get you approved. Your name. Zero down.",
  },
];

const SMS_REPLY_HREF = "sms:+16044420894?body=YES";
const REVIEWS_HREF = "https://titaniumford-michaelf-5stars.netlify.app/";
const CONSULT_HREF = "https://calendly.com/aec-michael/15min";

const pillButtonClass =
  "drive-ready-cta inline-block w-full rounded-full text-center text-[13px] font-extrabold uppercase tracking-[0.08em] no-underline sm:w-auto";

const pillButtonStyle = {
  background: TEAL,
  color: NAVY,
  padding: "16px 28px",
} as const;

const pillButtonSecondaryStyle = {
  background: "transparent",
  color: TEAL,
  padding: "14px 28px",
  border: `2px solid rgba(0, 201, 167, 0.45)`,
} as const;

export default function DriveReadyBrochurePage() {
  return (
    <div className="min-h-full" style={{ background: NAVY_DEEP, color: "#fff" }}>
      <style>{`
        @media (max-width: 639px) {
          .drive-ready-cta {
            display: block;
            width: 100%;
            box-sizing: border-box;
          }
        }
      `}</style>

      <header
        style={{
          background: NAVY,
          borderBottom: `1px solid rgba(0, 201, 167, 0.2)`,
        }}
      >
        <div
          className={`${BROCHURE_CONTAINER} flex items-center justify-between gap-4`}
          style={{ paddingTop: 14, paddingBottom: 14 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/Teal%20Logo.png"
            alt="Credit Path Canada"
            style={{ height: 40, width: "auto", maxWidth: "min(180px, 55vw)", display: "block", borderRadius: 8 }}
          />
          <span
            aria-label="Canada"
            style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}
            title="Canada"
          >
            🇨🇦
          </span>
        </div>
      </header>

      <main>
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
              zIndex: 0,
            }}
          />
          <div className={`${BROCHURE_CONTAINER} relative text-center`} style={{ zIndex: 1 }}>
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
              Canada&apos;s Drive Ready Program is designed to get you approved — many clients in 8 to 10 months.
            </p>
          </div>
        </section>

        <section style={{ background: NAVY, padding: "56px 24px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className={`${BROCHURE_CONTAINER} grid gap-10 md:grid-cols-[minmax(0,1fr)_1.4fr] md:items-start`}>
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
              <blockquote
                style={{
                  margin: 0,
                  fontSize: 14,
                  lineHeight: 1.8,
                  color: "rgba(255,255,255,0.75)",
                  borderLeft: `3px solid ${TEAL}`,
                  paddingLeft: 20,
                }}
              >
                I&apos;m Michael Filzwieser — Finance Director at Titanium Ford, part of TD&apos;s #1 dealer group in
                Canada. I work subprime, which means most people who reach my desk have already been told no. I see it
                every day: good people declined, not because they can&apos;t be helped, but because nobody gave them a
                plan. I built Credit Path Canada so that a rejection isn&apos;t the end of the road. It&apos;s the start
                of one.
              </blockquote>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/sig.jpg"
                alt="Michael Filzwieser signature"
                style={{
                  width: 120,
                  maxWidth: "100%",
                  height: "auto",
                  display: "block",
                  marginTop: 20,
                  marginBottom: 16,
                  borderRadius: 8,
                  opacity: 0.9,
                }}
              />
              <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Michael Filzwieser</p>
              <p style={{ fontSize: 13, lineHeight: 1.8, color: "rgba(255,255,255,0.6)" }}>
                Founder, Credit Path Canada
                <br />
                Finance Director, Titanium Ford
                <br />
                TD&apos;s #1 dealer in Canada
              </p>
            </div>
          </div>
        </section>

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
            <p style={{ fontSize: 14, lineHeight: 1.75, color: "rgba(255,255,255,0.65)", maxWidth: 640 }}>
              Applications get declined every day — because nobody gave them a plan. We give you the blueprint: a
              personalized credit plan built from your real file.
            </p>
          </div>
        </section>

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
              The Drive Ready Program
            </p>
            <h2
              style={{
                fontSize: "clamp(20px, 2.4vw, 28px)",
                fontWeight: 800,
                textAlign: "center",
                marginBottom: 32,
              }}
            >
              Four steps. Here&apos;s exactly what happens.
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
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, lineHeight: 1.35 }}>{step.title}</h3>
                  <p style={{ fontSize: 13, lineHeight: 1.65, color: "rgba(255,255,255,0.55)" }}>{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <ThreeRulesBlock variant="dark" />

        <section style={{ background: NAVY_DEEP, padding: "56px 24px" }}>
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
              Testimonial
            </p>
            <p
              style={{
                fontSize: "clamp(16px, 2vw, 19px)",
                fontWeight: 600,
                lineHeight: 1.55,
                marginBottom: 20,
                fontStyle: "italic",
              }}
            >
              &ldquo;My credit was shot and I wasn&apos;t sure how I was going to get back into a vehicle. Michael took
              great care of me — incredibly patient with all my anxiety. As long as I make my payments on time, I had the
              vehicle I wanted in a year. Thank you for your time, energy, patience and most of all kindness.&rdquo;
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, color: TEAL, marginBottom: 28 }}>— Cassandra Brinson</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
              <a
                href={REVIEWS_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className={pillButtonClass}
                style={pillButtonStyle}
              >
                5 Star Reviews
              </a>
              <a
                href={CONSULT_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className={pillButtonClass}
                style={pillButtonSecondaryStyle}
              >
                Book a Free Credit Consultation
              </a>
            </div>
          </div>
        </section>

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
              Follow the program for 12 months, and if your score doesn&apos;t move, we work with you at no charge until
              you&apos;re approved.
            </p>
          </div>
        </section>

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
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.65)", marginBottom: 28 }}>
              Your vehicle is still out there. Let&apos;s go get it.
            </p>
            <Link href={SMS_REPLY_HREF} className={pillButtonClass} style={pillButtonStyle}>
              Reply Now — We&apos;ll Set It Up
            </Link>
            <p style={{ fontSize: 13, fontWeight: 600, color: TEAL, marginTop: 20 }}>creditpathcanada.ca</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 16, lineHeight: 1.6 }}>
              About 50 cents/day after your free trial · Cancel anytime · No contracts
            </p>
          </div>
        </section>
      </main>

      <BrochureFooter />
    </div>
  );
}
