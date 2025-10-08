import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HardDriveUpload, Server, Wrench, Sparkles } from "lucide-react";
import Link from "next/link";

const services = [
  {
    icon: <Wrench className="h-10 w-10 text-primary" />,
    title: "Assistência Técnica",
    description: "Assistência técnica especializada para computadores, consolas e outros equipamentos eletrónicos. Diagnosticamos e resolvemos problemas com rapidez e precisão, garantindo que o teu dispositivo volte a funcionar no máximo desempenho, com a transparência que esperas de uma equipa profissional.",
  },
  {
    icon: <Server className="h-10 w-10 text-primary" />,
    title: "Web e Serviços Digitais",
    description: "Desenvolvimento de sites e soluções digitais à medida, pensadas para destacar a tua marca e simplificar processos. Criamos plataformas modernas, rápidas e seguras, desde páginas institucionais até lojas online completas, com foco na performance, design e experiência do utilizador.",
  },
  {
    icon: <HardDriveUpload className="h-10 w-10 text-primary" />,
    title: "Software e Recuperação",
    description: "Instalação e configuração de software, drivers e sistemas operativos, bem como recuperação básica de dados perdidos. Garantimos que o teu equipamento volta a funcionar de forma estável, atualizada e otimizada, com todos os programas essenciais prontos a usar e os teus ficheiros recuperados sempre que possível.",
  },
];

export function Services() {
  return (
    <section id="services" className="py-20 md:py-32 bg-background">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-headline text-3xl md:text-4xl font-bold">Nossos Serviços</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Oferecemos uma gama completa de serviços para dar resposta aos seus problemas.
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
                Não encontrou o que procurava? A nossa paixão é criar soluções à medida. <Link href="#contact" className="font-semibold text-primary hover:underline">Fale connosco</Link> e vamos transformar a sua ideia em realidade.
            </p>
        </div>
      </div>
    </section>
  );
}
