import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  HardDriveUpload,
  Server,
  Wrench,
  Sparkles,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

const SERVICES: ReadonlyArray<{ key: string; Icon: LucideIcon }> = [
  { key: "tecAssist", Icon: Wrench },
  { key: "webDigital", Icon: Server },
  { key: "dataRecovery", Icon: HardDriveUpload },
];

export function Services() {
  const t = useTranslations("HomePage.ServicesSection");

  return (
    <section id="services" className="py-12 md:py-24 bg-background">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-headline text-3xl md:text-4xl font-bold">{t("title")}</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("description")}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map(({ key, Icon }) => (
            <Card
              key={key}
              className="text-center shadow-md hover:shadow-xl transition-shadow duration-300 border-0 bg-secondary/50 rounded-lg"
            >
              <CardHeader>
                <div className="mx-auto bg-accent/20 p-4 rounded-full w-fit">
                  <Icon className="h-10 w-10 text-primary" aria-hidden="true" />
                </div>
                <CardTitle className="font-headline text-2xl pt-4">
                  {t(`services.${key}.title`)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {t(`services.${key}.description`)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-16 text-center flex flex-col items-center gap-8">
          <Button asChild size="lg" className="group">
            <Link href="/servicos">
              {t("cta")}{" "}
              <ArrowRight
                className="ml-2 transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          </Button>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            <Sparkles
              className="inline-block h-5 w-5 text-primary mr-2"
              aria-hidden="true"
            />
            {t.rich("quote", {
              contactLink: (chunks) => (
                <Link
                  className="font-semibold text-primary hover:underline"
                  href="#contact"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
      </div>
    </section>
  );
}
