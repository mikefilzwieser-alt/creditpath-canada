import Link from "next/link";
import type { CSSProperties } from "react";

type SiteHeaderProps = {
  /** Highlights "Blog" when true (e.g. on /blog routes). */
  blogActive?: boolean;
  /** Highlights "FAQ" when true (e.g. on /faq). */
  faqActive?: boolean;
  /** Highlights "Free Resources" when true (e.g. on /resources). */
  resourcesActive?: boolean;
};

export function SiteHeader({ blogActive = false, faqActive = false, resourcesActive = false }: SiteHeaderProps) {
  const linkStyle = (active: boolean): CSSProperties => ({
    fontSize: "14px",
    fontWeight: 500,
    color: "#0F1923",
    textDecoration: active ? "underline" : "none",
    textUnderlineOffset: 4,
    textDecorationColor: active ? "#00C9A7" : "transparent",
  });

  return (
    <header
      style={{
        backgroundColor: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(0,0,0,0.08)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: "1152px",
          margin: "0 auto",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          <img
            src="/logo.png"
            alt="Credit Path Canada"
            style={{ height: "60px", width: "auto", display: "block" }}
          />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Link href="/blog" style={linkStyle(blogActive)}>
            Blog
          </Link>
          <Link href="/faq" style={linkStyle(faqActive)}>
            FAQ
          </Link>
          <Link href="/resources" style={linkStyle(resourcesActive)}>
            Free Resources
          </Link>
          <Link
            href="/login"
            style={{
              border: "2px solid #00C9A7",
              backgroundColor: "transparent",
              color: "#0F1923",
              padding: "6px 18px",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Sign in
          </Link>
          <Link
            href="/onboarding"
            style={{
              backgroundColor: "#00C9A7",
              color: "#0F1923",
              padding: "8px 20px",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Get Your Blueprint
          </Link>
        </div>
      </div>
    </header>
  );
}
