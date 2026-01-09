/**
 * Script para crear un segundo restaurante con datos de ejemplo
 * 
 * Estructura:
 * - restaurants/{restaurantId} (documento)
 * - restaurants/{restaurantId}/categories/{categoryId} (subcolección)
 * - restaurants/{restaurantId}/categories/{categoryId}/items/{itemId} (subcolección anidada)
 * 
 * Uso:
 * node scripts/create-restaurant-2.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDcEDy1vTJL5IkN-ELKltGabGz7pN7NZbk",
  authDomain: "menu-templates.firebaseapp.com",
  projectId: "menu-templates",
  storageBucket: "menu-templates.firebasestorage.app",
  messagingSenderId: "739218044592",
  appId: "1:739218044592:web:00509b2188c7509e71ed75",
  measurementId: "G-9R9Z2R06XL"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function createRestaurant2() {
  console.log('🚀 Creando restaurante 2...\n');

  try {
    const restaurantId = 'restaurant_2';
    const restaurantSlug = 'cafe-bella-vista';

    // 1. Crear el documento del restaurante
    console.log('📋 Creando documento del restaurante...');
    const restaurantRef = doc(db, 'restaurants', restaurantId);
    
    const restaurantData = {
      name: 'Café Bella Vista',
      slug: restaurantSlug,
      templateId: 'template-elegant', // Puedes cambiar esto
      ownerUid: '', // Vacío por ahora, se puede asignar después
      isActive: true,
      currency: 'COP',
      contact: {
        whatsapp: '+57 300 123 4567',
        instagram: '@cafebellavista',
        address: 'Carrera 15 #93-47, Bogotá'
      },
      schedule: {
        monday: '07:00-20:00',
        tuesday: '07:00-20:00',
        wednesday: '07:00-20:00',
        thursday: '07:00-20:00',
        friday: '07:00-22:00',
        saturday: '08:00-22:00',
        sunday: '09:00-18:00'
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(restaurantRef, restaurantData);
    console.log(`   ✓ Restaurante creado: ${restaurantData.name}\n`);

    // 2. Crear categorías con sus items
    const categories = [
      {
        id: 'cat_bebidas',
        name: 'Bebidas',
        order: 1,
        active: true,
        items: [
          {
            id: 'item_cafe_americano',
            name: 'Café Americano',
            description: 'Café negro fuerte',
            price: 3500,
            order: 1,
            active: true
          },
          {
            id: 'item_cafe_latte',
            name: 'Café Latte',
            description: 'Espresso con leche vaporizada',
            price: 4500,
            order: 2,
            active: true
          },
          {
            id: 'item_capuccino',
            name: 'Capuccino',
            description: 'Espresso, leche y espuma',
            price: 4800,
            order: 3,
            active: true
          },
          {
            id: 'item_te_verde',
            name: 'Té Verde',
            description: 'Té verde orgánico',
            price: 4000,
            order: 4,
            active: true
          },
          {
            id: 'item_limonada',
            name: 'Limonada Natural',
            description: 'Limonada fresca con hielo',
            price: 5500,
            order: 5,
            active: true
          }
        ]
      },
      {
        id: 'cat_postres',
        name: 'Postres',
        order: 2,
        active: true,
        items: [
          {
            id: 'item_torta_chocolate',
            name: 'Torta de Chocolate',
            description: 'Torta húmeda de chocolate belga',
            price: 12000,
            order: 1,
            active: true
          },
          {
            id: 'item_cheesecake',
            name: 'Cheesecake',
            description: 'Cheesecake de fresa',
            price: 13500,
            order: 2,
            active: true
          },
          {
            id: 'item_brownie',
            name: 'Brownie',
            description: 'Brownie con nueces y helado',
            price: 8500,
            order: 3,
            active: true
          },
          {
            id: 'item_tiramisu',
            name: 'Tiramisú',
            description: 'Postre italiano tradicional',
            price: 14000,
            order: 4,
            active: true
          }
        ]
      },
      {
        id: 'cat_desayunos',
        name: 'Desayunos',
        order: 3,
        active: true,
        items: [
          {
            id: 'item_desayuno_completo',
            name: 'Desayuno Completo',
            description: 'Huevos, tostadas, jamón, queso y café',
            price: 18000,
            order: 1,
            active: true
          },
          {
            id: 'item_pancakes',
            name: 'Pancakes',
            description: 'Pancakes con miel y frutas',
            price: 15000,
            order: 2,
            active: true
          },
          {
            id: 'item_waffles',
            name: 'Waffles',
            description: 'Waffles belgas con miel y mantequilla',
            price: 16000,
            order: 3,
            active: true
          },
          {
            id: 'item_arepa_huevo',
            name: 'Arepa con Huevo',
            description: 'Arepa frita con huevo y queso',
            price: 8000,
            order: 4,
            active: true
          }
        ]
      },
      {
        id: 'cat_almuerzos',
        name: 'Almuerzos',
        order: 4,
        active: true,
        items: [
          {
            id: 'item_ensalada_cesar',
            name: 'Ensalada César',
            description: 'Lechuga, pollo, crutones y aderezo césar',
            price: 22000,
            order: 1,
            active: true
          },
          {
            id: 'item_sandwich_pollo',
            name: 'Sandwich de Pollo',
            description: 'Pollo a la plancha, lechuga, tomate y mayonesa',
            price: 19000,
            order: 2,
            active: true
          },
          {
            id: 'item_pasta_carbonara',
            name: 'Pasta Carbonara',
            description: 'Pasta con tocino, crema y queso parmesano',
            price: 24000,
            order: 3,
            active: true
          },
          {
            id: 'item_sopa_dia',
            name: 'Sopa del Día',
            description: 'Sopa casera del día',
            price: 12000,
            order: 4,
            active: true
          }
        ]
      }
    ];

    // 3. Crear categorías e items
    console.log('📋 Creando categorías e items...\n');
    
    let totalCategories = 0;
    let totalItems = 0;

    for (const category of categories) {
      // Crear categoría
      const categoryRef = doc(
        db,
        'restaurants',
        restaurantId,
        'categories',
        category.id
      );

      const categoryData = {
        name: category.name,
        order: category.order,
        active: category.active,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(categoryRef, categoryData);
      totalCategories++;
      console.log(`   ✓ Categoría creada: ${category.name}`);

      // Crear items de la categoría
      for (const item of category.items) {
        const itemRef = doc(
          db,
          'restaurants',
          restaurantId,
          'categories',
          category.id,
          'items',
          item.id
        );

        const itemData = {
          name: item.name,
          description: item.description,
          price: item.price,
          order: item.order,
          active: item.active,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        await setDoc(itemRef, itemData);
        totalItems++;
      }

      console.log(`      → ${category.items.length} items creados\n`);
    }

    console.log('\n✅ Restaurante creado exitosamente:');
    console.log(`   - Restaurante: ${restaurantData.name}`);
    console.log(`   - Slug: ${restaurantSlug}`);
    console.log(`   - Categorías: ${totalCategories}`);
    console.log(`   - Items: ${totalItems}`);
    console.log(`   - URL: /menu-templates/m/${restaurantSlug}\n`);

  } catch (error) {
    console.error('❌ Error al crear restaurante:', error);
    throw error;
  }
}

// Ejecutar creación
createRestaurant2()
  .then(() => {
    console.log('✨ ¡Restaurante creado exitosamente!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });

