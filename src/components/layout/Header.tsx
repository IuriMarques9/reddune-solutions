"use client";

import Image from "next/image";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import logo from '../../public/logo.png';
const RedduneLogoText = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 350 40"
    className="h-7 w-auto"
    fill="currentColor"
  >
    <text x="0" y="30" fontFamily="sans-serif" fontSize="30" fontWeight="bold">REDDUNE</text>
    <text x="170" y="30" fontFamily="sans-serif" fontSize="30" fontWeight="normal">SOLUTIONS</text>
  </svg>
);


const RedduneDune = () => (
    <Image src={logo} alt={"logo"} width={50} height={50}/>
);

export function Header() {
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
        <RedduneDune />
        <span className="font-headline text-xl font-bold">Reddune Solutions</span>
    </Link>
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
          : "bg-transparent"
      )}
    >
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-center px-4 sm:px-6 lg:px-8">
        <Logo />
      </div>
    </header>
  );
}
