import { countNetworkCardsTowardMinimum, type ParsedBureauLite } from "@/lib/goals-milestone-helpers";

export type MonthlyProgramAction = {
  action: string;
  impact: string;
  timeline: string;
};

const ACTION_1 =
  "Do not apply for credit without contacting Credit Path Canada first";
const ACTION_2 = "Set up pre-authorized payments on every account";

function isConsumerProposal(parsed: ParsedBureauLite | null | undefined): boolean {
  const raw = parsed as Record<string, unknown> | null | undefined;
  return raw?.consumer_proposal === true;
}

function highestUtilizationRevolvingLine(parsed: ParsedBureauLite | null | undefined): {
  creditor: string;
  utilPct: number;
} | null {
  const tradelines = Array.isArray(parsed?.tradelines) ? parsed!.tradelines! : [];
  let best: { creditor: string; utilPct: number } | null = null;
  for (const t of tradelines) {
    const codeRaw = String(t?.equifax_rating_code ?? t?.rating_code ?? "")
      .trim()
      .toUpperCase()
      .replace(/\s/g, "");
    if (!/^R[1-9]/.test(codeRaw)) continue;
    const limit = typeof t.credit_limit === "number" ? t.credit_limit : Number(String(t.credit_limit ?? "").replace(/[^0-9.-]/g, ""));
    const bal = typeof t.balance === "number" ? t.balance : Number(String(t.balance ?? "").replace(/[^0-9.-]/g, ""));
    if (!Number.isFinite(limit) || limit <= 0 || !Number.isFinite(bal) || bal < 0) continue;
    const util = (bal / limit) * 100;
    if (!Number.isFinite(util)) continue;
    const creditor = String(t.creditor_name ?? "this account").trim() || "this account";
    if (!best || util > best.utilPct) best = { creditor, utilPct: util };
  }
  return best;
}

/** Month 1: exactly three actions (fixed 1–2, bureau-driven 3). */
export function buildFoundationMonthActions(parsed: ParsedBureauLite | null | undefined): MonthlyProgramAction[] {
  const cp = isConsumerProposal(parsed);
  const tradelines = Array.isArray(parsed?.tradelines) ? parsed!.tradelines! : [];
  const revolvingNetworkCount = countNetworkCardsTowardMinimum(tradelines);

  let third: MonthlyProgramAction;
  if (cp) {
    third = {
      action:
        "Open or use a secured credit product only (for example Neo Financial secured or Koho on a secured path) — do not apply for unsecured credit while you are in a Consumer Proposal.",
      impact: "Builds payment history safely",
      timeline: "Within 30 days",
    };
  } else if (revolvingNetworkCount < 3) {
    third = {
      action:
        "Add a secured credit card on the Visa or Mastercard network (Neo Financial or Koho secured) so you can build history toward three healthy revolving accounts.",
      impact: "Strengthens credit mix",
      timeline: "Within 45 days",
    };
  } else {
    const hi = highestUtilizationRevolvingLine(parsed);
    const label = hi ? hi.creditor : "your highest-utilization revolving account";
    const pct = hi ? Math.round(hi.utilPct) : null;
    third = {
      action: pct
        ? `Make extra payments toward ${label} this month — it is at about ${pct}% utilization. Every dollar paid down reduces what is hurting your score. Aim under 30% over time.`
        : `Make extra payments toward your highest-utilization revolving account this month. Every dollar paid down reduces what is hurting your score. Aim under 30% utilization over time.`,
      impact: "Lowers reported utilization",
      timeline: "This billing cycle",
    };
  }

  return [
    { action: ACTION_1, impact: "Protects your score", timeline: "Ongoing" },
    { action: ACTION_2, impact: "Prevents missed payments", timeline: "This week" },
    third,
  ];
}
