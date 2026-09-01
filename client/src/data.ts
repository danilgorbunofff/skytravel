export type OwnTour = {
  id?: number;
  destination: string;
  title: string;
  price: number;
  startDate?: string;
  endDate?: string;
  transport?: string;
  description?: string;
  image: string;
  photos?: string[];
  i18n?: Record<string, { destination?: string; title?: string; description?: string }>;
  sortOrder?: number;
};

export type Favorite = {
  destination: string;
  price: number;
  image: string;
};

export const heroImages = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1080&q=80",
  "https://images.unsplash.com/photo-1520454974749-611b7248ffdb?auto=format&fit=crop&w=1080&q=80",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1080&q=80",
  "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1080&q=80",
];

export const defaultOwnTours: OwnTour[] = [
  {
    destination: "Santorini",
    title: "SkyTravel Signature",
    price: 12190,
    startDate: "2026-02-21",
    endDate: "2026-04-21",
    transport: "plane",
    description:
      "Romantické bílé uličky, západy slunce a pečlivě vybrané hotely v nejlepší poloze ostrova.",
    image:
      "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=80",
    photos: [
      "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?auto=format&fit=crop&w=1600&q=80",
    ],
  },
  {
    destination: "Mallorca",
    title: "SkyTravel Signature",
    price: 13550,
    startDate: "2026-02-21",
    endDate: "2026-04-21",
    transport: "plane",
    description:
      "Kombinace pláží, výletů a pohodlného ubytování s dopravou i servisem od SkyTravel.",
    image:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    photos: [
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1600&q=80",
    ],
  },
  {
    destination: "Jižní Kypr",
    title: "SkyTravel Signature",
    price: 15990,
    startDate: "2026-02-21",
    endDate: "2026-04-21",
    transport: "plane",
    description: "Slunce po většinu roku, čisté moře a ověřené resorty vhodné pro páry i rodiny.",
    image:
      "https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=1200&q=80",
    photos: [
      "https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1600&q=80",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80",
    ],
  },
];

export const favorites: Favorite[] = [
  {
    destination: "Bulharsko",
    price: 4990,
    image:
      "https://images.unsplash.com/photo-1473116763249-2faaef81ccda?auto=format&fit=crop&w=1200&q=80",
  },
  {
    destination: "Řecko",
    price: 8990,
    image:
      "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80",
  },
  {
    destination: "Turecko",
    price: 11990,
    image:
      "https://images.unsplash.com/photo-1527838832700-5059252407fa?auto=format&fit=crop&w=1200&q=80",
  },
  {
    destination: "Chorvatsko",
    price: 6990,
    image:
      "https://images.unsplash.com/photo-1582967788606-a171c1080cb0?auto=format&fit=crop&w=1200&q=80",
  },
  {
    destination: "Itálie",
    price: 9990,
    image:
      "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=1200&q=80",
  },
  {
    destination: "Španělsko",
    price: 11990,
    image:
      "https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=1200&q=80",
  },
];
