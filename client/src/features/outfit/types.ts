// Категории одежд
export type Slot = "top" | "bottom" | "shoes" | "outerwear";

export interface Item {
  id: number;
  name: string;
  category: Slot; // нормализуем в единственное число
  image: string; // "/images/..."
  // опциональные поля, могут приходить с бэка
  style?: string | null;
  style_tags?: string[]; // ← массив стилей
  season?: string | null;
  seasons?: string[]; // ← массив сезонов
}

export type Outfit = {
  tops: Item[];
  bottoms: Item[];
  outerwear: Item[];
  shoes: Item[];
};

export type Filters = {
  style: "any" | string;
  season: "all" | string;
  limit?: number;
};

// Что надето на аватаре (например, { top: item1, bottom: item2...})
export type SelectedBySlot = Partial<Record<Slot, Item>>;
