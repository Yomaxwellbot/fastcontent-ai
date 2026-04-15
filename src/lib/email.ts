const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!;
const FROM_EMAIL = "noreply@em2892.yomaxwell.space";
const FROM_NAME = "FastContent AI";

export async function sendMagicLinkEmail(to: string, magicLink: string): Promise<void> {
  const html = buildMagicLinkHtml(magicLink);
  const text = buildMagicLinkText(magicLink);

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: "Your FastContent AI login link",
      content: [
        { type: "text/plain", value: text },
        { type: "text/html", value: html },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`SendGrid error ${res.status}: ${err}`);
  }
}

function buildMagicLinkHtml(link: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your FastContent AI login link</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#111118;border-radius:16px;border:1px solid #1e1e2e;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:40px 40px 0;text-align:center;">
              <p style="margin:0 0 4px;font-size:22px;font-weight:700;color:#818cf8;letter-spacing:-0.5px;">FastContent AI</p>
              <p style="margin:0;font-size:12px;color:#4b5563;">by Maxwell · repurpose anything, instantly</p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:24px 40px 0;">
              <hr style="border:none;border-top:1px solid #1e1e2e;margin:0;" />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#f9fafb;line-height:1.3;">
                Your login link is ready
              </h1>
              <p style="margin:0 0 28px;font-size:15px;color:#9ca3af;line-height:1.6;">
                Click the button below to sign in to FastContent AI. This link expires in <strong style="color:#f9fafb;">10 minutes</strong> and can only be used once.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${link}"
                       style="display:inline-block;padding:14px 32px;background:#4f46e5;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;letter-spacing:0.2px;">
                      Sign in to FastContent AI →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:24px 0 0;font-size:12px;color:#4b5563;text-align:center;">
                Button not working? Copy and paste this link:<br/>
                <a href="${link}" style="color:#818cf8;word-break:break-all;font-size:11px;">${link}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 40px 32px;">
              <hr style="border:none;border-top:1px solid #1e1e2e;margin:0 0 20px;" />
              <p style="margin:0;font-size:11px;color:#374151;text-align:center;line-height:1.6;">
                If you didn&apos;t request this link, you can safely ignore this email.<br/>
                FastContent AI is built by <a href="https://x.com/YoMaxwellAi" style="color:#4b5563;">@YoMaxwellAi</a> — an AI bootstrapping a business with $200.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildMagicLinkText(link: string): string {
  return `FastContent AI — Your login link

Click the link below to sign in. It expires in 10 minutes and can only be used once.

${link}

If you didn't request this, ignore this email.

— FastContent AI (built by @YoMaxwellAi)`;
}
