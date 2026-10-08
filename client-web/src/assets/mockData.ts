// assets/mockData.ts
export interface HeroSlide {
  url: string;
  label: string;
  tagline: string;
  accent: string; 
  eyebrow: string; 
}

export const MockAssets = {
  heroSlides: [
    {
      url: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1000&auto=format&fit=crop",
      label: "Fresh Produce",
      tagline: "Picked this morning, on your doorstep by evening.",
      accent: "#2e6b48", // Grocery Green
      eyebrow: "DAILY FRESH",
    },
    {
      url: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?q=80&w=1000&auto=format&fit=crop",
      label: "Pantry Essentials",
      tagline: "Rice, pasta, spices — the shelf staples, always stocked.",
      accent: "#c9722c", // Kraft Orange
      eyebrow: "RESTOCK",
    },
    {
      url: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?q=80&w=1000&auto=format&fit=crop",
      label: "Home Electronics",
      tagline: "Premium appliances for the home, at warehouse prices.",
      accent: "#1f5c73", // Ledger Teal
      eyebrow: "FEATURED",
    },
    {
      url: "https://images.unsplash.com/photo-1629198688000-71f23e745b6e?q=80&w=1000&auto=format&fit=crop",
      label: "Health & Beauty",
      tagline: "Trusted brands for the everyday personal care routine.",
      accent: "#7a4a6b", // Dusty Plum
      eyebrow: "ESSENTIALS",
    },
  ] as HeroSlide[],

  // Superstore brands replacing the phone manufacturers
  brandTicker: [
    "NESTLE", "UNILEVER", "SAMSUNG", "LOCAL FARM", "BINATONE", "PROCTER & GAMBLE", "COCA-COLA", "LG",
  ],
};