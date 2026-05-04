import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request: Request) {
  const body = await request.json() as { question?: string; name?: string; email?: string; phone?: string };
  const { question, name, email, phone } = body;

  if (!question?.trim()) {
    return NextResponse.json({ error: "No question provided." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "Email not configured." }, { status: 500 });
  }

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM?.trim() ?? "Credit Path Canada <onboarding@resend.dev>";

  // Send to Michael
  await resend.emails.send({
    from,
    to: ["michaelf@titaniumford.ca"],
    subject: `Ask Michael — Question from ${name}`,
    html: `<div style="font-family: 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; color: #0F1923;">
      <div style="background: #00C9A7; padding: 24px;">
        <h1 style="color: white; margin: 0; font-size: 20px;">New Question from ${name}</h1>
      </div>
      <div style="padding: 32px;">
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p style="margin-top: 24px;"><strong>Question:</strong></p>
        <p style="background: #F5F7FA; padding: 16px; border-radius: 8px; border-left: 4px solid #00C9A7;">${question}</p>
        <p style="margin-top: 24px; font-size: 13px; color: #888;">Reply directly to this email to respond to the client.</p>
      </div>
    </div>`,
    replyTo: email,
  });

  // Auto-reply to client
  if (email) {
    await resend.emails.send({
      from,
      to: [email],
      subject: "Got your question — Michael will be in touch",
      html: `<div style="font-family: 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; color: #0F1923;">
        <div style="background: #00C9A7; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">Question Received</h1>
        </div>
        <div style="padding: 32px;">
          <p>Hi ${name?.split(" ")[0] ?? "there"},</p>
          <p>Got your question. I'll personally review it and get back to you within 3 business days.</p>
          <p style="background: #F5F7FA; padding: 16px; border-radius: 8px; border-left: 4px solid #00C9A7; font-style: italic;">"${question}"</p>
          <p style="margin-top: 24px;">In the meantime, keep following your monthly actions. Every step counts.</p>
          <p style="margin-top: 32px;">— Michael Filzwieser<br><span style="color: #888; font-size: 13px;">Founder, Credit Path Canada<br>(604) 442-0894 · info@creditpathcanada.ca</span></p>
        </div>
        <div style="background: #f5f5f5; padding: 16px; text-align: center; font-size: 12px; color: #888;">
          Credit Path Canada · creditpathcanada.ca · 34 W 7th Ave #401, Vancouver BC V5Y 1L6
        </div>
      </div>`,
    });
  }

  return NextResponse.json({ ok: true });
}
