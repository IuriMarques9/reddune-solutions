import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { ArrowRight } from "lucide-react";

export function Hero() {
  const heroImage = PlaceHolderImages.find((img) => img.id === "hero-image");

  return (
    <section id="home" className="relative w-full h-[90vh] min-h-[700px] flex items-center justify-center text-center bg-primary">
      {heroImage && (
        <Image
          src={heroImage.imageUrl}
          alt={heroImage.description}
          fill
          priority
          className="object-cover opacity-20"
          data-ai-hint={heroImage.imageHint}
        />
      )}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-primary-foreground">
        <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
          Criando Excelência, Construindo Futuros
        </h1>
        <p className="mt-6 text-lg md:text-xl max-w-2xl mx-auto text-primary-foreground/80">
          A Reddune Solutions oferece soluções de design e desenvolvimento inigualáveis que elevam sua marca e envolvem seu público.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold shadow-lg">
            <Link href="#portfolio">
              Veja Nosso Trabalho <ArrowRight className="ml-2" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-colors duration-300">
            <Link href="#contact">
              Entre em Contato
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
