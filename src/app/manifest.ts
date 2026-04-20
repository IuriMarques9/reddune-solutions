import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RedDune Solutions",
    short_name: "RedDune",
    description: "Soluções informáticas profissionais no Algarve",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#8b1a1a",
    icons: [
      { src: "/icone.png", sizes: "any", type: "image/png" },
    ],
  };
}
