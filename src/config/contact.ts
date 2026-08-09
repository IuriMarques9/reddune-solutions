import { PHONE, EMAIL, INSTAGRAM, LOCATION } from "@/lib/constants";

// Fonte única dos contactos = src/lib/constants.ts. As env vars continuam a
// poder fazer override (ex.: remetente de email noutro ambiente), mas sem env
// definida tudo cai nas mesmas constantes — nunca há dois contactos diferentes
// no mesmo site.
export const contactInfo = {
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? EMAIL,
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? PHONE,
  city: process.env.NEXT_PUBLIC_CONTACT_CITY ?? LOCATION.city,
  instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? INSTAGRAM,
} as const;
