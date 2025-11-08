import nodemailer from 'nodemailer';

// Create transporter with Gmail configuration
const createTransporter = () => {
  // Check if email credentials are configured
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️ Email credentials not configured. Email notifications will be disabled.');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    // Additional options for better reliability in production
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5,
    // Fix certificate issues
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Create transporter - will be recreated if env vars change
let transporter = createTransporter();

export const sendEmail = async (to, subject, html) => {
  // Recreate transporter if it doesn't exist (in case env vars were set after module load)
  if (!transporter) {
    transporter = createTransporter();
  }
  
  // Check if email is configured
  if (!transporter) {
    console.warn('⚠️ Email transporter not configured. Skipping email to:', to);
    return { success: false, error: 'Email not configured' };
  }

  // Validate email address
  if (!to || !to.includes('@')) {
    console.error('❌ Invalid email address:', to);
    return { success: false, error: 'Invalid email address' };
  }

  try {
    const mailOptions = {
      from: `InkLine DVC <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✉️ Email sent successfully to:', to);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    
    // Provide helpful error messages
    if (error.code === 'EAUTH') {
      console.error('   → Authentication failed. Check your EMAIL_USER and EMAIL_PASS in .env');
      console.error('   → For Gmail, you may need to use an App Password instead of your regular password');
    } else if (error.code === 'ECONNECTION') {
      console.error('   → Connection failed. Check your internet connection.');
    }
    
    return { success: false, error: error.message };
  }
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
  const subject = `InkLine - Order #${orderNumber} Ready for Pickup`;
  const paymentNote = shop === 'SSC' ? ' and Payment' : '';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0;">Order Ready for Pickup${paymentNote}!</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${fullName},</p>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Great news! Your printing order is ready for pickup${paymentNote.toLowerCase()}!
        </p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            <strong>Order Number:</strong> #${orderNumber}
          </p>
          <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
            <strong>Shop:</strong> ${shop} Printing Shop
          </p>
        </div>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
          Please visit the <strong>${shop} Printing Shop</strong> to collect your order.
        </p>
        ${shop === 'SSC' ? '<p style="color: #374151; font-size: 16px; line-height: 1.6;"><strong>Note:</strong> Payment is required upon pickup.</p>' : ''}
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

