import { useTranslations } from "next-intl";
import { PageHero } from "@/components/sections/PageHero";

export function PricingHero() {
  const t = useTranslations("PricingPage");

  return (
    <PageHero
      title={t("title")}
      description={t("subtitle")}
      imageSrc="/services-hero.png"
    />
  );
}
