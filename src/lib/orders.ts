import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import { db } from './firebase';

export const ORDER_MODES = ['in_store', 'delivery'] as const;
export type OrderMode = (typeof ORDER_MODES)[number];
export const ACTIVE_ORDER_STATUSES = ['pending', 'accepted', 'preparing', 'ready'] as const;
export type ActiveOrderStatus = (typeof ACTIVE_ORDER_STATUSES)[number];
export const ADMIN_ORDER_LIMIT = 50;

export interface OrderItemInput {
  itemId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface PublicOrderInput {
  customerName: string;
  type: OrderMode;
  items: OrderItemInput[];
  total: number;
  notes?: string;
  tableNumber?: number;
  customerPhone?: string;
  deliveryAddress?: string;
}

export interface OrderCapabilities {
  inStoreOrdering?: boolean;
  deliveryOrdering?: boolean;
}

export type PublicOrderValidation =
  | { valid: true; value: PublicOrderInput }
  | { valid: false; message: string };

/** Validates the public contract before a Firestore write. */
export function validatePublicOrder(
  input: PublicOrderInput,
  capabilities: OrderCapabilities,
): PublicOrderValidation {
  const customerName = input.customerName?.trim();
  const notes = input.notes?.trim();

  if (!customerName || customerName.length < 2 || customerName.length > 80) {
    return { valid: false, message: 'Ingresa un nombre entre 2 y 80 caracteres.' };
  }
  if (!ORDER_MODES.includes(input.type)) {
    return { valid: false, message: 'La modalidad del pedido no es válida.' };
  }
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 40) {
    return { valid: false, message: 'El pedido debe incluir entre 1 y 40 productos.' };
  }
  if (!Number.isFinite(input.total) || input.total < 0) {
    return { valid: false, message: 'El total del pedido no es válido.' };
  }
  if (input.items.some((item) => !item.itemId || !item.name?.trim() || !Number.isInteger(item.quantity) || item.quantity < 1 || !Number.isFinite(item.price) || item.price < 0)) {
    return { valid: false, message: 'Uno o más productos del pedido no son válidos.' };
  }

  if (input.type === 'in_store') {
    if (input.customerPhone?.trim() || input.deliveryAddress?.trim()) {
      return { valid: false, message: 'Un pedido en mesa no requiere teléfono ni dirección.' };
    }
    if (!capabilities.inStoreOrdering) return { valid: false, message: 'Los pedidos en mesa no están disponibles.' };
    if (!Number.isInteger(input.tableNumber) || input.tableNumber < 1 || input.tableNumber > 999) {
      return { valid: false, message: 'Ingresa un número de mesa entre 1 y 999.' };
    }

    return {
      valid: true,
      value: { customerName, type: input.type, items: input.items, total: input.total, tableNumber: input.tableNumber, ...(notes ? { notes } : {}) },
    };
  }

  if (input.tableNumber !== undefined) {
    return { valid: false, message: 'Un domicilio no requiere número de mesa.' };
  }
  if (!capabilities.deliveryOrdering) return { valid: false, message: 'Los pedidos a domicilio no están disponibles.' };
  const customerPhone = input.customerPhone?.trim();
  const deliveryAddress = input.deliveryAddress?.trim();
  if (!customerPhone || customerPhone.length < 7 || customerPhone.length > 30) {
    return { valid: false, message: 'Ingresa un teléfono entre 7 y 30 caracteres.' };
  }
  if (!deliveryAddress || deliveryAddress.length < 5 || deliveryAddress.length > 200) {
    return { valid: false, message: 'Ingresa una dirección entre 5 y 200 caracteres.' };
  }

  return {
    valid: true,
    value: { customerName, type: input.type, items: input.items, total: input.total, customerPhone, deliveryAddress, ...(notes ? { notes } : {}) },
  };
}

/** Writes only an already validated, normalized public order. */
export async function createPublicOrder(storeId: string, order: PublicOrderInput) {
  return addDoc(collection(db, 'stores', storeId, 'orders'), {
    ...order,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export interface StoreOrder {
  id: string;
  customerName?: string;
  customerPhone?: string;
  type?: OrderMode;
  tableNumber?: number;
  deliveryAddress?: string;
  status?: ActiveOrderStatus | 'delivered' | 'cancelled';
  total?: number;
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
  // Historic documents can lack newer modality fields; keep them readable.
  return snapshot.docs.map((orderDoc) => ({ id: orderDoc.id, ...orderDoc.data() } as StoreOrder));
}
