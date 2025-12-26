import { useTranslations } from "next-intl";

export function About() {
  const t = useTranslations("HomePage.AboutUsSection");

  return (
    <section id="about" className="py-20 md:py-32 bg-background">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="font-headline text-3xl md:text-4xl font-bold">{t("title")} </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">
            {t("description")}
          </p>
        </div>
      </div>
    </section>
  );
}
