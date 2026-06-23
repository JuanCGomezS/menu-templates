/**
 * Crea una tienda de ejemplo compatible con el modelo público actual.
 *
 * Estructura:
 * - stores/{storeId}
 * - stores/{storeId}/categories/{categoryId}
 * - stores/{storeId}/items/{itemId}
 * - templates/{templateId}
 *
 * Uso:
 * node scripts/create-restaurant-2.js
 */

import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { initializeAdminApp } from './firebase-admin.js';

async function seedStore() {
  initializeAdminApp();

  const db = getFirestore();
  console.log('Creando tienda de ejemplo...\n');

  const storeId = 'store_cafe_bella_vista';
  const storeSlug = 'cafe-bella-vista';
  const templateId = 'restaurant-classic';
  const now = FieldValue.serverTimestamp();

  await db
    .collection('templates')
    .doc(templateId)
    .set(
      {
        name: 'Restaurante clásico',
        description: 'Diseño clásico de menú para restaurante con categorías y horarios visibles.',
        component: 'restaurant-classic',
        active: true,
        createdAt: now,
        updatedAt: now
      },
      { merge: true }
    );

  const storeData = {
    name: 'Café Bella Vista',
    slug: storeSlug,
    type: 'restaurant',
    active: true,
    isActive: true,
    templateId,
    themeId: 'default',
    currency: 'COP',
    plan: 'free_trial',
    limits: {
      maxProducts: 100,
      maxCategories: 20,
      maxImages: 30
    },
    contact: {
      whatsapp: '+57 300 123 4567',
      instagram: '@cafebellavista',
      address: 'Carrera 15 #93-47, Bogotá',
      deliveryNotes: 'Domicilios disponibles en zonas cercanas.'
    },
    schedule: {
      monday: { open: '07:00', close: '20:00', closed: false },
      tuesday: { open: '07:00', close: '20:00', closed: false },
      wednesday: { open: '07:00', close: '20:00', closed: false },
      thursday: { open: '07:00', close: '20:00', closed: false },
      friday: { open: '07:00', close: '22:00', closed: false },
      saturday: { open: '08:00', close: '22:00', closed: false },
      sunday: { open: '09:00', close: '18:00', closed: false }
    },
    createdAt: now,
    updatedAt: now
  };

  await db.collection('stores').doc(storeId).set(storeData, { merge: true });
  console.log(`Tienda creada: ${storeData.name}`);

  const categories = [
    {
      id: 'cat_drinks',
      name: 'Bebidas',
      order: 1,
      items: [
        { id: 'item_americano', name: 'Café americano', description: 'Café negro intenso.', price: 3500, order: 1 },
        { id: 'item_latte', name: 'Café latte', description: 'Espresso con leche vaporizada.', price: 4500, order: 2 },
        { id: 'item_lemonade', name: 'Limonada natural', description: 'Limonada fresca con hielo.', price: 5500, order: 3 }
      ]
    },
    {
      id: 'cat_desserts',
      name: 'Postres',
      order: 2,
      items: [
        { id: 'item_chocolate_cake', name: 'Torta de chocolate', description: 'Torta húmeda de chocolate.', price: 12000, order: 1 },
        { id: 'item_cheesecake', name: 'Cheesecake de fresa', description: 'Cheesecake suave con salsa de fresa.', price: 13500, order: 2 },
        { id: 'item_brownie', name: 'Brownie', description: 'Brownie con nueces.', price: 8500, order: 3 }
      ]
    },
    {
      id: 'cat_breakfasts',
      name: 'Desayunos',
      order: 3,
      items: [
        { id: 'item_full_breakfast', name: 'Desayuno completo', description: 'Huevos, tostadas, jamón, queso y café.', price: 18000, order: 1 },
        { id: 'item_pancakes', name: 'Panqueques', description: 'Panqueques con miel y fruta.', price: 15000, order: 2 }
      ]
    }
  ];

  let totalItems = 0;

  for (const category of categories) {
    await db
      .collection('stores')
      .doc(storeId)
      .collection('categories')
      .doc(category.id)
      .set(
        {
          name: category.name,
          order: category.order,
          active: true,
          createdAt: now,
          updatedAt: now
        },
        { merge: true }
      );

    for (const item of category.items) {
      await db
        .collection('stores')
        .doc(storeId)
        .collection('items')
        .doc(item.id)
        .set(
          {
            categoryId: category.id,
            name: item.name,
            description: item.description,
            price: item.price,
            order: item.order,
            active: true,
            trackStock: false,
            createdAt: now,
            updatedAt: now
          },
          { merge: true }
        );
      totalItems++;
    }

    console.log(`Categoría creada: ${category.name} (${category.items.length} productos)`);
  }

  console.log('\nTienda de ejemplo creada correctamente:');
  console.log(`- Tienda: ${storeData.name}`);
  console.log(`- Slug: ${storeSlug}`);
  console.log(`- Categorías: ${categories.length}`);
  console.log(`- Productos: ${totalItems}`);
  console.log(`- URL: /menu-templates/t/${storeSlug}\n`);
}

seedStore()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('No se pudo crear la tienda de ejemplo:', error);
    process.exit(1);
  });
