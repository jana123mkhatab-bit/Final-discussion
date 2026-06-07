'use strict';

const nodemailer = require('nodemailer');

let transporter = null;

let smtpDisabled = false;

function buildTransporter() {
  if (process.env.NODE_ENV === 'test') {
    return {
      sendMail: async (options) => {
        return { messageId: `mock-${Date.now()}@swapify.com` };
      },
      verify: (callback) => {
        callback(null);
      }
    };
  }


  const user = (process.env.EMAIL_USER || '').trim();
  const pass = (process.env.EMAIL_PASS || '').trim();


  if (!user || !pass ||
    user === 'your_gmail@gmail.com' ||
    pass === 'your_16char_app_password' ||
    user.startsWith('your-brevo')) {
    console.warn('[email] ⚠️  EMAIL credentials not configured in .env — emails will be skipped.');
    console.warn('[email]    Set EMAIL_USER (your Brevo login email) and EMAIL_PASS (your Brevo SMTP key).');
    return null;
  }

  const t = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: { user, pass },
    authMethod: 'LOGIN',
    tls: {
      rejectUnauthorized: false,
    },
    pool: false,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

  return t;
}

function getTransporter() {
  if (smtpDisabled) return null;
  if (!transporter) {
    transporter = buildTransporter();
  }
  return transporter;
}

function verifyTransporter() {
  const t = buildTransporter();
  if (!t) return;

  t.verify((err) => {
    if (err) {
      if (process.env.NODE_ENV) {
        console.error('[email] ❌ SMTP connection verification FAILED:', err.message);
        console.error('[email]    Code:', err.code);
      }
      if (err.code === 'EAUTH' || (err.message && err.message.includes('535'))) {
        smtpDisabled = true;
        if (process.env.NODE_ENV) {
          console.error('[email] ══════════════════════════════════════════════════════');
          console.error('[email] 🔑 BREVO SMTP AUTHENTICATION FAILED — Action Required:');
          console.error('[email]    1. Go to https://app.brevo.com → log in');
          console.error('[email]    2. Click your avatar (top-right) → "SMTP & API"');
          console.error('[email]    3. Click the "SMTP" tab → Delete old key → Create a new SMTP key');
          console.error('[email]    4. Copy the new key and update EMAIL_PASS in your .env file');
          console.error('[email]    5. Make sure EMAIL_USER matches your Brevo account login email');
          console.error('[email]    6. In Brevo → Senders & IP → verify the EMAIL_FROM address');
          console.error('[email]    7. Restart the server after updating .env');
          console.error('[email] ══════════════════════════════════════════════════════');
        }
      } else {
        if (process.env.NODE_ENV) {
          console.error('[email]    Check that:');
          console.error('[email]      • EMAIL_USER is your Brevo account login email');
          console.error('[email]      • EMAIL_PASS is the SMTP key from Brevo → SMTP & API → SMTP tab');
          console.error('[email]      • The sender in EMAIL_FROM is verified in Brevo → Senders & IP');
        }

        transporter = null;
      }
    } else {
      smtpDisabled = false;
      if (process.env.NODE_ENV) {
        console.log('[email] ✅ SMTP connection verified — ready to send emails');
      }
    }
  });
}

verifyTransporter();

