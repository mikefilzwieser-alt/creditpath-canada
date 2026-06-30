import { Resend } from "resend";
import { buildEmailFooter } from "@/lib/email-footer";

const LOGO_URL = "https://www.creditpathcanada.ca/Teal%20Logo.png";
const SIGNATURE_URL = "https://www.creditpathcanada.ca/sig.jpg";
const TANGERINE_URL = "https://www.tangerine.ca/en/products/spending/creditcard";
const NEO_URL = "https://neo.cc/refer/G3Y6L5A9";
const KOHO_URL = "https://www.koho.ca";
const PRODUCTS_URL = "https://www.creditpathcanada.ca/dashboard/blueprint#credit-products";

export type Month2CardsEmailResult =
  | { sent: true }
  | { sent: false; reason: "missing_api_key" | "request_failed"; detail?: string };

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function sendMonth2CardsEmail(to: string, name: string, unsubscribeUrl: string): Promise<Month2CardsEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { sent: false, reason: "missing_api_key" };

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM?.trim() ?? "Credit Path Canada <onboarding@resend.dev>";
  const firstName = name.trim().split(/\s+/)[0] ?? "";
  const subject = firstName
    ? `${firstName}, the fastest way to build your score right now`
    : "The fastest way to build your score right now";

  const html = `
<div style="font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;color:#0F1923;">

  <!-- HEADER -->
  <div style="background:#0F1923;padding:32px 40px;border-radius:16px 16px 0 0;">
    <img src="${LOGO_URL}" alt="Credit Path Canada" style="display:block;width:160px;max-width:100%;height:auto;margin:0 0 24px;border-radius:8px;" />
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px;">
      <div style="width:6px;height:6px;background:#00C9A7;border-radius:50%;"></div>
      <span style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.45);">CREDIT PATH CANADA</span>
    </div>
    <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;line-height:1.2;">One move that<br>builds every month.</h1>
    <p style="margin:10px 0 0;font-size:13px;color:rgba(255,255,255,0.5);font-weight:500;">By month 2, you're ready to add a building block.</p>
  </div>

  <!-- BODY -->
  <div style="padding:32px 40px;">
    <p style="font-size:15px;font-weight:600;color:#0F1923;margin:0 0 6px;">Hi ${escapeHtml(firstName || name)},</p>
    <p style="font-size:14px;line-height:1.8;color:#4B5563;margin:0 0 18px;">By Month 2, one of the most useful building blocks is a credit-builder card used responsibly.</p>
    <p style="font-size:14px;line-height:1.8;color:#4B5563;margin:0 0 28px;">That means one small purchase — <strong style="color:#00C9A7;">under 30% of the card's limit</strong> — paid in full every month. Keeping the balance low is what builds the utilization signal lenders want to see. Going over 30% works against you even if you pay it off.</p>

    <!-- AMBER CALLOUT -->
    <div style="background:#FFF8E8;border:1px solid #F0D98A;border-radius:14px;padding:20px 24px;margin:0 0 28px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#5C4708;">Wait — doesn't the program say don't apply for credit?</p>
      <p style="margin:0;font-size:13px;line-height:1.65;color:#5C4708;">Yes — and this is the one exception. The cards below are designed for rebuilding and generally don't require a hard credit check, so there's <strong style="color:#00C9A7;">typically no hard inquiry or risk to your score</strong>. Still — <strong style="color:#00C9A7;">never apply for anything else without checking with us first</strong>.</p>
    </div>

    <!-- CARD ROWS -->
    <div style="background:#F8F6F1;border-radius:14px;padding:20px 24px;margin:0 0 14px;">
      <p style="margin:0 0 6px;font-size:14px;font-weight:800;color:#0F1923;">Tangerine Money-Back Card</p>
      <p style="margin:0 0 8px;font-size:13px;line-height:1.65;color:#4B5563;">Reports to both Equifax and TransUnion. Typically no hard credit check.</p>
      <p style="margin:0 0 12px;font-size:13px;line-height:1.65;color:#0F1923;">Use code <strong>79976711S1</strong> for a $50 bonus.</p>
      <a href="${TANGERINE_URL}" style="font-size:12px;font-weight:800;color:#00C9A7;text-decoration:none;letter-spacing:0.04em;">View Tangerine →</a>
    </div>

    <div style="background:#F8F6F1;border-radius:14px;padding:20px 24px;margin:0 0 14px;">
      <p style="margin:0 0 6px;font-size:14px;font-weight:800;color:#0F1923;">Neo Financial</p>
      <p style="margin:0 0 12px;font-size:13px;line-height:1.65;color:#4B5563;">A top Canadian credit-building card. Reports to Equifax.</p>
      <a href="${NEO_URL}" style="font-size:12px;font-weight:800;color:#00C9A7;text-decoration:none;letter-spacing:0.04em;">View Neo →</a>
    </div>

    <div style="background:#F8F6F1;border-radius:14px;padding:20px 24px;margin:0 0 32px;">
      <p style="margin:0 0 6px;font-size:14px;font-weight:800;color:#0F1923;">Koho</p>
      <p style="margin:0 0 12px;font-size:13px;line-height:1.65;color:#4B5563;">Builds credit with everyday spending. Reports to Equifax.</p>
      <a href="${KOHO_URL}" style="font-size:12px;font-weight:800;color:#00C9A7;text-decoration:none;letter-spacing:0.04em;">View Koho →</a>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin:0 0 32px;">
      <a href="${PRODUCTS_URL}" style="display:inline-block;background:#00C9A7;color:#0F1923;padding:14px 36px;border-radius:100px;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;">See My Recommended Cards</a>
    </div>

    <!-- SIGN OFF -->
    <div style="border-top:1px solid rgba(15,25,35,0.08);padding-top:20px;">
      <img src="${SIGNATURE_URL}" alt="Michael Filzwieser signature" style="display:block;width:120px;max-width:100%;height:auto;margin:0 0 10px;border-radius:8px;" />
      <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#0F1923;">Michael Filzwieser</p>
      <p style="margin:0 0 2px;font-size:11px;color:#6B7A8D;">Founder, Credit Path Canada · Finance Director, Titanium Ford</p>
      <p style="margin:0;font-size:11px;color:#6B7A8D;">(604) 442-0894 · info@creditpathcanada.ca</p>
      <p style="margin:12px 0 0;font-size:11px;font-style:italic;color:#9CA3AF;">The clients who stay consistent are the ones who get approved.</p>
    </div>
  </div>

${buildEmailFooter(unsubscribeUrl)}

</div>`;

  const { error } = await resend.emails.send({ from, to: [to.trim()], subject, html });
  if (error) {
    const detail = typeof error.message === "string" ? error.message : JSON.stringify(error);
    return { sent: false, reason: "request_failed", detail: detail.slice(0, 500) };
  }
  return { sent: true };
}
