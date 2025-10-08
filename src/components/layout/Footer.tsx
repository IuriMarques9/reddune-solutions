"use client";

import { Github, Linkedin, Twitter } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import logo from '../../public/logo.png';
import { useEffect, useState } from "react";

const RedduneDuneLogo = () => (
    <Image src={logo} alt={"logo"} width={50} height={50}/>
);


export function Footer() {
  
    const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
      const handleScroll = () => {
        setScrolled(window.scrollY > 10);
      };
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }, []);
    
    const Logo = () => (
        <Link href="/" className="flex items-center gap-2 text-foreground">
            <RedduneDuneLogo />
            <span className="font-headline text-xl font-bold">Reddune Solutions</span>
        </Link>
      );

  return (
    <footer className="bg-secondary/50 text-secondary-foreground py-12">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between md:flex-row">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <Logo />
          </div>
          <div className="flex space-x-4">
            <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
              <Twitter className="h-5 w-5" />
              <span className="sr-only">Twitter</span>
            </Link>
            <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
              <Github className="h-5 w-5" />
              <span className="sr-only">GitHub</span>
            </Link>
            <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
              <Linkedin className="h-5 w-5" />
              <span className="sr-only">LinkedIn</span>
            </Link>
          </div>
        </div>
        <div className="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Reddune Solutions. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
function setScrolled(arg0: boolean) {
  throw new Error("Function not implemented.");
}

