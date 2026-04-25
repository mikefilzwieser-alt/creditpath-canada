import { NextResponse } from "next/server";
import { sendCpcWelcomeEmail } from "@/lib/send-cpc-welcome-email";
import { isValidVaPortalPassword } from "@/lib/va-portal";

export const runtime = "nodejs";

type Body = {
  portal_password?: string;
  to?: string;
  full_name?: string;
  temporary_password?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isValidVaPortalPassword(body.portal_password)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const to = typeof body.to === "string" ? body.to.trim().toLowerCase() : "";
  const full_name = typeof body.full_name === "string" ? body.full_name.trim() : "";
  const temporary_password =
    typeof body.temporary_password === "string" ? body.temporary_password.trim() : "";

  if (!to || !full_name || !temporary_password) {
    return NextResponse.json({ error: "to, full_name, and temporary_password are required." }, { status: 400 });
  }

  const result = await sendCpcWelcomeEmail(to, full_name, temporary_password);
  if (!result.sent) {
    const status = result.reason === "missing_api_key" ? 503 : 502;
    return NextResponse.json(
      {
        ok: false,
        error: result.reason === "missing_api_key" ? "RESEND_API_KEY is not configured." : result.detail ?? "Send failed.",
      },
      { status },
    );
  }

  return NextResponse.json({ ok: true });
}
