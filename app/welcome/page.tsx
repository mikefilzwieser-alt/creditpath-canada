import Link from "next/link";
import { BrochureFooter } from "@/components/brochures/BrochureFooter";
import { ThreeRulesBlock } from "@/components/brochures/ThreeRulesBlock";
import { BROCHURE_CONTAINER, NAVY, NAVY_DEEP, TEAL } from "@/components/brochures/brochure-tokens";

const VALUE_ITEMS = [
  {
    icon: "📄",
    title: "Your Credit Blueprint",
    tag: "$497 VALUE",
    body: "A personalized 24-month plan built from your Equifax bureau.",
  },
  {
    icon: "✅",
    title: "Monthly Action Plan",
    tag: "$127/MO VALUE",
    body: "3 clear priorities every month, ranked by score impact.",
  },
  {
    icon: "💳",
    title: "Recommended Credit Products",
    tag: "$199 VALUE",
    body: "Access cards that move your score fastest.",
  },
  {
    icon: "💼",
    title: "Financial Planning Session",
    tag: "$199 VALUE",
    body: "Brandon Kirk at Safe Wealth Planners. No cost, no obligation.",
  },
  {
    icon: "🚗",
    title: "Direct Line to a Finance Director",
    tag: "PRICELESS",
    body: "Michael reviews your file personally. Speak with him anytime.",
  },
  {
    icon: "💰",
    title: "Personal Loan Access",
    tag: "NO HARD CHECK",
    body: "We connect you with trusted lending partners.",
  },
];

const NEXT_STEPS = [
  {
    n: "01",
    title: "Log in to your dashboard",
    body: (
      <>
        <Link href="/login" style={{ color: TEAL, textDecoration: "none", fontWeight: 700 }}>
          creditpathcanada.ca/login
        </Link>
        {" — your blueprint is built. It's waiting."}
      </>
    ),
  },
  {
    n: "02",
    title: "Find your 3 monthly actions",
    body: "3 actions ranked by score impact. Complete them — that's how your file gets ready.",
  },
  {
    n: "03",
    title: "That's the day everything changes",
    body: "Many clients are approved in 8 to 10 months. We're here anytime — let's ride.",
  },
];

