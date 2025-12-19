"use client";

import { Instagram } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";


export function Footer() {
  
    const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
      const handleScroll = () => {
        setScrolled(window.scrollY > 10);
      };
      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }, []);
    

  return (
    <footer className="bg-secondary/50 text-secondary-foreground py-12">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between md:flex-row">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <Link href="/">
              <Image src="/logo.png" alt="Reddune Solutions Logo" width={150} height={150} className=""/>
            </Link>
          </div>
          <div className="flex space-x-4">
            <Link href="https://www.instagram.com/reddune_solutions/" className="text-muted-foreground hover:text-primary transition-colors">
              <Instagram className="h-5 w-5" />
              <span className="sr-only">Instagram</span>
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

