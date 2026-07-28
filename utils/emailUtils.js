import dns from "node:dns";
import nodemailer from "nodemailer";
import configuration from "../config/configuration.js";

dns.setDefaultResultOrder("ipv4first");

const smtpLookup = (hostname, options, callback) => {
  dns.lookup(
    hostname,
    {
      ...options,
      family: 4,
      all: false,
    },
    callback,
  );
};

const createTransporter = () => {
  const commonOptions = {
    auth: {
      user: configuration.EMAIL_USER,
      pass: configuration.EMAIL_PASS,
    },

    lookup: smtpLookup,

    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  };

  if (configuration.EMAIL_HOST) {
    return nodemailer.createTransport({
      ...commonOptions,

      host: configuration.EMAIL_HOST,
      port: Number(configuration.EMAIL_PORT || 587),
      secure: configuration.EMAIL_SECURE === "true",

      tls: {
        servername: configuration.EMAIL_HOST,
      },
    });
  }

  if (configuration.EMAIL_SERVICE) {
    return nodemailer.createTransport({
      ...commonOptions,
      service: configuration.EMAIL_SERVICE,
    });
  }

  return nodemailer.createTransport({
    ...commonOptions,
    service: "gmail",
  });
};

const transporter = createTransporter();

const emailTemplates = {
  resetPasswordOtp: ({ otp }) => ({
    subject: "Password Reset OTP",
    text: `Your password reset OTP is ${otp}. It will expire in 10 minutes.`,
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
    text: `Your account verification OTP is ${otp}. It will expire in 10 minutes.`,
    html: `
      <h3>Account Verification</h3>

      <p>Your OTP for account verification is:</p>

      <h2>${otp}</h2>

      <p>This OTP will expire in 10 minutes.</p>

      <p>If you did not create this account, you can ignore this email.</p>
    `,
  }),
};

export const verifyEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log("Email server connected successfully");
  } catch (error) {
    console.error(
      "Email server connection failed:",
      error?.message || error,
    );

    throw error;
  }
};

export const sendMail = async (templateName, to, data = {}) => {
  const template = emailTemplates[templateName];

  if (!template) {
    throw new Error(`Email template not found: ${templateName}`);
  }

  if (!to || typeof to !== "string") {
    throw new Error("A valid recipient email address is required");
  }

  const { subject, text, html } = template(data);

  try {
    return await transporter.sendMail({
      from:
        configuration.EMAIL_FROM ||
        configuration.EMAIL_USER,

      to: to.trim().toLowerCase(),
      subject,
      text,
      html,
    });
  } catch (error) {
    console.error("Email sending failed:", {
      templateName,
      recipient: to,
      code: error?.code,
      command: error?.command,
      message: error?.message,
    });

    throw new Error(
      `Could not send email: ${error?.message || "Unknown email error"}`,
    );
  }
};

export default sendMail;