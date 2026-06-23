import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type React from 'react';
import { auth, db } from '../../lib/firebase';
import { getUserProfile, ROLES } from '../../lib/auth';
import { ADMIN_STORE_LIST_LIMIT, getLimitedStoresForAdmin } from '../../lib/public-store-data';
import { withBasePath } from '../../lib/base-path';
import AppHeader from './AppHeader';
import AppFooter from './AppFooter';
import Messaging, { type MessageTone } from './Messaging';

interface StoreRow {
  id: string;
  name?: string;
  slug?: string;
  active?: boolean;
  type?: string;
  ownerUid?: string;
}

export default function SuperAdminDashboard() {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [status, setStatus] = useState<'loading' | 'allowed' | 'denied'>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<MessageTone>('info');
  const [error, setError] = useState<string | null>(null);
  const [storeAdminEmails, setStoreAdminEmails] = useState<Record<string, string>>({});
  const [assigningStoreId, setAssigningStoreId] = useState<string | null>(null);

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

  const assignStoreAdmin = async (store: StoreRow) => {
    const email = storeAdminEmails[store.id]?.trim().toLowerCase();
    setError(null);
    setMessage(null);

    if (!email) {
      setError('Escribe el correo del usuario que quieres asignar como administrador de tienda.');
      return;
    }

    if (!store.slug) {
      setError('La tienda no tiene slug; aún no se puede asignar administrador.');
      return;
    }

    setAssigningStoreId(store.id);

    try {
      const usersQuery = query(collection(db, 'users'), where('email', '==', email));
      const snapshot = await getDocs(usersQuery);

      if (snapshot.empty) {
        setError('Ese usuario debe registrarse primero desde /login para quedar como customer.');
        return;
      }

      const userDoc = snapshot.docs[0];

      await updateDoc(doc(db, 'users', userDoc.id), {
        role: ROLES.STOREADMIN,
        storeId: store.id,
        storeSlug: store.slug,
        updatedAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'stores', store.id), {
        ownerUid: userDoc.id,
        updatedAt: serverTimestamp(),
      });

      setStoreAdminEmails((current) => ({ ...current, [store.id]: '' }));
      setMessageTone('done');
      setMessage(`Usuario ${email} asignado como storeadmin de ${store.name || store.slug}.`);
    } catch (err) {
      console.error('Error al asignar storeadmin:', err);
      setError('No pudimos asignar el administrador. Revisa permisos e intenta de nuevo.');
    } finally {
      setAssigningStoreId(null);
    }
  };

  return (
    <DashboardShell title="Panel superadmin">
      <Messaging message={message} tone={messageTone} onClose={() => setMessage(null)} />
      {error && <Messaging message={error} tone="error" onClose={() => setError(null)} />}

      <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
        <div className="grid gap-4 bg-gray-950 px-5 py-3 text-sm font-bold text-white md:grid-cols-[1.1fr_0.9fr_0.6fr_1.4fr]">
          <span>Tienda</span>
          <span>Slug</span>
          <span>Estado</span>
          <span>Asignar storeadmin</span>
        </div>
        {stores.length === 0 ? (
          <p className="px-5 py-6 text-gray-600">Todavía no hay tiendas para mostrar.</p>
        ) : (
          stores.map((store) => (
            <div key={store.id} className="grid gap-4 border-t border-gray-100 px-5 py-4 text-sm md:grid-cols-[1.1fr_0.9fr_0.6fr_1.4fr] md:items-center">
              <span className="font-semibold text-gray-950">{store.name || 'Sin nombre'}</span>
              <span className="text-gray-600">{store.slug || 'Sin slug'}</span>
              <span className={store.active === false ? 'font-semibold text-red-600' : 'font-semibold text-green-700'}>
                {store.active === false ? 'Inactiva' : 'Activa'}
              </span>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  value={storeAdminEmails[store.id] || ''}
                  onChange={(event) => setStoreAdminEmails((current) => ({
                    ...current,
                    [store.id]: event.target.value,
                  }))}
                  placeholder="correo@ejemplo.com"
                  className="min-w-0 flex-1 rounded-xl border border-gray-300 px-3 py-2 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
                <button
                  type="button"
                  onClick={() => assignStoreAdmin(store)}
                  disabled={assigningStoreId === store.id}
                  className="rounded-xl bg-orange-600 px-4 py-2 font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {assigningStoreId === store.id ? 'Asignando...' : 'Asignar'}
                </button>
              </div>
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
      <section className="mx-auto min-h-[calc(100vh-9rem)] max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-4xl font-black tracking-tight">{title}</h1>
        {children}
      </section>
      <AppFooter />
    </main>
  );
}
