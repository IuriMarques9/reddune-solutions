import { contactInfo } from "@/config/contact";
import { publicEnv } from "@/lib/env";

export function StructuredData() {
  const base = publicEnv.baseUrl;

  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Reddune Solutions",
    description:
      "Assistência técnica informática, montagem de PCs, desenvolvimento web/app e recuperação de dados no Algarve.",
    url: base,
    logo: `${base}/logo.png`,
    image: `${base}/og-image.png`,
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
      latitude: 37.053490,
      longitude: -7.745656
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "18:00",
      },
    ],
    sameAs: [contactInfo.instagramUrl],
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

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
