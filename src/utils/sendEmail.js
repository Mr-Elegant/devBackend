/**
 * Resend Email Service for DevNet
 * Utilizes Resend REST API (3,000 free emails/month) via native fetch
 */

const run = async (toEmail, subject, body) => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log("[Email Service] RESEND_API_KEY not configured. Skipping email dispatch.");
    return null;
  }

  // Default to onboarding@resend.dev if custom domain is not yet verified
  const fromAddress = process.env.EMAIL_FROM || "DevNet <onboarding@resend.dev>";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [toEmail],
        subject: subject,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
            <div style="margin-bottom: 20px;">
              <span style="background: #2563eb; color: #ffffff; padding: 6px 12px; border-radius: 6px; font-weight: bold; font-size: 14px;">DevNet</span>
            </div>
            <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">${subject}</h2>
            <p style="color: #334155; font-size: 15px; line-height: 1.6;">${body}</p>
            <div style="margin: 28px 0;">
              <a href="https://devnet.co.in" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Open DevNet</a>
            </div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">You received this notification from DevNet • <a href="https://devnet.co.in" style="color: #64748b;">devnet.co.in</a></p>
          </div>
        `,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.warn("[Email Service] Resend API Warning:", data);
      return null;
    }

    console.log(`[Email Service] Email successfully sent via Resend to: ${toEmail} (ID: ${data.id})`);
    return data;
  } catch (error) {
    console.warn("[Email Service] Non-blocking email dispatch failed:", error.message);
    return null;
  }
};

export { run };