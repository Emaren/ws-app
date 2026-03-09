import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Wheat & Stone",
    short_name: "W&S",
    description:
      "A premium organic discovery app for trusted reviews, local buying, offers, and rewards.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
    background_color: "#110c09",
    theme_color: "#110c09",
    lang: "en-CA",
    categories: ["food", "health", "lifestyle"],
    shortcuts: [
      {
        name: "Discover",
        short_name: "Discover",
        description: "Open the discovery hub",
        url: "/discover?source=pwa-shortcut",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Products",
        short_name: "Products",
        description: "Browse the product atlas",
        url: "/products?source=pwa-shortcut",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Offers",
        short_name: "Offers",
        description: "See current local offers",
        url: "/offers?source=pwa-shortcut",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Articles",
        short_name: "Articles",
        description: "Open the latest reviews and stories",
        url: "/articles?source=pwa-shortcut",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
    screenshots: [
      {
        src: "/WSNIf.png",
        sizes: "1024x1536",
        type: "image/png",
        label: "Wheat & Stone mobile product and review experience",
        form_factor: "narrow",
      },
      {
        src: "/bbs.trim.v6.png",
        sizes: "3046x1969",
        type: "image/png",
        label: "Wheat & Stone wide editorial and commerce experience",
        form_factor: "wide",
      },
    ],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
