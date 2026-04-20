# Plano de SEO — RedDune Solutions
## (Para o Claude Code implementar)

## Estado atual
- ✅ `StructuredData` com schema LocalBusiness no layout
- ✅ `generateMetadata` com openGraph nas páginas principais
- ✅ `metadataBase` definido no layout
- ✅ Atributo `lang` no `<html>`
- ✅ Vercel Analytics
- ❌ Sem `sitemap.xml` — crítico para indexação
- ❌ Sem `robots.txt`
- ❌ Sem Open Graph image (imagem de pré-visualização para partilha)
- ❌ i18n baseado em cookie (mau para SEO — o Google não consegue indexar as duas línguas)
- ❌ URL `/pricingPage` não é SEO-friendly
- ❌ `twitter:card` metadata ausente na maioria das páginas
- ❌ `keywords` ausente em todas as páginas
- ❌ Structured data incompleto (sem BreadcrumbList, sem Service schema)
- ❌ Sem `hreflang` para as duas versões de idioma

---

## PASSO 1 — Sitemap dinâmico (PRIORIDADE MÁXIMA)

**Ficheiro a criar:** `src/app/sitemap.ts`

O Next.js 14+ gera o `sitemap.xml` automaticamente a partir deste ficheiro.
Incluir todas as páginas públicas com as suas prioridades e frequência de atualização:

