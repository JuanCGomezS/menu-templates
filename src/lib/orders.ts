import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  Timestamp,
  where,
  writeBatch,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";

export const ORDER_MODES = ["in_store", "delivery"] as const;
export type OrderMode = (typeof ORDER_MODES)[number];
export const ACTIVE_ORDER_STATUSES = [
  "pending",
  "accepted",
  "preparing",
  "ready",
] as const;
export type ActiveOrderStatus = (typeof ACTIVE_ORDER_STATUSES)[number];
export const ORDER_STATUSES = [
  ...ACTIVE_ORDER_STATUSES,
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const ADMIN_ORDER_LIMIT = 25;

export interface OrderItemInput {
  itemId: string;
  name: string;
  quantity: number;
  price: number;
}
export interface DeliveryLocation {
  latitude: number;
  longitude: number;
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
  deliveryLocation?: DeliveryLocation;
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
  const deliveryLocation = input.deliveryLocation;
  const hasValidDeliveryLocation =
    deliveryLocation !== undefined &&
    Number.isFinite(deliveryLocation.latitude) &&
    Number.isFinite(deliveryLocation.longitude) &&
    deliveryLocation.latitude >= -90 &&
    deliveryLocation.latitude <= 90 &&
    deliveryLocation.longitude >= -180 &&
    deliveryLocation.longitude <= 180;
  const notes = input.notes?.trim();
  if (!customerName || customerName.length < 2 || customerName.length > 80)
    return {
      valid: false,
      message: "Ingresa un nombre entre 2 y 80 caracteres.",
    };
  if (!ORDER_MODES.includes(input.type))
    return { valid: false, message: "La modalidad del pedido no es válida." };
  if (
    !Array.isArray(input.items) ||
    input.items.length < 1 ||
    input.items.length > 40
  )
    return {
      valid: false,
      message: "El pedido debe incluir entre 1 y 40 productos.",
    };
  if (!Number.isFinite(input.total) || input.total < 0)
    return { valid: false, message: "El total del pedido no es válido." };
  if (
    input.items.some(
      (item) =>
        !item.itemId ||
        !item.name?.trim() ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        !Number.isFinite(item.price) ||
        item.price < 0,
    )
  )
    return {
      valid: false,
      message: "Uno o más productos del pedido no son válidos.",
    };

  if (input.type === "in_store") {
    const tableNumber = input.tableNumber;
    if (
      input.customerPhone?.trim() ||
      input.deliveryAddress?.trim() ||
      input.deliveryLocation
    )
      return {
        valid: false,
        message: "Un pedido en mesa no requiere datos de domicilio.",
      };
    if (!capabilities.inStoreOrdering)
      return {
        valid: false,
        message: "Los pedidos en mesa no están disponibles.",
      };
    if (
      !Number.isInteger(tableNumber) ||
      tableNumber === undefined ||
      tableNumber < 1 ||
      tableNumber > 999
    )
      return {
        valid: false,
        message: "Ingresa un número de mesa entre 1 y 999.",
      };
    return {
      valid: true,
      value: {
        customerName,
        type: input.type,
        items: input.items,
        total: input.total,
        tableNumber,
        ...(notes ? { notes } : {}),
      },
    };
  }

  if (input.tableNumber !== undefined)
    return {
      valid: false,
      message: "Un domicilio no requiere número de mesa.",
    };
  if (!capabilities.deliveryOrdering)
    return {
      valid: false,
      message: "Los pedidos a domicilio no están disponibles.",
    };
  const customerPhone = input.customerPhone?.trim();
  const deliveryAddress = input.deliveryAddress?.trim();
  if (!customerPhone || customerPhone.length < 7 || customerPhone.length > 30)
    return {
      valid: false,
      message: "Ingresa un teléfono entre 7 y 30 caracteres.",
    };
  if (
    !deliveryAddress ||
    deliveryAddress.length < 5 ||
    deliveryAddress.length > 200
  )
    return {
      valid: false,
      message: "Ingresa una dirección entre 5 y 200 caracteres.",
    };
  if (!hasValidDeliveryLocation || !deliveryLocation)
    return {
      valid: false,
      message: "Confirma el punto exacto de entrega en el mapa.",
    };
  return {
    valid: true,
    value: {
      customerName,
      type: input.type,
      items: input.items,
      total: input.total,
      customerPhone,
      deliveryAddress,
      deliveryLocation,
      ...(notes ? { notes } : {}),
    },
  };
}

/** Writes only an already validated, normalized public order. */
export async function createPublicOrder(
  storeId: string,
  order: PublicOrderInput,
  trackingCode: string,
) {
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(trackingCode))
    throw new Error("El código de seguimiento no es válido.");
  const batch = writeBatch(db);
  batch.set(doc(db, "stores", storeId, "orders", trackingCode), {
    ...order,
    clientRequestId: trackingCode,
    trackingCode,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, "stores", storeId, "orderTracking", trackingCode), {
    type: order.type,
    status: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
  return trackingCode;
}

export interface StoreOrder {
  id: string;
  customerName?: string;
  customerPhone?: string;
  type?: OrderMode;
  tableNumber?: number;
  deliveryAddress?: string;
  deliveryLocation?: DeliveryLocation;
  status?: OrderStatus;
  trackingCode?: string;
  total?: number;
  items?: Array<{
    itemId?: string;
    name?: string;
    quantity?: number;
    price?: number;
  }>;
  createdAt?: Timestamp;
}

export interface OrdersPage {
  orders: StoreOrder[];
  cursor: QueryDocumentSnapshot | null;
}
export interface PublicOrderTracking {
  type: OrderMode;
  status: OrderStatus;
  updatedAt?: Timestamp;
}
export interface DayRange {
  start: Date;
  end: Date;
}
export interface HistoricalOrdersPage extends OrdersPage {
  range: DayRange;
}

function localDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
}

function zonedMidnightToUtc(
  parts: { year: number; month: number; day: number },
  timeZone: string,
) {
  const candidate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const formatted = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(candidate);
  const value = (type: string) =>
    Number(formatted.find((part) => part.type === type)?.value);
  const localAsUtc = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
    value("second"),
  );
  return new Date(candidate.getTime() - (localAsUtc - candidate.getTime()));
}

