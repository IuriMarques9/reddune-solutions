import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, ArrowRight, InfoIcon } from "lucide-react";
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
        maintenance: {
            title: t('pricingTable.maintenance.title'),
            description: t('pricingTable.maintenance.desc'),
            type: 'table',
            headerService: t('pricingTable.maintenance.price_table.header_service'),
            headerDesktop: t('pricingTable.maintenance.price_table.header_tower'),
            headerLaptop: t('pricingTable.maintenance.price_table.header_laptop'),
            headerConsole: t('pricingTable.maintenance.price_table.header_console'),
            groupCleaning: t('pricingTable.maintenance.price_table.group_cleaning'),
            groupFormatting: t('pricingTable.maintenance.price_table.group_formatting'),
            services: [
                {
                    name: t('pricingTable.maintenance.price_table.service3_name'),
                    desktop: t('pricingTable.maintenance.price_table.service3_desktop_price'),
                    laptop: t('pricingTable.maintenance.price_table.service3_laptop_price'),
                    console: t('pricingTable.maintenance.price_table.service3_console_price'),
                    info: t('pricingTable.maintenance.price_table.service3_info'),
                },
                {
                    name: t('pricingTable.maintenance.price_table.service4_name'),
                    desktop: t('pricingTable.maintenance.price_table.service4_desktop_price'),
                    laptop: t('pricingTable.maintenance.price_table.service4_laptop_price'),
                    console: t('pricingTable.maintenance.price_table.service4_console_price'),
                    info: t('pricingTable.maintenance.price_table.service4_info'),
                },
                {
                    name: t('pricingTable.maintenance.price_table.service7_name'),
                    desktop: t('pricingTable.maintenance.price_table.service7_desktop_price'),
                    laptop: t('pricingTable.maintenance.price_table.service7_laptop_price'),
                    console: t('pricingTable.maintenance.price_table.service7_console_price'),
                    info: t('pricingTable.maintenance.price_table.service7_info'),
                },
                {
                    name: t('pricingTable.maintenance.price_table.service8_name'),
                    desktop: t('pricingTable.maintenance.price_table.service8_desktop_price'),
                    laptop: t('pricingTable.maintenance.price_table.service8_laptop_price'),
                    console: t('pricingTable.maintenance.price_table.service8_console_price'),
                    info: t('pricingTable.maintenance.price_table.service8_info'),
                },
                {
                    name: t('pricingTable.maintenance.price_table.service1_name'),
                    group: t('pricingTable.maintenance.price_table.service1_group'),
                    desktop: t('pricingTable.maintenance.price_table.service1_desktop_price'),
                    laptop: t('pricingTable.maintenance.price_table.service1_laptop_price'),
                    console: t('pricingTable.maintenance.price_table.service1_console_price'),
                    info: t('pricingTable.maintenance.price_table.service1_info'),
                },
                {
                    name: t('pricingTable.maintenance.price_table.service2_name'),
                    group: t('pricingTable.maintenance.price_table.service2_group'),
                    desktop: t('pricingTable.maintenance.price_table.service2_desktop_price'),
                    laptop: t('pricingTable.maintenance.price_table.service2_laptop_price'),
                    console: t('pricingTable.maintenance.price_table.service2_console_price'),
                    info: t('pricingTable.maintenance.price_table.service2_info'),
                },
                {
                    name: t('pricingTable.maintenance.price_table.service5_name'),
                    group: t('pricingTable.maintenance.price_table.service5_group'),
                    desktop: t('pricingTable.maintenance.price_table.service5_desktop_price'),
                    laptop: t('pricingTable.maintenance.price_table.service5_laptop_price'),
                    console: t('pricingTable.maintenance.price_table.service5_console_price'),
                    info: t('pricingTable.maintenance.price_table.service5_info'),
                },
                {
                    name: t('pricingTable.maintenance.price_table.service6_name'),
                    group: t('pricingTable.maintenance.price_table.service6_group'),
                    desktop: t('pricingTable.maintenance.price_table.service6_desktop_price'),
                    laptop: t('pricingTable.maintenance.price_table.service6_laptop_price'),
                    console: t('pricingTable.maintenance.price_table.service6_console_price'),
                    info: t('pricingTable.maintenance.price_table.service6_info'),
                },
            ]
        },
        assembly: {
            title: t('pricingTable.assembly.title'),
            description: t('pricingTable.assembly.desc'),
            type: 'list',
            services: [
                {
                    name: t('pricingTable.assembly.price_table.service1_name'),
                    price: t('pricingTable.assembly.price_table.service1_price'),
                    info: t('pricingTable.assembly.price_table.service1_info')
                },
                {
                    name: t('pricingTable.assembly.price_table.service2_name'),
                    price: t('pricingTable.assembly.price_table.service2_price'),
                    info: t('pricingTable.assembly.price_table.service2_info')
                },
                {
                    name: t('pricingTable.assembly.price_table.service3_name'),
                    price: t('pricingTable.assembly.price_table.service3_price'),
                    info: t('pricingTable.assembly.price_table.service3_info')
                },
            ]
        },
        web: {
            title: t('pricingTable.web_services.title'),
            description: t('pricingTable.web_services.desc'),
            type: 'list',
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
        }
    };

  return (
    <section id="pricing" className="py-20 bg-secondary/50">
      <div className="container mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">

        <Tabs defaultValue="maintenance" className="w-full">
            <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 mb-10 max-w-3xl mx-auto h-auto gap-1">
                <TabsTrigger value="maintenance" className="py-2 hover:bg-primary hover:text-white">{t('pricingTable.maintenance.tab')}</TabsTrigger>
                <TabsTrigger value="assembly" className="py-2 hover:bg-primary hover:text-white">{t('pricingTable.assembly.tab')}</TabsTrigger>
                <TabsTrigger value="web" className="py-2 hover:bg-primary hover:text-white">{t('pricingTable.web_services.tab')}</TabsTrigger>
            </TabsList>

            <TabsContent value="maintenance">
                <PricingCategory category={pricingData.maintenance} t={t} />
            </TabsContent>
            <TabsContent value="assembly">
                <PricingCategory category={pricingData.assembly} t={t} />
            </TabsContent>
            <TabsContent value="web">
                <PricingCategory category={pricingData.web} t={t} />
            </TabsContent>
        </Tabs>

        <div className="mt-16 mb-16">
            <div className="text-center mb-8">
                <h3 className="font-headline text-2xl font-bold mb-2">{t('pricingTable.extraServices.title')}</h3>
            </div>
            <Card className="border-0 shadow-md bg-background">
                <CardContent className="pt-6">
                    <ul className="space-y-4">
                        {[
                            { name: t('pricingTable.extraServices.service1_name'), price: t('pricingTable.extraServices.service1_price'), info: t('pricingTable.extraServices.service1_info') },
                            { name: t('pricingTable.extraServices.service2_name'), price: t('pricingTable.extraServices.service2_price'), info: t('pricingTable.extraServices.service2_info') }
                        ].map((service) => (
                            <li key={service.name} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 rounded-lg transition-colors hover:bg-secondary/50">
                                <div className="flex items-center gap-3 mb-3 md:mb-0">
                                    <div className="flex-1">
                                        <span className="font-medium text-foreground block">{service.name}</span>
                                        <p className="text-sm text-muted-foreground mt-1">{service.info}</p>
                                    </div>
                                </div>
                                <p className="font-semibold text-primary text-lg mt-2 md:mt-0 md:ml-4">
                                    {service.price}
                                </p>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        </div>

        <Card className="mt-8 bg-background/70 border-primary/50 shadow-lg">
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
                    <Link href="/contacto?from=pricing">{t('customProjectCard.cta')} <ArrowRight className="ml-2" /></Link>
                </Button>
            </CardContent>
        </Card>

      </div>
    </section>
  );
}

interface PricingService {
    name: string;
    group?: string;
    info: string;
    desktop?: string;
    laptop?: string;
    console?: string;
    price?: string;
}

interface PricingCategoryProps {
    category: {
        title: string;
        description: string;
        type: string;
        headerService?: string;
        headerDesktop?: string;
        headerLaptop?: string;
        headerConsole?: string;
        groupCleaning?: string;
        groupFormatting?: string;
        services: PricingService[];
    };
    t: (key: string) => string;
}

function PricingCategory({ category, t }: PricingCategoryProps) {
    let lastGroup: string | undefined = '';

    return (
        <Card className="border-0 shadow-lg bg-background">
            <CardHeader className="text-center">
                <CardTitle className="font-headline text-2xl">{category.title}</CardTitle>
                <CardDescription>{category.description}</CardDescription>
            </CardHeader>
            <CardContent>
                {category.type === 'table' ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50%]">{category.headerService}</TableHead>
                                <TableHead className="text-center">{category.headerDesktop}</TableHead>
                                <TableHead className="text-center">{category.headerLaptop}</TableHead>
                                <TableHead className="text-center">{category.headerConsole}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {category.services.flatMap((service) => {
                                const isNewGroup = service.group && service.group !== lastGroup;
                                lastGroup = service.group;
                                const groupLabel =
                                    service.group === 'group_cleaning' ? category.groupCleaning :
                                    service.group === 'group_formatting' ? category.groupFormatting :
                                    undefined;

                                const rows = [];

                                if (isNewGroup) {
                                    rows.push(
                                        <TableRow key={`header-${groupLabel}`} className="bg-primary/10">
                                            <TableCell colSpan={4} className="font-semibold text-primary py-3">
                                                {groupLabel}
                                            </TableCell>
                                        </TableRow>
                                    );
                                }

                                rows.push(
                                    <TableRow key={service.name} className="hover:bg-secondary/50">
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                                                <span>{service.name}</span>

                                                {service.info && (
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <InfoIcon className="hover:scale-105 h-3 w-3 text-muted-foreground cursor-pointer" />
                                                        </PopoverTrigger>
                                                        <PopoverContent>
                                                            <p className="max-w-xs text-justify text-xs">{service.info}</p>
                                                        </PopoverContent>
                                                    </Popover>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-semibold text-primary text-lg">{service.desktop}</TableCell>
                                        <TableCell className="text-center font-semibold text-primary text-lg">{service.laptop}</TableCell>
                                        <TableCell className="text-center font-semibold text-primary text-lg">{service.console}</TableCell>
                                    </TableRow>
                                );

                                return rows;
                            })}
                        </TableBody>
                    </Table>
                ) : (
                    <ul className="space-y-4">
                        {category.services.map((service) => (
                            <li key={service.name} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 rounded-lg transition-colors hover:bg-secondary/50">
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="h-full w-5 text-primary flex-shrink-0" />
                                    <span className="font-medium text-foreground">{service.name}</span>

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
