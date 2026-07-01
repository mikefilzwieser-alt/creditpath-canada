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
      </div>
    </footer>
  );
}
