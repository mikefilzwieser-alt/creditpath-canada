import Link from "next/link";
import { BROCHURE_CONTAINER, NAVY_DEEP, TEAL } from "@/components/brochures/brochure-tokens";

export function BrochureFooter() {
  return (
    <footer
      style={{
        background: NAVY_DEEP,
        padding: "32px 24px",
        textAlign: "center",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className={BROCHURE_CONTAINER}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: TEAL,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Credit Path Canada — Drive Ready Program
        </p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 10 }}>
          (604) 442-0894 · info@creditpathcanada.ca
        </p>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 12, lineHeight: 1.6 }}>
          about 50 cents/day after your free trial · Cancel anytime · No contracts
        </p>
        <div style={{ marginTop: 16, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/privacy-policy" style={{ fontSize: 11, color: TEAL, textDecoration: "none" }}>
            Privacy Policy
          </Link>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
          <Link href="/user-agreement" style={{ fontSize: 11, color: TEAL, textDecoration: "none" }}>
            User Agreement
          </Link>
        </div>
      </div>
    </footer>
  );
}
