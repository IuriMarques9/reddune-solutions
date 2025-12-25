import { EmailTemplate } from "../../../components/templates/email-template";
import { Resend } from 'resend';
import { render } from '@react-email/render';

const resend = new Resend(process.env.RESEND_API_KEY!);


export async function POST(data: Request) {
  
  const { name, email, message } = await data.json();
  
  try {
    const emailHtml = await render(EmailTemplate({ name, email, message }));


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