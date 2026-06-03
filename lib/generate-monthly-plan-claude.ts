import { extractJsonFromAssistantText } from "@/lib/parse-bureau-claude";
import { getProgramMonthThemeTitle } from "@/lib/monthly-progression-themes";

const MODEL = "claude-sonnet-4-20250514";

export type MonthlyPlanGeneratedAction = {
  action: string;
  impact: string;
  timeline: string;
};

function systemPromptForMonth(programMonth: number, themeTitle: string): string {
  const sharedRules = `
HARD RULES (apply to every month):
- Never recommend unsecured credit if consumer_proposal is true
- Never use the word "bankruptcy" — always "Consumer Proposal"
- Never give specific dollar amounts for paydown — keep actions directional
- Never promise specific score gains or timelines
- Always lead with payment consistency as the foundation
- Actions must be based on the client's actual bureau data
- Return JSON only: {"actions":[{"action":"string","impact":"string","timeline":"string"}]}
- Generate exactly 3 actions, no more, no less
- Each action must be specific, Canadian context, and achievable this month
- ACTION LENGTH: Each action string must be ONE sentence maximum — 20 words or fewer. Direct coaching voice. No explanations, no clauses, no parentheticals. Write like a coach giving a clear instruction, not a report.
- IMPACT LENGTH: Each impact string must be 6 words or fewer.
- TIMELINE LENGTH: Each timeline string must be 3 words or fewer.
`;

  const monthGuides: Record<number, string> = {
    2: `MONTH 2 — "${themeTitle}":
Focus: Reducing what is actively hurting the score right now.
Actions must come from these themes (pick the 3 most relevant based on bureau data):
- Utilization reduction: identify the highest utilization revolving account and direct client to reduce its balance. Give directional guidance (e.g. "focus extra payments on your highest utilization card this month") — no specific dollar amounts
- Payment streak protection: reinforce pre-authorized payments are set up and running — confirm nothing slipped in Month 1
- Hard inquiry freeze: if client has 3+ inquiries, reinforce no new applications under any circumstances
- Tradeline gap: if client has fewer than 3 Visa/MC/Amex cards and consumer_proposal is false, recommend the next secured card (Neo Financial first, then Koho, then Tangerine)
- Collections awareness: if client has active collections, remind them of the do-not-contact rule for collections falling off within 24 months — no action yet, just awareness
`,
    3: `MONTH 3 — "${themeTitle}":
Focus: Collections strategy and decisive action on debt.
Actions must come from these themes (pick the 3 most relevant based on bureau data):
- Collections decision: for each active collection, apply the rule — under 24 months to fall off = do not pay or contact; over 24 months + under $500 = pay in full with written deletion confirmation; over 24 months + over $500 = negotiate 30-40 cents on dollar with pay-for-delete agreement in writing first
- CRA debt: if Canada Revenue Agency collections present, direct client to contact a licensed insolvency trustee before any action
- Utilization check: review Month 2 progress — are balances moving in the right direction? Reinforce continued reduction
- Payment history review: 3 months of on-time payments is building — reinforce the streak and what is at stake if it breaks
`,
    4: `MONTH 4 — "${themeTitle}":
Focus: Optimizing the credit mix and preparing for the upgrade window.
Actions must come from these themes (pick the 3 most relevant based on bureau data):
- Tradeline mix optimization: ensure client has at least 1 installment account and 3 revolving network cards reporting — identify any gap and address it
- Utilization targets: push all revolving accounts toward under 30% utilization — identify which accounts are still above threshold
- Inquiry discipline: review any new inquiries since Month 1 — if any occurred without Credit Path Canada approval, address the impact and reinforce the no-application rule
- Auto upgrade readiness: assess readiness_percentage against 640 subprime threshold — if above 75%, note that the upgrade window may be approaching and contact Credit Path Canada to discuss next steps
- Score factor review: identify which of the 5 score factors (payment history 35%, utilization 30%, length 15%, mix 10%, inquiries 10%) has improved most and which still needs work
`,
  };

  const guide = monthGuides[programMonth] ?? `MONTH ${programMonth} — "${themeTitle}":
Focus: Continue building on previous months. Reinforce payment consistency, utilization discipline, and inquiry freeze. Identify the single biggest remaining drag on the score and address it directly.`;

  return `You are Credit Path Canada's senior Canadian credit strategist. Based on this client's bureau data and their completed actions from previous months, generate exactly 3 personalized action items for this month of their program.

${guide}

${sharedRules}`;
}

export async function generateMonthlyPlanWithClaude(input: {
  programMonth: number;
  rawParseData: unknown;
  completedActionsSummary: unknown;
}): Promise<MonthlyPlanGeneratedAction[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const themeTitle = getProgramMonthThemeTitle(input.programMonth);
  const system = systemPromptForMonth(input.programMonth, themeTitle);

  const userPayload = {
    bureau_data: input.rawParseData,
    completed_actions: input.completedActionsSummary,
    theme: themeTitle,
    month_number: input.programMonth,
  };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      system,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: JSON.stringify(userPayload) }],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Claude API error ${res.status}: ${errText.slice(0, 500)}`);
  }

  const payload = (await res.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const block = payload.content?.find((c) => c.type === "text");
  const text = block?.text;
  if (!text) {
    throw new Error("Claude response had no text content.");
  }

  const parsed = extractJsonFromAssistantText(text) as { actions?: unknown };
  const arr = Array.isArray(parsed.actions) ? parsed.actions : [];
  const out: MonthlyPlanGeneratedAction[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const action = typeof o.action === "string" ? o.action.trim() : "";
    const impact = typeof o.impact === "string" ? o.impact.trim() : "Medium impact";
    const timeline = typeof o.timeline === "string" ? o.timeline.trim() : "This month";
    if (action) out.push({ action, impact, timeline });
    if (out.length >= 3) break;
  }
  if (out.length < 3) {
    throw new Error("Claude returned fewer than 3 valid actions.");
  }
  return out.slice(0, 3);
}
