export type GamingRotationItem = {
  index: string;
  id: string;
  title: string;
  platform: string;
  genre: string;
  description: string;
  visual: string;
  artworkUrl: string | null;
  steam: null | {
    appId: string;
    storeUrl: string;
  };
};

export const GAMING_RUMBLE_URL = "https://rumble.com/thirdrailifygaming";

export const GAMING_SCHEDULE = [
  { day: "MON", time: "2 PM" },
  { day: "TUE", time: "2 PM" },
  { day: "THU", time: "2 PM" },
  { day: "FRI", time: "2 PM" },
] as const;

