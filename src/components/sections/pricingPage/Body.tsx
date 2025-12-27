import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, ArrowRight, ChevronRight, InfoIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export function Body() {
  const t = useTranslations('PricingPage.pricing');

  const pricingData = {
    tech: {
      title: t('tech_title'),
      description: t('tech_desc'),
      services: [
        { name: t('tech_service1_name'), price: t('tech_service1_price') },
        { name: t('tech_service2_name'), price: t('tech_service2_price') },
        { name: t('tech_service3_name'), price: t('tech_service3_price') },
        { name: t('tech_service4_name'), price: t('tech_service4_price') },
        { name: t('tech_service5_name'), price: t('tech_service5_price') },
      ]
    },
    web: {
      title: t('web_title'),
      description: t('web_desc'),
      services: [
          { name: t('web_service1_name'), price: t('web_service1_price') },
          { name: t('web_service2_name'), price: t('web_service2_price') },
          { name: t('web_service3_name'), price: t('web_service3_price') },
          { name: t('web_service4_name'), price: t('web_service4_price') },
      ]
    },
    software: {
      title: t('software_title'),
      description: t('software_desc'),
      services: [
          { name: t('software_service1_name'), price: t('software_service1_price') },
          { name: t('software_service2_name'), price: t('software_service2_price') },
          { name: t('software_service3_name'), price: t('software_service3_price') },
          { name: t('software_service4_name'), price: t('software_service4_price') },
      ]
    }
  };

  return (
    <section id="pricing" className="py-20 md:py-32 bg-secondary/50">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="mb-4 flex items-center text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary transition-colors">{t('breadcrumb_home')}</Link>
            <ChevronRight className="h-4 w-4 mx-1" />
            <span>{t('breadcrumb_pricing')}</span>
          </div>
          <h2 className="font-headline text-3xl md:text-4xl font-bold">{t('title')}</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        <Tabs defaultValue="tech" className="w-full">
          <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 mb-10 max-w-2xl mx-auto h-auto">
            <TabsTrigger value="tech" className="py-2">{t('tab_tech')}</TabsTrigger>
            <TabsTrigger value="web" className="py-2">{t('tab_web')}</TabsTrigger>
            <TabsTrigger value="software" className="py-2">{t('tab_software')}</TabsTrigger>
          </TabsList>

          <TabsContent value="tech">
            <PricingCategory category={pricingData.tech} />
          </TabsContent>
          <TabsContent value="web">
            <PricingCategory category={pricingData.web} />
          </TabsContent>
          <TabsContent value="software">
            <PricingCategory category={pricingData.software} />
          </TabsContent>
        </Tabs>

        <Card className="mt-16 bg-background/70 border-primary/50 shadow-lg">
            <CardHeader className="text-center">
                <CardTitle className="font-headline text-2xl">{t('custom_plan_title')}</CardTitle>
                <CardDescription>
                {t('custom_plan_desc')}
                </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
                <p className="text-muted-foreground mb-6">
                    {t('custom_plan_text')}
                </p>
                <Button asChild>
                    <Link href="/#contact">{t('custom_plan_button')} <ArrowRight className="ml-2" /></Link>
                </Button>
            </CardContent>
        </Card>

      </div>
    </section>
  );
}

interface PricingCategoryProps {
    category: {
        title: string;
        description: string;
        services: { name: string; price: string }[];
    }
}

function PricingCategory({ category }: PricingCategoryProps) {
    return (
        <Card className="border-0 shadow-lg bg-background">
            <CardHeader className="text-center md:text-left">
                <CardTitle className="font-headline text-2xl">{category.title}</CardTitle>
                <CardDescription>{category.description}</CardDescription>
            </CardHeader>
            <CardContent>
                 <ul className="space-y-4">
                    {category.services.map((service, index) => (
                        <li key={index} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 rounded-lg transition-colors hover:bg-secondary/50">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="h-full w-5 text-primary flex-shrink-0" />
                                    <span className="font-medium text-foreground">{service.name}</span>
                                </div>
                                <InfoIcon className="h-3 w-3 text-muted-foreground" />
                            </div>
                            <p className="font-semibold text-primary text-lg mt-2 md:mt-0 md:ml-4">
                                {service.price}
                            </p>
                            
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    )
}