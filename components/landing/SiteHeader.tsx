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
  aboutActive?: boolean;
};

export function SiteHeader({ blogActive = false, faqActive = false, resourcesActive = false, aboutActive = false }: SiteHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!mobileMenuRef.current) return;
      const target = event.target as HTMLElement;
      if (mobileMenuRef.current.contains(target)) return;
      if (target.closest?.(".cp-site-header__menu-btn")) return;
      setMobileMenuOpen(false);
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
      <style>{`
        .cp-site-header__menu-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        @media (min-width: 768px) {
          .cp-site-header__menu-btn {
            display: none !important;
          }
        }
        .cp-site-header__desktop-nav {
          display: none;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        @media (min-width: 768px) {
          .cp-site-header__desktop-nav {
            display: flex;
          }
        }
        .cp-site-header__mobile-only {
          position: fixed;
          inset: 0;
          z-index: 40;
        }
        @media (min-width: 768px) {
          .cp-site-header__mobile-only {
            display: none !important;
            pointer-events: none;
          }
        }
      `}</style>
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
          className="cp-site-header__menu-btn"
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
        <div className="cp-site-header__desktop-nav">
          <Link href="/about" style={linkStyle(aboutActive)}>
            About
          </Link>
          <Link href="/blog" style={linkStyle(blogActive)}>
            Blog
          </Link>
          <Link href="/faq" style={linkStyle(faqActive)}>
            FAQ
          </Link>
          <Link href="/resources" style={linkStyle(resourcesActive)}>
            Free Resources
          </Link>
          <Link href="/drive-ready" style={linkStyle(false)}>
            Drive Ready
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
          className="cp-site-header__mobile-only"
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
            <Link
              href="/about"
              onClick={() => setMobileMenuOpen(false)}
              style={{ ...linkStyle(aboutActive), padding: "6px 0", textAlign: "center" }}
            >
              About
            </Link>
            <Link
              href="/blog"
              onClick={() => setMobileMenuOpen(false)}
              style={{ ...linkStyle(blogActive), padding: "6px 0", textAlign: "center" }}
            >
              Blog
            </Link>
            <Link
              href="/faq"
              onClick={() => setMobileMenuOpen(false)}
              style={{ ...linkStyle(faqActive), padding: "6px 0", textAlign: "center" }}
            >
              FAQ
            </Link>
            <Link
              href="/resources"
              onClick={() => setMobileMenuOpen(false)}
              style={{ ...linkStyle(resourcesActive), padding: "6px 0", textAlign: "center" }}
            >
              Free Resources
            </Link>
            <Link
              href="/drive-ready"
              onClick={() => setMobileMenuOpen(false)}
              style={{ ...linkStyle(false), padding: "6px 0", textAlign: "center" }}
            >
              Drive Ready
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
