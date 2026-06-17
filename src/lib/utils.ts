import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getStableFoodImage(recipeName: string = "", category: string = "", cuisine: string = ""): string {
  const nameLower = (recipeName || "").toLowerCase();
  const catLower = (category || "").toLowerCase();
  const cuiLower = (cuisine || "").toLowerCase();

  const images: Record<string, string> = {
    curry: "photo-1565557623262-b51c2513a641",
    soup: "photo-1547592180-85f173990554",
    salad: "photo-1512621776951-a57141f2eefd",
    pasta: "photo-1563379091339-03b21ab4a4f8",
    pizza: "photo-1513104890138-7c749659a591",
    burger: "photo-1568901346375-23c9450c58cd",
    tacos: "photo-1565299585323-38d6b0865b47",
    steak: "photo-1544025162-d76694265947",
    seafood: "photo-1519708227418-c8fd9a32b7a2",
    chicken: "photo-1598515214211-89d3c73ae83b",
    dessert: "photo-1578985545062-69928b1d9587",
    breakfast: "photo-1525351484163-7529414344d8",
    asian: "photo-1585032226651-759b368d7246",
    rice: "photo-1541832676-9b763b0239ab",
    vegan: "photo-1540420773420-3366772f4999",
    default: "photo-1546069901-ba9599a7e63c"
  };

  let id = images.default;

  if (nameLower.includes("curry") || catLower.includes("curry") || cuiLower.includes("indian") || cuiLower.includes("jamaican")) {
    id = images.curry;
  } else if (nameLower.includes("soup") || nameLower.includes("stew") || nameLower.includes("ramen") || catLower.includes("soup")) {
    id = images.soup;
  } else if (nameLower.includes("pasta") || nameLower.includes("spaghetti") || nameLower.includes("lasagna") || catLower.includes("pasta") || cuiLower.includes("italian")) {
    id = images.pasta;
  } else if (nameLower.includes("pizza") || catLower.includes("pizza") || nameLower.includes("flatbread")) {
    id = images.pizza;
  } else if (nameLower.includes("burger") || nameLower.includes("sandwich") || catLower.includes("burger")) {
    id = images.burger;
  } else if (nameLower.includes("taco") || nameLower.includes("fajita") || nameLower.includes("burrito") || cuiLower.includes("mexican")) {
    id = images.tacos;
  } else if (nameLower.includes("steak") || nameLower.includes("ribs") || nameLower.includes("beef") || nameLower.includes("lamb") || nameLower.includes("ribeye") || nameLower.includes("goat") || nameLower.includes("mutton")) {
    id = images.steak;
  } else if (nameLower.includes("salad") || catLower.includes("salad")) {
    id = images.salad;
  } else if (nameLower.includes("fish") || nameLower.includes("shrimp") || nameLower.includes("salmon") || nameLower.includes("seafood") || nameLower.includes("crab") || catLower.includes("seafood")) {
    id = images.seafood;
  } else if (nameLower.includes("chicken") || nameLower.includes("poultry") || nameLower.includes("turkey") || nameLower.includes("wings")) {
    id = images.chicken;
  } else if (nameLower.includes("dessert") || nameLower.includes("cake") || nameLower.includes("cookie") || nameLower.includes("sweet") || nameLower.includes("pancakes") || catLower.includes("dessert")) {
    id = images.dessert;
  } else if (nameLower.includes("breakfast") || nameLower.includes("toast") || nameLower.includes("egg") || nameLower.includes("waffle")) {
    id = images.breakfast;
  } else if (nameLower.includes("rice") || nameLower.includes("biryani") || nameLower.includes("risotto")) {
    id = images.rice;
  } else if (cuiLower.includes("asian") || cuiLower.includes("chinese") || cuiLower.includes("japanese") || nameLower.includes("noodles") || nameLower.includes("stir")) {
    id = images.asian;
  } else if (nameLower.includes("vegan") || nameLower.includes("vegetarian")) {
    id = images.vegan;
  }

  return `https://images.unsplash.com/${id}?auto=format&fit=crop&q=80&w=1000`;
}

export function cleanRecipeImageUrl(url?: string, recipeName: string = "", category: string = "", cuisine: string = "") {
  if (!url || typeof url !== 'string' || !url.startsWith('http') || url.includes('featured')) {
    return getStableFoodImage(recipeName, category, cuisine);
  }
  return url;
}
