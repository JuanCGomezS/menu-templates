import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeAdminApp } from './firebase-admin.js';

initializeAdminApp();

const db = getFirestore();

function normalizeStoreData(restaurantId, data) {
  const active = data.active ?? data.isActive ?? true;

  return {
    name: data.name || 'Tienda sin nombre',
    slug: data.slug || restaurantId,
    type: data.type || 'restaurant',
    ownerUid: data.ownerUid || '',
    active,
    isActive: active,
    templateId: data.templateId || 'restaurant-classic',
    themeId: data.themeId || 'theme-default',
    currency: data.currency || 'COP',
    contact: data.contact || {},
    schedule: data.schedule || {},
    migratedFrom: `restaurants/${restaurantId}`,
    migratedAt: FieldValue.serverTimestamp(),
    createdAt: data.createdAt || FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

async function copyCategoryAndItems(restaurantId, storeId, categoryDoc) {
  const categoryData = categoryDoc.data();
  const categoryRef = db.doc(`stores/${storeId}/categories/${categoryDoc.id}`);

  await categoryRef.set(
    {
      ...categoryData,
      active: categoryData.active ?? true,
      order: categoryData.order ?? 0,
      migratedFrom: `restaurants/${restaurantId}/categories/${categoryDoc.id}`,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const itemsSnapshot = await categoryDoc.ref.collection('items').get();
  let copiedItems = 0;

  for (const itemDoc of itemsSnapshot.docs) {
    const itemData = itemDoc.data();
    await db.doc(`stores/${storeId}/items/${itemDoc.id}`).set(
      {
        ...itemData,
        categoryId: itemData.categoryId || categoryDoc.id,
        active: itemData.active ?? true,
        order: itemData.order ?? 0,
        trackStock: itemData.trackStock ?? false,
        migratedFrom: `restaurants/${restaurantId}/categories/${categoryDoc.id}/items/${itemDoc.id}`,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    copiedItems++;
  }

  return copiedItems;
}

async function migrateRestaurantsToStores() {
  console.log('Migrando restaurantes legacy hacia stores...\n');

  const restaurantsSnapshot = await db.collection('restaurants').get();

  if (restaurantsSnapshot.empty) {
    console.log('No se encontraron documentos en restaurants.');
    return;
  }

  for (const restaurantDoc of restaurantsSnapshot.docs) {
    const restaurantData = restaurantDoc.data();
    const storeId = restaurantDoc.id.replace(/^restaurant_/, 'store_');
    const storeData = normalizeStoreData(restaurantDoc.id, restaurantData);

    await db.doc(`stores/${storeId}`).set(storeData, { merge: true });

    const categoriesSnapshot = await restaurantDoc.ref.collection('categories').get();
    let copiedItems = 0;

    for (const categoryDoc of categoriesSnapshot.docs) {
      copiedItems += await copyCategoryAndItems(restaurantDoc.id, storeId, categoryDoc);
    }

    console.log(`Migrado: ${restaurantData.name || restaurantDoc.id}`);
    console.log(`- Store ID: ${storeId}`);
    console.log(`- Slug: ${storeData.slug}`);
    console.log(`- Categorías: ${categoriesSnapshot.size}`);
    console.log(`- Productos: ${copiedItems}\n`);
  }

  console.log('Migración finalizada. Los datos legacy en restaurants no fueron eliminados.');
}

migrateRestaurantsToStores()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('No se pudo completar la migración:', error);
    process.exit(1);
  });
