// Provisional estimates based on general Equifax scoring guidance, not yet calibrated
// against verified before/after client data. Revisit once 20-30 real datapoints exist.

export type ScoreProjectionAction =
  | string
  | {
      action?: string | null;
      title?: string | null;
      impact?: string | null;
      timeline?: string | null;
    };

export type ScoreProjectionBureauFields = {
  utilizationPercentage?: number | null;
  preAuthRequired?: boolean | null;
  consumerProposal?: boolean | null;
  recentHardInquiryCount?: number | null;
};

export type ScoreProjectionRange = {
  low: number;
  high: number;
};

type LeverRange = {
  low: number;
  high: number;
};

const DEFAULT_RANGE: LeverRange = { low: 1, high: 3 };

function getActionText(action: ScoreProjectionAction): string {
  if (typeof action === "string") return action;
  return [action.action, action.title, action.impact, action.timeline].filter(Boolean).join(" ");
}

function utilizationRange(utilizationPercentage?: number | null): LeverRange {
  const utilization = typeof utilizationPercentage === "number" && Number.isFinite(utilizationPercentage)
    ? utilizationPercentage
    : 0;

  if (utilization >= 90) return { low: 8, high: 15 };
  if (utilization >= 50) return { low: 4, high: 10 };
  return { low: 2, high: 5 };
}

function classifyActionRange(action: ScoreProjectionAction, bureau: ScoreProjectionBureauFields): LeverRange {
  const text = getActionText(action).toLowerCase();

  if (
    /\b(utilization|balance|pay\s?down|paydown|extra payment|above the minimum|highest-utilization|highest utilization)\b/.test(text)
  ) {
    return utilizationRange(bureau.utilizationPercentage);
  }

  if (/\b(pre-?auth|pre-authorized|autopay|auto-pay|payment stability|on[- ]time|no new lates|late payment)\b/.test(text)) {
    return { low: 2, high: 6 };
  }

  if (/\b(hard inquiry|inquir|no new applications|do not apply|application freeze|credit freeze)\b/.test(text)) {
    return { low: 0, high: 3 };
  }

  if (bureau.consumerProposal && /\b(consumer proposal|proposal|reporting as agreed|payments? as agreed)\b/.test(text)) {
    return { low: 1, high: 4 };
  }

  return DEFAULT_RANGE;
}

export function calculateScoreProjection(
  actions: ScoreProjectionAction[],
  bureau: ScoreProjectionBureauFields,
): ScoreProjectionRange {
  const selectedActions = actions.slice(0, 3);
  const rawRange = selectedActions.reduce(
    (sum, action) => {
      const range = classifyActionRange(action, bureau);
      return {
        low: sum.low + range.low,
        high: sum.high + range.high,
      };
    },
    { low: 0, high: 0 },
  );

  return {
    low: Math.min(rawRange.low, 15),
    high: Math.min(rawRange.high, 25),
  };
}