```ts
import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = publicEnv.baseUrl;
  const now = new Date();

  return [
    {
      url: base,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${base}/loja`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${base}/pricingPage`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/contacto`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.6,
    },
  ];
}
```

---

## PASSO 2 — robots.txt

**Ficheiro a criar:** `src/app/robots.ts`

```ts
import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: `${publicEnv.baseUrl}/sitemap.xml`,
  };
}
```

---

## PASSO 3 — Open Graph image global

O Google e as redes sociais usam esta imagem quando o site é partilhado. Sem ela, é usada uma imagem aleatória ou nenhuma.

**Ficheiro a criar:** `src/app/opengraph-image.png`

Criar uma imagem 1200×630px com o logo da RedDune Solutions sobre fundo vermelho escuro. Esta é a imagem padrão usada em todas as páginas que não tenham uma imagem própria.

Colocar também em `public/og-image.png` e referenciar no metadata do layout:
```ts
// em src/app/layout.tsx, dentro de export const metadata:
openGraph: {
  images: [{ url: "/og-image.png", width: 1200, height: 630 }],
},
twitter: {
  card: "summary_large_image",
  images: ["/og-image.png"],
},
```

---

## PASSO 4 — Melhorar metadata em todas as páginas

**Ficheiros a alterar:** `src/app/page.tsx`, `src/app/loja/page.tsx`, `src/app/pricingPage/page.tsx`, `src/app/contacto/page.tsx`

### 4a — Adicionar `keywords` e `twitter` a todas as páginas

Cada `generateMetadata` deve incluir:

**Homepage (`page.tsx`):**
```ts
keywords: ["assistência técnica informática", "reparação computadores", "Fuseta", "Algarve", "serviços web", "recuperação de dados", "RedDune Solutions"],
twitter: {
  card: "summary_large_image",
  title,
  description,
},
```

**Loja (`loja/page.tsx`):**
```ts
keywords: ["loja informática", "comprar computador", "componentes PC", "segunda mão", "recondicionado", "Algarve"],
twitter: { card: "summary_large_image", title, description },
```

**Serviços (`pricingPage/page.tsx`):**
```ts
keywords: ["preços assistência técnica", "montagem PC", "desenvolvimento web Portugal", "serviços informáticos"],
twitter: { card: "summary_large_image", title, description },
```

**Contacto (`contacto/page.tsx`):**
```ts
keywords: ["contacto RedDune Solutions", "suporte técnico", "orçamento informático"],
twitter: { card: "summary_large_image", title, description },
```

### 4b — Melhorar as descrições

As descrições devem ter entre 120–160 caracteres, ser únicas por página, e incluir palavras-chave naturalmente. Atualizar as strings em `messages/pt.json` e `messages/en.json` que são usadas como `description` nas páginas.

### 4c — Adicionar `alternates.hreflang`

Em cada `generateMetadata`, adicionar as versões de idioma:
```ts
alternates: {
  canonical: `${base}/`,
  languages: {
    "pt": `${base}/`,
    "en": `${base}/`,
  },
},
```

**Nota:** Como o site usa cookies para idioma (não URLs diferentes), o `hreflang` tem valor limitado. Ver Passo 7 para a solução completa.

---

## PASSO 5 — Melhorar o Structured Data

**Ficheiro a alterar:** `src/components/structured-data.tsx`

### 5a — Enriquecer o schema LocalBusiness

Adicionar mais campos ao schema existente:

```ts
const schema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Reddune Solutions",
  description: "Assistência técnica informática, montagem de PCs, desenvolvimento web e recuperação de dados no Algarve.",
  url: publicEnv.baseUrl,
  logo: `${publicEnv.baseUrl}/logo.png`,
  image: `${publicEnv.baseUrl}/og-image.png`,
  telephone: contactInfo.phone,
  email: contactInfo.email,
  priceRange: "€€",
  address: {
    "@type": "PostalAddress",
    addressLocality: contactInfo.city,
    addressRegion: "Algarve",
    addressCountry: "PT",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 37.0566,    // coordenadas de Fuseta — confirmar valor exato
    longitude: -7.7389,
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "18:00",
    },
  ],
  sameAs: [
    contactInfo.instagramUrl,
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Serviços de Informática",
    itemListElement: [
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Assistência Técnica" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Desenvolvimento Web" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Recuperação de Dados" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Montagem de PCs" } },
    ],
  },
};
```

**Nota:** Confirmar as coordenadas geográficas exatas de Fuseta antes de fazer deploy.

### 5b — Adicionar BreadcrumbList nas páginas com breadcrumb

Nas páginas `/contacto` e `/pricingPage` (após ter hero), adicionar schema de breadcrumb inline no `generateMetadata` ou como componente separado:

```ts
const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Início", item: base },
    { "@type": "ListItem", position: 2, name: "Contacto", item: `${base}/contacto` },
  ],
};
```

---

## PASSO 6 — Renomear URL `/pricingPage` para `/servicos`

A URL atual `/pricingPage` é má para SEO — está em inglês, tem camelCase, e não descreve o conteúdo.

**O que fazer:**
1. Renomear a pasta `src/app/pricingPage/` para `src/app/servicos/`
2. Adicionar redirect permanente no `next.config.ts` para não perder links existentes:
```ts
async redirects() {
  return [
    {
      source: "/pricingPage",
      destination: "/servicos",
      permanent: true,  // 301 redirect — preserva o SEO
    },
  ];
},
```
3. Atualizar todos os links internos que apontem para `/pricingPage` (Header, Hero, Services section, sitemap, breadcrumbs)
4. Atualizar o `canonical` e `alternates` na metadata da página

---

## PASSO 7 — i18n baseado em URL (melhoria a longo prazo)

**Contexto:** O sistema atual usa cookies para determinar o idioma. O Google indexa páginas com uma única língua e não consegue descobrir automaticamente a versão inglesa do site. Isto é a falha de SEO mais significativa para um site bilingue.

**Solução:** Migrar para routing por URL usando o next-intl com path-based routing:
- `reddune-solutions.vercel.app/` → Português (padrão)
- `reddune-solutions.vercel.app/en/` → English

**O que muda:**
- `src/i18n/request.ts` — ler locale do path em vez de cookie
- `src/middleware.ts` — criar ficheiro de middleware next-intl para routing automático
- `next.config.ts` — configurar `locales` e `defaultLocale`
- Todas as páginas ficam dentro de `src/app/[locale]/` em vez de `src/app/`
- `hreflang` passa a funcionar corretamente

**Nota:** Esta é uma alteração estrutural significativa. Fazer depois de todas as outras estarem estáveis e antes de investir muito em backlinks ou campanhas.

---

## PASSO 8 — Web App Manifest

**Ficheiro a criar:** `src/app/manifest.ts`

Melhora a presença em mobile e pode influenciar resultados de pesquisa em dispositivos móveis:

```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RedDune Solutions",
    short_name: "RedDune",
    description: "Soluções informáticas profissionais",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#8b1a1a",
    icons: [
      { src: "/icone.png", sizes: "any", type: "image/png" },
    ],
  };
}
```

---

## Ordem de execução recomendada

1. **Passo 1** — Sitemap (impacto imediato na indexação)
2. **Passo 2** — robots.txt (rápido de fazer)
3. **Passo 3** — OG image (pede ao designer ou cria com Canva/Figma)
4. **Passo 4** — Melhorar metadata em todas as páginas
5. **Passo 5** — Structured Data enriquecido
6. **Passo 6** — Renomear `/pricingPage` → `/servicos`
7. **Passo 8** — Web App Manifest
8. **Passo 7** — i18n por URL (último, é a mudança mais estrutural)

---

## Após o deploy — Ações manuais importantes

1. **Google Search Console** — Ir a [search.google.com/search-console](https://search.google.com/search-console), adicionar o domínio e submeter o sitemap (`https://reddune-solutions.vercel.app/sitemap.xml`)
2. **Google Business Profile** — Criar/reclamar o perfil em [business.google.com](https://business.google.com) com o mesmo nome, morada e telefone do schema LocalBusiness. É o fator mais importante para aparecer nas pesquisas locais (ex: "assistência técnica Fuseta")
3. **Bing Webmaster Tools** — Submeter também em [bing.com/webmasters](https://www.bing.com/webmasters)
4. **Testar structured data** — Usar [schema.org/validator](https://validator.schema.org) para validar o JSON-LD
5. **Testar OG tags** — Usar [opengraph.xyz](https://www.opengraph.xyz) para ver a pré-visualização nas redes sociais
