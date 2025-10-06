import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { AboutContentGenerator } from "@/components/ai/AboutContentGenerator";

const teamMembers = [
  {
    name: "Alexia Thorne",
    role: "Founder & CEO",
    imageId: "team-1",
  },
  {
    name: "Julian Cross",
    role: "Lead Designer",
    imageId: "team-2",
  },
  {
    name: "Seraphina Vale",
    role: "Project Manager",
    imageId: "team-3",
  },
];

export function About() {
  const teamImages = PlaceHolderImages.filter((img) => img.id.startsWith("team-"));

  return (
    <section id="about" className="py-20 md:py-32 bg-background">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="font-headline text-3xl md:text-4xl font-bold">About Apex Portfolio</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">
            We are a collective of passionate designers, developers, and strategists dedicated to crafting exceptional digital and physical experiences. Our mission is to merge functionality with artistry, creating solutions that are not only beautiful but also impactful and enduring.
          </p>
        </div>

        <div className="mt-20 text-center">
            <h3 className="font-headline text-2xl md:text-3xl font-bold">Meet Our Team</h3>
            <p className="mt-2 text-md text-muted-foreground max-w-2xl mx-auto">The creative minds behind our success.</p>
            <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3 mt-12">
            {teamMembers.map((member) => {
                const image = teamImages.find((img) => img.id === member.imageId);
                return (
                <div key={member.name} className="flex flex-col items-center">
                    <Avatar className="h-32 w-32 border-4 border-accent shadow-lg">
                    <AvatarImage src={image?.imageUrl} alt={member.name} data-ai-hint={image?.imageHint} />
                    <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <h4 className="mt-4 font-headline text-xl font-semibold">{member.name}</h4>
                    <p className="text-primary font-medium">{member.role}</p>
                </div>
                );
            })}
            </div>
        </div>

        <AboutContentGenerator />
      </div>
    </section>
  );
}
