"use client";

import { Montserrat } from "next/font/google";
import { useCallback, useState } from "react";
import { useDashboardAuth } from "@/components/dashboard/DashboardShell";
import { supabase } from "@/lib/supabase";

const montserrat = Montserrat({ subsets: ["latin"], weight: ["600", "700", "800"] });

const TEAL = "#00C9A7";
const NAVY = "#0F1923";

export default function AskMichaelPage() {
  const { user, loading: authLoading, headingFontClass } = useDashboardAuth();
  const h = headingFontClass || montserrat.className;
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = useCallback(async () => {
    if (!user || !question.trim()) return;
    setSubmitting(true);
    setError("");

    const { data: clientData } = await supabase
      .from("clients")
      .select("full_name, email, phone")
      .eq("id", user.id)
      .maybeSingle();

    const name = clientData?.full_name ?? user.email ?? "A client";
    const email = clientData?.email ?? user.email ?? "";
    const phone = clientData?.phone ?? "Not provided";

    const res = await fetch("/api/ask-michael", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: question.trim(),
        name,
        email,
        phone,
      }),
    });

    if (!res.ok) {
      setError("Something went wrong. Please try again or email us directly at info@creditpathcanada.ca");
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
  }, [question, user]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: `${TEAL} transparent ${TEAL} ${TEAL}` }} />
      </div>
    );
  }

  return (
    <div className={`mx-auto max-w-2xl space-y-8 ${montserrat.className}`} style={{ color: NAVY }}>
      <header>
        <h1 className={`text-2xl font-bold tracking-tight sm:text-3xl ${h}`}>Ask Michael</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#0F1923]/70">
          Have a question about your program or your blueprint actions? Ask below and Michael will personally respond within 3 business days.
        </p>
      </header>

      {submitted ? (
        <section
          className="rounded-2xl border-2 p-6 shadow-sm"
          style={{ borderColor: TEAL, backgroundColor: "rgba(0,201,167,0.08)" }}
        >
          <p className={`text-lg font-bold ${h}`} style={{ color: TEAL }}>Message received.</p>
          <p className="mt-2 text-sm leading-relaxed text-[#0F1923]/75">
            Michael will personally review your question and respond within 3 business days. Keep an eye on your inbox.
          </p>
        </section>
      ) : (
        <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm" style={{ borderColor: "rgba(15,25,35,0.08)" }}>
          <label className="block">
            <span className={`text-xs font-bold uppercase tracking-wide text-[#0F1923]/60 ${h}`}>Your question</span>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. I have a collection from 2021 — should I pay it or wait for it to fall off?"
              rows={6}
              className="mt-2 w-full rounded-xl border border-black/10 bg-[#F5F7FA] px-4 py-3 text-sm leading-relaxed text-[#0F1923] placeholder:text-[#0F1923]/40 focus:outline-none focus:ring-2"
              style={{ ["--tw-ring-color" as string]: TEAL }}
            />
          </label>
          {error ? (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          ) : null}
          <button
            type="button"
            disabled={submitting || !question.trim()}
            onClick={() => void handleSubmit()}
            className={`mt-5 inline-flex rounded-xl px-6 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60 ${h}`}
            style={{ backgroundColor: TEAL, color: NAVY }}
          >
            {submitting ? "Sending..." : "Send My Question →"}
          </button>
        </section>
      )}

      <section className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm" style={{ borderColor: "rgba(15,25,35,0.08)" }}>
        <p className={`text-sm font-bold ${h}`}>What you can ask about:</p>
        <ul className="mt-3 space-y-2 text-sm text-[#0F1923]/75">
          <li>→ Your monthly blueprint actions — anything unclear?</li>
          <li>→ Your program progress</li>
          <li>→ General questions about the Drive Ready Program</li>
        </ul>
      </section>
    </div>
  );
}
