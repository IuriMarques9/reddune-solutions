import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HardDriveUpload, Server, Wrench, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";



export function Services() {

  const t = useTranslations('HomePage.ServicesSection');

  const services = [
    {
      icon: <Wrench className="h-10 w-10 text-primary" />,
      title: t("services.tecAssist.title"),
      description: t("services.tecAssist.description"),
    },
    {
      icon: <Server className="h-10 w-10 text-primary" />,
      title: t("services.webDigital.title"),
      description: t("services.webDigital.description"),
    },
    {
      icon: <HardDriveUpload className="h-10 w-10 text-primary" />,
      title: t("services.dataRecovery.title"),
      description: t("services.dataRecovery.description"),
    },
  ];

  return (
    <section id="services" className="py-20 md:py-32 bg-background">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-headline text-3xl md:text-4xl font-bold">{t('title')}</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('description')}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <Card key={index} className="text-center shadow-md hover:shadow-xl transition-shadow duration-300 border-0 bg-secondary/50 rounded-lg">
              <CardHeader>
                <div className="mx-auto bg-accent/20 p-4 rounded-full w-fit">
                    {service.icon}
                </div>
                <CardTitle className="font-headline text-2xl pt-4">{service.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{service.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-20 text-center">
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              <Sparkles className="inline-block h-5 w-5 text-primary mr-2" />
              {t.rich('quote', {
                contactLink: (chunks) => (
                  <Link
                    className="font-semibold text-primary hover:underline" 
                    href={"#contact"}                
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
