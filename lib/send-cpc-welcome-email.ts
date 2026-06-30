import { Resend } from "resend";

const LOGIN_URL = "https://creditpathcanada.ca/login";

export type CpcWelcomeEmailResult =
  | { sent: true }
  | { sent: false; reason: "missing_api_key" | "request_failed"; detail?: string };

/**
 * Transactional welcome for VA-created clients (matches /api/send-welcome-email).
 */
export async function sendCpcWelcomeEmail(
  to: string,
  fullName: string,
  temporaryPassword: string,
): Promise<CpcWelcomeEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { sent: false, reason: "missing_api_key" };
  }

  const resend = new Resend(apiKey);
  const from =
    process.env.RESEND_FROM?.trim() ?? "Credit Path Canada <onboarding@resend.dev>";

  const firstName = fullName.trim().split(/\s+/)[0] ?? fullName;

  const html = `
<div style="font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;color:#0F1923;">

  <!-- HEADER -->
  <div style="background:#0F1923;padding:32px 40px;border-radius:16px 16px 0 0;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
      <div style="width:6px;height:6px;background:#00C9A7;border-radius:50%;"></div>
      <span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.45);">Credit Path Canada</span>
    </div>
    <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;line-height:1.2;">Congratulations.<br>You're in.</h1>
    <p style="margin:10px 0 0;font-size:13px;color:rgba(255,255,255,0.5);font-weight:500;">Your blueprint is being built right now.</p>
  </div>

  <!-- WARNING -->
  <div style="padding:14px 40px;background:#fff3f3;border-bottom:2px solid #fca5a5;">
    <p style="margin:0;font-size:12px;font-weight:700;color:#dc2626;letter-spacing:0.08em;text-transform:uppercase;">⚠️ Read Before Anything Else</p>
    <p style="margin:6px 0 0;font-size:12px;line-height:1.65;color:#7f1d1d;">If you receive a text or call saying you are approved — <strong>do not respond.</strong> They submit your application without permission and damage your score. <strong>Contact us first. Always.</strong></p>
  </div>

  <!-- BODY -->
  <div style="padding:32px 40px;">

    <p style="font-size:15px;font-weight:600;color:#0F1923;margin:0 0 6px;">Hi ${escapeHtml(firstName)},</p>
    <p style="font-size:14px;line-height:1.8;color:#4B5563;margin:0 0 18px;">You just made the most important decision for your financial future. Here's what makes this different from anything else you've tried.</p>
    <p style="font-size:14px;line-height:1.8;color:#4B5563;margin:0 0 22px;">Credit Path Canada was built by <strong style="color:#0F1923;">Michael Filzwieser — a Finance Director who has spent years getting people with damaged credit approved.</strong> Not a faceless agency. Not empty promises. A real person whose focus is getting you to the approval — because that's where the real win is.</p>

    <div style="background:#F8F6F1;border-left:3px solid #00C9A7;border-radius:0 12px 12px 0;padding:18px 22px;margin:0 0 22px;">
      <p style="margin:0 0 10px;font-size:13px;line-height:1.7;color:#0F1923;font-style:italic;">"I filed a consumer proposal 4 years ago — I knew that presents a challenge. The approval process was smooth and finished with a deal I'm delighted with. Michael was listening."</p>
      <p style="margin:0;font-size:11px;font-weight:700;color:#6B7A8D;">— Igor S. · ★★★★★ Google Review</p>
    </div>

    <p style="font-size:14px;line-height:1.8;color:#4B5563;margin:0 0 28px;">Right now, every tradeline, collection, and inquiry on your file is being turned into a clear month-by-month plan. <strong style="color:#0F1923;">It'll be waiting when you log in.</strong></p>

    <!-- LOGIN -->
    <div style="background:#F8F6F1;border-radius:14px;padding:20px 24px;margin:0 0 20px;">
      <p style="margin:0 0 12px;font-size:10px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:#00C9A7;">Your Login Details</p>
      <p style="margin:0 0 6px;font-size:13px;color:#0F1923;"><strong>Website:</strong> <a href="${LOGIN_URL}" style="color:#00C9A7;text-decoration:none;">${LOGIN_URL}</a></p>
      <p style="margin:0;font-size:13px;color:#0F1923;"><strong>Temporary password:</strong> ${escapeHtml(temporaryPassword)}</p>
    </div>

    <!-- 2 RULES -->
    <div style="background:#F8F6F1;border-radius:14px;padding:20px 24px;margin:0 0 28px;">
      <p style="margin:0 0 14px;font-size:10px;font-weight:800;letter-spacing:0.2em;text-transform:uppercase;color:#00C9A7;">Your 2 Rules</p>
      <div style="display:flex;gap:12px;margin-bottom:10px;align-items:flex-start;">
        <div style="min-width:22px;height:22px;background:#0F1923;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#00C9A7;">1</div>
        <p style="margin:0;font-size:13px;line-height:1.65;color:#0F1923;"><strong>Do not apply for any credit</strong> without contacting us first. Every application is a hard inquiry that damages your score.</p>
      </div>
      <div style="display:flex;gap:12px;align-items:flex-start;">
        <div style="min-width:22px;height:22px;background:#0F1923;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#00C9A7;">2</div>
        <p style="margin:0;font-size:13px;line-height:1.65;color:#0F1923;"><strong>Set up pre-authorized payments</strong> on every account this week. One missed payment can undo months of progress.</p>
      </div>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin:0 0 32px;">
      <a href="${LOGIN_URL}" style="display:inline-block;background:#00C9A7;color:#0F1923;padding:14px 36px;border-radius:100px;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;">Log In and See My Blueprint</a>
      <p style="margin:10px 0 0;font-size:10px;color:#9CA3AF;">First 30 days free · No charge until Day 31 · Cancel anytime</p>
    </div>

    <!-- SIGN OFF -->
    <div style="border-top:1px solid rgba(15,25,35,0.08);padding-top:20px;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#0F1923;">Michael Filzwieser</p>
      <p style="margin:0 0 2px;font-size:11px;color:#6B7A8D;">Founder, Credit Path Canada · Finance Director, Titanium Ford</p>
      <p style="margin:0;font-size:11px;color:#6B7A8D;">(604) 442-0894 · info@creditpathcanada.ca</p>
      <p style="margin:12px 0 0;font-size:11px;font-style:italic;color:#9CA3AF;">Built for Canadian families the system forgot.</p>
    </div>

  </div>

  <!-- FOOTER -->
  <div style="background:#F8F6F1;padding:16px 40px;border-radius:0 0 16px 16px;text-align:center;">
    <p style="margin:0;font-size:10px;color:#9CA3AF;">Credit Path Canada · <a href="https://www.creditpathcanada.ca" style="color:#00C9A7;text-decoration:none;">creditpathcanada.ca</a> · 34 W 7th Ave #401, Vancouver BC V5Y 1L6</p>
    <p style="margin:6px 0 0;font-size:10px;color:#9CA3AF;">Credit Path Canada provides educational credit guidance only. We are not a licensed credit repair agency or financial advisor.</p>
  </div>

</div>`.trim();

  const { error } = await resend.emails.send({
    from,
    to: [to.trim()],
    subject: `${firstName}, your Credit Path Canada blueprint is being built`,
    html,
  });

  if (error) {
    const detail = typeof error.message === "string" ? error.message : JSON.stringify(error);
    return { sent: false, reason: "request_failed", detail: detail.slice(0, 500) };
  }

  return { sent: true };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
