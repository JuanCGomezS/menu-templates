import type { Schedule } from "./utils";

export type StoreType = "restaurant" | "food_business" | "product_store";
export type Currency = "COP" | "USD" | "EUR";

export interface PublicItem {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  active?: boolean;
  order: number;
  stock?: number;
  trackStock?: boolean;
  variants?: Array<{ name: string; price?: number; stock?: number }>;
}

export interface PublicCategory {
  id: string;
  name: string;
  active?: boolean;
  order: number;
  items: PublicItem[];
}

export interface PublicStore {
  id: string;
  name: string;
  slug: string;
  type?: StoreType;
  active: boolean;
  isActive: boolean;
  currency: Currency | string;
  templateId: string;
  themeId?: string;
  template?: { id: string; name: string } | null;
  contact?: {
    whatsapp?: string;
    instagram?: string;
    address?: string;
    deliveryNotes?: string;
  };
  schedule?: Schedule;
  categories: PublicCategory[];
}

export function getStoreWithData(
  store: any,
  categories: any[],
  items: any[],
  templates: any[]
): PublicStore {
  const storeCategories = categories
    .filter((category) => category.active !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((category) => {
      const categoryItems = items
        .filter(
          (item) => item.categoryId === category.id && item.active !== false
        )
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      return {
        ...category,
        items: categoryItems,
      };
    });

  const template = templates.find((template) => template.id === store.templateId);
  const active = store.active ?? store.isActive ?? false;

  return {
    ...store,
    active,
    isActive: active,
    categories: storeCategories,
    template: template || null,
  };
}
