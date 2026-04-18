export type Locale = "pt" | "en";

export interface SiteMessages {
  TabTitles?: {
    home?: string;
    pricing?: string;
  };
  TabDescription?: string;
  [key: string]: unknown;
}
