import express from 'express';
import { sendEmail } from '../utils/email.js';

const router = express.Router();

// @route   GET /api/test/email
// @desc    Test email sending (for production testing)
// @access  Public (for testing purposes)
router.get('/email', async (req, res) => {
  try {
    const { to } = req.query;

    if (!to) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide an email address. Usage: /api/test/email?to=your-email@example.com' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email address format' 
      });
    }

    // Check if email is configured (SendGrid or Gmail)
    if (!process.env.SENDGRID_API_KEY && (!process.env.EMAIL_USER || !process.env.EMAIL_PASS)) {
      return res.status(500).json({ 
        success: false, 
        message: 'Email credentials not configured. Please set SENDGRID_API_KEY (recommended) or EMAIL_USER and EMAIL_PASS in Render environment variables.' 
      });
    }

    // Create test email
    const subject = 'InkLine - Email Integration Test';
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'SF Pro Icons', 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">✅ Email Test Successful!</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Congratulations! Your Gmail integration is working correctly.
          </p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            This is a test email from the <strong>InkLine Smart Printing System</strong>.
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              <strong>Test Details:</strong><br>
              Sent at: ${new Date().toLocaleString()}<br>
              From: ${process.env.EMAIL_USER}<br>
              To: ${to}
            </p>
          </div>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Your system is now ready to send email notifications for:
          </p>
          <ul style="color: #374151; font-size: 16px; line-height: 1.8;">
            <li>Account approvals</li>
            <li>Order created notifications</li>
            <li>Order ready notifications</li>
            <li>Violation warnings</li>
          </ul>
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            This is an automated test email. You can safely ignore it.
          </p>
        </div>
      </div>
    `;

    console.log(`🧪 Testing email sending to: ${to}`);
    console.log(`📧 From: ${process.env.EMAIL_USER}`);

    // Send email
    const result = await sendEmail(to, subject, html);

    if (result.success) {
      console.log(`✅ Test email sent successfully to: ${to}`);
      return res.status(200).json({ 
        success: true, 
        message: `Test email sent successfully to ${to}`,
        details: {
          from: process.env.EMAIL_USER || process.env.SENDGRID_FROM_EMAIL || 'noreply@inkline-dvc.com',
          to: to,
          messageId: result.messageId,
          service: result.service || 'Unknown',
          timestamp: new Date().toISOString()
        }
      });
    } else {
      console.error(`❌ Test email failed: ${result.error}`);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send test email',
        error: result.error,
        service: result.service || 'Unknown',
        details: {
          from: process.env.EMAIL_USER || process.env.SENDGRID_FROM_EMAIL || 'noreply@inkline-dvc.com',
          to: to
        }
      });
    }
  } catch (error) {
    console.error('❌ Test email error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'An error occurred while sending test email',
      error: error.message 
    });
  }
});

export default router;

