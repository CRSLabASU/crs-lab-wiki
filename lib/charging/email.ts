import nodemailer from "nodemailer";

// Reminder emails go out from the lab's Gmail account using an app password
// (Google Account → Security → 2-Step Verification → App passwords). Without
// GMAIL_USER and GMAIL_APP_PASSWORD the email is printed to the console.

export async function sendEmail(to: string, subject: string, text: string) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "GMAIL_USER and GMAIL_APP_PASSWORD must be set to send emails.",
      );
    }
    console.log(`[charging] email to ${to}: ${subject}\n${text}`);
    return;
  }

  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  await transport.sendMail({
    from: `CRS Lab Bot <${user}>`,
    to,
    subject,
    text,
  });
}
