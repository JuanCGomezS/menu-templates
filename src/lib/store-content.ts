import type { PublicCategory, PublicItem, PublicStore } from './store-helpers';

/** Normalized, layout-independent content contract for every public template. */
export interface StoreContentModel extends PublicStore {
  presentation: 'menu' | 'catalog';
  navigation: Array<{ id: string; label: string }>;
  items: PublicItem[];
  categories: PublicCategory[];
}

export function normalizeStoreContent(store: PublicStore): StoreContentModel {
  const categories = store.categories
    .map((category) => ({ ...category, items: [...category.items] }))
    .filter((category) => category.active !== false);

  return {
    ...store,
    categories,
    items: categories.flatMap((category) => category.items),
    navigation: categories.map((category) => ({ id: category.id, label: category.name })),
    presentation: store.type === 'product_store' ? 'catalog' : 'menu',
  };
}
