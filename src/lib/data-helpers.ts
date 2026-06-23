export function relateStoreData(
  stores: any[],
  categories: any[],
  items: any[],
  templates: any[]
) {
  return stores.map((store) => {
    const storeCategories = categories
      .filter((cat) =>
        cat.storeId === store.id &&
        (cat.active === undefined || cat.active !== false)
      )
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((category) => {
        const categoryItems = items
          .filter(
            (item) =>
              item.categoryId === category.id &&
              item.storeId === store.id &&
              (item.active === undefined || item.active !== false)
          )
          .sort((a, b) => (a.order || 0) - (b.order || 0));

        return {
          ...category,
          items: categoryItems
        };
      });

    const template = templates.find((t) => t.id === store.templateId);
    const active = store.active ?? store.isActive ?? false;

    return {
      ...store,
      active,
      isActive: active,
      categories: storeCategories,
      template: template || null
    };
  });
}

export const relateRestaurantData = relateStoreData;

export function createDatabaseLog(
  stores: any[],
  categories: any[],
  items: any[],
  templates: any[],
  storesWithData: any[]
) {
  return {
    stores: {
      count: stores.length,
      data: stores
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
    storesWithData: {
      count: storesWithData.length,
      data: storesWithData
    }
  };
}
