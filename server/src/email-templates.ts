export interface EmailTemplateProps {
  title: string;
  body: string;
  footerNote?: string;
  link?: string;
  linkText?: string;
  siteUrl?: string;
}

export function buildEmailHtml(props: EmailTemplateProps): string {
  const { title, body, footerNote, link, linkText, siteUrl } = props;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="100%" style="max-width: 480px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding: 40px 40px 0 40px; text-align: center;">
              <div style="width: 48px; height: 48px; background: #dc2626; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                <span style="color: #fff; font-size: 22px; font-weight: 700;">AM</span>
              </div>
              <h1 style="margin: 0 0 4px 0; font-size: 20px; font-weight: 700; color: #1a2933; letter-spacing: -0.3px;">Asset Management</h1>
              <p style="margin: 0 0 24px 0; font-size: 13px; color: #8899a8;">Secure Access Platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 40px;">
              <div style="height: 1px; background: #eef1f4; margin-bottom: 28px;"></div>
              <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #1a2933;">${title}</h2>
              <div style="font-size: 14px; line-height: 1.6; color: #4a5a6a; margin-bottom: 24px;">
                ${body}
              </div>
            </td>
          </tr>
          ${link ? `
          <tr>
            <td style="padding: 0 40px 8px 40px; text-align: center;">
              <a href="${link}" style="display: inline-block; padding: 12px 32px; background: #dc2626; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">${linkText || 'Continue'}</a>
            </td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: ${link ? '24px' : '8px'} 40px 32px 40px;">
              <div style="height: 1px; background: #eef1f4; margin-bottom: 20px;"></div>
              <p style="margin: 0; font-size: 12px; color: #8899a8; line-height: 1.5; text-align: center;">
                ${footerNote ? `${footerNote}<br/>` : ''}
                ${siteUrl ? `<a href="${siteUrl}" style="color: #8899a8; text-decoration: underline;">${siteUrl}</a><br/>` : ''}
                This is an automated message from Asset Management. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
        <p style="margin: 16px 0 0 0; font-size: 11px; color: #b0bcc8;">&copy; ${new Date().getFullYear()} Asset Management. All rights reserved.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