function layout(title, body) {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0f0f17;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f17;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#1a1a2e;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.5);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6c47ff 0%,#a855f7 100%);padding:36px 40px;text-align:center;">
            <h1 style="margin:0;color:#fff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">
              🔄 Swapify
            </h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">The Smart Swap Marketplace</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            ${body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#13131f;padding:24px 40px;text-align:center;border-top:1px solid rgba(255,255,255,0.06);">
            <p style="margin:0;color:#666;font-size:12px;">
              © ${new Date().getFullYear()} Swapify. All rights reserved.<br/>
              <a href="${appUrl}" style="color:#a855f7;text-decoration:none;">Visit Swapify</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(label, url) {
  return `<a href="${url}" style="display:inline-block;margin-top:24px;padding:14px 32px;background:linear-gradient(135deg,#6c47ff,#a855f7);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">${label}</a>`;
}

function infoRow(label, value) {
  return `<tr>
    <td style="padding:10px 14px;color:#aaa;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.06);">${label}</td>
    <td style="padding:10px 14px;color:#fff;font-size:13px;font-weight:600;border-bottom:1px solid rgba(255,255,255,0.06);">${value}</td>
  </tr>`;
}

async function send({ to, subject, html }) {
  if (smtpDisabled) {
    if (process.env.NODE_ENV) {
      console.warn(`[email] ⚠️  SMTP disabled due to auth failure. Skipping "${subject}" → ${to}`);
      console.warn('[email]    Fix credentials in .env and restart the server.');
    }
    return;
  }

  const t = getTransporter();
  if (!t) return;



  const from = (process.env.EMAIL_FROM || '').trim() ||
    `"Swapify 🔄" <${(process.env.EMAIL_USER || '').trim()}>`;

  try {
    const info = await t.sendMail({ from, to, subject, html });
    if (process.env.NODE_ENV) {
      console.log(`[email] ✅ Sent "${subject}" → ${to} (messageId: ${info.messageId})`);
    }
  } catch (err) {

    if (err.code === 'EAUTH' || err.responseCode === 535 || (err.message && err.message.includes('535'))) {
      smtpDisabled = true;
      transporter = null;
      if (process.env.NODE_ENV) {
        console.error('[email] ❌ Auth failure sending mail — disabling SMTP.');
        console.error('[email]    Generate a new SMTP key at https://app.brevo.com → SMTP & API → SMTP tab');
        console.error('[email]    Then update EMAIL_PASS in .env and restart the server.');
      }
    } else {
      if (process.env.NODE_ENV) {
        console.error(`[email] ❌ Failed to send "${subject}" to ${to}:`, err.message);
      }
    }
    if (err.response && process.env.NODE_ENV) {
      console.error('[email]    SMTP response:', err.response);
    }

  }
}

exports.sendWelcome = async ({ to, username }) => {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const html = layout('Welcome to Swapify!', `
    <h2 style="color:#fff;font-size:24px;margin:0 0 12px;">Welcome aboard, ${username}! 🎉</h2>
    <p style="color:#aaa;font-size:15px;line-height:1.7;margin:0 0 20px;">
      Your Swapify account has been created. You can now start swapping skills,
      objects, and deals with our growing community!
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#13131f;border-radius:10px;overflow:hidden;margin-bottom:24px;">
      <tbody>
        ${infoRow('Username', username)}
        ${infoRow('Email', to)}
        ${infoRow('Member since', new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }))}
      </tbody>
    </table>
    <p style="color:#aaa;font-size:14px;line-height:1.6;">
      🔍 Browse skills &amp; objects people are offering<br/>
      💬 Chat and negotiate directly with other users<br/>
      ⭐ Build your reputation through successful swaps
    </p>
    ${btn('Get Started', appUrl)}
  `);
  await send({ to, subject: '🎉 Welcome to Swapify!', html });
};

exports.sendLoginAlert = async ({ to, username, ip, time }) => {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const html = layout('New Login Detected', `
    <h2 style="color:#fff;font-size:22px;margin:0 0 12px;">New login to your account 🔐</h2>
    <p style="color:#aaa;font-size:15px;line-height:1.7;margin:0 0 20px;">
      Hi <strong style="color:#fff;">${username}</strong>, we detected a new login to your Swapify account.
      If this was you, no action is needed.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#13131f;border-radius:10px;overflow:hidden;margin-bottom:24px;">
      <tbody>
        ${infoRow('Time', time || new Date().toLocaleString())}
        ${infoRow('IP Address', ip || 'Unknown')}
      </tbody>
    </table>
    <p style="color:#f59e0b;font-size:13px;padding:12px 16px;background:rgba(245,158,11,0.1);border-radius:8px;border-left:3px solid #f59e0b;">
      ⚠️ If you did NOT log in, please change your password immediately and contact support.
    </p>
    ${btn('Secure My Account', `${appUrl}/settings`)}
  `);
  await send({ to, subject: '🔐 New login to your Swapify account', html });
};

exports.sendSwapRequestSubmitted = async ({ to, username, swapType, itemTitle }) => {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const html = layout('Swap Request Submitted', `
    <h2 style="color:#fff;font-size:22px;margin:0 0 12px;">Your swap request is under review 🔄</h2>
    <p style="color:#aaa;font-size:15px;line-height:1.7;margin:0 0 20px;">
      Hi <strong style="color:#fff;">${username}</strong>, your swap request has been submitted and is
      currently being reviewed by our team.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#13131f;border-radius:10px;overflow:hidden;margin-bottom:24px;">
      <tbody>
        ${infoRow('Item / Skill', itemTitle || 'N/A')}
        ${infoRow('Type', swapType === 'skill' ? 'Skill Swap' : 'Object Swap')}
        ${infoRow('Status', 'Pending Review')}
        ${infoRow('Submitted', new Date().toLocaleString())}
      </tbody>
    </table>
    <p style="color:#aaa;font-size:14px;line-height:1.6;">
      The admin will review the request and notify you once a decision is made.
      You can track your swap requests from your dashboard at any time.
    </p>
    ${btn('View My Swaps', `${appUrl}/swap-requests`)}
  `);
  await send({ to, subject: '🔄 Swap request submitted — under review', html });
};

exports.sendSwapAccepted = async ({ to, username, itemTitle, swapType }) => {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const html = layout('Swap Request Accepted!', `
    <h2 style="color:#fff;font-size:22px;margin:0 0 12px;">Your swap was accepted! 🎊</h2>
    <p style="color:#aaa;font-size:15px;line-height:1.7;margin:0 0 20px;">
      Great news, <strong style="color:#fff;">${username}</strong>! Your swap request has been accepted.
      The other user has agreed to the swap — please coordinate the next steps.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#13131f;border-radius:10px;overflow:hidden;margin-bottom:24px;">
      <tbody>
        ${infoRow('Item / Skill', itemTitle || 'N/A')}
        ${infoRow('Type', swapType === 'skill' ? 'Skill Swap' : 'Object Swap')}
        ${infoRow('Status', '✅ Accepted')}
        ${infoRow('Accepted on', new Date().toLocaleString())}
      </tbody>
    </table>
    <p style="color:#aaa;font-size:14px;line-height:1.6;">
      Use the Swapify chat to coordinate details with the other party and complete your swap safely!
    </p>
    ${btn('View My Swaps', `${appUrl}/swap-requests`)}
  `);
  await send({ to, subject: '🎊 Your swap request was accepted!', html });
};

exports.sendOrderConfirmation = async ({ to, username, deal, item }) => {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';


  const methodLabel = { card: '💳 Credit/Debit Card', points: '⭐ Swapify Points', cod: '💵 Cash on Delivery' };
  const summary = `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#13131f;border-radius:10px;overflow:hidden;margin-bottom:24px;">
      <tbody>
        ${infoRow('Order ID', deal._id || deal.id || 'N/A')}
        ${infoRow('Item', item.title || 'N/A')}
        ${infoRow('Quantity', deal.quantity || 1)}
        ${infoRow('Amount Paid', deal.amount != null ? `$${Number(deal.amount).toFixed(2)}` : 'N/A')}
        ${infoRow('Payment Method', methodLabel[deal.paymentMethod] || deal.paymentMethod || 'N/A')}
        ${infoRow('Shipping Address', deal.shippingAddress || 'N/A')}
        ${infoRow('Order Status', '✅ Confirmed')}
        ${infoRow('Date', new Date().toLocaleString())}
      </tbody>
    </table>
  `;

  const html = layout('Order Confirmed!', `
    <h2 style="color:#fff;font-size:22px;margin:0 0 12px;">Order confirmed! Thank you 🛍️</h2>
    <p style="color:#aaa;font-size:15px;line-height:1.7;margin:0 0 20px;">
      Hi <strong style="color:#fff;">${username}</strong>, your order has been confirmed.
      Here is your order summary:
    </p>
    ${summary}
    <p style="color:#aaa;font-size:14px;line-height:1.6;">
      The seller has been notified and will ship your item soon.
      You can track delivery status from your profile.
    </p>
    ${btn('View My Orders', `${appUrl}/profile`)}
  `);
  await send({ to, subject: `🛍️ Order Confirmed — ${item.title || 'Your Purchase'}`, html });
};

exports.sendAccountBanned = async ({ to, username, reason }) => {
  const html = layout('Account Suspended', `
    <h2 style="color:#f87171;font-size:22px;margin:0 0 12px;">Your account has been suspended 🚫</h2>
    <p style="color:#aaa;font-size:15px;line-height:1.7;margin:0 0 20px;">
      Hi <strong style="color:#fff;">${username}</strong>, your Swapify account has been suspended by an administrator.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#13131f;border-radius:10px;overflow:hidden;margin-bottom:24px;">
      <tbody>
        ${infoRow('Status', '🚫 Suspended')}
        ${infoRow('Reason', reason || 'Violation of terms of service')}
        ${infoRow('Date', new Date().toLocaleString())}
      </tbody>
    </table>
    <p style="color:#aaa;font-size:14px;line-height:1.6;">
      If you believe this was a mistake, please contact our support team and we will review your case.
    </p>
    <p style="color:#f87171;font-size:13px;padding:12px 16px;background:rgba(248,113,113,0.1);border-radius:8px;border-left:3px solid #f87171;">
      While suspended, you will not be able to access your account or use Swapify services.
    </p>
  `);
  await send({ to, subject: '🚫 Your Swapify account has been suspended', html });
};

exports.sendAccountDeleted = async ({ to, username }) => {
  const html = layout('Account Deleted', `
    <h2 style="color:#f87171;font-size:22px;margin:0 0 12px;">Your account has been deleted 🗑️</h2>
    <p style="color:#aaa;font-size:15px;line-height:1.7;margin:0 0 20px;">
      Hi <strong style="color:#fff;">${username}</strong>, your Swapify account and all associated data
      have been permanently deleted by an administrator.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#13131f;border-radius:10px;overflow:hidden;margin-bottom:24px;">
      <tbody>
        ${infoRow('Status', '🗑️ Permanently Deleted')}
        ${infoRow('Date', new Date().toLocaleString())}
      </tbody>
    </table>
    <p style="color:#aaa;font-size:14px;line-height:1.6;">
      All your listings, swap history, and messages have been removed.
      If you believe this was a mistake, please contact our support team.
    </p>
  `);
  await send({ to, subject: '🗑️ Your Swapify account has been deleted', html });
};

exports.sendNewMessageNotification = async ({ to, username, senderName }) => {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const html = layout('New Message', `
    <h2 style="color:#fff;font-size:22px;margin:0 0 12px;">You have a new message 💬</h2>
    <p style="color:#aaa;font-size:15px;line-height:1.7;margin:0 0 20px;">
      Hi <strong style="color:#fff;">${username}</strong>,
      <strong style="color:#a855f7;">${senderName}</strong> has sent you a message on Swapify.
    </p>
    <p style="color:#aaa;font-size:14px;line-height:1.6;">
      Log in to Swapify to read and reply to their message. Fast replies lead to faster swaps!
    </p>
    ${btn('Read Message', `${appUrl}/messages`)}
  `);
  await send({ to, subject: `💬 New message from ${senderName} on Swapify`, html });
};

exports.sendReportSubmitted = async ({ to, username }) => {
  const html = layout('Report Submitted', `
    <h2 style="color:#fff;font-size:22px;margin:0 0 12px;">Your report has been submitted ✅</h2>
    <p style="color:#aaa;font-size:15px;line-height:1.7;margin:0 0 20px;">
      Hi <strong style="color:#fff;">${username}</strong>, thank you for submitting a report.
      Our admin team has received it and will investigate the matter thoroughly.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#13131f;border-radius:10px;overflow:hidden;margin-bottom:24px;">
      <tbody>
        ${infoRow('Status', '🔍 Under Investigation')}
        ${infoRow('Submitted', new Date().toLocaleString())}
      </tbody>
    </table>
    <p style="color:#aaa;font-size:14px;line-height:1.6;">
      We take all reports seriously. Our team will review the case and take appropriate action
      in accordance with our community guidelines. Thank you for helping keep Swapify safe!
    </p>
    <p style="color:#6c47ff;font-size:13px;padding:12px 16px;background:rgba(108,71,255,0.1);border-radius:8px;border-left:3px solid #6c47ff;">
      🛡️ The admin is going to investigate this report. We appreciate your patience.
    </p>
  `);
  await send({ to, subject: '🛡️ Your report has been received — Swapify Admin', html });
};

exports.sendPasswordReset = async ({ to, username, resetUrl }) => {
  const html = layout('Reset Your Password', `
    <h2 style="color:#fff;font-size:22px;margin:0 0 12px;">Reset your password 🔑</h2>
    <p style="color:#aaa;font-size:15px;line-height:1.7;margin:0 0 20px;">
      Hi <strong style="color:#fff;">${username}</strong>, we received a request to reset the password
      for your Swapify account. Click the button below to choose a new password.
    </p>
    <p style="color:#f59e0b;font-size:13px;padding:12px 16px;background:rgba(245,158,11,0.1);border-radius:8px;border-left:3px solid #f59e0b;margin-bottom:24px;">
      ⏰ This link expires in <strong>1 hour</strong>. If you did not request a password reset,
      you can safely ignore this email — your password will not change.
    </p>
    ${btn('Reset My Password', resetUrl)}
    <p style="color:#555;font-size:12px;margin-top:24px;word-break:break-all;">
      If the button doesn't work, copy and paste this link into your browser:<br/>
      <span style="color:#a855f7;">${resetUrl}</span>
    </p>
  `);
  await send({ to, subject: '🔑 Reset your Swapify password', html });
};

exports.sendListingApproved = async ({ to, username, listingTitle, listingType, listingUrl }) => {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const typeLabel = listingType === 'skill' ? 'Skill Listing' : 'Object Listing';
  const typeEmoji = listingType === 'skill' ? '🧠' : '📦';
  const html = layout(`Your ${typeLabel} is Live!`, `
    <h2 style="color:#6bcb77;font-size:22px;margin:0 0 12px;">Your listing is approved and live! ${typeEmoji}</h2>
    <p style="color:#aaa;font-size:15px;line-height:1.7;margin:0 0 20px;">
      Great news, <strong style="color:#fff;">${username}</strong>! Your ${typeLabel.toLowerCase()} has been
      reviewed and <strong style="color:#6bcb77;">approved</strong> by our admin team. It is now
      visible to the Swapify community.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#13131f;border-radius:10px;overflow:hidden;margin-bottom:24px;">
      <tbody>
        ${infoRow('Listing', listingTitle)}
        ${infoRow('Type', typeLabel)}
        ${infoRow('Status', '✅ Active & Live')}
        ${infoRow('Approved on', new Date().toLocaleString())}
      </tbody>
    </table>
    <p style="color:#aaa;font-size:14px;line-height:1.6;">
      Other Swapify members can now discover and contact you about your listing.
      Make sure your profile is complete to attract the best swap partners!
    </p>
    ${btn('View My Listing', listingUrl || appUrl)}
  `);
  await send({ to, subject: `${typeEmoji} Your listing "${listingTitle}" is now live on Swapify!`, html });
};

exports.sendListingRejected = async ({ to, username, listingTitle, listingType, reason }) => {
  const typeLabel = listingType === 'skill' ? 'Skill Listing' : 'Object Listing';
  const typeEmoji = listingType === 'skill' ? '🧠' : '📦';
  const html = layout(`${typeLabel} Not Approved`, `
    <h2 style="color:#f87171;font-size:22px;margin:0 0 12px;">Your listing needs attention ${typeEmoji}</h2>
    <p style="color:#aaa;font-size:15px;line-height:1.7;margin:0 0 20px;">
      Hi <strong style="color:#fff;">${username}</strong>, after reviewing your ${typeLabel.toLowerCase()},
      our admin team was unable to approve it at this time.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#13131f;border-radius:10px;overflow:hidden;margin-bottom:24px;">
      <tbody>
        ${infoRow('Listing', listingTitle)}
        ${infoRow('Type', typeLabel)}
        ${infoRow('Status', '❌ Not Approved')}
        ${infoRow('Reason', reason || 'Does not meet our community guidelines')}
        ${infoRow('Reviewed on', new Date().toLocaleString())}
      </tbody>
    </table>
    <p style="color:#aaa;font-size:14px;line-height:1.6;">
      You are welcome to edit your listing and resubmit it for review. Please make sure
      your listing complies with our <a href="${process.env.APP_URL || 'http://localhost:3000'}/about"
      style="color:#a855f7;">community guidelines</a>.
    </p>
    <p style="color:#f59e0b;font-size:13px;padding:12px 16px;background:rgba(245,158,11,0.1);border-radius:8px;border-left:3px solid #f59e0b;">
      💡 If you believe this decision was made in error, please contact our support team.
    </p>
  `);
  await send({ to, subject: `${typeEmoji} Update on your listing "${listingTitle}" — Swapify`, html });
};

