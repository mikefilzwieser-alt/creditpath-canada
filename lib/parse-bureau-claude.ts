import { BUREAU_PARSE_SYSTEM_PROMPT } from "@/lib/bureau-parse-system-prompt";
import { normalizeParsedBureau } from "@/lib/bureau-parse-normalize";

const MODEL = "claude-sonnet-4-5";

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
      max_tokens: 8192,
      system: BUREAU_PARSE_SYSTEM_PROMPT,
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
  const raw = extractJsonFromAssistantText(text);
  return normalizeParsedBureau(raw);
}
