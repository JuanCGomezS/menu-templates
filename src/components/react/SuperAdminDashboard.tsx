import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import type React from 'react';
import { auth } from '../../lib/firebase';
import { getUserProfile, ROLES } from '../../lib/auth';
import { getLimitedStoresForAdmin } from '../../lib/public-store-data';
import { withBasePath } from '../../lib/base-path';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import Messaging from './Messaging';

type StoreType = 'restaurant' | 'food_business' | 'product_store';

interface StoreRow {
  id: string;
  name?: string;
  slug?: string;
  active?: boolean;
  type?: StoreType;
}

const STORE_TYPES: Record<StoreType, string> = {
  restaurant: 'Restaurante',
  food_business: 'Emprendimiento de comida',
  product_store: 'Catálogo de productos',
};

export default function SuperAdminDashboard() {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [status, setStatus] = useState<'loading' | 'allowed' | 'denied'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.assign(withBasePath('/login'));
        return;
      }

      const profile = await getUserProfile(user);

      if (profile?.role !== ROLES.SUPERADMIN) {
        setStatus('denied');
        return;
      }

      try {
        const rows = await getLimitedStoresForAdmin();
        setStores(rows as StoreRow[]);
        setStatus('allowed');
      } catch (err) {
        console.error('Error al cargar tiendas para superadmin:', err);
        setError('No pudimos cargar el listado de tiendas.');
        setStatus('allowed');
      }
    });
  }, []);

  if (status === 'loading') {
    return <DashboardShell title="Panel superadmin" />;
  }

  if (status === 'denied') {
    return <DashboardShell title="No tienes permiso para ver este panel." />;
  }

  return (
    <DashboardShell title="Panel superadmin">
      {error && <Messaging message={error} tone="error" onClose={() => setError(null)} />}

      <div className="mt-6 flex justify-end">
        <a href={withBasePath('/admin/store/')} className="rounded-xl bg-orange-600 px-5 py-3 font-bold text-white shadow-sm transition hover:bg-orange-700">
          Crear tienda
        </a>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
        <div className="grid gap-4 bg-gray-950 px-5 py-3 text-sm font-bold text-white md:grid-cols-[1.1fr_0.9fr_0.6fr_0.8fr_auto_auto]">
          <span>Tienda</span>
          <span>Slug</span>
          <span>Estado</span>
          <span>Tipo</span>
          <span>Vista</span>
          <span>Acción</span>
        </div>
        {stores.length === 0 ? (
          <p className="px-5 py-6 text-gray-600">Todavía no hay tiendas para mostrar.</p>
        ) : (
          stores.map((store) => (
            <div key={store.id} className="grid gap-4 border-t border-gray-100 px-5 py-4 text-sm md:grid-cols-[1.1fr_0.9fr_0.6fr_0.8fr_auto_auto] md:items-center">
              <span className="font-semibold text-gray-950">{store.name || 'Sin nombre'}</span>
              <span className="text-gray-600">{store.slug || 'Sin slug'}</span>
              <span className={store.active === false ? 'font-semibold text-red-600' : 'font-semibold text-green-700'}>
                {store.active === false ? 'Inactiva' : 'Activa'}
              </span>
              <span className="text-gray-600">{store.type ? STORE_TYPES[store.type] : 'Sin tipo'}</span>
              {store.slug ? (
                <a href={withBasePath(`/t/${store.slug}`)} target="_blank" rel="noreferrer" className="rounded-xl border border-gray-300 px-4 py-2 text-center font-bold text-gray-700 transition hover:border-gray-950">
                  Ver tienda
                </a>
              ) : (
                <span className="text-gray-400">Sin slug</span>
              )}
              <a href={withBasePath(`/admin/store/?storeId=${store.id}`)} className="rounded-xl bg-gray-950 px-4 py-2 text-center font-bold text-white transition hover:bg-gray-800">
                Editar
              </a>
            </div>
          ))
        )}
      </div>
    </DashboardShell>
  );
}

function DashboardShell({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#fff8ef] text-gray-950">
      <AppHeader />
      <section className="mx-auto min-h-[calc(100vh-9rem)] max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-4xl font-black tracking-tight">{title}</h1>
        {children}
      </section>
      <AppFooter />
    </main>
  );
}
