import { EmailTemplate } from "../../../components/email-template";
import { Resend } from 'resend';
import { render } from '@react-email/render';

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST() {
  try {

    const emailHtml = await render(EmailTemplate({ firstName: 'John' }));


    const { data, error } = await resend.emails.send({
      from: 'Website Form <onboarding@resend.dev>',
      to: 'reddunesolutions@hotmail.com',
      subject: 'Contact Form Submission',
      html: emailHtml,
    });

    if (error) {
      return Response.json({ error }, { status: 400 });
    }

    return Response.json(data);
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}