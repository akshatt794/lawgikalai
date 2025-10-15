const otpGenerator = require("otp-generator");
const nodemailer = require('nodemailer');
const axios = require("axios");
require("dotenv").config();

const generateOtp = () => {
    // otp creation
    let otp = otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
        digits: true
    }
    );

    return otp;
}

const sendCodeByEmail = (email, otp) => {

    var mailOptions = {
        from: process.env.ADMIN_EMAIL,
        to: email,
        subject: 'LawgikalAI OTP Verification',
        html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #d97706;">LawgikalAI Verification Code</h2>
          <p>Dear User,</p>
          <p>Your 6-digit verification code is:</p>
          <h3 style="letter-spacing: 4px; color: #111;">${otp}</h3>
          <p>This code will expire in 5 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
          <br/>
          <p>Best regards,</p>
          <p><strong>Team LawgikalAI</strong></p>
        </div>
      `,
    };

    const transporter = nodemailer.createTransport({
        host: "smtpout.secureserver.net",
        port: 465,
        secure: true,
        auth: {
            user: process.env.ADMIN_EMAIL,
            pass: process.env.APP_PWD
        }
    });

    transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        console.error("OTP email failed:", error);
    } else {
        console.log("OTP email sent:", info.response);
    }
    });
}

module.exports = { sendCodeByEmail, generateOtp };