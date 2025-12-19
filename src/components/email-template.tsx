import Image from 'next/image';
import * as React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  render,
} from "@react-email/components";


export function EmailTemplate(data: { name: string; email: string; message: string }) {
  
  const { name, email, message } = data;
  
  return (
    <Html>
    <Head />
    <Preview>Nova mensagem de contato de {name}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Novo Contato</Heading>
        <Section style={section}>
          <Text style={text}>
            <strong>Nome:</strong> {name}
          </Text>
          <Text style={text}>
            <strong>E-mail:</strong> {email}
          </Text>
          <Hr style={hr} />
          <Text style={text}>
            <strong>Mensagem:</strong>
          </Text>
          <Text style={messageBox}>{message}</Text>
        </Section>
        <Text style={footer}>
          Este e-mail foi enviado automaticamente pelo formulário do seu site.
        </Text>
      </Container>
    </Body>
  </Html>

  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  borderRadius: "8px",
  border: "1px solid #e6ebf1",
};

const h1 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "30px 0",
};

const section = {
  padding: "0 40px",
};

const text = {
  color: "#525f7f",
  fontSize: "16px",
  lineHeight: "24px",
  textAlign: "left" as const,
};

const messageBox = {
  color: "#525f7f",
  fontSize: "16px",
  lineHeight: "24px",
  backgroundColor: "#f4f4f4",
  padding: "15px",
  borderRadius: "4px",
  fontStyle: "italic",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  textAlign: "center" as const,
  marginTop: "20px",
};