/** Returns the exact calendar-day range in the store's IANA time zone. */
export function getStoreDayRange(
  timeZone = "America/Bogota",
  now = new Date(),
): DayRange {
  try {
    const today = localDateParts(now, timeZone);
    const tomorrow = new Date(
      Date.UTC(today.year, today.month - 1, today.day + 1),
    );
    return {
      start: zonedMidnightToUtc(today, timeZone),
      end: zonedMidnightToUtc(
        {
          year: tomorrow.getUTCFullYear(),
          month: tomorrow.getUTCMonth() + 1,
          day: tomorrow.getUTCDate(),
        },
        timeZone,
      ),
    };
  } catch {
    return getStoreDayRange("America/Bogota", now);
  }
}

function dateStringToParts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("La fecha debe tener formato AAAA-MM-DD.");
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    throw new Error("La fecha no es válida.");
  return { year, month, day };
}

/** Returns an inclusive, bounded calendar range in the store's time zone. */
export function getStoreDateRange(
  startDate: string,
  endDate: string,
  timeZone = "America/Bogota",
): DayRange {
  const start = dateStringToParts(startDate);
  const end = dateStringToParts(endDate);
  const endUtcDate = new Date(Date.UTC(end.year, end.month - 1, end.day + 1));
  const endNext = {
    year: endUtcDate.getUTCFullYear(),
    month: endUtcDate.getUTCMonth() + 1,
    day: endUtcDate.getUTCDate(),
  };
  const range = {
    start: zonedMidnightToUtc(start, timeZone),
    end: zonedMidnightToUtc(endNext, timeZone),
  };
  if (
    range.end <= range.start ||
    range.end.getTime() - range.start.getTime() >
      31 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000
  )
    throw new Error("Selecciona un rango entre 1 y 31 días.");
  return range;
}

export async function getHistoricalOrdersForStore(
  storeId: string,
  startDate: string,
  endDate: string,
  timeZone: string,
  cursor?: QueryDocumentSnapshot | null,
): Promise<HistoricalOrdersPage> {
  const range = getStoreDateRange(startDate, endDate, timeZone);
  const snapshot = await getDocs(
    query(
      collection(db, "stores", storeId, "orders"),
      where("createdAt", ">=", Timestamp.fromDate(range.start)),
      where("createdAt", "<", Timestamp.fromDate(range.end)),
      orderBy("createdAt", "desc"),
      ...(cursor ? [startAfter(cursor)] : []),
      limit(ADMIN_ORDER_LIMIT),
    ),
  );
  return {
    orders: snapshot.docs.map(
      (orderDoc) => ({ id: orderDoc.id, ...orderDoc.data() }) as StoreOrder,
    ),
    cursor: snapshot.docs.at(-1) || null,
    range,
  };
}

/** Fetches one bounded, paginable queue page for the store's current local day. */
export async function getOrdersForStoreDay(
  storeId: string,
  timeZone: string,
  cursor?: QueryDocumentSnapshot | null,
): Promise<OrdersPage> {
  const range = getStoreDayRange(timeZone);
  const constraints = [
    where("createdAt", ">=", Timestamp.fromDate(range.start)),
    where("createdAt", "<", Timestamp.fromDate(range.end)),
    orderBy("createdAt", "desc"),
    ...(cursor ? [startAfter(cursor)] : []),
    limit(ADMIN_ORDER_LIMIT),
  ];
  const snapshot = await getDocs(
    query(collection(db, "stores", storeId, "orders"), ...constraints),
  );
  return {
    orders: snapshot.docs.map(
      (orderDoc) => ({ id: orderDoc.id, ...orderDoc.data() }) as StoreOrder,
    ),
    cursor: snapshot.docs.at(-1) || null,
  };
}

