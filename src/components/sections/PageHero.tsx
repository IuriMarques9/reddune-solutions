import Image from "next/image";

type Props = {
  title: string;
  description?: string;
  imageSrc?: string;
};

export function PageHero({ title, description, imageSrc }: Props) {
  return (
    <section className="relative w-full bg-primary flex items-center justify-center text-center overflow-hidden min-h-[280px] pt-28 pb-12 md:pt-32 md:pb-16">
      {imageSrc && (
        <Image
          src={imageSrc}
          alt={title}
          fill
          priority
          sizes="100vw"
          quality={80}
          className="object-cover opacity-20"
        />
      )}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-primary-foreground">
        <h1 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-6 text-lg md:text-xl max-w-2xl mx-auto text-primary-foreground/80">
            {description}
          </p>
        )}
      </div>
    </section>
  );
}
