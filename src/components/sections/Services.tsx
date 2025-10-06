import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Building2, Palette } from "lucide-react";

const services = [
  {
    icon: <Building2 className="h-10 w-10 text-primary" />,
    title: "Architectural Design",
    description: "Innovative and sustainable architectural solutions from concept to completion for residential and commercial projects.",
  },
  {
    icon: <Palette className="h-10 w-10 text-primary" />,
    title: "Interior Design",
    description: "Creating beautiful and functional interior spaces that reflect your personal style and enhance your quality of life.",
  },
  {
    icon: <Briefcase className="h-10 w-10 text-primary" />,
    title: "Project Management",
    description: "Expert project management services to ensure your project is delivered on time, within budget, and to the highest standards.",
  },
];

export function Services() {
  return (
    <section id="services" className="py-20 md:py-32 bg-background">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-headline text-3xl md:text-4xl font-bold">Our Services</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            We provide a comprehensive range of services to bring your vision to life.
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
