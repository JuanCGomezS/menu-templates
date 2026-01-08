export function relateRestaurantData(
  restaurants: any[],
  categories: any[],
  items: any[],
  templates: any[]
) {
  return restaurants.map((restaurant) => {
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
  });
}

export function createDatabaseLog(
  restaurants: any[],
  categories: any[],
  items: any[],
  templates: any[],
  restaurantsWithData: any[]
) {
  return {
    restaurants: {
      count: restaurants.length,
      data: restaurants
    },
    categories: {
      count: categories.length,
      data: categories
    },
    items: {
      count: items.length,
      data: items
    },
    templates: {
      count: templates.length,
      data: templates
    },
    restaurantsWithData: {
      count: restaurantsWithData.length,
      data: restaurantsWithData
    }
  };
}

