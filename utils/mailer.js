// utils/mailer.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendOTPEmail(to, otp) {
    console.log("sending email....",to,otp);
  const mailOptions = {
    from: `"Halal Tools Support" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Your Password Reset OTP',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 10px;">
        <h2>Password Reset Request</h2>
        <p>Your OTP is:</p>
        <h1 style="color: #4285f4;">${otp}</h1>
        <p>This OTP is valid for 5 minutes. Do not share it with anyone.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendOTPEmail };
