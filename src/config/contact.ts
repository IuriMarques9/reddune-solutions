export const contactInfo = {
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "reddunesolutions@gmail.com",
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "(+351) 961 531 235",
  city: process.env.NEXT_PUBLIC_CONTACT_CITY ?? "Fuseta",
  instagramUrl:
    process.env.NEXT_PUBLIC_INSTAGRAM_URL ??
    "https://www.instagram.com/reddune_solutions/",
} as const;

export const businessEmail =
  process.env.BUSINESS_EMAIL ?? "reddunesolutions@gmail.com";
