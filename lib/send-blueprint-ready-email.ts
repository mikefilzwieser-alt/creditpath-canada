import { Resend } from "resend";

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

export async function sendBlueprintReadyEmail(to: string, name: string): Promise<BlueprintReadyEmailResult> {
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

  const html = `<div style="font-family:'Helvetica Neue',sans-serif;max-width:600px;margin:0 auto;color:#0F1923;">

  <div style="background:#0F1923;padding:24px;text-align:center;">
    <h1 style="color:#00C9A7;margin:0;font-size:22px;font-weight:800;">Your Blueprint is Ready</h1>
  </div>

  <div style="padding:32px;">

    <div style="background:#fff3f3;border-left:4px solid #dc2626;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:28px;">
      <p style="margin:0;font-size:14px;font-weight:700;color:#dc2626;">⚠️ Important — Read Before Anything Else</p>
      <p style="margin:8px 0 0;font-size:13px;line-height:1.6;color:#0F1923;">If you receive a text or call saying you are approved for credit — <strong>do not respond.</strong> These callers will submit your application without your permission. Every hard inquiry drops your score and can delay your approval by months. <strong style="color:#00C9A7;">Contact Credit Path Canada first. Always.</strong></p>
    </div>

    <p style="font-size:16px;">Hi ${escapeHtml(firstName || name)},</p>

    <p style="font-size:15px;line-height:1.7;">We just finished analyzing your bureau — <span style="color:#00C9A7;">every tradeline, every collection, every inquiry.</span> Your personalized blueprint is ready.</p>

    <p style="font-size:15px;line-height:1.7;">What you'll see when you log in might surprise you. Some things on your file are hurting you more than you think. Some are closer to fixed than you'd expect.</p>

    <p style="font-size:15px;line-height:1.7;">Either way — you now have a clear plan. <span style="color:#00C9A7;">3 actions. Month by month.</span> Built from your actual file.</p>

    <div style="background:#F5F7FA;border-radius:12px;padding:20px 24px;margin:24px 0;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#00C9A7;text-transform:uppercase;letter-spacing:0.1em;">Your 2 Rules</p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.6;"><strong>1. Do not apply for any credit</strong> without contacting us first. Every application is a hard inquiry that damages your score.</p>
      <p style="margin:0;font-size:14px;line-height:1.6;"><strong>2. Set up pre-authorized payments</strong> on every account this week. One missed payment can undo months of progress.</p>
    </div>

    <p style="text-align:center;margin:28px 0;">
      <a href="https://www.creditpathcanada.ca/dashboard" style="background:#00C9A7;color:#0F1923;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:800;font-size:15px;display:inline-block;">View My Blueprint →</a>
    </p>

    <p style="font-size:15px;line-height:1.7;">Want a head start while your blueprint loads? Download our free credit guide — 7 habits that move your score, written specifically for Canadians rebuilding their credit.</p>

    <p style="text-align:center;margin:20px 0;">
      <a href="https://www.creditpathcanada.ca/credit-guide" style="background:#0F1923;color:#ffffff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:800;font-size:14px;display:inline-block;">Download Free Credit Guide →</a>
    </p>

    <p style="font-size:15px;line-height:1.7;">Want me to personally walk you through your file? Book a free 15-minute call.</p>

    <p style="text-align:center;margin:20px 0;">
      <a href="https://calendly.com/aec-michael/15min" style="background:#00C9A7;color:#0F1923;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:800;font-size:14px;display:inline-block;">Book a Free 15-Min File Review →</a>
    </p>

    <p style="margin-top:32px;font-size:14px;line-height:1.7;">Built for Canadian families the system forgot.</p>

    <p style="margin-top:16px;">— Michael Filzwieser<br><span style="color:#888;font-size:13px;">Founder, Credit Path Canada | Finance Director, Titanium Ford<br>(604) 442-0894 · info@creditpathcanada.ca</span></p>

  </div>

  <div style="background:#f5f5f5;padding:16px;text-align:center;font-size:12px;color:#888;">
    Credit Path Canada · <a href="https://www.creditpathcanada.ca" style="color:#00C9A7;">creditpathcanada.ca</a> · 34 W 7th Ave #401, Vancouver BC V5Y 1L6<br>
    <span style="font-size:11px;margin-top:6px;display:block;">Credit Path Canada provides educational credit guidance only. We are not a licensed credit repair agency or financial advisor.</span>
  </div>

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
