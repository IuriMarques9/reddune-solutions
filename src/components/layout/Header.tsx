"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

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
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="50 5 45 35"
      className="h-8 w-auto"
      fill="currentColor"
    >
      <path
        fill="#660E00"
        d="M66.4,12.7c-2.3-1.8-5.3-2.8-8.9-2.8c-8.8,0-15.1,6.6-15.1,15.1c0,8.5,6.3,15.1,15.1,15.1c3.6,0,6.6-1,8.9-2.8l-3-4.5c-1.3,1-3,1.6-4.9,1.6c-4.1,0-7.2-3.1-7.2-7.3s3-7.3,7.2-7.3c1.9,0,3.6,0.6,4.9,1.6L66.4,12.7z"
      />
      <path
        fill="#B31919"
        d="M74.4,22.8c-1.5,1.2-3.4,1.9-5.7,1.9c-4.1,0-7.2-3.1-7.2-7.3s3-7.3,7.2-7.3c2.3,0,4.2,0.7,5.7,1.9l3.6-4.1C79.8,8.2,76,7,71.8,7c-8.8,0-15.1,6.6-15.1,15.1c0,8.5,6.3,15.1,15.1,15.1c4.2,0,8-1.2,11.2-3.1L74.4,22.8z"
      />
    </svg>
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
