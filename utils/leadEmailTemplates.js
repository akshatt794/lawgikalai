const getCorporateLeadAutoReplyTemplate = ({ name }) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LawgikalAI – Corporate Demo Request</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f6f7fb; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center" style="padding:40px 15px;">
          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.08);">
            
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#d97706,#b45309); padding:28px 32px; color:#ffffff;">
                <h1 style="margin:0; font-size:24px;">LawgikalAI</h1>
                <p style="margin:6px 0 0; font-size:14px; opacity:0.9;">
                  Corporate Legal Intelligence Platform
                </p>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:32px;">
                <h2 style="margin-top:0; color:#111827;">
                  Thank you for reaching out${name ? `, ${name}` : ""}.
                </h2>

                <p style="font-size:15px; color:#374151; line-height:1.6;">
                  We’ve received your request to learn more about <strong>LawgikalAI for Corporate</strong>.
                  Our team is reviewing your details and will connect with you shortly.
                </p>

                <div style="margin:24px 0; padding:20px; background:#f9fafb; border-left:4px solid #f59e0b; border-radius:8px;">
                  <p style="margin:0; font-size:14px; color:#374151;">
                    <strong>What happens next?</strong><br />
                    • A corporate specialist will contact you within <strong>24 hours</strong><br />
                    • We’ll understand your legal workflow and team structure<br />
                    • You’ll receive a personalized demo & pricing discussion
                  </p>
                </div>

                <p style="font-size:14px; color:#374151;">
                  If you have any immediate questions, feel free to reply to this email.
                </p>

                <p style="margin-top:24px; font-size:14px; color:#374151;">
                  Regards,<br />
                  <strong>LawgikalAI Corporate Team</strong>
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#f3f4f6; padding:20px; text-align:center;">
                <p style="margin:0; font-size:12px; color:#6b7280;">
                  © ${new Date().getFullYear()} LawgikalAI · All rights reserved
                </p>
                <p style="margin:6px 0 0; font-size:12px; color:#9ca3af;">
                  This is an automated confirmation email.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
};

module.exports = { getCorporateLeadAutoReplyTemplate };
