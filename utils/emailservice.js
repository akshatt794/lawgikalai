const otpGenerator = require("otp-generator");
const nodemailer = require("nodemailer");
const axios = require("axios");
require("dotenv").config();

const generateOtp = () => {
  // otp creation
  let otp = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false,
    digits: true,
  });

  return otp;
};

const sendCodeByEmail = (email, otp) => {
  var mailOptions = {
    from: process.env.ADMIN_EMAIL,
    to: email,
    subject: "LawgikalAI OTP verification",
    text: `Your 6-digit OTP for verification is ${otp}. It expires in 5 minutes.`,
  };

  const transporter = nodemailer.createTransport({
    service: "gmail.com",
    auth: {
      user: process.env.ADMIN_EMAIL,
      pass: process.env.APP_PWD,
    },
  });

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("OTP email failed:", error);
    } else {
      console.log("OTP email sent:", info.response);
    }
  });
};

module.exports = { sendCodeByEmail, generateOtp };
