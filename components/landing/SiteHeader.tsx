"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";

type SiteHeaderProps = {
  /** Highlights "Blog" when true (e.g. on /blog routes). */
  blogActive?: boolean;
  /** Highlights "FAQ" when true (e.g. on /faq). */
  faqActive?: boolean;
  /** Highlights "Free Resources" when true (e.g. on /resources). */
  resourcesActive?: boolean;
};

export function SiteHeader({ blogActive = false, faqActive = false, resourcesActive = false }: SiteHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!mobileMenuRef.current) return;
      if (!mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [mobileMenuOpen]);

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
        <button
          type="button"
          className="md:hidden"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((v) => !v)}
          style={{
            border: "1px solid rgba(15, 25, 35, 0.18)",
            borderRadius: "10px",
            width: "40px",
            height: "40px",
            backgroundColor: "#fff",
            color: "#0F1923",
            fontSize: "22px",
            lineHeight: 1,
            fontWeight: 700,
          }}
        >
          ☰
        </button>
        <div
          className="hidden md:flex"
          style={{ alignItems: "center", gap: "12px", flexWrap: "wrap", justifyContent: "flex-end" }}
        >
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
      {mobileMenuOpen ? (
        <div
          className="md:hidden"
          style={{ position: "fixed", inset: 0, zIndex: 40 }}
          aria-hidden
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            ref={mobileMenuRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              marginTop: "86px",
              width: "100%",
              backgroundColor: "#fff",
              borderTop: "1px solid rgba(15, 25, 35, 0.08)",
              borderBottom: "1px solid rgba(15, 25, 35, 0.08)",
              boxShadow: "0 10px 28px rgba(15,25,35,0.12)",
              padding: "14px 24px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Link href="/blog" style={linkStyle(blogActive)} onClick={() => setMobileMenuOpen(false)}>
              Blog
            </Link>
            <Link href="/faq" style={linkStyle(faqActive)} onClick={() => setMobileMenuOpen(false)}>
              FAQ
            </Link>
            <Link href="/resources" style={linkStyle(resourcesActive)} onClick={() => setMobileMenuOpen(false)}>
              Free Resources
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                border: "2px solid #00C9A7",
                backgroundColor: "transparent",
                color: "#0F1923",
                padding: "8px 16px",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
                textAlign: "center",
              }}
            >
              Sign in
            </Link>
            <Link
              href="/onboarding"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                backgroundColor: "#00C9A7",
                color: "#0F1923",
                padding: "10px 18px",
                borderRadius: "12px",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
                textAlign: "center",
              }}
            >
              Get Your Blueprint
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
