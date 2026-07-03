const nodemailer = require('nodemailer');

/**
 * Sends an email if SMTP is configured in .env.
 * If SMTP_HOST is not set, it logs to the console instead of throwing,
 * so the app remains usable in development without a mail provider.
 */
async function sendEmail({ to, subject, html }) {
  if (!process.env.SMTP_HOST) {
    console.log(`[email disabled - would send] To: ${to} | Subject: ${subject}`);
    return { simulated: true };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter.sendMail({
    from: process.env.SMTP_FROM || 'USSD Exam System <no-reply@ckt-utas.edu.gh>',
    to,
    subject,
    html,
  });
}

module.exports = sendEmail;
