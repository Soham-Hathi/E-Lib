import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASS;
const target = process.argv[2] || process.env.ADMIN_EMAIL || 'hathisoham9@gmail.com';

console.log('Testing SMTP configuration...');
console.log('EMAIL_USER:', user ? user : '(not set)');
console.log('EMAIL_PASS:', pass ? '******' : '(not set)');
console.log('Target recipient:', target);

if (!user || !pass) {
  console.log('\n[!] EMAIL_USER and EMAIL_PASS are not configured in backend/.env.');
  console.log('To send real emails to your inbox, set your Gmail address and 16-character Google App Password in backend/.env.');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user, pass },
});

transporter.verify((err, success) => {
  if (err) {
    console.error('\n[X] SMTP Connection Failed:', err.message);
    process.exit(1);
  }
  console.log('\n[✓] SMTP Server Connection Succeeded!');

  transporter.sendMail({
    from: user,
    to: target,
    subject: 'E-Library SMTP Test Email',
    text: 'Hello Soham,\n\nThis is a real test email from your E-Library system confirming that real email delivery is functioning!',
    html: '<h3>E-Library System</h3><p>Hello Soham,</p><p>This is a real test email from your E-Library system confirming that real email delivery is functioning!</p>'
  }, (sendErr, info) => {
    if (sendErr) {
      console.error('[X] Delivery Error:', sendErr.message);
      process.exit(1);
    }
    console.log('[✓] Real email sent successfully! Message ID:', info.messageId);
    process.exit(0);
  });
});
