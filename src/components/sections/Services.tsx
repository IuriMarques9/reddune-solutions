import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Building2, Palette } from "lucide-react";

const services = [
  {
    icon: <Building2 className="h-10 w-10 text-primary" />,
    title: "Design Arquitetônico",
    description: "Soluções arquitetônicas inovadoras e sustentáveis, do conceito à conclusão, para projetos residenciais e comerciais.",
  },
  {
    icon: <Palette className="h-10 w-10 text-primary" />,
    title: "Design de Interiores",
    description: "Criando espaços interiores belos e funcionais que refletem seu estilo pessoal e melhoram sua qualidade de vida.",
  },
  {
    icon: <Briefcase className="h-10 w-10 text-primary" />,
    title: "Gerenciamento de Projetos",
    description: "Serviços especializados de gerenciamento de projetos para garantir que seu projeto seja entregue no prazo, dentro do orçamento e com os mais altos padrões.",
  },
];

export function Services() {
  return (
    <section id="services" className="py-20 md:py-32 bg-background">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-headline text-3xl md:text-4xl font-bold">Nossos Serviços</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Oferecemos uma gama completa de serviços para dar vida à sua visão.
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
      </div>
    </section>
  );
}
