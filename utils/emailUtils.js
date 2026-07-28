import configuration from "../config/configuration.js";

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
  if (!configuration.BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is missing");
  }

  if (!configuration.EMAIL_FROM_ADDRESS) {
    throw new Error("EMAIL_FROM_ADDRESS is missing");
  }

  console.log("Brevo email API configured successfully");
};


///test
export const sendTestEmail = async () => {
  try {
    const result = await sendMail(
      "verifyAccountOtp",
      "veereshnaik.swio@gmail.com",
      {
        otp: "123456",
      },
    );

    console.log("✅ Test email sent successfully");
    console.log(result);

    return result;
  } catch (error) {
    console.error("❌ Test email failed");
    console.error(error);

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

  const recipient = to.trim().toLowerCase();
  const { subject, text, html } = template(data);

  try {
    const response = await fetch(
      "https://api.brevo.com/v3/smtp/email",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "api-key": configuration.BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: {
            name: configuration.EMAIL_FROM_NAME,
            email: configuration.EMAIL_FROM_ADDRESS,
          },
          to: [
            {
              email: recipient,
            },
          ],
          subject,
          textContent: text,
          htmlContent: html,
        }),
      },
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        result?.message ||
          `Brevo API request failed with status ${response.status}`,
      );
    }

    console.log("Email sent successfully:", {
      recipient,
      templateName,
      messageId: result?.messageId,
    });

    return result;
  } catch (error) {
    console.error("Email sending failed:", {
      templateName,
      recipient,
      message: error?.message,
    });

    throw new Error(
      `Could not send email: ${
        error?.message || "Unknown email error"
      }`,
    );
  }
};

export default sendMail;

