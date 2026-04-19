import Image from "next/image";
import { useTranslations } from "next-intl";

export function ShopHero() {
  const t = useTranslations("ShopPage.hero");

  return (
    <section className="relative w-full h-[50vh] min-h-[300px] flex items-center justify-center text-center overflow-hidden bg-primary">
      <Image
        src="/shop-hero.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        quality={80}
        className="object-cover opacity-20"
      />
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-primary-foreground">
        <h1 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-6 text-lg md:text-xl max-w-2xl mx-auto text-primary-foreground/80">
          {t("description")}
        </p>
      </div>
    </section>
  );
}
