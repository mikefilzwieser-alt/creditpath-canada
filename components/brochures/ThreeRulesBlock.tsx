import { BROCHURE_CONTAINER, NAVY, TEAL } from "@/components/brochures/brochure-tokens";

type ThreeRulesBlockProps = {
  variant?: "dark" | "light";
};

const RULES = [
  {
    icon: "🔕",
    title: "Zero new applications",
    body: "Do not apply anywhere without contacting us first. Hard inquiries do damage.",
  },
  {
    icon: "⏰",
    title: "Pay on time. Every single time.",
    body: "Set up pre-authorized payments on every account. No exceptions.",
  },
  {
    icon: "📈",
    title: "Stay under 30% utilization",
    body: "Keep every card under 30% of its limit. Going over drops your score.",
  },
];

export function ThreeRulesBlock({ variant = "dark" }: ThreeRulesBlockProps) {
  const isDark = variant === "dark";
  const bg = isDark ? NAVY : "#F8F6F1";
  const headingColor = isDark ? "#fff" : "#0F1923";
  const subColor = isDark ? "rgba(255,255,255,0.6)" : "rgba(15,25,35,0.65)";

  return (
    <section style={{ background: bg, padding: "56px 24px" }}>
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
          Non-negotiables
        </p>
        <h2
          style={{
            fontSize: "clamp(20px, 2.4vw, 28px)",
            fontWeight: 800,
            lineHeight: 1.12,
            letterSpacing: "-0.02em",
            color: headingColor,
            marginBottom: 32,
            textAlign: "center",
          }}
        >
          Three rules. <span style={{ fontWeight: 300, color: subColor }}>No exceptions.</span>
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {RULES.map((rule) => (
            <div
              key={rule.title}
              style={{
                background: isDark ? "rgba(255,255,255,0.03)" : "#fff",
                border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(15,25,35,0.08)",
                borderRadius: 14,
                padding: "18px 22px",
                display: "flex",
                gap: 14,
                alignItems: "flex-start",
              }}
            >
              <span style={{ fontSize: 18 }} aria-hidden>
                {rule.icon}
              </span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 800, color: headingColor, marginBottom: 4 }}>{rule.title}</p>
                <p style={{ fontSize: 13, lineHeight: 1.65, color: subColor }}>{rule.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
