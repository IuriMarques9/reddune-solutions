import { contactInfo } from "@/config/contact";
import { publicEnv } from "@/lib/env";

export function StructuredData() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Reddune Solutions",
    description:
      "Assistência técnica informática, serviços web e recuperação de dados.",
    url: publicEnv.baseUrl,
    image: `${publicEnv.baseUrl}/logo.png`,
    telephone: contactInfo.phone,
    email: contactInfo.email,
    address: {
      "@type": "PostalAddress",
      addressLocality: contactInfo.city,
      addressCountry: "PT",
    },
    sameAs: [contactInfo.instagramUrl],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
