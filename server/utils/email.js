import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import { getEmailTemplate, createInfoBox, createInfoBoxItem, createAlertBox, createStatusBadge } from './emailTemplates.js';

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
  
  // Clean subject line - remove spam trigger words
  const cleanSubject = subject
    .replace(/\s+/g, ' ') // Remove extra spaces
    .trim();

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
        subject: cleanSubject,
        text, // Plain text version (required for better deliverability)
        html, // HTML version
        // Add custom headers to improve deliverability and reduce spam
        headers: {
          'X-Entity-Ref-ID': `inkline-${Date.now()}`,
          'List-Unsubscribe': `<mailto:${replyTo}?subject=Unsubscribe>, <https://inkline-printing-system.onrender.com/unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          'Precedence': 'bulk', // Indicate this is a transactional email
          'X-Auto-Response-Suppress': 'All', // Suppress auto-responders
          'Auto-Submitted': 'auto-generated', // Indicate automated email
          'X-Mailer': 'InkLine Printing System', // Identify the sender
          'Message-ID': `<${Date.now()}-${Math.random().toString(36).substring(7)}@${fromEmail.split('@')[1]}>`, // Unique message ID using authenticated domain
          'Date': new Date().toUTCString() // Proper date header
        },
        // Add categories for better tracking and deliverability
        categories: ['inkline-printing-system', 'transactional'],
        // Mail settings for better deliverability
        mailSettings: {
          sandboxMode: {
            enable: false // Make sure sandbox mode is disabled
          },
          // Bypass list management (for transactional emails)
          bypassListManagement: {
            enable: true
          },
          // Footer settings (disable SendGrid footer for better deliverability)
          footer: {
            enable: false
          },
          // Spam check (optional - can help identify issues)
          spamCheck: {
            enable: false, // Disable to avoid false positives
            threshold: 5,
            postToUrl: ''
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
          },
          ganalytics: {
            enable: false // Disable Google Analytics tracking
          }
        },
        // Custom args for better tracking
        customArgs: {
          source: 'inkline-printing-system',
          type: 'transactional',
          timestamp: Date.now().toString()
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
  
  const content = `
    <p>Hello ${fullName},</p>
    <p>Great news! Your InkLine account has been approved by the IT Printing Shop administrators.</p>
    <p>You can now log in and access the IT Printing Shop services.</p>
    <p>Thank you for using InkLine Smart Printing Queue System!</p>
  `;
  
  const html = getEmailTemplate({
    title: 'Account Approved!',
    headerColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    content
  });
  
  await sendEmail(email, subject, html);
};

export const sendOrderCreatedEmail = async (email, fullName, orderNumber, shop, queuePosition, totalPrice, totalPages, pagesToPrintCount) => {
  const subject = `Your Printing Order #${orderNumber} Has Been Created`;
  
  const infoItems = [
    createInfoBoxItem('Order Number', `#${orderNumber}`),
    createInfoBoxItem('Printing Shop', `${shop} Printing Shop`)
  ];
  
  if (queuePosition) {
    infoItems.push(createInfoBoxItem('Queue Position', `#${queuePosition}`));
  }
  
  if (totalPages && totalPages > 0) {
    infoItems.push(createInfoBoxItem('Pages', `${pagesToPrintCount || totalPages} of ${totalPages} page${(pagesToPrintCount || totalPages) !== 1 ? 's' : ''}`));
  }
  
  if (totalPrice != null && totalPrice > 0) {
    infoItems.push(createInfoBoxItem('Total', `₱${Number(totalPrice).toFixed(2)}`, true));
  }
  
  const content = `
    <p>Hello ${fullName},</p>
    <p>Your printing order has been created and is now in the queue.</p>
    ${createInfoBox(infoItems)}
    <p><strong>What happens next?</strong></p>
    <ul>
      <li>Your order is now in the queue</li>
      <li>You will receive an email when your order starts printing</li>
      <li>You will receive another email when your order is ready for pickup</li>
      <li>You can track your order status in your student portal</li>
    </ul>
    <p>We will keep you updated on your order's progress. Thank you for using InkLine!</p>
  `;
  
  const html = getEmailTemplate({
    title: 'Order Created Successfully',
    headerColor: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    content
  });
  
  await sendEmail(email, subject, html);
};

