import type { APIRoute } from "astro";
import nodemailer from "nodemailer";

export const POST: APIRoute = async ({ request }) => {
  try {
    const form = await request.formData();
    const name = (form.get('name') as string) || '';
    const email = (form.get('email') as string) || '';
    const job = (form.get('job') as string) || '';
    const message = (form.get('message') as string) || '';
    const resume = form.get('resume') as File | null;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: import.meta.env.SMTP_USER,
        pass: import.meta.env.SMTP_PASS,
      },
      logger: true,
      debug: true,
    });

    await transporter.verify();

    const attachments: any[] = [];
    if (resume && typeof (resume as any).arrayBuffer === 'function' && (resume as any).size > 0) {
      if ((resume as any).size > 5 * 1024 * 1024) {
        return new Response(
          JSON.stringify({ success: false, error: 'Resume exceeds 5MB limit' }),
          { status: 413, headers: { 'Content-Type': 'application/json' } }
        );
      }
      const buf = Buffer.from(await (resume as any).arrayBuffer());
      attachments.push({
        filename: (resume as any).name || 'resume',
        content: buf,
        contentType: (resume as any).type || 'application/octet-stream',
      });
    }

    const info = await transporter.sendMail({
      from: `"TechAI Website" <${import.meta.env.SMTP_USER}>`,
      to: import.meta.env.TO_EMAIL,
      replyTo: email,
      subject: `New message from ${name}${job ? ' - ' + job : ''}`,
      text: `Name: ${name}\nEmail: ${email}\nJob: ${job || '(not provided)'}\nHas Resume: ${attachments.length > 0}\n\n${message}`,
      attachments,
    });

    return new Response(JSON.stringify({ success: true, id: info.messageId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Unknown error' }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
