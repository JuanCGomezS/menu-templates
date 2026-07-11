import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import type React from 'react';
import { getUserProfile, ROLES } from '../../lib/auth';
import { auth } from '../../lib/firebase';
import { getStoreForAdminById, getStoreForAdminBySlug } from '../../lib/public-store-data';
import { withBasePath } from '../../lib/base-path';
import AppFooter from './AppFooter';
import AppHeader from './AppHeader';

export default function StoreAdminPanel({ slug }: { slug: string }) {
  const [status, setStatus] = useState<'loading' | 'allowed' | 'denied' | 'not-found'>('loading');

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.assign(withBasePath('/login'));
        return;
      }

      const profile = await getUserProfile(user);

      if (profile?.role === ROLES.SUPERADMIN) {
        const store = await getStoreForAdminBySlug(slug);

        if (!store) {
          setStatus('not-found');
          return;
        }

        window.location.assign(withBasePath(`/admin/store/?storeId=${store.id}`));
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

      if (!isMatchingStoreAdmin) {
        setStatus('denied');
        return;
      }

      window.location.assign(withBasePath(`/admin/store/?storeId=${store.id}`));
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
    <StoreAdminShell title="Panel de tienda en preparación">
      <p className="mt-3 text-gray-600">Redirigiendo al editor protegido de la tienda <strong>{slug}</strong>…</p>
    </StoreAdminShell>
  );
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
