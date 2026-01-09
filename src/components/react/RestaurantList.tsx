import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { relateRestaurantData } from '../../lib/data-helpers';
import RestaurantCard from './RestaurantCard';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  currency: string;
  template?: { name: string } | null;
  contact?: {
    whatsapp?: string;
    instagram?: string;
    address?: string;
  };
  schedule?: Record<string, string>;
  categories: Array<{
    id: string;
    name: string;
    items: Array<{
      name: string;
      description?: string;
      price: number;
    }>;
  }>;
}

export default function RestaurantList() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let restaurantsData: any[] = [];
    let categoriesData: any[] = [];
    let itemsData: any[] = [];
    let templatesData: any[] = [];
    const categoryUnsubscribes: Map<string, () => void> = new Map();
    const itemUnsubscribes: Map<string, () => void> = new Map();

    const updateRestaurants = () => {
      if (
        restaurantsData.length > 0 ||
        categoriesData.length > 0 ||
        itemsData.length > 0 ||
        templatesData.length > 0
      ) {
        const restaurantsWithData = relateRestaurantData(
          restaurantsData,
          categoriesData,
          itemsData,
          templatesData
        ) as Restaurant[];

        setRestaurants(restaurantsWithData);
        setLoading(false);
        setError(null);
      }
    };

    // Cargar templates (solo una vez, no cambian frecuentemente)
    const loadTemplates = async () => {
      try {
        const templatesSnapshot = await getDocs(collection(db, 'templates'));
        templatesData = templatesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));
        updateRestaurants();
      } catch (err) {
        console.error('Error en templates:', err);
      }
    };

    loadTemplates();

    // Función para cargar categorías e items de un restaurante
    const loadRestaurantData = (restaurantId: string) => {
      // Limpiar suscripciones anteriores de este restaurante
      const oldCategoryUnsub = categoryUnsubscribes.get(restaurantId);
      if (oldCategoryUnsub) oldCategoryUnsub();
      categoryUnsubscribes.delete(restaurantId);
      
      // Limpiar items de este restaurante
      itemUnsubscribes.forEach((unsub, key) => {
        if (key.startsWith(`${restaurantId}/`)) {
          unsub();
          itemUnsubscribes.delete(key);
        }
      });

      // Suscribirse a categorías del restaurante
      const categoriesRef = collection(db, 'restaurants', restaurantId, 'categories');
      const unsubscribeCategories = onSnapshot(
        categoriesRef,
        (categoriesSnapshot) => {
          // Actualizar categorías de este restaurante
          const restaurantCategories = categoriesSnapshot.docs.map((doc) => ({
            id: doc.id,
            restaurantId, // Mantener para compatibilidad
            ...doc.data()
          }));

          // Remover categorías antiguas de este restaurante
          categoriesData = categoriesData.filter(cat => cat.restaurantId !== restaurantId);
          categoriesData = [...categoriesData, ...restaurantCategories];

          // Suscribirse a items de cada categoría
          categoriesSnapshot.docs.forEach((categoryDoc) => {
            const categoryId = categoryDoc.id;
            const itemsKey = `${restaurantId}/${categoryId}`;
            
            // Limpiar suscripción anterior si existe
            const oldItemUnsub = itemUnsubscribes.get(itemsKey);
            if (oldItemUnsub) oldItemUnsub();

            const itemsRef = collection(db, 'restaurants', restaurantId, 'categories', categoryId, 'items');
            const unsubscribeItems = onSnapshot(
              itemsRef,
              (itemsSnapshot) => {
                // Actualizar items de esta categoría
                const categoryItems = itemsSnapshot.docs.map((itemDoc) => ({
                  id: itemDoc.id,
                  restaurantId,
                  categoryId,
                  ...itemDoc.data()
                }));

                // Remover items antiguos de esta categoría
                itemsData = itemsData.filter(item => 
                  !(item.restaurantId === restaurantId && item.categoryId === categoryId)
                );
                itemsData = [...itemsData, ...categoryItems];

                updateRestaurants();
              },
              (err) => {
                console.error(`Error en items de categoría ${categoryId}:`, err);
              }
            );

            itemUnsubscribes.set(itemsKey, unsubscribeItems);
          });

          // Si no hay categorías, actualizar de todas formas
          if (categoriesSnapshot.empty) {
            updateRestaurants();
          }
        },
        (err) => {
          console.error(`Error en categories de restaurante ${restaurantId}:`, err);
        }
      );

      categoryUnsubscribes.set(restaurantId, unsubscribeCategories);
    };

    // Suscribirse a restaurantes
    const unsubscribeRestaurants = onSnapshot(
      collection(db, 'restaurants'),
      (snapshot) => {
        restaurantsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));

        // Cargar datos de cada restaurante
        snapshot.docs.forEach((doc) => {
          loadRestaurantData(doc.id);
        });

        // Limpiar datos de restaurantes que ya no existen
        const currentRestaurantIds = new Set(snapshot.docs.map(doc => doc.id));
        categoriesData = categoriesData.filter(cat => currentRestaurantIds.has(cat.restaurantId));
        itemsData = itemsData.filter(item => currentRestaurantIds.has(item.restaurantId));

        updateRestaurants();
      },
      (err) => {
        console.error('Error en restaurants:', err);
        setError('Error al cargar restaurantes');
        setLoading(false);
      }
    );

    return () => {
      unsubscribeRestaurants();
      categoryUnsubscribes.forEach(unsub => unsub());
      itemUnsubscribes.forEach(unsub => unsub());
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-12 text-center">
        <p className="text-xl text-gray-500">Cargando menús...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-xl shadow-md p-12 text-center border border-red-200">
        <p className="text-xl text-red-600">{error}</p>
      </div>
    );
  }

  if (restaurants.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-12 text-center">
        <p className="text-xl text-gray-500">No hay restaurantes disponibles.</p>
      </div>
    );
  }

  return (
    <div>
      {restaurants.map((restaurant) => (
        <RestaurantCard key={restaurant.id} restaurant={restaurant} />
      ))}
    </div>
  );
}

