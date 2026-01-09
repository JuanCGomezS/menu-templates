import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export default function DatabaseSummary() {
  const [counts, setCounts] = useState({
    restaurants: 0,
    categories: 0,
    items: 0,
    templates: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Usar onSnapshot para tiempo real
    const unsubscribes: Array<() => void> = [];

    const unsubscribeRestaurants = onSnapshot(
      collection(db, 'restaurants'),
      (snapshot) => {
        setCounts((prev) => ({
          ...prev,
          restaurants: snapshot.size
        }));
        setLoading(false);
      }
    );

    const unsubscribeCategories = onSnapshot(
      collection(db, 'categories'),
      (snapshot) => {
        setCounts((prev) => ({
          ...prev,
          categories: snapshot.size
        }));
      }
    );

    const unsubscribeItems = onSnapshot(
      collection(db, 'items'),
      (snapshot) => {
        setCounts((prev) => ({
          ...prev,
          items: snapshot.size
        }));
      }
    );

    const unsubscribeTemplates = onSnapshot(
      collection(db, 'templates'),
      (snapshot) => {
        setCounts((prev) => ({
          ...prev,
          templates: snapshot.size
        }));
      }
    );

    unsubscribes.push(
      unsubscribeRestaurants,
      unsubscribeCategories,
      unsubscribeItems,
      unsubscribeTemplates
    );

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, []);

  if (loading) {
    return (
      <div className="mb-8 p-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl border border-gray-300 shadow-sm">
        <p className="text-center text-gray-600">Cargando resumen...</p>
      </div>
    );
  }

  return (
    <div className="mb-8 p-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl border border-gray-300 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Resumen de la Base de Datos</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-white rounded-lg p-4 text-center shadow-sm">
          <div className="text-3xl font-bold text-orange-600 mb-1">{counts.restaurants}</div>
          <div className="text-sm text-gray-600 font-medium">Restaurantes</div>
        </div>
        <div className="bg-white rounded-lg p-4 text-center shadow-sm">
          <div className="text-3xl font-bold text-blue-600 mb-1">{counts.categories}</div>
          <div className="text-sm text-gray-600 font-medium">Categorías</div>
        </div>
        <div className="bg-white rounded-lg p-4 text-center shadow-sm">
          <div className="text-3xl font-bold text-green-600 mb-1">{counts.items}</div>
          <div className="text-sm text-gray-600 font-medium">Items</div>
        </div>
        <div className="bg-white rounded-lg p-4 text-center shadow-sm">
          <div className="text-3xl font-bold text-purple-600 mb-1">{counts.templates}</div>
          <div className="text-sm text-gray-600 font-medium">Templates</div>
        </div>
      </div>
      <p className="text-center mt-4">
        <small className="text-gray-600 text-sm">Los datos se actualizan en tiempo real</small>
      </p>
    </div>
  );
}

