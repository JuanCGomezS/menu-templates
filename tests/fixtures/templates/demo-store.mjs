const categories = [
  [
    "ensaladas",
    "Ensaladas",
    [
      ["Ensalada de huerta", "/tests/fixtures/templates/photos/salad.jpg"],
      ["Bowl con salmón", "/tests/fixtures/templates/photos/plate.jpg"],
    ],
  ],
  [
    "platos",
    "Platos",
    [
      ["Pizza de la casa", "/tests/fixtures/templates/photos/pizza.jpg"],
      ["Pollo al horno con limón"],
    ],
  ],
  ["postres", "Postres", [["Torta de cacao"], ["Flan de vainilla"]]],
];

export const demoLabels = {
  previewLabel: "Datos demo · Casa del Patio",
  longStoreName: "Casa del Patio con recetas de temporada y cocina de cercanía",
  longCategoryName:
    "Ensaladas de la huerta y vegetales de temporada para compartir",
  longProductName:
    "Ensalada campesina con vegetales asados, queso fresco y vinagreta de limón de la casa para compartir",
  categories: categories.map(([, name]) => name),
  products: categories.flatMap(([, , products]) =>
    products.map(([name]) => name),
  ),
};

export function createDemoStore({ layout, theme, scenario = "default" }) {
  const store = {
    id: "template-demo",
    name:
      scenario === "long-names" ? demoLabels.longStoreName : "Casa del Patio",
    slug: "casa-del-patio",
    type: scenario === "product_store" ? "product_store" : "restaurant",
    active: true,
    isActive: true,
    currency: "COP",
    templateId: layout,
    themeId: theme,
    timeZone: "America/Bogota",
    capabilities: scenario === "no-order" ? {} : { inStoreOrdering: true },
    contact: { address: "Calle 72 # 12-34, Bogotá" },
    schedule: Object.fromEntries(
      [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ].map((day) => [
        day,
        { open: "00:00", close: "23:59", closed: scenario === "closed" },
      ]),
    ),
    categories: categories.map(([id, name, products], categoryIndex) => ({
      id,
      name:
        scenario === "long-names" && categoryIndex === 0
          ? demoLabels.longCategoryName
          : name,
      order: categoryIndex,
      items:
        scenario === "empty-category" && categoryIndex === 0
          ? []
          : products.map(([product, imageUrl], productIndex) => ({
              id: `${id}-${productIndex}`,
              categoryId: id,
              name:
                scenario === "long-names" &&
                categoryIndex === 0 &&
                productIndex === 0
                  ? demoLabels.longProductName
                  : product,
              description:
                "Datos demo: ingredientes frescos preparados al momento.",
              imageUrl: scenario === "no-photos" ? undefined : imageUrl,
              price:
                scenario === "long-names"
                  ? 1234567 + productIndex
                  : 18000 + categoryIndex * 3000 + productIndex * 1500,
              order: productIndex,
              active: true,
              availableInStore: scenario !== "unavailable",
              trackStock:
                scenario === "soldout" &&
                categoryIndex === 0 &&
                productIndex === 0,
              stock:
                scenario === "soldout" &&
                categoryIndex === 0 &&
                productIndex === 0
                  ? 0
                  : 8,
            })),
    })),
  };
  if (scenario === "empty") store.categories = [];
  return store;
}
