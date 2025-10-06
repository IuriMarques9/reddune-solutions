import { Github, Linkedin, Twitter } from "lucide-react";
import Link from "next/link";

const RedduneLogo = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 160 40"
    className="h-10 w-auto"
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
    <path d="M0,0v40h12.8V26.5H23L23.8,40H37l-4.4-23.8L44.8,0H31.1l-5.6,15.3L20,0H0z" />
    <path d="M51.8,0v40h12.8V26.5H75L75.8,40H89l-4.4-23.8L96.8,0H83.1l-5.6,15.3L72,0H51.8z" />
    <path d="M103,0v40h12.8V0H103z" />
    <path d="M122.2,0v40h12.8V0H122.2z" />
    <path d="M141.4,0v40h12.8V0H141.4z" />
  </svg>
);

export function Footer() {
  return (
    <footer className="bg-secondary/50 text-secondary-foreground py-12">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between md:flex-row">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <RedduneLogo />
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
          <p>&copy; {new Date().getFullYear()} Reddune Solutions. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
