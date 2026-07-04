const AfricasTalking = require('africastalking');

let smsClient = null;

function getSmsClient() {
  if (!process.env.AT_API_KEY || !process.env.AT_USERNAME) {
    return null;
  }
  if (!smsClient) {
    const at = AfricasTalking({
      apiKey: process.env.AT_API_KEY,
      username: process.env.AT_USERNAME,
    });
    smsClient = at.SMS;
  }
  return smsClient;
}

/**
 * Sends an SMS via Africa's Talking if AT_API_KEY/AT_USERNAME are configured
 * in .env. If not configured, logs to console instead of throwing, so the
 * app remains usable without an SMS provider set up.
 */
async function sendSms(to, message) {
  const sms = getSmsClient();
  if (!sms) {
    console.log(`[SMS disabled - would send] To: ${to} | Message: ${message}`);
    return { simulated: true };
  }

  // Africa's Talking expects international format, e.g. +233XXXXXXXXX for Ghana.
  const formattedTo = to.startsWith('+') ? to : `+233${to.replace(/^0/, '')}`;

  try {
    const result = await sms.send({ to: [formattedTo], message });
    return result;
  } catch (err) {
    console.error('Failed to send SMS:', err.message);
    return { error: err.message };
  }
}

module.exports = sendSms;
