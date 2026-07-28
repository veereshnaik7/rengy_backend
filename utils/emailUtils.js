import nodemailer from "nodemailer";
import configuration from "../config/configuration.js";

const createTransporter = () => {
  if (configuration.EMAIL_HOST) {
    return nodemailer.createTransport({
      host: configuration.EMAIL_HOST,
      port: Number(configuration.EMAIL_PORT || 587),
      secure: configuration.EMAIL_SECURE === "true",
      auth: {
        user: configuration.EMAIL_USER,
        pass: configuration.EMAIL_PASS,
      },
    });
  }

  if (configuration.EMAIL_SERVICE) {
    return nodemailer.createTransport({
      service: configuration.EMAIL_SERVICE,
      auth: {
        user: configuration.EMAIL_USER,
        pass: configuration.EMAIL_PASS,
      },
    });
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: configuration.EMAIL_USER,
      pass: configuration.EMAIL_PASS,
    },
  });
};

const emailTemplates = {
  resetPasswordOtp: ({ otp }) => ({
    subject: "Password Reset OTP",
    html: `
      <h3>Password Reset Request</h3>
      <p>Your OTP for password reset is:</p>
      <h2>${otp}</h2>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  }),

  verifyAccountOtp: ({ otp }) => ({
    subject: "Verify Your Account",
    html: `
      <h3>Account Verification</h3>
      <p>Your OTP for account verification is:</p>
      <h2>${otp}</h2>
      <p>This OTP will expire in 10 minutes.</p>
      <p>If you did not create this account, you can ignore this email.</p>
    `,
  }),
};

export const sendMail = async (templateName, to, data = {}) => {
  const template = emailTemplates[templateName];

  if (!template) {
    throw new Error(`Email template not found: ${templateName}`);
  }

  const { subject, html } = template(data);
  const transporter = createTransporter();

  return transporter.sendMail({
    from: configuration.EMAIL_FROM || configuration.EMAIL_USER,
    to,
    subject,
    html,
  });
};

export default sendMail;
