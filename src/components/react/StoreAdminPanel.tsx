import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import type React from 'react';
import { getUserProfile, ROLES } from '../../lib/auth';
import { auth } from '../../lib/firebase';
import { getStoreForAdminById, getStoreForAdminBySlug } from '../../lib/public-store-data';
import { getActiveOrdersForStore, type StoreOrder } from '../../lib/orders';
import { withBasePath } from '../../lib/base-path';
import AppFooter from './AppFooter';
import AppHeader from './AppHeader';

export default function StoreAdminPanel({ slug }: { slug: string }) {
  const [status, setStatus] = useState<'loading' | 'allowed' | 'denied' | 'not-found'>('loading');
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.assign(withBasePath('/login'));
        return;
      }

      const profile = await getUserProfile(user);

      if (profile?.role === ROLES.SUPERADMIN) {
        const store = await getStoreForAdminBySlug(slug);
        setStoreId(store?.id || null);
        setStatus(store ? 'allowed' : 'not-found');
        return;
      }

      if (profile?.role !== ROLES.STOREADMIN) {
        setStatus('denied');
        return;
      }

      if (!profile.storeId) {
        setStatus('denied');
        return;
      }

      const store = await getStoreForAdminById(profile.storeId);

      if (!store) {
        setStatus('not-found');
        return;
      }

      const isMatchingStoreAdmin = profile.storeId === store.id && store.slug === slug;

      setStoreId(isMatchingStoreAdmin ? store.id : null);
      setStatus(isMatchingStoreAdmin ? 'allowed' : 'denied');
    });
  }, [slug]);

  if (status === 'loading') {
    return <StoreAdminShell title="Panel de tienda" />;
  }

  if (status === 'denied') {
    return <StoreAdminShell title="Acceso denegado">
      <p className="mt-3 text-gray-600">No tienes permiso para administrar esta tienda.</p>
    </StoreAdminShell>;
  }

  if (status === 'not-found') {
    return <StoreAdminShell title="Tienda no encontrada o inactiva" />;
  }

  return (
    <StoreAdminShell title="Panel de tienda">
      <p className="mt-3 text-gray-600">Tienda <strong>{slug}</strong>.</p>
      {storeId && <OrdersFeedback storeId={storeId} />}
    </StoreAdminShell>
  );
}

function OrdersFeedback({ storeId }: { storeId: string }) {
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    getActiveOrdersForStore(storeId)
      .then((loadedOrders) => {
        setOrders(loadedOrders);
        setState('ready');
      })
      .catch((error) => {
        console.error('No se pudieron cargar los pedidos activos:', error);
        setState('error');
      });
  }, [storeId]);

  if (state === 'loading') return <p className="mt-6 text-sm text-gray-500">Cargando pedidos activos…</p>;
  if (state === 'error') return <p className="mt-6 text-sm text-red-600">No fue posible cargar los pedidos activos.</p>;

  return <p className="mt-6 rounded-xl bg-orange-50 p-4 text-sm font-semibold text-orange-900">Pedidos activos recientes: {orders.length}</p>;
}

function StoreAdminShell({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-950">
      <AppHeader />
      <section className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-lg items-center px-4 py-10">
        <div className="w-full rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-600">Admin de tienda</p>
          <h1 className="mt-3 text-2xl font-bold text-gray-950">{title}</h1>
          {children}
        </div>
      </section>
      <AppFooter />
    </main>
  );
}
