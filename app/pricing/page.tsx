"use client";

import Image from "next/image";
import Link from "next/link";
import { Montserrat } from "next/font/google";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const montserrat = Montserrat({ subsets: ["latin"], weight: ["600", "700"] });

const TEAL = "#00C9A7";
const NAVY = "#0F1923";
const BG = "#F5F7FA";

export default function PricingPage() {
  const h = montserrat.className;
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setSignedIn(Boolean(data.session));
      setReady(true);
    })();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(Boolean(session));
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const startCheckout = useCallback(async () => {
    setError("");
    if (!signedIn) {
      window.location.href = "/onboarding";
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not start checkout.");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError("Checkout did not return a URL.");
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }, [signedIn]);

  return (
    <div className={`min-h-screen px-4 py-12 sm:px-8 ${h}`} style={{ backgroundColor: BG, color: NAVY }}>
      <div className="mx-auto max-w-lg">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold opacity-80 hover:opacity-100" style={{ color: TEAL }}>
          ← Back to home
        </Link>

        <div className="mt-8 rounded-2xl border-2 bg-white p-8 shadow-lg" style={{ borderColor: "rgba(0,201,167,0.35)" }}>
          <div className="flex justify-center">
            <Image src="/Teal Logo.png" alt="Credit Path Canada" width={280} height={70} className="h-14 w-auto object-contain" priority />
          </div>
          <p className="mt-6 text-center text-xs font-bold uppercase tracking-[0.2em]" style={{ color: TEAL }}>
            Simple pricing
          </p>
          <h1 className="mt-2 text-center text-2xl font-bold tracking-tight">Credit Education Program</h1>
          <p className="mt-4 text-center text-3xl font-bold tabular-nums" style={{ color: TEAL }}>
            $8.88
            <span className="text-lg font-semibold text-[#0F1923]/70"> / biweekly</span>
          </p>

          <div
            className="mt-6 rounded-xl border px-4 py-3 text-center text-sm font-semibold"
            style={{ borderColor: TEAL, backgroundColor: "rgba(0,201,167,0.12)", color: NAVY }}
          >
            30-day free trial — explore the full program before your first charge.
          </div>

          <ul className="mt-6 space-y-3 text-sm leading-relaxed text-[#0F1923]/80">
            <li className="flex gap-2">
              <span className="font-bold" style={{ color: TEAL }}>✓</span>
              Personalized monthly credit blueprint and priority actions
            </li>
            <li className="flex gap-2">
              <span className="font-bold" style={{ color: TEAL }}>✓</span>
              Bureau upload, goals, and coaching-aligned milestones
            </li>
            <li className="flex gap-2">
              <span className="font-bold" style={{ color: TEAL }}>✓</span>
              Cancel anytime from your Stripe billing portal after checkout
            </li>
          </ul>

          {error ? <p className="mt-4 text-center text-sm text-red-600">{error}</p> : null}

          <button
            type="button"
            disabled={!ready || busy}
            onClick={() => void startCheckout()}
            className="mt-8 w-full rounded-xl py-3.5 text-sm font-bold text-[#0F1923] shadow-md transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: TEAL }}
          >
            {busy ? "Redirecting…" : "Start free — 30 days on us"}
          </button>
          <p className="mt-3 text-center text-xs text-[#0F1923]/55">
            {signedIn ? "You’ll be sent to Stripe’s secure checkout." : "You’ll sign in first, then continue to Stripe."}
          </p>

          {signedIn ? (
            <Link href="/dashboard" className="mt-6 block text-center text-sm font-semibold underline" style={{ color: NAVY }}>
              Back to dashboard
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
