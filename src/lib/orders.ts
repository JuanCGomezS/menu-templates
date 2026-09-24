import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from './firebase';

export const ACTIVE_ORDER_STATUSES = ['pending', 'accepted', 'preparing', 'ready'] as const;
export type ActiveOrderStatus = (typeof ACTIVE_ORDER_STATUSES)[number];
export const ADMIN_ORDER_LIMIT = 50;

export interface StoreOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  type: 'in_store' | 'delivery';
  status: ActiveOrderStatus | 'delivered' | 'cancelled';
  total: number;
  createdAt?: { toDate?: () => Date };
}

/**
 * Carga únicamente pedidos operativos recientes de una tienda.
 * La subcolección fija el tenant; estado, rango temporal y límite evitan
 * consultas abiertas sobre el historial completo.
 */
export async function getActiveOrdersForStore(
  storeId: string,
  since: Date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  maxOrders = ADMIN_ORDER_LIMIT,
): Promise<StoreOrder[]> {
  const safeLimit = Math.min(Math.max(1, maxOrders), ADMIN_ORDER_LIMIT);
  const ordersQuery = query(
    collection(db, 'stores', storeId, 'orders'),
    where('status', 'in', ACTIVE_ORDER_STATUSES),
    where('createdAt', '>=', since),
    orderBy('createdAt', 'desc'),
    limit(safeLimit),
  );

  const snapshot = await getDocs(ordersQuery);
  return snapshot.docs.map((orderDoc) => ({ id: orderDoc.id, ...orderDoc.data() } as StoreOrder));
}
