import { Card, CardContent } from "@/components/ui/card";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

const portfolioItems = PlaceHolderImages.filter((img) => img.id.startsWith("portfolioCard-") && img.serviceUrl);

export function Portfolio() {
  const t = useTranslations("HomePage.PortfolioSection");

  return (
    <section id="portfolio" className="py-12 md:py-24 bg-secondary/50">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-headline text-3xl md:text-4xl font-bold">{t("title")}</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("description")}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {portfolioItems.map((item) => (
            <Card key={item.id} className="overflow-hidden group transition-shadow duration-300 hover:shadow-2xl rounded-lg">
              <Link href={item.serviceUrl!} target="_blank" rel="noopener noreferrer">
                <CardContent className="p-0 relative">
                  <Image
                    src={item.imageUrl}
                    alt={item.description}
                    width={600}
                    height={400}
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="w-full h-auto object-cover aspect-[3/2] transition-transform duration-300 group-hover:scale-105"
                    data-ai-hint={item.imageHint}
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" aria-hidden="true" />

                  <div className="absolute bottom-0 left-0 p-6">
                      <h3 className="font-headline text-xl font-bold text-white ">{t(`cards.${item.id}`)}</h3>
                  </div>
                  <div className="absolute top-4 right-4 bg-accent text-accent-foreground p-2 rounded-full transform scale-0 group-hover:scale-100 transition-transform duration-300 ease-in-out" aria-hidden="true">
                      <ArrowUpRight className="h-5 w-5"/>
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
