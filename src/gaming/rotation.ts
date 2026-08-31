export type GamingRotationItem = {
  index: string;
  title: "WITCHER" | "LUMINARY" | "SUPER MARIO WORLD" | "PARTY ANIMAL";
  genre: string;
  description: string;
  visual: "runes" | "luminary" | "world" | "party";
  steam: null | {
    appId: "1648360";
    canonicalTitle: "Luminary";
    storeUrl: "https://store.steampowered.com/app/1648360/Luminary/";
    coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1648360/library_600x900.jpg";
  };
};

export const GAMING_RUMBLE_URL = "https://rumble.com/thirdrailifygaming";

export const GAMING_SCHEDULE = [
  { day: "MON", time: "2 PM" },
  { day: "TUE", time: "2 PM" },
  { day: "THU", time: "2 PM" },
  { day: "FRI", time: "2 PM" },
] as const;

export const GAMING_ROTATION: readonly GamingRotationItem[] = [
  {
    index: "01",
    title: "WITCHER",
    genre: "RPG / ADVENTURE",
    description: "Monster hunting, hard choices, and the side quest that quietly steals the whole session.",
    visual: "runes",
    steam: null,
  },
  {
    index: "02",
    title: "LUMINARY",
    genre: "ACTION RPG / CO-OP",
    description: "Solo or co-op exploration, character progression, and a campaign built around pushing back the dark with light.",
    visual: "luminary",
    steam: {
      appId: "1648360",
      canonicalTitle: "Luminary",
      storeUrl: "https://store.steampowered.com/app/1648360/Luminary/",
      coverUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1648360/library_600x900.jpg",
    },
  },
  {
    index: "03",
    title: "SUPER MARIO WORLD",
    genre: "PLATFORMER",
    description: "Classic platforming rhythm, secret routes, and one more level turning into an entire night.",
    visual: "world",
    steam: null,
  },
  {
    index: "04",
    title: "PARTY ANIMAL",
    genre: "PARTY / PHYSICS",
    description: "Physics-driven party chaos where the plan survives roughly one collision.",
    visual: "party",
    steam: null,
  },
] as const;

