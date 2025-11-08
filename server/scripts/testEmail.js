import dotenv from 'dotenv';
import { sendEmail } from '../utils/email.js';

dotenv.config();

const testEmail = async () => {
  // Get recipient email from command line argument
  const recipientEmail = process.argv[2];

  if (!recipientEmail) {
    console.log('\n❌ Error: Please provide a recipient email address\n');
    console.log('Usage: node server/scripts/testEmail.js your-email@example.com\n');
    process.exit(1);
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(recipientEmail)) {
    console.log('\n❌ Error: Invalid email address format\n');
    process.exit(1);
  }

  console.log('\n🧪 Testing Gmail Integration...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Check if email credentials are configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('❌ Email credentials not configured!');
    console.log('\nPlease set the following in your .env file:');
    console.log('  EMAIL_USER=your-email@gmail.com');
    console.log('  EMAIL_PASS=your-16-character-app-password');
    console.log('\nSee GMAIL_SETUP.md for detailed instructions.\n');
    process.exit(1);
  }

  console.log(`✅ Email credentials found`);
  console.log(`   From: ${process.env.EMAIL_USER}`);
  console.log(`   To: ${recipientEmail}\n`);

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
            To: ${recipientEmail}
          </p>
        </div>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Your system is now ready to send email notifications for:
        </p>
        <ul style="color: #374151; font-size: 16px; line-height: 1.8;">
          <li>Account approvals</li>
          <li>Order ready notifications</li>
          <li>Violation warnings</li>
        </ul>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          This is an automated test email. You can safely ignore it.
        </p>
      </div>
    </div>
  `;

  try {
    console.log('📧 Sending test email...\n');
    
    const result = await sendEmail(recipientEmail, subject, html);

    if (result.success) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ SUCCESS! Test email sent successfully!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log(`📬 Please check the inbox for: ${recipientEmail}`);
      console.log('   (Also check spam/junk folder if not in inbox)\n');
      console.log('💡 Your Gmail integration is working correctly!\n');
    } else {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('❌ FAILED! Email could not be sent');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log(`Error: ${result.error}\n`);
      
      if (result.error.includes('EAUTH') || result.error.includes('authentication')) {
        console.log('🔧 Troubleshooting:');
        console.log('   1. Verify EMAIL_USER and EMAIL_PASS in .env file');
        console.log('   2. Make sure you\'re using a Gmail App Password (not regular password)');
        console.log('   3. Ensure 2-Step Verification is enabled on your Gmail account');
        console.log('   4. See GMAIL_SETUP.md for detailed instructions\n');
      }
    }
  } catch (error) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ ERROR! An unexpected error occurred');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`Error: ${error.message}\n`);
  }

  process.exit(0);
};

testEmail();

