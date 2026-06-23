import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { relateStoreData } from '../../lib/data-helpers';
import RestaurantCard from './RestaurantCard';
import type { Schedule } from '../../lib/utils';

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
  schedule?: Schedule;
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
  const [stores, setStores] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStores = async () => {
      try {
        const [storesSnapshot, templatesSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'stores'), where('active', '==', true), limit(25))),
          getDocs(query(collection(db, 'templates'), where('active', '==', true), limit(25)))
        ]);

        const storesData = storesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));

        const templatesData = templatesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));

        const storeDataGroups = await Promise.all(
          storesData.map(async (store) => {
            const [categoriesSnapshot, itemsSnapshot] = await Promise.all([
              getDocs(query(collection(db, 'stores', store.id, 'categories'), where('active', '==', true), limit(50))),
              getDocs(query(collection(db, 'stores', store.id, 'items'), where('active', '==', true), limit(200)))
            ]);

            return {
              categories: categoriesSnapshot.docs.map((doc) => ({
                id: doc.id,
                storeId: store.id,
                ...doc.data()
              })),
              items: itemsSnapshot.docs.map((doc) => ({
                id: doc.id,
                storeId: store.id,
                ...doc.data()
              }))
            };
          })
        );

        const categoriesData = storeDataGroups.flatMap((group) => group.categories);
        const itemsData = storeDataGroups.flatMap((group) => group.items);
        const storesWithData = relateStoreData(
          storesData,
          categoriesData,
          itemsData,
          templatesData
        ) as Restaurant[];

        setStores(storesWithData);
        setError(null);
      } catch (err) {
        console.error('Error loading stores:', err);
        setError('Error al cargar tiendas');
      } finally {
        setLoading(false);
      }
    };

    loadStores();
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

  if (stores.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-12 text-center">
        <p className="text-xl text-gray-500">No hay tiendas disponibles.</p>
      </div>
    );
  }

  return (
    <div>
      {stores.map((store) => (
        <RestaurantCard key={store.id} restaurant={store} />
      ))}
    </div>
  );
}
