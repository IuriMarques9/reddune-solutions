import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

export function ContactCTA() {
  const t = useTranslations("HomePage.ContactCTA");

  return (
    <section className="bg-primary py-20">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="font-headline text-3xl md:text-4xl font-bold text-primary-foreground">
          {t("title")}
        </h2>
        <p className="mt-4 text-lg text-primary-foreground/80 max-w-2xl mx-auto">
          {t("description")}
        </p>
        <div className="mt-10">
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-primary-foreground text-[rgb(132,21,21)] hover:bg-primary-foreground hover:text-primary transition-colors duration-300 font-bold group"
          >
            <Link href="/contacto">
              {t("cta")}
              <ArrowRight
                className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
