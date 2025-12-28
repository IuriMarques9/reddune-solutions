import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, ArrowRight, ChevronRight, InfoIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function Body() {
  const t = useTranslations('PricingPage');

  const pricingData = {
    tech: {
      title: t('pricingTable.technical_assistance.title'),
      description: t('pricingTable.technical_assistance.desc'),
      services: [
        { 
            name: t('pricingTable.technical_assistance.price_table.service1_name'), 
            desktop: t('pricingTable.technical_assistance.price_table.service1_desktop_price'), 
            laptop: t('pricingTable.technical_assistance.price_table.service1_laptop_price'), 
            console: t('pricingTable.technical_assistance.price_table.service1_console_price'),
            info: t('pricingTable.technical_assistance.price_table.service1_info'),
        },
        { 
            name: t('pricingTable.technical_assistance.price_table.service2_name'), 
            desktop: t('pricingTable.technical_assistance.price_table.service2_desktop_price'), 
            laptop: t('pricingTable.technical_assistance.price_table.service2_laptop_price'), 
            console: t('pricingTable.technical_assistance.price_table.service2_console_price'),
            info: t('pricingTable.technical_assistance.price_table.service2_info'),
        },
        { 
            name: t('pricingTable.technical_assistance.price_table.service3_name'), 
            desktop: t('pricingTable.technical_assistance.price_table.service3_desktop_price'), 
            laptop: t('pricingTable.technical_assistance.price_table.service3_laptop_price'), 
            console: t('pricingTable.technical_assistance.price_table.service3_console_price'),
            info: t('pricingTable.technical_assistance.price_table.service3_info'),
        },
        { 
            name: t('pricingTable.technical_assistance.price_table.service4_name'), 
            desktop: t('pricingTable.technical_assistance.price_table.service4_desktop_price'), 
            laptop: t('pricingTable.technical_assistance.price_table.service4_laptop_price'), 
            console: t('pricingTable.technical_assistance.price_table.service4_console_price'),
            info: t('pricingTable.technical_assistance.price_table.service4_info'),
        },
      ]
    },
    web: {
      title: t('pricingTable.web_services.title'),
      description: t('pricingTable.web_services.desc'),
      services: [
          { 
            name: t('pricingTable.web_services.price_table.service1_name'), 
            price: t('pricingTable.web_services.price_table.service1_price'),
            info: t('pricingTable.web_services.price_table.service1_info')
        },
          { 
            name: t('pricingTable.web_services.price_table.service2_name'), 
            price: t('pricingTable.web_services.price_table.service2_price'),
            info: t('pricingTable.web_services.price_table.service2_info')
        },
          { 
            name: t('pricingTable.web_services.price_table.service3_name'), 
            price: t('pricingTable.web_services.price_table.service3_price'),
            info: t('pricingTable.web_services.price_table.service3_info')
        },
          { 
            name: t('pricingTable.web_services.price_table.service4_name'), 
            price: t('pricingTable.web_services.price_table.service4_price'),
            info: t('pricingTable.web_services.price_table.service4_info')
        },
      ]
    },
    software: {
      title: t('pricingTable.software_services.title'),
      description: t('pricingTable.software_services.desc'),
      services: [
          { 
            name: t('pricingTable.software_services.price_table.service1_name'), 
            price: t('pricingTable.software_services.price_table.service1_price'),
            info: t('pricingTable.web_services.price_table.service1_info')

          },
          { 
            name: t('pricingTable.software_services.price_table.service2_name'), 
            price: t('pricingTable.software_services.price_table.service2_price'),
            info: t('pricingTable.web_services.price_table.service2_info')

          },
          { 
            name: t('pricingTable.software_services.price_table.service3_name'), 
            price: t('pricingTable.software_services.price_table.service3_price'),
            info: t('pricingTable.web_services.price_table.service3_info')

          },
      ]
    }
  };

  return (
    <section id="pricing" className="py-20 bg-secondary/50">
      <div className="container mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <div className="text-center mb-16">
          <div className="flex items-center text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary transition-colors">{t('breadcrumbHome')}</Link>
            <ChevronRight className="h-4 w-4 mx-1" />
            <span>{t('breadcrumbPricing')}</span>
          </div>
          <h2 className="font-headline text-3xl md:text-4xl font-bold">{t('title')}</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        <Tabs defaultValue="tech" className="w-full">
          <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 mb-10 max-w-2xl mx-auto h-auto gap-1">
            <TabsTrigger value="tech" className="py-2 hover:bg-primary hover:text-white">{t('pricingTable.technical_assistance.tab')}</TabsTrigger>
            <TabsTrigger value="web" className="py-2 hover:bg-primary hover:text-white">{t('pricingTable.web_services.tab')}</TabsTrigger>
            <TabsTrigger value="software" className="py-2 hover:bg-primary hover:text-white">{t('pricingTable.software_services.tab')}</TabsTrigger>
          </TabsList>

          <TabsContent value="tech">
            <PricingCategory category={pricingData.tech} t={t} isTechTab={true} />
          </TabsContent>
          <TabsContent value="web">
            <PricingCategory category={pricingData.web} t={t} />
          </TabsContent>
          <TabsContent value="software">
            <PricingCategory category={pricingData.software} t={t} />
          </TabsContent>
        </Tabs>

        <Card className="mt-16 bg-background/70 border-primary/50 shadow-lg">
            <CardHeader className="text-center">
                <CardTitle className="font-headline text-2xl">{t('customProjectCard.title')}</CardTitle>
                <CardDescription>
                {t('customProjectCard.desc')}
                </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
                <p className="text-muted-foreground mb-6">
                    {t('customProjectCard.text')}
                </p>
                <Button asChild>
                    <Link href="/#contact">{t('customProjectCard.cta')} <ArrowRight className="ml-2" /></Link>
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
        services: any[];
    };
    t: (key: string) => string;
    isTechTab?: boolean;
}

