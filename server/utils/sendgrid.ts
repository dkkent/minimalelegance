import { MailService } from '@sendgrid/mail';

// Initialize SendGrid
if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY environment variable is not set. Email functionality will be disabled.");
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  fromName?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn("Email not sent: SENDGRID_API_KEY is not set");
    return false;
  }

  try {
    // Use the verified sender email from environment variables
    if (!process.env.SENDGRID_VERIFIED_SENDER) {
      console.warn("Email not sent: SENDGRID_VERIFIED_SENDER is not set");
      return false;
    }
    
    const fromEmail = process.env.SENDGRID_VERIFIED_SENDER;
    const fromName = params.fromName || 'Loveslices';
    
    await mailService.send({
      to: params.to,
      from: {
        email: fromEmail,
        name: fromName
      },
      subject: params.subject,
      text: params.text || '',
      html: params.html || params.text || ''
    });
    
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

/**
 * Sends a partner invitation email
 */
export async function sendPartnerInvitationEmail({
  to,
  inviterName,
  inviteCode,
  personalMessage
}: {
  to: string;
  inviterName: string;
  inviteCode: string;
  personalMessage?: string;
}): Promise<boolean> {
  const subject = `${inviterName} has invited you to connect on Loveslices`;
  
  const text = `
Hello,

${inviterName} has invited you to connect as a partner on Loveslices.

${personalMessage ? `Their message to you: "${personalMessage}"` : ''}

Here's your invitation code: ${inviteCode}

To accept the invitation, create an account at https://loveslices.app/auth and then enter this code on your profile.

Warm regards,
The Loveslices Team
  `.trim();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
    }
    .container {
      padding: 20px;
      background-color: #f9f9f9;
      border-radius: 8px;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #4a6741;
    }
    .invite-code {
      background-color: #eaefea;
      padding: 15px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 18px;
      text-align: center;
      margin: 20px 0;
    }
    .personal-message {
      font-style: italic;
      border-left: 3px solid #4a6741;
      padding-left: 15px;
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      background-color: #4a6741;
      color: white;
      padding: 10px 20px;
      text-decoration: none;
      border-radius: 5px;
      margin-top: 20px;
    }
    .footer {
      margin-top: 30px;
      font-size: 13px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Loveslices</div>
      <p>Nurturing relationships through meaningful connection</p>
    </div>
    
    <p>Hello,</p>
    
    <p><strong>${inviterName}</strong> has invited you to connect as a partner on Loveslices.</p>
    
    ${personalMessage ? `
    <div class="personal-message">
      "${personalMessage}"
    </div>
    ` : ''}
    
    <p>Here's your invitation code:</p>
    
    <div class="invite-code">
      ${inviteCode}
    </div>
    
    <p>To accept the invitation:</p>
    <ol>
      <li>Create an account at Loveslices</li>
      <li>Go to your profile</li>
      <li>Enter this invitation code to connect with ${inviterName}</li>
    </ol>
    
    <center>
      <a href="https://loveslices.app/auth" class="button">Create Your Account</a>
    </center>
    
    <div class="footer">
      <p>If you received this invitation by mistake, you can safely ignore it.</p>
      <p>© ${new Date().getFullYear()} Loveslices. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
  
  return sendEmail({
    to,
    subject,
    text,
    html,
    fromName: `${inviterName} via Loveslices`
  });
}