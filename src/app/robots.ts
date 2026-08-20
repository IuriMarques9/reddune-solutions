import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";

// /api fica FORA do disallow de propósito: o fetcher do Resumo Matinal
// (tarefa agendada) respeita robots.txt e parsers simples não aplicam a
// precedência "Allow mais específico ganha" — o antigo Disallow /api/
// bloqueava-o mesmo com Allow /api/brief. robots.txt não é segurança
// (todas as rotas /api têm auth própria); a não-indexação é garantida
// pelo X-Robots-Tag: noindex no next.config.ts, o mecanismo certo.
const PRIVATE_PATHS = ["/painel", "/painel/", "/entrar", "/entrar/", "/p/"];

// Grupo explícito para crawlers de AI (GEO): o "*" já os permite hoje, mas o
// grupo dedicado declara intenção e sobrevive a um futuro aperto do "*" —
// e permite tratar Google-Extended (treino Gemini) separado do Googlebot.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: AI_CRAWLERS,
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: `${publicEnv.baseUrl}/sitemap.xml`,
    host: publicEnv.baseUrl,
  };
}