export default function WelcomeBrochurePage() {
  return (
    <div className="min-h-full" style={{ background: "#F5F7FA", color: NAVY }}>
      <main>
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
              inset: 0,
              background:
                "radial-gradient(circle at 85% 15%, rgba(0,201,167,0.1) 0%, transparent 55%)",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
          <div className={BROCHURE_CONTAINER} style={{ position: "relative", zIndex: 1 }}>
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
              <div className="min-w-0 flex-1">
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
                <p style={{ fontSize: 15, lineHeight: 1.75, color: "rgba(255,255,255,0.7)" }}>
                  Your blueprint is ready — and we&apos;re in your corner every step of the way.
                </p>
              </div>
              <div
                className="min-w-0 w-full shrink-0 lg:max-w-sm"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 16,
                  padding: 24,
                }}
              >
                <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Michael Filzwieser</p>
                <p style={{ fontSize: 13, lineHeight: 1.8, color: "rgba(255,255,255,0.6)" }}>
                  Founder, Credit Path Canada
                  <br />
                  Finance Director, Titanium Ford
                  <br />
                  TD&apos;s #1 dealer in Canada
                </p>
              </div>
            </div>
          </div>
        </section>

        <section style={{ padding: "56px 24px" }}>
          <div className={BROCHURE_CONTAINER}>
            <h2
              style={{
                fontSize: "clamp(22px, 3vw, 30px)",
                fontWeight: 800,
                marginBottom: 28,
                textAlign: "center",
              }}
            >
              What&apos;s included
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {VALUE_ITEMS.map((item) => (
                <article
                  key={item.title}
                  style={{
                    background: "#fff",
                    border: "1px solid rgba(15,25,35,0.08)",
                    borderRadius: 16,
                    padding: 24,
                    boxShadow: "0 4px 20px rgba(15,25,35,0.04)",
                  }}
                >
                  <p style={{ fontSize: 22, marginBottom: 10 }} aria-hidden>
                    {item.icon}
                  </p>
                  <span
                    style={{
                      display: "inline-block",
                      borderRadius: 100,
                      padding: "4px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      background: "rgba(0,201,167,0.12)",
                      color: TEAL,
                      marginBottom: 10,
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

        <section style={{ background: "#fff", padding: "56px 24px", borderTop: "1px solid rgba(15,25,35,0.06)" }}>
          <div className={`${BROCHURE_CONTAINER} max-w-[720px]`}>
            <h2 style={{ fontSize: "clamp(20px, 2.4vw, 26px)", fontWeight: 800, marginBottom: 16 }}>
              Founder&apos;s note
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: "rgba(15,25,35,0.8)", marginBottom: 20 }}>
              A decline today means your file needs a plan — and that&apos;s exactly what you now have. The banks
              decline without telling you why; we show you the blueprint. They don&apos;t teach us this stuff in school.
              If you follow the plan and complete your actions, my job is to get you approved. I&apos;ll work at it
              until we get there. Welcome to the program. Let&apos;s get to work.
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>— Michael Filzwieser</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sig.jpg" alt="Michael Filzwieser signature" style={{ width: 120, opacity: 0.9 }} />
          </div>
        </section>

        <section style={{ padding: "48px 24px", background: "#F8F6F1" }}>
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

        <section style={{ background: "#fff", padding: "56px 24px" }}>
          <div className={BROCHURE_CONTAINER}>
            <h2
              style={{
                fontSize: "clamp(22px, 3vw, 30px)",
                fontWeight: 800,
                marginBottom: 28,
                textAlign: "center",
              }}
            >
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
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, lineHeight: 1.35 }}>{step.title}</h3>
                  <p style={{ fontSize: 13, lineHeight: 1.65, color: "rgba(15,25,35,0.7)" }}>{step.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

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
            <p
              style={{
                fontSize: "clamp(16px, 2vw, 19px)",
                fontWeight: 600,
                lineHeight: 1.55,
                marginBottom: 16,
                fontStyle: "italic",
              }}
            >
              &ldquo;This is the second time working with the Director of Finance, Michael Filzwieser. Things moved
              quickly and smoothly, he stayed within my comfort range for repayment. Makes you feel you&apos;re the most
              important client. I filed a consumer proposal 4 years ago which has an obviously negative impact. The
              approval process was smooth and it finished with a satisfactory deal!&rdquo;
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, color: TEAL }}>— Igor Sarkisov</p>
          </div>
        </section>

        <ThreeRulesBlock variant="light" />

        <section style={{ background: NAVY_DEEP, padding: "56px 24px", color: "#fff", textAlign: "center" }}>
          <div className={`${BROCHURE_CONTAINER} max-w-[700px]`}>
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
            <h2 style={{ fontSize: "clamp(22px, 2.6vw, 30px)", fontWeight: 800, marginBottom: 12 }}>
              Log in. See your actions.
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: "rgba(255,255,255,0.7)", marginBottom: 28 }}>
              First 30 days completely free.
            </p>
            <Link
              href="/login"
              style={{
                display: "inline-block",
                background: TEAL,
                color: NAVY,
                padding: "14px 36px",
                borderRadius: 100,
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              Let&apos;s Get to Work
            </Link>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 16, lineHeight: 1.6 }}>
              About 50 cents/day after your free trial · Cancel anytime · No contracts
            </p>
          </div>
        </section>

        <section style={{ background: NAVY, padding: "56px 24px", color: "#fff", textAlign: "center" }}>
          <div className={`${BROCHURE_CONTAINER} max-w-[800px]`}>
            <h2 style={{ fontSize: "clamp(20px, 2.4vw, 28px)", fontWeight: 800, marginBottom: 16 }}>
              Your score moves — or we work for free.
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.75, color: "rgba(255,255,255,0.6)" }}>
              Follow the program for 12 months, and if your score doesn&apos;t move, we work with you at no charge until
              you&apos;re approved.
            </p>
          </div>
        </section>
      </main>

      <BrochureFooter />
    </div>
  );
}
