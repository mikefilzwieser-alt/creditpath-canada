import { extractJsonFromAssistantText } from "@/lib/parse-bureau-claude";
import { getProgramMonthThemeTitle } from "@/lib/monthly-progression-themes";

const MODEL = "claude-sonnet-4-20250514";

export type MonthlyPlanGeneratedAction = {
  action: string;
  impact: string;
  timeline: string;
};

function systemPromptForMonth(programMonth: number, themeTitle: string): string {
  return `You are a Canadian credit coach. Based on this client's bureau data and completed actions, generate exactly 3 personalized action items for Month ${programMonth}: "${themeTitle}". Actions must be specific, actionable, and based on their actual bureau data. Never recommend unsecured credit if consumer_proposal is true. Always keep actions realistic for their credit profile. Return JSON only with this structure: {"actions":[{"action":"string","impact":"string","timeline":"string"}]}`;
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
