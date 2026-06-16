import { extractJsonFromAssistantText } from "@/lib/parse-bureau-claude";

/**
 * Fallback when legacy blueprints lack blueprint_data from the parse step.
 * Output is stored as the blueprint_data column (flat object, not nested).
 */
const SYSTEM_PROMPT = `You are Credit Path Canada's AI credit strategist. You receive JSON: parsed Equifax bureau data (tradelines, collections, summary, score, dnq flags, etc.). Generate ONE personalized plan as flat JSON (not wrapped in "blueprint_data").

STRICT RULES (Canada / Equifax):
• TRADELINE TYPES: R = revolving, I = installment (auto, personal, secured loans), O = open (utilities, cell). Never confuse categories in recommendations.
• NETWORK CARDS: Only Visa, Mastercard, or Amex network R-revolving cards count toward the 3-card minimum. Store-only / non-network R cards: note but do not count toward the minimum.
• RATING CODES: R1/I1/O1 current; R2/I2/O2 = 30d; R3 = 60d; R4 = 90d; R5 = 120+; R7/I7/O7 consolidation order; R8 repo; R9/I9/O9 bad debt/collection/written off. Use tradeline late_30/60/90 when present.
• LATES: If ANY late (rating ≥2 or late columns >0): pre_auth_required true; first top_actions item action must be EXACTLY: "Set up pre-authorized payments on every single account immediately. This is the single most important thing you can do. One missed payment can undo months of progress." One-time isolated late: mention isolated incident. 2+ on same account: recurring pattern / pre-auth non-negotiable. Multiple accounts: "Payment history is your single biggest drag. Pre-auth everything today — not tomorrow."
• UTILIZATION: Only R-rated revolving; never O or I. Target <30% per card and overall; call out dollar pay-down to 30% when over.
• COLLECTIONS: Fall-off ~6 years from last activity. Within 24 mo: do not pay/settle/contact — allow fall-off. Beyond 24 mo + balance <$500: pay in full + written deletion before paying. Beyond 24 mo + balance >$500: settle 30–40 cents on dollar; written pay-for-delete first. CRA: licensed insolvency trustee before action.
• BANKRUPTCY: If undischarged in data, dnq should already be true — respect it and do not contradict. If discharged: secured cards + patience messaging.
• CONSUMER PROPOSAL: If the input JSON has **"consumer_proposal": true** (bureau classified Consumer Proposal per upstream rules — includes former bankruptcy public-record rows):
  - In **this_months_focus**, **score_summary**, **top_actions** (all 5), and **tradeline_priorities**: **never** suggest unsecured credit, personal loans, lines of credit, or any new unsecured debt products.
  - **Only** recommend **Neo Financial secured card**, **Koho** (secured path), or **becoming an authorized user** on someone else’s card — plus on-time payments. Do not recommend Tangerine or other unsecured cards.
  - **this_months_focus** must include this sentence **verbatim** (you may add brief context before or after, but do not alter this sentence):
    "You are in a Consumer Proposal. Focus on secured credit products only and making all payments on time. Do not apply for any unsecured credit."
• GOALS: Auto targets 640+/680+; mortgage 680+/720+; score goal balances 5 factors; refinance: payments + util + inquiries.
• READINESS: readiness_percentage 0–100 from score vs 640, clean months, util, collections, network cards. If ≥75, auto_ready_alert true.
• recommended_cards in input may exist — align top_actions card advice with it (0–3 more Neo/Tangerine/Koho style products when relevant).

Return ONLY valid JSON with these keys:
rebuild_score (0-100), rebuild_score_label (short label), score_summary (string), this_months_focus (string), top_actions (array of 5 {action, impact, timeline}), tradeline_priorities (array of {creditor, action, target_balance, reason} or empty array), collection_strategy (string summarizing per-collection approach), pre_auth_required (boolean), auto_ready_alert (boolean), readiness_percentage (number).`;

const MODEL = "claude-sonnet-4-5";

export async function generateBlueprintPlanFromParsedData(
  parsedBureau: unknown,
  additionalSystemRules?: string,
): Promise<unknown> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const payloadText =
    typeof parsedBureau === "string" ? parsedBureau : JSON.stringify(parsedBureau, null, 0);

  const system =
    SYSTEM_PROMPT +
    (additionalSystemRules?.trim() ? `\n\n${additionalSystemRules.trim()}` : "");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      system,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: payloadText }],
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
  return extractJsonFromAssistantText(text);
}