export const sendOrderPrintingEmail = async (email, fullName, orderNumber, shop) => {
  const subject = `Your Order #${orderNumber} is Now Printing`;
  
  const infoItems = [
    createInfoBoxItem('Order Number', `#${orderNumber}`),
    createInfoBoxItem('Printing Shop', `${shop} Printing Shop`),
    createInfoBoxItem('Status', createStatusBadge('Printing', 'warning'))
  ];
  
  const content = `
    <p>Hello ${fullName},</p>
    <p>Great news! Your printing order is now being processed.</p>
    ${createInfoBox(infoItems)}
    <p>Your order is currently being printed. You will receive another email notification when it is ready for pickup.</p>
    <p>Thank you for using InkLine!</p>
  `;
  
  const html = getEmailTemplate({
    title: 'Order Now Printing',
    headerColor: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    content
  });
  
  await sendEmail(email, subject, html);
};

export const sendOrderReadyEmail = async (email, fullName, orderNumber, shop) => {
  const subject = `Your Order #${orderNumber} is Ready for Pickup`;
  const paymentNote = shop === 'SSC' ? ' and Payment' : '';
  
  const infoItems = [
    createInfoBoxItem('Order Number', `#${orderNumber}`),
    createInfoBoxItem('Printing Shop', `${shop} Printing Shop`)
  ];
  
  const content = `
    <p>Hello ${fullName},</p>
    <p>Great news! Your printing order is ready for pickup${paymentNote.toLowerCase()}!</p>
    ${createInfoBox(infoItems)}
    <p>Please visit the <strong>${shop} Printing Shop</strong> to collect your order.</p>
    ${shop === 'SSC' ? createAlertBox('<strong>Note:</strong> Payment is required upon pickup.', 'warning') : ''}
    <p>Thank you for using InkLine!</p>
  `;
  
  const html = getEmailTemplate({
    title: `Order Ready for Pickup${paymentNote}!`,
    headerColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    content
  });
  
  await sendEmail(email, subject, html);
};

export const sendViolationWarningEmail = async (email, fullName, shop) => {
  const subject = 'InkLine - Violation Warning';
  
  const content = `
    <p>Hello ${fullName},</p>
    <p>There is a violation recorded on your account at the <strong>${shop} Printing Shop</strong>.</p>
    ${createAlertBox('To avoid being banned from accessing this Printing Shop, please settle the violation first at the ' + (shop === 'IT' ? 'IT Office' : 'SSC Office') + '.', 'warning')}
    <p>Please contact the ${shop === 'IT' ? 'IT Office' : 'SSC Office'} to resolve this issue as soon as possible.</p>
  `;
  
  const html = getEmailTemplate({
    title: 'Violation Warning',
    headerColor: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    content
  });
  
  await sendEmail(email, subject, html);
};

export const sendViolationSettledEmail = async (email, fullName, shop) => {
  const subject = 'InkLine - Violation Settled';
  
  const infoItems = [
    createInfoBoxItem('Status', createStatusBadge('Violation Settled', 'success')),
    createInfoBoxItem('Shop', `${shop} Printing Shop`)
  ];
  
  const content = `
    <p>Hello ${fullName},</p>
    <p>Great news! Your violation at the <strong>${shop} Printing Shop</strong> has been settled.</p>
    ${createInfoBox(infoItems)}
    <p>Your account is now in good standing. You can continue using the ${shop} Printing Shop services without any restrictions.</p>
    <p>Thank you for resolving this matter. If you have any questions, feel free to contact us.</p>
  `;
  
  const html = getEmailTemplate({
    title: 'Violation Settled!',
    headerColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    content
  });
  
  await sendEmail(email, subject, html);
};

export const sendBanNotificationEmail = async (email, fullName, shop) => {
  const subject = `InkLine - Account Banned from ${shop} Printing Shop`;
  
  const infoItems = [
    createInfoBoxItem('Status', createStatusBadge('Banned', 'error')),
    createInfoBoxItem('Shop', `${shop} Printing Shop`)
  ];
  
  const content = `
    <p>Hello ${fullName},</p>
    <p>We regret to inform you that your account has been banned from accessing the <strong>${shop} Printing Shop</strong>.</p>
    ${createInfoBox(infoItems)}
    <p><strong>What does this mean?</strong></p>
    <ul>
      <li>You will not be able to access the ${shop} Printing Shop services</li>
      <li>The ${shop} Printing Shop button on your homepage will be disabled</li>
      <li>You will not be able to create new orders from this shop</li>
    </ul>
    <p>If you believe this is a mistake or have questions about your ban, please contact the ${shop} Office directly.</p>
  `;
  
  const html = getEmailTemplate({
    title: 'Account Banned',
    headerColor: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
    content
  });
  
  await sendEmail(email, subject, html);
};

