import { extractJsonFromAssistantText } from "@/lib/parse-bureau-claude";

const SYSTEM_PROMPT =
  "You are Credit Path Canada's AI credit advisor. You receive parsed Equifax bureau data. Generate a personalized credit action plan as JSON with: rebuild_score (0-100, payment history 35%, utilization 30%, derogatory marks 15%, credit age 10%, inquiries 10%), rebuild_score_label (Getting Started/Building Momentum/On Track/Strong Progress/Almost There/Credit Ready), score_summary (2-3 sentence warm coaching summary), this_months_focus (single most impactful action), top_actions (array of 5 priority actions with action, impact, timeline), tradeline_priorities (ordered by impact with creditor, action, target_balance, reason), collection_strategy (per collection: settle/ignore/dispute with reasoning). Return ONLY valid JSON.";

const MODEL = "claude-sonnet-4-20250514";

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
