import { MailService } from '@sendgrid/mail';

// Initialize SendGrid with better logging
if (!process.env.SENDGRID_API_KEY) {
  console.error("CRITICAL ERROR: SENDGRID_API_KEY environment variable is not set. Email functionality will be disabled.");
} else {
  console.log("SendGrid API Key is configured (not showing for security)");
}

if (!process.env.SENDGRID_VERIFIED_SENDER) {
  console.error("CRITICAL ERROR: SENDGRID_VERIFIED_SENDER environment variable is not set. Email functionality will be disabled.");
} else {
  console.log(`SendGrid Verified Sender is configured: ${process.env.SENDGRID_VERIFIED_SENDER}`);
}

// Create a new instance of the mail service
const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  try {
    mailService.setApiKey(process.env.SENDGRID_API_KEY);
    console.log("SendGrid API key applied to mail service successfully");
  } catch (error) {
    console.error("Error configuring SendGrid mail service:", error);
  }
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
    
    // Log email details before sending
    console.log('Attempting to send email:');
    console.log('From:', fromEmail);
    console.log('To:', params.to);
    console.log('Subject:', params.subject);
    
    // Create email data object
    const emailData = {
      to: params.to,
      from: {
        email: fromEmail,
        name: fromName
      },
      subject: params.subject,
      text: params.text || '',
      html: params.html || params.text || ''
    };
    
    // Send email and log response
    try {
      const response = await mailService.send(emailData);
      console.log('Email sent successfully!');
      console.log('SendGrid response headers:', response[0].headers);
      return true;
    } catch (sendError) {
      // More detailed error logging
      if (sendError instanceof Error) {
        console.error('SendGrid email sending error:', {
          message: sendError.message,
          name: sendError.name, 
          stack: sendError.stack
        });
        
        // If it's an API error with response data, log that too
        if ('response' in sendError && sendError.response) {
          try {
            console.error('SendGrid API error response:', 
              JSON.stringify(sendError.response, null, 2)
            );
          } catch (jsonError) {
            console.error('Error parsing SendGrid API error response', jsonError);
          }
        }
      } else {
        console.error('Unknown SendGrid error type:', sendError);
      }
      return false;
    }
  } catch (error) {
    console.error('SendGrid email preparation error:', error);
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

To accept the invitation, create an account at the Loveslices application and then enter this code on your profile.

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
      <div class="button">Enter invite code: ${inviteCode}</div>
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

/**
 * Sends a password reset email with a token link
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<boolean> {
  console.log(`Preparing password reset email for ${email} with token starting with ${token.substring(0,3)}...`);
  
  // Make sure we have a valid APP_URL
  let appUrl = process.env.VITE_APP_URL || '';
  if (!appUrl) {
    // Fallback to determine URL from environment
    console.log(`VITE_APP_URL not set, attempting to create URL from REPL variables...`);
    const replSlug = process.env.REPL_SLUG;
    const replOwner = process.env.REPL_OWNER;
    
    if (replSlug && replOwner) {
      appUrl = `https://${replSlug}.${replOwner}.repl.co`;
      console.log(`Created app URL from REPL variables: ${appUrl}`);
    } else {
      console.warn(`Could not determine app URL from environment. Using empty string.`);
    }
  }
  
  console.log(`Using APP_URL: ${appUrl}`);
  const subject = `Reset Your Loveslices Password`;
  const resetUrl = `${appUrl}/reset-password/${token}`;
  console.log(`Reset URL will be: ${resetUrl}`);
  
  // Direct approach (bypass our wrapper function to eliminate any potential issues)
  try {
    // Initialize a fresh mail service instance
    const directMailService = new MailService();
    directMailService.setApiKey(process.env.SENDGRID_API_KEY as string);
    
    // Create the email message
    const msg = {
      to: email,
      from: {
        email: process.env.SENDGRID_VERIFIED_SENDER as string,
        name: 'Loveslices'
      },
      subject,
      text: `Hello,

You recently requested to reset your password for your Loveslices account.

Please go to the following link to reset your password:
${resetUrl}

If you did not request a password reset, please ignore this email or contact support if you have questions.

This password reset link is only valid for 1 hour.

Warm regards,
The Loveslices Team`,
      html: `<!DOCTYPE html>
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
    .reset-button {
      background-color: #4a6741;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 5px;
      display: inline-block;
      margin: 20px 0;
      font-weight: bold;
    }
    .notice {
      background-color: #eaefea;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
      font-size: 14px;
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
    
    <p>You recently requested to reset your password for your Loveslices account.</p>
    
    <center>
      <a href="${resetUrl}" class="reset-button">Reset Your Password</a>
    </center>
    
    <div class="notice">
      <p>If you did not request a password reset, please ignore this email or contact support if you have questions.</p>
      <p>This password reset link is only valid for 1 hour.</p>
    </div>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} Loveslices. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`
    };
    
    console.log('Sending password reset email directly via SendGrid SDK');
    const response = await directMailService.send(msg);
    console.log('Password reset email sent successfully:', response[0].statusCode);
    return true;
  } catch (error) {
    console.error('Error sending password reset email directly:', error);
    if (error instanceof Error && 'response' in error) {
      try {
        const responseBody = (error as any).response.body;
        console.error('SendGrid API error response:', responseBody);
      } catch (jsonError) {
        console.error('Error parsing SendGrid API error response');
      }
    }
    
    // Fallback to our wrapper function
    console.log('Falling back to original sendEmail method...');
    
    try {
      return await sendEmail({
        to: email,
        subject,
        text: `Hello,

You recently requested to reset your password for your Loveslices account.

Click the link below to reset your password:
${resetUrl}

If you did not request a password reset, please ignore this email or contact support if you have questions.

This password reset link is only valid for 1 hour.

Warm regards,
The Loveslices Team`,
        html: `<!DOCTYPE html>
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
    .reset-button {
      background-color: #4a6741;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 5px;
      display: inline-block;
      margin: 20px 0;
      font-weight: bold;
    }
    .notice {
      background-color: #eaefea;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
      font-size: 14px;
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
    
    <p>You recently requested to reset your password for your Loveslices account.</p>
    
    <center>
      <a href="${resetUrl}" class="reset-button">Reset Your Password</a>
    </center>
    
    <div class="notice">
      <p>If you did not request a password reset, please ignore this email or contact support if you have questions.</p>
      <p>This password reset link is only valid for 1 hour.</p>
    </div>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} Loveslices. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`,
        fromName: 'Loveslices'
      });
    } catch (fallbackError) {
      console.error('Both direct and fallback email methods failed:', fallbackError);
      return false;
    }
  }
}