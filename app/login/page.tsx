"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-[var(--cp-bg-light)] px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-[var(--cp-border)] bg-white p-8 shadow-[0_8px_24px_rgba(15,25,35,0.06)]">
        <h1 className="font-[family-name:var(--font-syne)] text-2xl font-bold text-[var(--cp-dark)]">
          Sign in
        </h1>
        <p className="mt-1 text-sm text-[var(--cp-muted)]">Access your dashboard and Blueprint.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            placeholder="Email"
            className="w-full rounded-xl border border-[var(--cp-border)] px-4 py-3 text-sm"
          />
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-[var(--cp-border)] px-4 py-3 text-sm"
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[var(--cp-teal)] py-3 text-sm font-semibold text-[var(--cp-dark)] disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[var(--cp-muted)]">
          <Link href="/" className="font-semibold text-[var(--cp-teal)]">
            ← Back to home
          </Link>
          {" · "}
          <Link href="/onboarding" className="font-semibold text-[var(--cp-teal)]">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