function PricingCategory({ category, t, isTechTab }: PricingCategoryProps) {
    return (
        <Card className="border-0 shadow-lg bg-background">
            <CardHeader className="text-center">
                <CardTitle className="font-headline text-2xl">{category.title}</CardTitle>
                <CardDescription>{category.description}</CardDescription>
            </CardHeader>
            <CardContent>
                {isTechTab ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50%]">{t('pricingTable.technical_assistance.price_table.header_service')}</TableHead>
                                <TableHead className="text-center">{t('pricingTable.technical_assistance.price_table.header_tower')}</TableHead>
                                <TableHead className="text-center">{t('pricingTable.technical_assistance.price_table.header_laptop')}</TableHead>
                                <TableHead className="text-center">{t('pricingTable.technical_assistance.price_table.header_console')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {category.services.map((service, index) => (
                                <TableRow key={index} className="hover:bg-secondary/50">
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                            <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                                            <span>{service.name}</span>

                                            {/* Tooltip for service info */}
                                            {service.info && (
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <InfoIcon className="hover:scale-105 h-3 w-3 text-muted-foreground cursor-pointer" />
                                                    </PopoverTrigger>
                                                    <PopoverContent>
                                                        <p className="max-w-xs text-justify">{service.info}</p>
                                                    </PopoverContent>
                                                </Popover>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center font-semibold text-primary text-lg">{service.desktop}</TableCell>
                                    <TableCell className="text-center font-semibold text-primary text-lg">{service.laptop}</TableCell>
                                    <TableCell className="text-center font-semibold text-primary text-lg">{service.console}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <ul className="space-y-4">
                        {category.services.map((service, index) => (
                            <li key={index} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 rounded-lg transition-colors hover:bg-secondary/50">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle className="h-full w-5 text-primary flex-shrink-0" />
                                        <span className="font-medium text-foreground">{service.name}</span>
                                        
                                        {/* Tooltip for service info */}
                                        {service.info && (
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <InfoIcon className="h-3 w-3 text-muted-foreground cursor-pointer" />
                                                </PopoverTrigger>
                                                <PopoverContent>
                                                    <p className="max-w-xs">{service.info}</p>
                                                </PopoverContent>
                                            </Popover>
                                        )}
                                    </div>
                                </div>
                                <p className="font-semibold text-primary text-lg mt-2 md:mt-0 md:ml-4">
                                    {service.price}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    )
}