const SYSTEM_PROMPT =
  "You are a Canadian credit bureau analyst. Extract all data from this Equifax bureau report and return ONLY a JSON object with these fields: personal (name, dob, address), score (equifax_score, score_factors), summary (total_accounts, open_accounts, utilization_percentage, on_time_payment_percentage, derogatory_marks, hard_inquiries_12mo), tradelines (array with creditor_name, balance, credit_limit, utilization, payment_status, action_recommended), collections (array with creditor, amount, recommendation), errors_detected (array with description, dispute_priority). Return ONLY valid JSON, no markdown.";

const MODEL = "claude-sonnet-4-20250514";

export function extractJsonFromAssistantText(text: string): unknown {
  const trimmed = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed);
  const candidate = fence ? fence[1]!.trim() : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("Assistant response did not contain a JSON object.");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

export async function parseBureauPdfWithClaude(pdfBase64: string): Promise<unknown> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfBase64,
              },
            },
          ],
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
