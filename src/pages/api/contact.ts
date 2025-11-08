import type { APIRoute } from "astro";
import nodemailer from "nodemailer";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { name, email, message } = await request.json();
    console.log("📩 Incoming contact form:", { name, email, message });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: import.meta.env.SMTP_USER,
        pass: import.meta.env.SMTP_PASS,
      },
      logger: true,
      debug: true,
    });

    // verify connection before sending
    await transporter.verify();
    console.log("✅ SMTP connection verified successfully");

    const info = await transporter.sendMail({
      from: `"TechAI Website" <${import.meta.env.SMTP_USER}>`,
      to: import.meta.env.TO_EMAIL,
      replyTo: email,
      subject: `New message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
    });

    console.log("✅ Email sent successfully:", info.response);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("❌ Email send error:", err.message);
    console.error(err.stack);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
