import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';

// Initialize SendGrid if API key is provided
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Create Gmail SMTP transporter (fallback)
const createGmailTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    connectionTimeout: 30000,
    socketTimeout: 30000,
    greetingTimeout: 30000,
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    },
    pool: false
  });
};

// Send email using SendGrid (preferred) or Gmail SMTP (fallback)
export const sendEmail = async (to, subject, html, retries = 2) => {
  // Validate email address
  if (!to || !to.includes('@')) {
    console.error('❌ Invalid email address:', to);
    return { success: false, error: 'Invalid email address' };
  }

  // Try SendGrid first (preferred)
  if (process.env.SENDGRID_API_KEY) {
    return await sendEmailWithSendGrid(to, subject, html, retries);
  }

  // Fallback to Gmail SMTP if SendGrid is not configured
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return await sendEmailWithGmail(to, subject, html, retries);
  }

  // No email service configured
  console.warn('⚠️ No email service configured. Please set SENDGRID_API_KEY or EMAIL_USER/EMAIL_PASS in Render environment variables.');
  return { success: false, error: 'Email not configured' };
};

// Convert HTML to plain text (simple version)
const htmlToText = (html) => {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
};

// Send email using SendGrid
const sendEmailWithSendGrid = async (to, subject, html, retries = 2) => {
  const fromEmail = process.env.EMAIL_USER || process.env.SENDGRID_FROM_EMAIL || 'noreply@inkline-dvc.com';
  const fromName = process.env.SENDGRID_FROM_NAME || 'InkLine DVC';
  const replyTo = process.env.EMAIL_USER || process.env.SENDGRID_FROM_EMAIL || fromEmail;

  // Convert HTML to plain text for better deliverability
  const text = htmlToText(html);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const msg = {
        to,
        from: {
          email: fromEmail,
          name: fromName
        },
        replyTo: {
          email: replyTo,
          name: fromName
        },
        subject,
        text, // Plain text version (required for better deliverability)
        html, // HTML version
        // Add custom headers to improve deliverability
        headers: {
          'X-Entity-Ref-ID': `inkline-${Date.now()}`,
          'List-Unsubscribe': `<mailto:${replyTo}?subject=Unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        },
        // Add categories for better tracking and deliverability
        categories: ['inkline-printing-system'],
        // Mail settings for better deliverability
        mailSettings: {
          sandboxMode: {
            enable: false // Make sure sandbox mode is disabled
          }
        },
        // Tracking settings
        trackingSettings: {
          clickTracking: {
            enable: true
          },
          openTracking: {
            enable: true
          },
          subscriptionTracking: {
            enable: false // Disable subscription tracking for better deliverability
          }
        }
      };

      console.log(`📧 Sending email via SendGrid to: ${to} (attempt ${attempt}/${retries})`);
      
      const [response] = await sgMail.send(msg);
      
      console.log('✅ Email sent successfully via SendGrid to:', to);
      console.log('   Status Code:', response.statusCode);
      
      return { 
        success: true, 
        messageId: response.headers['x-message-id'] || 'sent',
        service: 'SendGrid'
      };
    } catch (error) {
      const isLastAttempt = attempt === retries;

      if (isLastAttempt) {
        console.error('❌ SendGrid email sending failed after', retries, 'attempts:', error.message);
        
        if (error.response) {
          console.error('   → SendGrid API Error:', JSON.stringify(error.response.body, null, 2));
          console.error('   → Status Code:', error.response.statusCode);
        }
        
        return { 
          success: false, 
          error: error.message,
          service: 'SendGrid'
        };
      } else {
        console.warn(`⚠️ SendGrid email sending attempt ${attempt} failed. Retrying... (${error.message})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  return { success: false, error: 'All retry attempts failed', service: 'SendGrid' };
};

// Send email using Gmail SMTP (fallback)
const sendEmailWithGmail = async (to, subject, html, retries = 2) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const transporter = createGmailTransporter();
      
      if (!transporter) {
        return { success: false, error: 'Gmail transporter not configured' };
      }

      const mailOptions = {
        from: `InkLine DVC <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html
      };

      const sendPromise = transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email sending timeout')), 30000);
      });

      const info = await Promise.race([sendPromise, timeoutPromise]);
      console.log('✉️ Email sent successfully via Gmail SMTP to:', to);
      
      transporter.close();
      
      return { success: true, messageId: info.messageId, service: 'Gmail SMTP' };
    } catch (error) {
      const isLastAttempt = attempt === retries;

      if (isLastAttempt) {
        console.error('❌ Gmail SMTP email sending failed after', retries, 'attempts:', error.message);
        return { success: false, error: error.message, service: 'Gmail SMTP' };
      } else {
        console.warn(`⚠️ Gmail SMTP email sending attempt ${attempt} failed. Retrying... (${error.message})`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  return { success: false, error: 'All retry attempts failed', service: 'Gmail SMTP' };
};

export const sendAccountApprovedEmail = async (email, fullName) => {
  const subject = 'InkLine - Account Approved!';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'SF Pro Icons', 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Account Approved!</h2>
      <p>Hi ${fullName},</p>
      <p>Your InkLine account has been approved by the IT Printing Shop administrators.</p>
      <p>You can now log in and access the IT Printing Shop services.</p>
      <p>Thank you for using InkLine Smart Printing Queue System!</p>
      <br>
      <p>Best regards,</p>
      <p><strong>InkLine Team - DVC</strong></p>
    </div>
  `;
  
  await sendEmail(email, subject, html);
};

export const sendOrderCreatedEmail = async (email, fullName, orderNumber, shop, queuePosition) => {
  const subject = `InkLine - Order #${orderNumber} Created Successfully`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0;">Order Created!</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${fullName},</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Your printing order has been created successfully!
        </p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            <strong>Order Number:</strong> #${orderNumber}
          </p>
          <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
            <strong>Shop:</strong> ${shop} Printing Shop
          </p>
          ${queuePosition ? `<p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;"><strong>Queue Position:</strong> #${queuePosition}</p>` : ''}
        </div>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          <strong>What happens next?</strong>
        </p>
        <ul style="color: #374151; font-size: 16px; line-height: 1.8;">
          <li>Your order is now in the queue</li>
          <li>You'll receive an email when your order starts printing</li>
          <li>You'll receive another email when your order is ready for pickup</li>
          <li>You can track your order status in your student portal</li>
        </ul>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          We'll keep you updated via email on your order's progress. Thank you for using InkLine!
        </p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          Best regards,<br>
          <strong>InkLine Team - DVC</strong>
        </p>
      </div>
    </div>
  `;
  
  await sendEmail(email, subject, html);
};

export const sendOrderPrintingEmail = async (email, fullName, orderNumber, shop) => {
  const subject = `InkLine - Order #${orderNumber} Now Printing`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0;">Order Now Printing!</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${fullName},</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Great news! Your printing order is now being processed.
        </p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            <strong>Order Number:</strong> #${orderNumber}
          </p>
          <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
            <strong>Shop:</strong> ${shop} Printing Shop
          </p>
          <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
            <strong>Status:</strong> Printing
          </p>
        </div>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Your order is currently being printed. You'll receive another email notification when it's ready for pickup.
        </p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Thank you for using InkLine!
        </p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          Best regards,<br>
          <strong>InkLine Team - DVC</strong>
        </p>
      </div>
    </div>
  `;
  
  await sendEmail(email, subject, html);
};

export const sendOrderReadyEmail = async (email, fullName, orderNumber, shop) => {
  const subject = `Your Order #${orderNumber} is Ready for Pickup`;
  const paymentNote = shop === 'SSC' ? ' and Payment' : '';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Ready - InkLine</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 20px 0; text-align: center;">
            <table role="presentation" style="width: 600px; margin: 0 auto; border-collapse: collapse; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <tr>
                <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Order Ready for Pickup${paymentNote}!</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 30px; background-color: #ffffff;">
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">Hello ${fullName},</p>
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">Great news! Your printing order is ready for pickup${paymentNote.toLowerCase()}!</p>
                  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0;">
                    <tr>
                      <td style="padding: 8px 0;">
                        <strong style="color: #111827; font-size: 14px;">Order Number:</strong>
                        <span style="color: #6b7280; font-size: 14px; margin-left: 8px;">#${orderNumber}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0;">
                        <strong style="color: #111827; font-size: 14px;">Printing Shop:</strong>
                        <span style="color: #6b7280; font-size: 14px; margin-left: 8px;">${shop} Printing Shop</span>
                      </td>
                    </tr>
                  </table>
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 24px 0 16px 0;">Please visit the <strong>${shop} Printing Shop</strong> to collect your order.</p>
                  ${shop === 'SSC' ? '<p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 16px 0 24px 0; padding: 16px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;"><strong>Note:</strong> Payment is required upon pickup.</p>' : ''}
                  <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 24px 0 0 0;">Thank you for using InkLine!</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 24px 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
                  <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">Best regards,</p>
                  <p style="color: #6b7280; font-size: 14px; margin: 0; font-weight: 600;">InkLine Team - DVC</p>
                  <p style="color: #9ca3af; font-size: 12px; margin: 16px 0 0 0;">This is an automated email. Please do not reply to this message.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
  
  await sendEmail(email, subject, html);
};

export const sendViolationWarningEmail = async (email, fullName, shop) => {
  const subject = 'InkLine - Violation Warning';
  
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'SF Pro Icons', 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Violation Warning</h2>
      <p>Hi ${fullName},</p>
      <p>There is a violation recorded on your account at the <strong>${shop} Printing Shop</strong>.</p>
      <p>To avoid being banned from accessing this Printing Shop, please settle the violation first at the ${shop === 'IT' ? 'IT Office' : 'SSC Office'}.</p>
      <br>
      <p>Best regards,</p>
      <p><strong>InkLine Team - DVC</strong></p>
    </div>
  `;
  
  await sendEmail(email, subject, html);
};

export const sendViolationSettledEmail = async (email, fullName, shop) => {
  const subject = 'InkLine - Violation Settled';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0;">Violation Settled!</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${fullName},</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Great news! Your violation at the <strong>${shop} Printing Shop</strong> has been settled.
        </p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            <strong>✅ Status:</strong> Violation Settled
          </p>
          <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
            <strong>Shop:</strong> ${shop} Printing Shop
          </p>
        </div>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Your account is now in good standing. You can continue using the ${shop} Printing Shop services without any restrictions.
        </p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Thank you for resolving this matter. If you have any questions, feel free to contact us.
        </p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          Best regards,<br>
          <strong>InkLine Team - DVC</strong>
        </p>
      </div>
    </div>
  `;
  
  await sendEmail(email, subject, html);
};

export const sendBanNotificationEmail = async (email, fullName, shop) => {
  const subject = `InkLine - Account Banned from ${shop} Printing Shop`;
  
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'SF Pro Icons', 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0;">Account Banned</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${fullName},</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          We regret to inform you that your account has been banned from accessing the <strong>${shop} Printing Shop</strong>.
        </p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            <strong>⚠️ Status:</strong> Banned from ${shop} Printing Shop
          </p>
          <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
            <strong>Shop:</strong> ${shop} Printing Shop
          </p>
        </div>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          <strong>What does this mean?</strong>
        </p>
        <ul style="color: #374151; font-size: 16px; line-height: 1.8;">
          <li>You will not be able to access the ${shop} Printing Shop services</li>
          <li>The ${shop} Printing Shop button on your homepage will be disabled</li>
          <li>You will not be able to create new orders from this shop</li>
        </ul>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          If you believe this is a mistake or have questions about your ban, please contact the ${shop} Office directly.
        </p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          Best regards,<br>
          <strong>InkLine Team - DVC</strong>
        </p>
      </div>
    </div>
  `;
  
  await sendEmail(email, subject, html);
};

export const sendUnbanNotificationEmail = async (email, fullName, shop) => {
  const subject = `InkLine - Ban Lifted from ${shop} Printing Shop`;
  
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'SF Pro Icons', 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0;">Ban Lifted!</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${fullName},</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Great news! Your ban from the <strong>${shop} Printing Shop</strong> has been lifted.
        </p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            <strong>✅ Status:</strong> Ban Lifted
          </p>
          <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
            <strong>Shop:</strong> ${shop} Printing Shop
          </p>
        </div>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          <strong>What you can do now:</strong>
        </p>
        <ul style="color: #374151; font-size: 16px; line-height: 1.8;">
          <li>Access the ${shop} Printing Shop services</li>
          <li>Create new printing orders</li>
          <li>Use all features available in the ${shop} Printing Shop</li>
        </ul>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Your account is now in good standing. You can continue using the ${shop} Printing Shop services without any restrictions.
        </p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Thank you for your patience. If you have any questions, feel free to contact us.
        </p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          Best regards,<br>
          <strong>InkLine Team - DVC</strong>
        </p>
      </div>
    </div>
  `;
  
  await sendEmail(email, subject, html);
};

export const sendWelcomeEmail = async (email, fullName, isBSIT) => {
  if (isBSIT) {
    // BSIT Student - Account created, waiting for approval
    const subject = 'InkLine - Welcome! Account Created Successfully';
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'SF Pro Icons', 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to InkLine!</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${fullName},</p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Thank you for creating an account with <strong>InkLine Smart Printing System</strong>!
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              <strong>Account Status:</strong> Pending Approval
            </p>
            <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
              Your account has been created successfully. Since you're a BSIT student, your account needs to be approved by the IT Printing Shop administrators before you can access the system.
            </p>
          </div>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            <strong>What happens next?</strong>
          </p>
          <ul style="color: #374151; font-size: 16px; line-height: 1.8;">
            <li>Our IT administrators will review your account and DVC School ID</li>
            <li>You will receive an email notification once your account is approved</li>
            <li>After approval, you can log in and access both IT and SSC Printing Shops</li>
          </ul>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            We'll notify you via email as soon as your account is approved. Thank you for your patience!
          </p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            Best regards,<br>
            <strong>InkLine Team - DVC</strong>
          </p>
        </div>
      </div>
    `;
    await sendEmail(email, subject, html);
  } else {
    // Non-BSIT Student - Account created and approved, can use immediately
    const subject = 'InkLine - Welcome! Your Account is Ready';
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'SF Pro Icons', 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to InkLine!</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${fullName},</p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Thank you for creating an account with <strong>InkLine Smart Printing System</strong>!
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              <strong>✅ Account Status:</strong> Approved and Ready to Use
            </p>
            <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
              Your account has been created and approved! You can now log in and start using the SSC Printing Shop services.
            </p>
          </div>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            <strong>What you can do:</strong>
          </p>
          <ul style="color: #374151; font-size: 16px; line-height: 1.8;">
            <li>Log in to your account at any time</li>
            <li>Create printing orders at the SSC Printing Shop</li>
            <li>Track your order status in real-time</li>
            <li>Receive email notifications when your orders are ready</li>
          </ul>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            <strong>Note:</strong> Payment is required upon pickup at the SSC Printing Shop.
          </p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            We're excited to have you on board! If you have any questions, feel free to contact us.
          </p>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            Best regards,<br>
            <strong>InkLine Team - DVC</strong>
          </p>
        </div>
      </div>
    `;
    await sendEmail(email, subject, html);
  }
};
