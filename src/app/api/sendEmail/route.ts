import { EmailTemplate } from "@/components/templates/email-template";
import { Resend } from "resend";
import { render } from "@react-email/render";
import { validateContact } from "@/lib/validation";
import { serverEnv } from "@/lib/env";
import { businessEmail } from "@/config/contact";

const resend = new Resend(serverEnv.RESEND_API_KEY);

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const result = validateContact(body);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  const { name, email, message } = result.data;

  try {
    const emailHtml = await render(EmailTemplate({ name, email, message }));

    const { data, error } = await resend.emails.send({
      from: "Website Form <onboarding@resend.dev>",
      to: businessEmail,
      subject: "Contact Form Submission",
      replyTo: email,
      html: emailHtml,
    });

    if (error) {
      console.error("Resend error:", error);
      return Response.json({ error: "Failed to send email" }, { status: 502 });
    }

    return Response.json({ id: data?.id });
  } catch (error) {
    console.error("sendEmail error:", error);
    return Response.json({ error: "Failed to send email" }, { status: 500 });
  }
}