const STATUS_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  pending: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled", "out_for_delivery"],
  out_for_delivery: ["delivered"],
};

/**
 * Applies an operational status change atomically. Stock is deducted only on
 * acceptance and restored only when an accepted/prepared/ready order is cancelled.
 */
export async function transitionOrderStatus(
  storeId: string,
  orderId: string,
  nextStatus: OrderStatus,
) {
  await runTransaction(db, async (transaction) => {
    const orderRef = doc(db, "stores", storeId, "orders", orderId);
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists()) throw new Error("El pedido ya no existe.");
    const order = orderSnapshot.data() as StoreOrder;
    if (
      !order.status ||
      !STATUS_TRANSITIONS[order.status]?.includes(nextStatus) ||
      (nextStatus === "out_for_delivery" && order.type !== "delivery")
    )
      throw new Error("La transición de estado no está permitida.");
    const orderItems = order.items || [];
    const itemSnapshots = await Promise.all(
      orderItems.map((item) =>
        transaction.get(doc(db, "stores", storeId, "items", item.itemId || "")),
      ),
    );
    const trackingRef = order.trackingCode
      ? doc(db, "stores", storeId, "orderTracking", order.trackingCode)
      : null;
    const trackingSnapshot = trackingRef ? await transaction.get(trackingRef) : null;
    if (trackingRef && !trackingSnapshot?.exists())
      throw new Error("El seguimiento del pedido ya no existe.");

    for (let index = 0; index < itemSnapshots.length; index += 1) {
      const item = itemSnapshots[index].data();
      const orderItem = orderItems[index];
      const quantity = orderItem?.quantity;
      if (
        !item ||
        !orderItem ||
        typeof quantity !== "number" ||
        !Number.isInteger(quantity) ||
        quantity < 1
      )
        throw new Error("El pedido contiene un producto inválido.");
      if (nextStatus === "accepted") {
        const availableForMode =
          order.type === "delivery"
            ? item.availableForDelivery !== false
            : item.availableInStore !== false;
        if (item.active === false || !availableForMode)
          throw new Error(
            `El producto ${item.name || orderItem.name || ""} ya no está disponible.`,
          );
        if (
          item.trackStock === true &&
          (!Number.isInteger(item.stock) || item.stock < quantity)
        )
          throw new Error(
            `No hay stock suficiente para ${item.name || orderItem.name || ""}.`,
          );
      }
    }

    const restoresStock =
      nextStatus === "cancelled" &&
      ["accepted", "preparing", "ready"].includes(order.status);
    if (nextStatus === "accepted" || restoresStock) {
      itemSnapshots.forEach((snapshot, index) => {
        const item = snapshot.data();
        const quantity = orderItems[index]?.quantity;
        if (
          item?.trackStock === true &&
          typeof quantity === "number" &&
          Number.isInteger(quantity)
        )
          transaction.update(snapshot.ref, {
            stock: item.stock + (restoresStock ? quantity : -quantity),
            updatedAt: serverTimestamp(),
          });
      });
    }
    transaction.update(orderRef, {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    });
    if (trackingRef)
      transaction.update(trackingRef, {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
  });
}

export async function getPublicOrderTracking(
  storeId: string,
  trackingCode: string,
): Promise<PublicOrderTracking | null> {
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(trackingCode)) return null;
  const snapshot = await getDoc(
    doc(db, "stores", storeId, "orderTracking", trackingCode),
  );
  return snapshot.exists() ? (snapshot.data() as PublicOrderTracking) : null;
}

/** Legacy bounded active-orders query retained for existing integrations. */
export async function getActiveOrdersForStore(
  storeId: string,
  since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  maxOrders = ADMIN_ORDER_LIMIT,
): Promise<StoreOrder[]> {
  const safeLimit = Math.min(Math.max(1, maxOrders), ADMIN_ORDER_LIMIT);
  const snapshot = await getDocs(
    query(
      collection(db, "stores", storeId, "orders"),
      where("status", "in", ACTIVE_ORDER_STATUSES),
      where("createdAt", ">=", since),
      orderBy("createdAt", "desc"),
      limit(safeLimit),
    ),
  );
  return snapshot.docs.map(
    (orderDoc) => ({ id: orderDoc.id, ...orderDoc.data() }) as StoreOrder,
  );
}
