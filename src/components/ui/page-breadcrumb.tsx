import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type PageBreadcrumbCrumb = { label: string; href?: string };

type Props = {
  crumbs: PageBreadcrumbCrumb[];
};

export function PageBreadcrumb({ crumbs }: Props) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center text-sm text-muted-foreground"
    >
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center">
          {i > 0 && <ChevronRight className="h-4 w-4 mx-1" aria-hidden="true" />}
          {crumb.href ? (
            <Link href={crumb.href} className="hover:text-primary transition-colors">
              {crumb.label}
            </Link>
          ) : (
            <span aria-current="page">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
