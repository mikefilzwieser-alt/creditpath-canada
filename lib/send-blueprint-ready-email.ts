import { Resend } from "resend";
import { buildEmailFooter } from "@/lib/email-footer";

export type BlueprintReadyEmailResult =
  | { sent: true }
  | { sent: false; reason: "missing_api_key" | "request_failed"; detail?: string };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendBlueprintReadyEmail(to: string, name: string, unsubscribeUrl: string): Promise<BlueprintReadyEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { sent: false, reason: "missing_api_key" };
  }

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM?.trim() ?? "Credit Path Canada <onboarding@resend.dev>";

  const trimmedName = typeof name === "string" ? name.trim() : "";
  const firstName = trimmedName ? trimmedName.split(/\s+/)[0] ?? "" : "";
  const subject = firstName
    ? `${firstName}, your credit file just told us everything. Here's what we found.`
    : "Your credit file just told us everything. Here's what we found.";

  const html = `
<div style="font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;color:#0F1923;">

  <!-- HEADER -->
  <div style="background:#0F1923;padding:32px 40px;border-radius:16px 16px 0 0;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
      <div style="width:6px;height:6px;background:#00C9A7;border-radius:50%;"></div>
      <span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.45);">Credit Path Canada</span>
    </div>
    <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;line-height:1.2;">Your Blueprint<br>is Ready.</h1>
    <p style="margin:10px 0 0;font-size:13px;color:rgba(255,255,255,0.5);font-weight:500;">Built from your actual file — not generic advice.</p>
  </div>

  <!-- WARNING -->
  <div style="margin:0 0 0 0;padding:14px 40px;background:#fff3f3;border-left:none;border-bottom:2px solid #fca5a5;">
    <p style="margin:0;font-size:12px;font-weight:700;color:#dc2626;letter-spacing:0.08em;text-transform:uppercase;">⚠️ Read Before Anything Else</p>
    <p style="margin:6px 0 0;font-size:12px;line-height:1.65;color:#7f1d1d;">If you receive a text or call saying you are approved — <strong>do not respond.</strong> They submit your application without permission. Every hard inquiry damages your score. <strong>Contact us first. Always.</strong></p>
  </div>

  <!-- BODY -->
  <div style="padding:32px 40px;">

    <p style="font-size:15px;font-weight:600;color:#0F1923;margin:0 0 6px;">Hi ${escapeHtml(firstName || name)},</p>
    <p style="font-size:14px;line-height:1.8;color:#4B5563;margin:0 0 18px;">Most credit advice online is generic — 'pay your bills, lower your balances,' the same tips for everyone. <strong style="color:#0F1923;">Yours isn't.</strong></p>
    <p style="font-size:14px;line-height:1.8;color:#4B5563;margin:0 0 24px;">We built your blueprint from your <strong style="color:#0F1923;">actual Equifax file</strong> — your tradelines, your collections, your inquiries — ranked by what moves <strong style="color:#0F1923;">your</strong> score the fastest. No guessing. Just the next right move.</p>

    <!-- 2 RULES -->
    <div style="background:#F8F6F1;border-radius:14px;padding:20px 24px;margin:0 0 24px;">
      <p style="margin:0 0 14px;font-size:10px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:#00C9A7;">Your 2 Rules</p>
      <div style="display:flex;gap:12px;margin-bottom:10px;">
        <div style="width:22px;height:22px;background:#0F1923;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;font-weight:800;color:#00C9A7;">1</div>
        <p style="margin:0;font-size:13px;line-height:1.65;color:#0F1923;"><strong>Do not apply for any credit</strong> without contacting us first. Every application is a hard inquiry that damages your score.</p>
      </div>
      <div style="display:flex;gap:12px;">
        <div style="width:22px;height:22px;background:#0F1923;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:11px;font-weight:800;color:#00C9A7;">2</div>
        <p style="margin:0;font-size:13px;line-height:1.65;color:#0F1923;"><strong>Set up pre-authorized payments</strong> on every account this week. One missed payment can undo months of progress.</p>
      </div>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin:0 0 28px;">
      <a href="https://www.creditpathcanada.ca/dashboard/blueprint#monthly-actions" style="display:inline-block;background:#00C9A7;color:#0F1923;padding:14px 36px;border-radius:100px;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;">View My Blueprint</a>
    </div>

    <!-- SIGN OFF -->
    <div style="border-top:1px solid rgba(15,25,35,0.08);padding-top:20px;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#0F1923;">Michael Filzwieser</p>
      <p style="margin:0 0 2px;font-size:11px;color:#6B7A8D;">Founder, Credit Path Canada · Finance Director, Titanium Ford</p>
      <p style="margin:0;font-size:11px;color:#6B7A8D;">(604) 442-0894 · info@creditpathcanada.ca</p>
      <p style="margin:12px 0 0;font-size:11px;font-style:italic;color:#9CA3AF;">Built for Canadian families the system forgot.</p>
    </div>

  </div>

${buildEmailFooter(unsubscribeUrl)}

</div>`;

  const { error } = await resend.emails.send({
    from,
    to: [to.trim()],
    subject,
    html,
  });

  if (error) {
    const detail = typeof error.message === "string" ? error.message : JSON.stringify(error);
    return { sent: false, reason: "request_failed", detail: detail.slice(0, 500) };
  }

  return { sent: true };
}
