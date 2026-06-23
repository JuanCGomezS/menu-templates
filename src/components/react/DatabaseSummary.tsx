import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';

const SUMMARY_STORE_LIMIT = 25;

export default function DatabaseSummary() {
  const [counts, setCounts] = useState({
    stores: 0,
    categories: 0,
    items: 0,
    templates: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCounts = async () => {
      const [storesSnapshot, templatesSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'stores'), where('active', '==', true), limit(SUMMARY_STORE_LIMIT))),
        getDocs(query(collection(db, 'templates'), where('active', '==', true), limit(25)))
      ]);

      const nestedCounts = await Promise.all(
        storesSnapshot.docs.map(async (storeDoc) => {
          const [categoriesSnapshot, itemsSnapshot] = await Promise.all([
            getDocs(query(collection(db, 'stores', storeDoc.id, 'categories'), where('active', '==', true), limit(50))),
            getDocs(query(collection(db, 'stores', storeDoc.id, 'items'), where('active', '==', true), limit(200)))
          ]);

          return {
            categories: categoriesSnapshot.size,
            items: itemsSnapshot.size
          };
        })
      );

      setCounts({
        stores: storesSnapshot.size,
        categories: nestedCounts.reduce((total, count) => total + count.categories, 0),
        items: nestedCounts.reduce((total, count) => total + count.items, 0),
        templates: templatesSnapshot.size
      });
      setLoading(false);
    };

    loadCounts().catch((error) => {
      console.error('Error al cargar el resumen de base de datos:', error);
      setLoading(false);
    });
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
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Resumen de la base de datos</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-white rounded-lg p-4 text-center shadow-sm">
          <div className="text-3xl font-bold text-orange-600 mb-1">{counts.stores}</div>
          <div className="text-sm text-gray-600 font-medium">Tiendas</div>
        </div>
        <div className="bg-white rounded-lg p-4 text-center shadow-sm">
          <div className="text-3xl font-bold text-blue-600 mb-1">{counts.categories}</div>
          <div className="text-sm text-gray-600 font-medium">Categorías</div>
        </div>
        <div className="bg-white rounded-lg p-4 text-center shadow-sm">
          <div className="text-3xl font-bold text-green-600 mb-1">{counts.items}</div>
          <div className="text-sm text-gray-600 font-medium">Productos</div>
        </div>
        <div className="bg-white rounded-lg p-4 text-center shadow-sm">
          <div className="text-3xl font-bold text-purple-600 mb-1">{counts.templates}</div>
          <div className="text-sm text-gray-600 font-medium">Plantillas</div>
        </div>
      </div>
      <p className="text-center mt-4">
        <small className="text-gray-600 text-sm">Resumen limitado a {SUMMARY_STORE_LIMIT} tiendas activas para proteger lecturas</small>
      </p>
    </div>
  );
}
