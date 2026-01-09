import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
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

    // Usar onSnapshot para tiempo real - todos en paralelo
    const unsubscribeRestaurants = onSnapshot(
      collection(db, 'restaurants'),
      (snapshot) => {
        restaurantsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));
        updateRestaurants();
      },
      (err) => {
        console.error('Error en restaurants:', err);
        setError('Error al cargar restaurantes');
        setLoading(false);
      }
    );

    const unsubscribeCategories = onSnapshot(
      collection(db, 'categories'),
      (snapshot) => {
        categoriesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));
        updateRestaurants();
      },
      (err) => {
        console.error('Error en categories:', err);
        setError('Error al cargar categories');
        setLoading(false);
      }
    );

    const unsubscribeItems = onSnapshot(
      collection(db, 'items'),
      (snapshot) => {
        itemsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));
        updateRestaurants();
      },
      (err) => {
        console.error('Error en items:', err);
        setError('Error al cargar items');
        setLoading(false);
      }
    );

    const unsubscribeTemplates = onSnapshot(
      collection(db, 'templates'),
      (snapshot) => {
        templatesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));
        updateRestaurants();
      },
      (err) => {
        console.error('Error en templates:', err);
        setError('Error al cargar templates');
        setLoading(false);
      }
    );

    return () => {
      unsubscribeRestaurants();
      unsubscribeCategories();
      unsubscribeItems();
      unsubscribeTemplates();
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

