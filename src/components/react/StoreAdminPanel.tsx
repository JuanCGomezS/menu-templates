import { onAuthStateChanged } from 'firebase/auth';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type React from 'react';
import { getUserProfile, ROLES } from '../../lib/auth';
import { auth } from '../../lib/firebase';
import { getStoreForAdminById, getStoreForAdminBySlug } from '../../lib/public-store-data';
import { getOrdersForStoreDay, updateOrderStatus, type OrderStatus, type StoreOrder } from '../../lib/orders';
import { formatPrice } from '../../lib/utils';
import { withBasePath } from '../../lib/base-path';
import AppFooter from './AppFooter';
import AppHeader from './AppHeader';

type StoreAccess = { id: string; name?: string; currency?: string; timeZone?: string };

export default function StoreAdminPanel({ slug }: { slug: string }) {
  const [status, setStatus] = useState<'loading' | 'allowed' | 'denied' | 'not-found'>('loading');
  const [store, setStore] = useState<StoreAccess | null>(null);

  useEffect(() => onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.assign(withBasePath('/login'));
      return;
    }
    const profile = await getUserProfile(user);
    if (profile?.role === ROLES.SUPERADMIN) {
      const foundStore = await getStoreForAdminBySlug(slug);
      setStore(foundStore || null);
      setStatus(foundStore ? 'allowed' : 'not-found');
      return;
    }
    if (profile?.role !== ROLES.STOREADMIN || !profile.storeId) {
      setStatus('denied');
      return;
    }
    const foundStore = await getStoreForAdminById(profile.storeId);
    const allowed = foundStore && foundStore.slug === slug;
    setStore(allowed ? foundStore : null);
    setStatus(allowed ? 'allowed' : 'denied');
  }), [slug]);

  if (status === 'loading') return <StoreAdminShell title="Cargando pedidos…" />;
  if (status === 'denied') return <StoreAdminShell title="Acceso denegado"><p className="mt-3 text-gray-600">No tienes permiso para administrar esta tienda.</p></StoreAdminShell>;
  if (status === 'not-found' || !store) return <StoreAdminShell title="Tienda no encontrada o inactiva" />;

  return <StoreAdminShell title="Pedidos de hoy"><OrdersQueue store={store} /></StoreAdminShell>;
}

function OrdersQueue({ store }: { store: StoreAccess }) {
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadingMore, setLoadingMore] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = async (nextPage = false) => {
    try {
      nextPage ? setLoadingMore(true) : setState('loading');
      const page = await getOrdersForStoreDay(store.id, store.timeZone || 'America/Bogota', nextPage ? cursor : null);
      setOrders((current) => nextPage ? [...current, ...page.orders] : page.orders);
      setCursor(page.cursor);
      setState('ready');
    } catch (error) {
      console.error('No se pudieron cargar los pedidos del día:', error);
      setState('error');
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => { void load(); }, [store.id, store.timeZone]);

  const changeStatus = async (order: StoreOrder, nextStatus: OrderStatus) => {
    try {
      setUpdatingId(order.id);
      await updateOrderStatus(store.id, order.id, nextStatus);
      setOrders((current) => current.map((item) => item.id === order.id ? { ...item, status: nextStatus } : item));
    } catch (error) {
      console.error('No se pudo actualizar el pedido:', error);
      setState('error');
    } finally {
      setUpdatingId(null);
    }
  };

  if (state === 'loading') return <p className="mt-6 text-sm text-gray-500">Cargando la cola operativa…</p>;
  if (state === 'error') return <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">No fue posible cargar o actualizar los pedidos. <button type="button" onClick={() => void load()} className="font-bold underline">Reintentar</button></div>;

  return <section className="mt-6 text-left" aria-label="Cola de pedidos del día">
    <p className="mb-4 text-sm text-gray-500">{store.name || 'Tienda'} · zona horaria: {store.timeZone || 'America/Bogota'}</p>
    {orders.length === 0 ? <p className="rounded-xl bg-gray-100 p-5 text-sm text-gray-600">No hay pedidos para hoy.</p> : <div className="space-y-3">{orders.map((order) => <OrderCard key={order.id} order={order} currency={store.currency} busy={updatingId === order.id} onStatusChange={changeStatus} />)}</div>}
    {cursor && orders.length % 25 === 0 && <button type="button" disabled={loadingMore} onClick={() => void load(true)} className="mt-5 rounded-xl border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 disabled:opacity-50">{loadingMore ? 'Cargando…' : 'Cargar más pedidos'}</button>}
  </section>;
}

function OrderCard({ order, currency, busy, onStatusChange }: { order: StoreOrder; currency?: string; busy: boolean; onStatusChange: (order: StoreOrder, status: OrderStatus) => Promise<void> }) {
  const actions: Partial<Record<OrderStatus, [string, OrderStatus]>> = {
    pending: ['Aceptar', 'accepted'], accepted: ['Preparar', 'preparing'], preparing: ['Marcar listo', 'ready'], ready: ['Entregar', 'delivered'],
  };
  const action = order.status && actions[order.status];
  const modality = order.type === 'delivery' ? 'Domicilio' : `Mesa ${order.tableNumber ?? '—'}`;
  return <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3"><div><p className="font-bold text-gray-950">{order.customerName || 'Pedido histórico'}</p><p className="mt-1 text-sm text-gray-600">{modality} · {formatPrice(order.total || 0, currency || 'COP')}</p></div><span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold capitalize text-orange-800">{order.status || 'sin estado'}</span></div>
    <div className="mt-3 flex flex-wrap gap-2">{action && <button type="button" disabled={busy} onClick={() => void onStatusChange(order, action[1])} className="rounded-lg bg-gray-950 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{action[0]}</button>}{order.status !== 'cancelled' && order.status !== 'delivered' && <button type="button" disabled={busy} onClick={() => void onStatusChange(order, 'cancelled')} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-700 disabled:opacity-50">Cancelar</button>}</div>
  </article>;
}

function StoreAdminShell({ title, children }: { title: string; children?: React.ReactNode }) {
  return <main className="min-h-screen bg-gray-50 text-gray-950"><AppHeader /><section className="mx-auto min-h-[calc(100vh-9rem)] max-w-3xl px-4 py-10"><div className="w-full rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-xl"><p className="text-sm font-semibold uppercase tracking-[0.3em] text-orange-600">Operación de tienda</p><h1 className="mt-3 text-2xl font-bold text-gray-950">{title}</h1>{children}</div></section><AppFooter /></main>;
}
