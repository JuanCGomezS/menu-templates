import { getStoreWithData, type PublicStore } from './store-helpers';

export type RestaurantData = PublicStore;

/**
 * Compatibility wrapper while older components migrate to the store domain.
 */
export function getRestaurantWithData(
  store: any,
  categories: any[],
  items: any[],
  templates: any[]
): RestaurantData {
  return getStoreWithData(store, categories, items, templates);
}
