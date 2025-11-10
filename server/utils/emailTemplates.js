/**
 * Responsive Email Template Base
 * Provides a consistent, mobile-friendly email template structure
 */

export const getEmailTemplate = (options) => {
  const {
    title,
    headerColor = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    content,
    showFooter = true
  } = options;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="x-apple-disable-message-reformatting">
      <title>${title || 'InkLine'}</title>
      <style type="text/css">
        /* Reset styles */
        body, table, td, p, a, li, blockquote {
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
        }
        table, td {
          mso-table-lspace: 0pt;
          mso-table-rspace: 0pt;
        }
        img {
          -ms-interpolation-mode: bicubic;
          border: 0;
          outline: none;
          text-decoration: none;
        }
        
        /* Base styles */
        body {
          margin: 0 !important;
          padding: 0 !important;
          background-color: #f3f4f6;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        /* Container */
        .email-container {
          max-width: 600px;
          width: 100%;
          margin: 0 auto;
          background-color: #ffffff;
        }
        
        /* Header */
        .email-header {
          background: ${headerColor};
          padding: 32px 24px;
          text-align: center;
        }
        
        .email-header h1 {
          color: #ffffff;
          font-size: 24px;
          font-weight: 600;
          line-height: 1.3;
          margin: 0;
          padding: 0;
        }
        
        /* Content */
        .email-content {
          padding: 32px 24px;
          background-color: #ffffff;
        }
        
        .email-content p {
          color: #374151;
          font-size: 16px;
          line-height: 1.6;
          margin: 0 0 16px 0;
          word-wrap: break-word;
        }
        
        .email-content p:last-child {
          margin-bottom: 0;
        }
        
        .email-content strong {
          color: #111827;
          font-weight: 600;
        }
        
        /* Info box */
        .info-box {
          background-color: #f9fafb;
          border-radius: 8px;
          padding: 20px;
          margin: 24px 0;
          border: 1px solid #e5e7eb;
        }
        
        .info-box-item {
          padding: 10px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .info-box-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }
        
        .info-box-label {
          color: #111827;
          font-size: 14px;
          font-weight: 600;
          display: inline-block;
          min-width: 120px;
          margin-bottom: 4px;
        }
        
        .info-box-value {
          color: #6b7280;
          font-size: 14px;
          line-height: 1.5;
          display: block;
          word-wrap: break-word;
        }
        
        .info-box-total {
          padding-top: 16px;
          margin-top: 16px;
          border-top: 2px solid #e5e7eb;
        }
        
        .info-box-total .info-box-label {
          font-size: 16px;
          color: #111827;
        }
        
        .info-box-total .info-box-value {
          font-size: 18px;
          color: #2563eb;
          font-weight: 600;
        }
        
        /* Alert box */
        .alert-box {
          padding: 16px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid;
        }
        
        .alert-warning {
          background-color: #fef3c7;
          border-left-color: #f59e0b;
        }
        
        .alert-success {
          background-color: #d1fae5;
          border-left-color: #10b981;
        }
        
        .alert-error {
          background-color: #fee2e2;
          border-left-color: #dc2626;
        }
        
        .alert-info {
          background-color: #dbeafe;
          border-left-color: #3b82f6;
        }
        
        .alert-box p {
          margin: 0;
          font-size: 14px;
          line-height: 1.6;
        }
        
        /* List */
        .email-content ul {
          color: #374151;
          font-size: 16px;
          line-height: 1.8;
          margin: 16px 0;
          padding-left: 24px;
        }
        
        .email-content ul li {
          margin-bottom: 8px;
          word-wrap: break-word;
        }
        
        .email-content ul li:last-child {
          margin-bottom: 0;
        }
        
        /* Footer */
        .email-footer {
          padding: 24px;
          background-color: #f9fafb;
          border-top: 1px solid #e5e7eb;
          text-align: center;
        }
        
        .email-footer p {
          color: #6b7280;
          font-size: 14px;
          line-height: 1.6;
          margin: 0 0 8px 0;
        }
        
        .email-footer p:last-child {
          margin: 16px 0 0 0;
          font-size: 12px;
          color: #9ca3af;
        }
        
        .email-footer strong {
          color: #6b7280;
          font-weight: 600;
        }
        
        /* Status badge */
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          line-height: 1.5;
        }
        
        .status-success {
          background-color: #d1fae5;
          color: #065f46;
        }
        
        .status-warning {
          background-color: #fef3c7;
          color: #92400e;
        }
        
        .status-error {
          background-color: #fee2e2;
          color: #991b1b;
        }
        
        .status-info {
          background-color: #dbeafe;
          color: #1e40af;
        }
        
        /* Mobile responsive styles */
        @media only screen and (max-width: 600px) {
          .email-container {
            width: 100% !important;
            max-width: 100% !important;
          }
          
          .email-header {
            padding: 24px 16px !important;
          }
          
          .email-header h1 {
            font-size: 20px !important;
          }
          
          .email-content {
            padding: 24px 16px !important;
          }
          
          .email-content p {
            font-size: 15px !important;
            line-height: 1.6 !important;
          }
          
          .email-content ul {
            font-size: 15px !important;
            padding-left: 20px !important;
          }
          
          .info-box {
            padding: 16px !important;
            margin: 20px 0 !important;
          }
          
          .info-box-label {
            min-width: 100% !important;
            display: block !important;
            margin-bottom: 4px !important;
          }
          
          .info-box-value {
            display: block !important;
            margin-left: 0 !important;
          }
          
          .alert-box {
            padding: 12px !important;
            margin: 16px 0 !important;
          }
          
          .email-footer {
            padding: 20px 16px !important;
          }
        }
        
        /* Dark mode support (optional) */
        @media (prefers-color-scheme: dark) {
          .email-container {
            background-color: #ffffff !important;
          }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6;">
        <tr>
          <td style="padding: 20px 0;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" class="email-container" style="margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              ${title ? `
              <tr>
                <td class="email-header">
                  <h1>${title}</h1>
                </td>
              </tr>
              ` : ''}
              <tr>
                <td class="email-content">
                  ${content}
                </td>
              </tr>
              ${showFooter ? `
              <tr>
                <td class="email-footer">
                  <p>Best regards,</p>
                  <p><strong>InkLine Team - DVC</strong></p>
                  <p>This is an automated email. Please do not reply to this message.</p>
                </td>
              </tr>
              ` : ''}
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

/**
 * Helper function to create info box items
 */
export const createInfoBoxItem = (label, value, isTotal = false) => {
  const totalClass = isTotal ? ' info-box-total' : '';
  return `
    <div class="info-box-item${totalClass}">
      <span class="info-box-label">${label}:</span>
      <span class="info-box-value">${value}</span>
    </div>
  `;
};

/**
 * Helper function to create info box
 */
export const createInfoBox = (items) => {
  return `
    <div class="info-box">
      ${items.join('')}
    </div>
  `;
};

/**
 * Helper function to create alert box
 */
export const createAlertBox = (message, type = 'info') => {
  return `
    <div class="alert-box alert-${type}">
      <p>${message}</p>
    </div>
  `;
};

/**
 * Helper function to create status badge
 */
export const createStatusBadge = (text, type = 'info') => {
  return `<span class="status-badge status-${type}">${text}</span>`;
};

