
export interface RestaurantData {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  currency: string;
  templateId: string;
  template?: { id: string; name: string } | null;
  contact?: {
    whatsapp?: string;
    instagram?: string;
    address?: string;
  };
  schedule?: Record<string, string>;
  categories: Array<{
    id: string;
    name: string;
    order: number;
    items: Array<{
      id: string;
      name: string;
      description?: string;
      price: number;
      order: number;
    }>;
  }>;
}

/**
 * Relaciona los datos de un restaurante con sus categorías, items y template
 */
export function getRestaurantWithData(
  restaurant: any,
  categories: any[],
  items: any[],
  templates: any[]
): RestaurantData {
  const restaurantCategories = categories
    .filter((cat) => cat.restaurantId === restaurant.id && cat.active)
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((category) => {
      const categoryItems = items
        .filter(
          (item) =>
            item.categoryId === category.id &&
            item.restaurantId === restaurant.id &&
            item.active
        )
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      return {
        ...category,
        items: categoryItems
      };
    });

  const template = templates.find((t) => t.id === restaurant.templateId);

  return {
    ...restaurant,
    categories: restaurantCategories,
    template: template || null
  };
}

