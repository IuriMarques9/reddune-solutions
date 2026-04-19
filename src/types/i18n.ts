export type Locale = "pt" | "en";

export interface SiteMessages {
  TabTitles?: {
    home?: string;
    pricing?: string;
    shop?: string;
    contact?: string;
  };
  TabDescription?: string;
  [key: string]: unknown;
}