export const sendUnbanNotificationEmail = async (email, fullName, shop) => {
  const subject = `InkLine - Ban Lifted from ${shop} Printing Shop`;
  
  const infoItems = [
    createInfoBoxItem('Status', createStatusBadge('Ban Lifted', 'success')),
    createInfoBoxItem('Shop', `${shop} Printing Shop`)
  ];
  
  const content = `
    <p>Hello ${fullName},</p>
    <p>Great news! Your ban from the <strong>${shop} Printing Shop</strong> has been lifted.</p>
    ${createInfoBox(infoItems)}
    <p><strong>What you can do now:</strong></p>
    <ul>
      <li>Access the ${shop} Printing Shop services</li>
      <li>Create new printing orders</li>
      <li>Use all features available in the ${shop} Printing Shop</li>
    </ul>
    <p>Your account is now in good standing. You can continue using the ${shop} Printing Shop services without any restrictions.</p>
    <p>Thank you for your patience. If you have any questions, feel free to contact us.</p>
  `;
  
  const html = getEmailTemplate({
    title: 'Ban Lifted!',
    headerColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    content
  });
  
  await sendEmail(email, subject, html);
};

export const sendWelcomeEmail = async (email, fullName, isBSIT) => {
  if (isBSIT) {
    // BSIT Student - Account created, waiting for approval
    const subject = 'InkLine - Welcome! Account Created Successfully';
    
    const infoItems = [
      createInfoBoxItem('Account Status', createStatusBadge('Pending Approval', 'warning')),
      createInfoBoxItem('Program', 'BSIT')
    ];
    
    const content = `
      <p>Hello ${fullName},</p>
      <p>Thank you for creating an account with <strong>InkLine Smart Printing System</strong>!</p>
      ${createInfoBox(infoItems)}
      <p>Your account has been created successfully. Since you're a BSIT student, your account needs to be approved by the IT Printing Shop administrators before you can access the system.</p>
      <p><strong>What happens next?</strong></p>
      <ul>
        <li>Our IT administrators will review your account and DVC School ID</li>
        <li>You will receive an email notification once your account is approved</li>
        <li>After approval, you can log in and access both IT and SSC Printing Shops</li>
      </ul>
      <p>We'll notify you via email as soon as your account is approved. Thank you for your patience!</p>
    `;
    
    const html = getEmailTemplate({
      title: 'Welcome to InkLine!',
      headerColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      content
    });
    
    await sendEmail(email, subject, html);
  } else {
    // Non-BSIT Student - Account created and approved, can use immediately
    const subject = 'InkLine - Welcome! Your Account is Ready';
    
    const infoItems = [
      createInfoBoxItem('Account Status', createStatusBadge('Approved and Ready to Use', 'success'))
    ];
    
    const content = `
      <p>Hello ${fullName},</p>
      <p>Thank you for creating an account with <strong>InkLine Smart Printing System</strong>!</p>
      ${createInfoBox(infoItems)}
      <p>Your account has been created and approved! You can now log in and start using the SSC Printing Shop services.</p>
      <p><strong>What you can do:</strong></p>
      <ul>
        <li>Log in to your account at any time</li>
        <li>Create printing orders at the SSC Printing Shop</li>
        <li>Track your order status in real-time</li>
        <li>Receive email notifications when your orders are ready</li>
      </ul>
      ${createAlertBox('<strong>Note:</strong> Payment is required upon pickup at the SSC Printing Shop.', 'info')}
      <p>We're excited to have you on board! If you have any questions, feel free to contact us.</p>
    `;
    
    const html = getEmailTemplate({
      title: 'Welcome to InkLine!',
      headerColor: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      content
    });
    
    await sendEmail(email, subject, html);
  }
};
