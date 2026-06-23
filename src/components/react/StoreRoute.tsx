import RestaurantMenuView from './RestaurantMenuView';
import { stripBasePath, withBasePath } from '../../lib/base-path';
import { lazy, Suspense } from 'react';

const StoreAdminPanel = lazy(() => import('./StoreAdminPanel'));

function getStoreRouteFromPath(pathname: string) {
  const normalizedPath = stripBasePath(pathname);
  // GitHub Pages sirve enlaces /t/{slug} desde 404.html; esta island resuelve la ruta en cliente.
  const storeMatch = normalizedPath.match(/^\/t\/([^/]+)(?:\/(admin))?\/?$/);
  const legacyMenuMatch = normalizedPath.match(/^\/m\/([^/]+)\/?$/);

  if (legacyMenuMatch) {
    const slug = legacyMenuMatch[1];
    window.location.replace(withBasePath(`/t/${slug}`));
    return { slug, isAdmin: false };
  }

  return { slug: storeMatch?.[1] || '', isAdmin: storeMatch?.[2] === 'admin' };
}

export default function StoreRoute() {
  const route = typeof window === 'undefined'
    ? { slug: '', isAdmin: false }
    : getStoreRouteFromPath(window.location.pathname);

  if (!route.slug) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-xl border border-gray-200">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-600">No encontrada</p>
          <h1 className="mt-3 text-2xl font-bold text-gray-950">Ruta de tienda no disponible</h1>
          <p className="mt-3 text-gray-600">Usa una URL pública como /t/slug-tienda.</p>
          <a className="mt-6 inline-flex rounded-full bg-gray-950 px-5 py-3 font-semibold text-white hover:bg-gray-800" href={withBasePath('/')}>
            Volver al inicio
          </a>
        </div>
      </main>
    );
  }

  if (route.isAdmin) {
    return (
      <Suspense fallback={<main className="min-h-screen bg-gray-50" />}>
        <StoreAdminPanel slug={decodeURIComponent(route.slug)} />
      </Suspense>
    );
  }

  return <RestaurantMenuView slug={decodeURIComponent(route.slug)} />;
}
