/**
 * structured-data — builders for JSON-LD schemas.
 *
 * Type-safe helpers used by pages to produce schema.org payloads that are
 * inlined inside `<script type="application/ld+json">` tags. Centralising
 * here keeps URL/locale logic consistent and avoids per-page duplication.
 */

import { contactInfo } from "@/config/contact";
import { publicEnv } from "@/lib/env";
import { LOCATION, PHONE, INSTAGRAM, LINKEDIN, FACEBOOK } from "@/lib/constants";

type JsonLd = Record<string, unknown>;

const base = () => publicEnv.baseUrl;

/**
 * LocalBusiness — homepage. Includes geo coordinates, opening hours,
 * areaServed (Algarve, Portugal) and a small offer catalog.
 */
export function localBusinessLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    // ComputerStore é o subtipo LocalBusiness mais específico para o negócio
    // (loja + assistência informática); manter LocalBusiness no array preserva
    // compatibilidade com parsers que não conhecem o subtipo.
    "@type": ["ComputerStore", "LocalBusiness"],
    "@id": `${base()}/#business`,
    name: "RedDune Solutions",
    description:
      "Assistência técnica informática, montagem de PCs, desenvolvimento web/app e recuperação de dados no Algarve.",
    url: base(),
    logo: `${base()}/logo.png`,
    image: `${base()}/opengraph-image`,
    telephone: PHONE,
    email: contactInfo.email,
    priceRange: "€€",
    address: {
      "@type": "PostalAddress",
      addressLocality: LOCATION.city,
      addressRegion: LOCATION.region,
      addressCountry: "PT",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: LOCATION.lat,
      longitude: LOCATION.lng,
    },
    areaServed: [
      { "@type": "AdministrativeArea", name: LOCATION.region },
      { "@type": "Country", name: LOCATION.country },
    ],
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "18:00",
      },
    ],
    sameAs: [INSTAGRAM, LINKEDIN, FACEBOOK],
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
}

/**
 * WebSite — nome do site nos SERPs. Injectado no layout junto do LocalBusiness.
 */
export function websiteLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${base()}/#website`,
    name: "RedDune Solutions",
    url: base(),
    publisher: { "@id": `${base()}/#business` },
  };
}

/**
 * ContactPage — /contacto.
 */
export function contactPageLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    url: `${base()}/contacto`,
    mainEntity: { "@id": `${base()}/#business` },
  };
}

/**
 * Service + Offer — service sub-page (/servicos/[slug]).
 */
export function serviceLd(params: {
  slug: string;
  name: string;
  description: string;
  priceFrom?: number;
}): JsonLd {
  const { slug, name, description, priceFrom } = params;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${base()}/servicos/${slug}#service`,
    name,
    description,
    url: `${base()}/servicos/${slug}`,
    provider: {
      "@type": "LocalBusiness",
      "@id": `${base()}/#business`,
      name: "RedDune Solutions",
    },
    areaServed: [
      { "@type": "AdministrativeArea", name: LOCATION.region },
      { "@type": "Country", name: LOCATION.country },
    ],
    ...(priceFrom !== undefined && {
      offers: {
        "@type": "Offer",
        priceCurrency: "EUR",
        priceSpecification: {
          "@type": "PriceSpecification",
          priceCurrency: "EUR",
          price: priceFrom,
          minPrice: priceFrom,
          valueAddedTaxIncluded: false,
        },
        availability: "https://schema.org/InStock",
      },
    }),
  };
}

/**
 * ItemList — shop catalog (/loja).
 */
export function itemListLd(params: {
  url: string;
  name: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    url?: string;
    image?: string;
    description?: string;
  }>;
}): JsonLd {
  const { url, name, items } = params;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    url,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Product",
        "@id": `${base()}/loja#${item.id}`,
        name: item.name,
        url: item.url ?? `${base()}/loja#${item.id}`,
        ...(item.image && { image: item.image }),
        ...(item.description && { description: item.description }),
        offers: {
          "@type": "Offer",
          priceCurrency: "EUR",
          price: item.price,
          priceSpecification: {
            "@type": "PriceSpecification",
            priceCurrency: "EUR",
            price: item.price,
            valueAddedTaxIncluded: false,
          },
          availability: "https://schema.org/InStock",
        },
      },
    })),
  };
}

/**
 * BreadcrumbList — inner pages two or more levels deep (/servicos/[slug]).
 */
export function breadcrumbLd(
  items: Array<{ name: string; url: string }>,
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * ItemList of CreativeWork — portfolio (/portfolio).
 */
export function creativeWorkListLd(params: {
  url: string;
  name: string;
  items: Array<{ id: string; name: string; url?: string; image?: string }>;
}): JsonLd {
  const { url, name, items } = params;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    url,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "CreativeWork",
        "@id": `${base()}/portfolio#${item.id}`,
        name: item.name,
        // Itens sem site próprio não emitem url vazio.
        ...(item.url && { url: item.url }),
        ...(item.image && { image: item.image }),
        creator: {
          "@type": "LocalBusiness",
          "@id": `${base()}/#business`,
        },
      },
    })),
  };
}

/**
 * FAQPage — used by service sub-pages with FAQ accordion.
 */
export function faqPageLd(
  faqs: Array<{ question: string; answer: string }>,
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer,
      },
    })),
  };
}

/**
 * Render a JSON-LD payload as a `<script>` element. Use as a child anywhere
 * server-rendered output is allowed; React strips this from the body in SSR.
 */
export function jsonLdScript(ld: JsonLd): string {
  // Escapar "<" impede que uma string vinda da BD com "</script>" feche o
  // <script> e injecte HTML na página (XSS via dangerouslySetInnerHTML).
  return JSON.stringify(ld).replace(/</g, "\\u003c");
}
