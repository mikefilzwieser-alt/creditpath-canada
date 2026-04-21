"use client";

import Link from "next/link";
import { DM_Mono, DM_Sans, Montserrat } from "next/font/google";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { defaultTenant } from "@/lib/tenant";

type GoalOption = {
  id: string;
  label: string;
};

const GOAL_OPTIONS: GoalOption[] = [
  { id: "debt_consolidation", label: "Get Approved for Auto Loan (or Upgrade)" },
  { id: "refi_lower_rate", label: "Refinance at a Lower Rate" },
  { id: "mortgage", label: "Mortgage Readiness" },
  { id: "score_increase", label: "Increase My Credit Score" },
  { id: "start_business", label: "Build Business Credit" },
  { id: "emergency_loc", label: "Emergency Line of Credit" },
];

const TOTAL_STEPS = 4;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
});

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [draggedGoalId, setDraggedGoalId] = useState<string | null>(null);
  const [borrowellConfirmed, setBorrowellConfirmed] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [transitNumber, setTransitNumber] = useState("");
  const [institutionNumber, setInstitutionNumber] = useState("");
  const [pipedaConsent, setPipedaConsent] = useState(false);
  const [padAuthorization, setPadAuthorization] = useState(false);
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);
  const [accountError, setAccountError] = useState("");

  const primaryGoal = selectedGoals[0] ?? "";
  const canContinueGoals = selectedGoals.length > 0;
  const canContinueBorrowell = borrowellConfirmed;
  const canContinueUpload = Boolean(pdfFile) && !isUploading;
  const canCreateAccount =
    fullName.trim().length > 1 &&
    email.includes("@") &&
    phone.trim().length >= 10 &&
    password.length >= 8 &&
    bankAccountNumber.trim().length > 0 &&
    /^\d{5}$/.test(transitNumber) &&
    /^\d{3}$/.test(institutionNumber) &&
    pipedaConsent &&
    padAuthorization;

  const firstPaymentDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toLocaleDateString("en-CA", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  const handleGoalAdd = (goalId: string) => {
    setAccountError("");
    setUploadMessage("");

    setSelectedGoals((prev) => {
      if (prev.includes(goalId)) return prev;
      if (prev.length >= 5) return prev;
      return [...prev, goalId];
    });
  };

  const handleGoalRemove = (goalId: string) => {
    setAccountError("");
    setUploadMessage("");
    setSelectedGoals((prev) => prev.filter((goal) => goal !== goalId));
  };

  const handleGoalDrop = (targetGoalId: string) => {
    if (!draggedGoalId || draggedGoalId === targetGoalId) return;

    setSelectedGoals((prev) => {
      const fromIndex = prev.indexOf(draggedGoalId);
      const toIndex = prev.indexOf(targetGoalId);
      if (fromIndex === -1 || toIndex === -1) return prev;

      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setDraggedGoalId(null);
  };

  const goalLabelById = useMemo(
    () => Object.fromEntries(GOAL_OPTIONS.map((goal) => [goal.id, goal.label])),
    [],
  );

  const handlePdfSelection = (file: File | null) => {
    setUploadMessage("");

    if (!file) {
      setPdfFile(null);
      return;
    }

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setPdfFile(null);
      setUploadMessage("Please upload a PDF file only.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setPdfFile(null);
      setUploadMessage("File is too large. Maximum size is 10MB.");
      return;
    }

    setPdfFile(file);
  };

  const handleUpload = async () => {
    if (!pdfFile) return;

    setIsUploading(true);
    setUploadProgress(10);
    setUploadMessage("");

    let progressValue = 10;
    const timer = setInterval(() => {
      progressValue = Math.min(progressValue + 10, 90);
      setUploadProgress(progressValue);
    }, 300);

    try {
      await new Promise((r) => setTimeout(r, 600));

      clearInterval(timer);
      setUploadProgress(100);
      setUploadMessage(
        "File saved for this step. After you create your account, upload the same PDF from Dashboard → Upload to parse it and build your blueprint.",
      );
      setStep(4);
    } catch {
      clearInterval(timer);
      setUploadProgress(0);
      setUploadMessage("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAccountSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canCreateAccount) return;

    setIsSubmittingAccount(true);
    setAccountError("");

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            goals: selectedGoals,
            primary_goal: goalLabelById[primaryGoal] ?? primaryGoal,
          },
        },
      });

      if (signUpError) {
        setAccountError(signUpError.message);
        return;
      }

      const accessToken = signUpData.session?.access_token;
      if (!accessToken) {
        setAccountError(
          "Your account was created, but we need an active session to finish setup. Confirm your email if required, then sign in and complete onboarding.",
        );
        return;
      }

      const createClientResponse = await fetch("/api/create-client", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          goals: selectedGoals,
          primary_goal: goalLabelById[primaryGoal] ?? primaryGoal,
        }),
      });

      const createClientPayload = (await createClientResponse.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!createClientResponse.ok) {
        setAccountError(createClientPayload.error ?? "Failed to create your client profile.");
        return;
      }

      router.push("/dashboard");
    } catch {
      setAccountError("Something went wrong while creating your account. Please try again.");
    } finally {
      setIsSubmittingAccount(false);
    }
  };

  return (
    <div className={`${dmSans.className} flex flex-1 flex-col bg-[#F5F7FA] px-4 py-6 sm:px-6 lg:py-10`}>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <header className="rounded-[16px] border border-[var(--cp-border)] bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,25,35,0.06)] sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <p
                className={`${dmMono.className} text-xs font-medium uppercase tracking-[0.28em] text-[var(--cp-teal)]`}
              >
                {defaultTenant.logoText}
              </p>
              <h1 className={`${montserrat.className} mt-2 text-2xl font-bold text-[var(--cp-dark)]`}>
                Let&apos;s Build Your Credit Path
              </h1>
              <p className="mt-1 text-sm text-[var(--cp-muted)]">
                Tell us where you want to go. We&apos;ll map the route.
              </p>
            </div>
            <div className="rounded-full bg-[var(--cp-dark)] px-3 py-1 text-xs font-semibold text-white">
              Step {step} of {TOTAL_STEPS}
            </div>
          </div>
          <div className="mt-4 h-2.5 rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-[var(--cp-teal)] transition-all duration-500 ease-out"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </header>

        {step === 1 && (
          <section className="rounded-[16px] border border-[var(--cp-border)] bg-white p-5 shadow-[0_8px_24px_rgba(15,25,35,0.06)] sm:p-6">
            <h2 className={`${montserrat.className} text-lg font-bold text-[var(--cp-dark)]`}>
              Step 1: Your Goals
            </h2>
            <p className="mt-1 text-sm text-[var(--cp-muted)]">
              Select your goals below. Drag to rank them — #1 is your top priority.
            </p>

            {/* Goal selection buttons */}
            <div className="mt-5 grid grid-cols-1 gap-3">
              {GOAL_OPTIONS.map((goal) => {
                const selected = selectedGoals.includes(goal.id);
                const rank = selectedGoals.indexOf(goal.id) + 1;
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() =>
                      selected ? handleGoalRemove(goal.id) : handleGoalAdd(goal.id)
                    }
                    className={`${montserrat.className} flex items-center justify-between rounded-xl border border-l-4 px-4 py-3 text-left text-sm font-semibold text-[var(--cp-dark)] transition-all duration-300 ease-out ${
                      selected
                        ? "border-[#00C9A7] bg-[#E8FAF6]"
                        : "border-[#E5E7EB] border-l-[#E5E7EB] bg-white hover:border-[#C9D2DE]"
                    }`}
                  >
                    <span>{goal.label}</span>
                    {selected ? (
                      <span className={`${dmMono.className} inline-flex size-6 items-center justify-center rounded-full bg-[#00C9A7] text-xs font-bold text-white`}>
                        {rank}
                      </span>
                    ) : (
                      <span className="inline-flex size-6 items-center justify-center rounded-full border border-[#E5E7EB] text-xs text-[var(--cp-muted)]">
                        +
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Ranked list — only shows when goals selected */}
            {selectedGoals.length > 1 && (
              <div className="mt-5">
                <p className={`${montserrat.className} text-sm font-bold text-[var(--cp-dark)]`}>
                  Drag to reorder — #1 is your primary goal
                </p>
                <ul className="mt-3 space-y-2">
                  {selectedGoals.map((goalId, index) => (
                    <li
                      key={goalId}
                      draggable
                      onDragStart={() => setDraggedGoalId(goalId)}
                      onDragEnd={() => setDraggedGoalId(null)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => handleGoalDrop(goalId)}
                      className={`flex cursor-grab items-center gap-3 rounded-xl border px-3 py-2 transition-all ${
                        draggedGoalId === goalId
                          ? "border-[#00C9A7] bg-[#E8FAF6] opacity-50"
                          : "border-[var(--cp-border)] bg-white"
                      }`}
                    >
                      <span
                        className={`${dmMono.className} inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          index === 0 ? "bg-[#00C9A7] text-white" : "bg-[#E8FAF6] text-[var(--cp-dark)]"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="flex-1 text-sm font-semibold text-[var(--cp-dark)]">
                        {goalLabelById[goalId] ?? goalId}
                        {index === 0 && (
                          <span className="ml-2 text-xs font-normal text-[var(--cp-teal)]">Primary</span>
                        )}
                      </span>
                      <span className="text-lg text-[var(--cp-muted)]" aria-hidden="true">⠿</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex items-center justify-between">
              <p className="text-xs text-[var(--cp-muted)]">
                {selectedGoals.length === 0
                  ? "Select at least one goal to continue"
                  : `${selectedGoals.length} goal${selectedGoals.length > 1 ? "s" : ""} selected`}
              </p>
              <button
                type="button"
                disabled={!canContinueGoals}
                onClick={() => setStep(2)}
                className={`${montserrat.className} rounded-[8px] bg-[var(--cp-teal)] px-5 py-3 text-sm font-bold text-[var(--cp-dark)] disabled:cursor-not-allowed disabled:opacity-50`}
              >
                Next
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="rounded-[16px] border border-[var(--cp-border)] bg-white p-5 shadow-[0_8px_24px_rgba(15,25,35,0.06)] sm:p-6">
            <h2 className={`${montserrat.className} text-lg font-bold text-[var(--cp-dark)]`}>
              Get Your Free Credit Report
            </h2>
            <p className="mt-1 text-sm text-[var(--cp-muted)]">
              Borrowell is free and shows your Equifax score. No hard inquiry — ever.
            </p>

            <div className="mt-4">
              <a
                href="https://borrowell.com"
                target="_blank"
                rel="noopener noreferrer"
                className={`${montserrat.className} inline-flex rounded-[8px] bg-[var(--cp-teal)] px-5 py-3 text-sm font-bold text-[var(--cp-dark)]`}
              >
                Sign Up for Borrowell
              </a>
            </div>

            <p className="mt-4 rounded-xl border border-[var(--cp-border)] bg-white p-4 text-sm text-[var(--cp-muted)]">
              Once signed up, download your credit report PDF from your Borrowell dashboard.
              You&apos;ll upload it on the next step.
            </p>

            <label className="mt-4 flex items-start gap-3 text-sm text-[var(--cp-dark)]">
              <input
                type="checkbox"
                checked={borrowellConfirmed}
                onChange={(event) => setBorrowellConfirmed(event.target.checked)}
                className="mt-1 size-4 rounded border-[var(--cp-border)]"
              />
              I&apos;ve signed up for Borrowell and have my report ready
            </label>

            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`${montserrat.className} rounded-[8px] border border-[var(--cp-border)] px-5 py-3 text-sm font-bold text-[var(--cp-dark)]`}
              >
                Back
              </button>
              <button
                type="button"
                disabled={!canContinueBorrowell}
                onClick={() => setStep(3)}
                className={`${montserrat.className} rounded-[8px] px-5 py-3 text-sm font-bold transition-colors ${
                  canContinueBorrowell
                    ? "cursor-pointer bg-[#00C9A7] text-[var(--cp-dark)]"
                    : "cursor-not-allowed bg-[#e2e8f0] text-[#9CA3AF]"
                }`}
              >
                Next
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="rounded-[16px] border border-[var(--cp-border)] bg-white p-5 shadow-[0_8px_24px_rgba(15,25,35,0.06)] sm:p-6">
            <h2 className={`${montserrat.className} text-lg font-bold text-[var(--cp-dark)]`}>
              Upload Your Credit Report
            </h2>
            <p className="mt-1 text-sm text-[var(--cp-muted)]">
              This is the foundation of your Credit Blueprint. Secure, private, and only used to
              build your plan.
            </p>

            <label
              className={`mt-4 block cursor-pointer rounded-2xl border-2 border-dashed bg-white p-6 text-center transition-colors ${
                isDragOver ? "border-[#00C9A7]" : "border-[var(--cp-border)]"
              }`}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragOver(false);
                const droppedFile = event.dataTransfer.files?.[0] ?? null;
                handlePdfSelection(droppedFile);
              }}
            >
              <input
                type="file"
                className="hidden"
                accept="application/pdf,.pdf"
                onChange={(event) => handlePdfSelection(event.target.files?.[0] ?? null)}
              />
              <p className="text-sm font-semibold text-[var(--cp-dark)]">
                Drag and drop your PDF here, or tap to browse
              </p>
              <p className="mt-1 text-xs text-[var(--cp-muted)]">PDF only, max 10MB</p>
              {pdfFile && (
                <p className="mt-3 text-sm font-medium text-[var(--cp-teal)]">{pdfFile.name}</p>
              )}
            </label>
            <p className="mt-3 text-xs text-[var(--cp-muted)]">
              Your report is encrypted and never shared.
            </p>

            {isUploading && (
              <div className="mt-4">
                <div className="h-2 rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-[var(--cp-teal)] transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-[var(--cp-muted)]">
                  Uploading and preparing your report...
                </p>
              </div>
            )}

            {uploadMessage && (
              <p className="mt-4 rounded-xl bg-[rgba(0,201,167,0.08)] p-3 text-sm text-[var(--cp-dark)]">
                {uploadMessage}
              </p>
            )}

            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className={`${montserrat.className} rounded-[8px] border border-[var(--cp-border)] px-5 py-3 text-sm font-bold text-[var(--cp-dark)]`}
              >
                Back
              </button>
              <button
                type="button"
                disabled={!canContinueUpload}
                onClick={handleUpload}
                className={`${montserrat.className} rounded-[8px] px-5 py-3 text-sm font-bold transition-colors ${
                  canContinueUpload
                    ? "cursor-pointer bg-[#00C9A7] text-[var(--cp-dark)]"
                    : "cursor-not-allowed bg-[#e2e8f0] text-[#9CA3AF]"
                }`}
              >
                {isUploading ? "Uploading..." : "Next"}
              </button>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="rounded-[16px] border border-[var(--cp-border)] bg-white p-5 shadow-[0_8px_24px_rgba(15,25,35,0.06)] sm:p-6">
            <h2 className={`${montserrat.className} text-lg font-bold text-[var(--cp-dark)]`}>
              Create Your Account
            </h2>
            <p className="mt-1 text-sm text-[var(--cp-muted)]">
              Your first month is on us. No charge for 30 days.
            </p>

            <form onSubmit={handleAccountSubmit} className="mt-5 space-y-4">
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Full name"
                className="w-full rounded-xl border border-[var(--cp-border)] bg-white px-4 py-3 text-sm"
              />
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                type="email"
                className="w-full rounded-xl border border-[var(--cp-border)] bg-white px-4 py-3 text-sm"
              />
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Phone"
                type="tel"
                className="w-full rounded-xl border border-[var(--cp-border)] bg-white px-4 py-3 text-sm"
              />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                type="password"
                className="w-full rounded-xl border border-[var(--cp-border)] bg-white px-4 py-3 text-sm"
              />

              <div className="rounded-[12px] border border-[#e2e8f0] bg-[#F8F9FC] p-5">
                <p
                  className={`${montserrat.className} flex items-center gap-2 text-sm font-bold text-[var(--cp-dark)]`}
                >
                  <span className="text-[var(--cp-teal)]" aria-hidden="true">
                    🔒
                  </span>
                  Pre-Authorized Debit (PAD)
                </p>
                <div className="mt-3 space-y-3">
                  <input
                    value={bankAccountNumber}
                    onChange={(event) => setBankAccountNumber(event.target.value.replace(/\D/g, ""))}
                    placeholder="Bank Account Number"
                    inputMode="numeric"
                    className="w-full rounded-xl border border-[var(--cp-border)] bg-white px-4 py-3 text-sm"
                  />
                  <input
                    value={transitNumber}
                    onChange={(event) =>
                      setTransitNumber(event.target.value.replace(/\D/g, "").slice(0, 5))
                    }
                    placeholder="Transit Number (5 digits)"
                    inputMode="numeric"
                    className="w-full rounded-xl border border-[var(--cp-border)] bg-white px-4 py-3 text-sm"
                  />
                  <input
                    value={institutionNumber}
                    onChange={(event) =>
                      setInstitutionNumber(event.target.value.replace(/\D/g, "").slice(0, 3))
                    }
                    placeholder="Institution Number (3 digits)"
                    inputMode="numeric"
                    className="w-full rounded-xl border border-[var(--cp-border)] bg-white px-4 py-3 text-sm"
                  />
                </div>
              </div>
              <p className="text-xs text-[var(--cp-muted)]">
                Your banking information is encrypted and never stored on our servers. Powered by
                Stripe.
              </p>

              <label className="flex items-start gap-3 text-xs text-[var(--cp-muted)]">
                <input
                  type="checkbox"
                  checked={padAuthorization}
                  onChange={(event) => setPadAuthorization(event.target.checked)}
                  className="mt-0.5 size-4 rounded border-[var(--cp-border)]"
                />
                I authorize Credit Path Canada to debit $19.99 CAD/month beginning 30 days from
                today. I can cancel anytime before then at no charge.
              </label>

              <label className="flex items-start gap-3 text-xs text-[var(--cp-muted)]">
                <input
                  type="checkbox"
                  checked={pipedaConsent}
                  onChange={(event) => setPipedaConsent(event.target.checked)}
                  className="mt-0.5 size-4 rounded border-[var(--cp-border)]"
                />
                I consent to the collection and secure use of my personal and credit bureau data
                to generate my Credit Blueprint in accordance with Canadian privacy requirements
                (PIPEDA).
              </label>

              <div className="rounded-xl border border-[var(--cp-border)] bg-[rgba(245,197,24,0.14)] p-4 text-sm text-[var(--cp-dark)]">
                Your first 30 days are completely free. First payment of $19.99 CAD on{" "}
                {firstPaymentDate}. Cancel anytime.
              </div>

              <button
                type="submit"
                disabled={!canCreateAccount || isSubmittingAccount}
                className={`${montserrat.className} w-full rounded-[8px] px-5 py-3 text-sm font-bold transition-colors ${
                  canCreateAccount && !isSubmittingAccount
                    ? "cursor-pointer bg-[#00C9A7] text-[var(--cp-dark)]"
                    : "cursor-not-allowed bg-[#e2e8f0] text-[#9CA3AF]"
                }`}
              >
                {isSubmittingAccount ? "Creating account..." : "Create Account"}
              </button>
              {accountError && (
                <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{accountError}</p>
              )}
            </form>

            <p className="mt-4 text-center text-xs text-[var(--cp-muted)]">
              Already started?{" "}
              <Link href="/" className="font-semibold text-[var(--cp-teal)]">
                Return home
              </Link>
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
