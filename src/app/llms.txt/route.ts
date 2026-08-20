import { publicEnv } from "@/lib/env";
import { EMAIL, PHONE, LOCATION } from "@/lib/constants";

// llms.txt (llmstxt.org): resumo do site para consumo por LLMs. Aposta barata
// de GEO — os grandes motores de AI ainda não o consomem (o Google rejeita-o),
// por isso nunca prometer resultados por causa dele. Factos derivados da mesma
// fonte única do site (constants + copy aprovado); preços vivem na DB/painel e
// ficam de fora de propósito (isto é estático, divergiria).
export const dynamic = "force-static";

export function GET(): Response {
  const base = publicEnv.baseUrl;

  const body = `# RedDune Solutions

> Assistência técnica informática, montagem de PCs, desenvolvimento web/app e recuperação de dados na ${LOCATION.city}, ${LOCATION.region} — para particulares e empresas, presencial e remoto.

## Factos

- Base: ${LOCATION.city}, ${LOCATION.region}, ${LOCATION.country}. Área de actuação: todo o ${LOCATION.region}, com apoio presencial e remoto.
- Horário: segunda a sexta, 09h00–18h00.
- Contacto: ${PHONE} · ${EMAIL}
- Orçamento gratuito e sem compromisso; resposta normalmente no próprio dia útil.
- Garantia de 30 dias na mão-de-obra das reparações.
- Recuperação de dados: sem dados recuperados, sem custo (intervenções em laboratórios parceiros orçadas à parte).
- Loja: equipamentos novos com 3 anos de garantia e recondicionados com 18 meses (DL 84/2021). Preços de referência sem IVA.

## Páginas

- [Serviços](${base}/servicos): visão geral das três áreas de serviço.
- [Assistência Técnica](${base}/servicos/assistencia-tecnica): reparação e manutenção de computadores, em loja e ao domicílio.
- [Web & Digital](${base}/servicos/web-digital): websites, lojas online e aplicações à medida.
- [Software & Recuperação de Dados](${base}/servicos/software-recuperacao): recuperação de ficheiros e resolução de problemas de software.
- [Loja](${base}/loja): equipamentos novos e recondicionados.
- [Portfólio](${base}/portfolio): trabalhos realizados.
- [FAQ](${base}/faq): perguntas frequentes sobre serviços, garantias e zonas servidas.
- [Contacto](${base}/contacto): formulário, telefone e morada.
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
