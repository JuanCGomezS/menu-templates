import type { QueryDocumentSnapshot } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { auth } from "../../lib/firebase";
import {
  getHistoricalOrdersForStore,
  getOrdersForStoreDay,
  subscribeToActiveOrdersForStoreDay,
  transitionOrderStatus,
  type OrderStatus,
  type StoreOrder,
} from "../../lib/orders";
import { formatPrice } from "../../lib/utils";
import { registerOrderPush } from "../../lib/order-notifications";
import { withBasePath } from "../../lib/base-path";

type StoreAccess = {
  id: string;
  name?: string;
  slug?: string;
  currency?: string;
  timeZone?: string;
};

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendiente",
  accepted: "Confirmado",
  preparing: "En preparación",
  ready: "Listo",
  out_for_delivery: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const ORDER_STATUS_STYLES: Record<
  OrderStatus,
  { line: string; badge: string; dot: string; icon?: string }
> = {
  pending: {
    line: "border-t-amber-400",
    badge: "bg-amber-50 text-amber-950",
    dot: "bg-amber-400",
    icon: "/orders/accept.svg",
  },
  accepted: {
    line: "border-t-blue-500",
    badge: "bg-blue-50 text-blue-950",
    dot: "bg-blue-500",
    icon: "/orders/accept.svg",
  },
  preparing: {
    line: "border-t-violet-500",
    badge: "bg-violet-50 text-violet-950",
    dot: "bg-violet-500",
    icon: "/orders/cooking.svg",
  },
  ready: {
    line: "border-t-teal-500",
    badge: "bg-teal-50 text-teal-950",
    dot: "bg-teal-500",
    icon: "/orders/ready.svg",
  },
  out_for_delivery: {
    line: "border-t-sky-500",
    badge: "bg-sky-50 text-sky-950",
    dot: "bg-sky-500",
    icon: "/orders/delivery.svg",
  },
  delivered: {
    line: "border-t-emerald-500",
    badge: "bg-emerald-50 text-emerald-950",
    dot: "bg-emerald-500",
    icon: "/orders/delivered.svg",
  },
  cancelled: {
    line: "border-t-rose-500",
    badge: "bg-rose-50 text-rose-950",
    dot: "bg-rose-500",
  },
};

const ORDER_STATUS_FLOW: OrderStatus[] = [
  "pending",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
];

function formatOrderStatus(status?: string) {
  return (status && ORDER_STATUS_LABELS[status as OrderStatus]) || "Sin estado";
}

function getOrderStatusStyle(status?: string) {
  return status ? ORDER_STATUS_STYLES[status as OrderStatus] : undefined;
}

function mergeOrders(current: StoreOrder[], incoming: StoreOrder[]) {
  const currentById = new Map(current.map((order) => [order.id, order]));
  const incomingIds = new Set(incoming.map((order) => order.id));
  return [
    ...incoming.map((order) => {
      const existing = currentById.get(order.id);
      const existingUpdatedAt = existing?.updatedAt?.toMillis() || 0;
      const incomingUpdatedAt = order.updatedAt?.toMillis() || 0;
      return existing && existingUpdatedAt > incomingUpdatedAt
        ? existing
        : order;
    }),
    ...current.filter((order) => !incomingIds.has(order.id)),
  ];
}

export default function StoreOperationsPanel({
  store,
  view,
}: {
  store: StoreAccess;
  view: "orders" | "history";
}) {
  return view === "orders" ? (
    <OrdersQueue store={store} />
  ) : (
    <HistoricalStats store={store} />
  );
}

function formatOrderTime(createdAt: StoreOrder["createdAt"], timeZone: string) {
  if (!createdAt) return null;
  return new Intl.DateTimeFormat("es-CO", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(createdAt.toDate());
}

function dateForTimeZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function HistoricalStats({ store }: { store: StoreAccess }) {
  const timeZone = store.timeZone || "America/Bogota";
  const today = dateForTimeZone(timeZone);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [error, setError] = useState("");

  const load = async (nextPage = false) => {
    try {
      setState("loading");
      setError("");
      const page = await getHistoricalOrdersForStore(
        store.id,
        startDate,
        endDate,
        timeZone,
        nextPage ? cursor : null,
      );
      setOrders((current) =>
        nextPage ? [...current, ...page.orders] : page.orders,
      );
      setCursor(page.cursor);
      setState("ready");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudieron consultar las estadísticas.",
      );
      setState("error");
    }
  };

  const sales = orders
    .filter((order) => order.status !== "cancelled")
    .reduce((sum, order) => sum + (order.total || 0), 0);
  const topProducts = Object.entries(
    orders
      .filter((order) => order.status !== "cancelled")
      .flatMap((order) => order.items || [])
      .reduce<Record<string, number>>(
        (totals, item) => ({
          ...totals,
          [item.name || "Producto sin nombre"]:
            (totals[item.name || "Producto sin nombre"] || 0) +
            (item.quantity || 0),
        }),
        {},
      ),
  )
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <section className="mt-6 text-left" aria-label="Estadísticas históricas">
      <div className="grid gap-3 rounded-xl bg-gray-50 p-4 sm:grid-cols-3">
        <label className="text-sm font-bold text-gray-700">
          Desde
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={(event) => setStartDate(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              void load();
            }}
            className="mt-1 block w-full rounded-lg border border-gray-300 p-2"
            required
          />
        </label>
        <label className="text-sm font-bold text-gray-700">
          Hasta
          <input
            type="date"
            value={endDate}
            min={startDate}
            max={today}
            onChange={(event) => setEndDate(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              void load();
            }}
            className="mt-1 block w-full rounded-lg border border-gray-300 p-2"
            required
          />
        </label>
        <button
          type="button"
          onClick={() => void load()}
          disabled={state === "loading"}
          className="self-end rounded-lg bg-gray-950 px-4 py-2 font-bold text-white disabled:opacity-50"
        >
          {state === "loading" ? "Consultando…" : "Consultar"}
        </button>
      </div>
      <p className="mt-3 text-xs text-gray-500">
        Calendario en zona horaria {timeZone}. Máximo 31 días por consulta.
      </p>
      {state === "error" && (
        <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}
      {state === "idle" && (
        <p className="mt-4 rounded-xl bg-gray-100 p-4 text-sm text-gray-600">
          Selecciona un día o rango y consulta su historial.
        </p>
      )}
      {state === "ready" && (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <StatCard label="Pedidos" value={String(orders.length)} />
            <StatCard
              label="Ventas"
              value={formatPrice(sales, store.currency || "COP")}
            />
          </div>
          <div className="mt-4 rounded-xl border border-gray-200 p-4">
            <p className="font-bold">Productos destacados</p>
            {topProducts.length ? (
              <ol className="mt-2 list-decimal pl-5 text-sm text-gray-700">
                {topProducts.map(([name, quantity]) => (
                  <li key={name}>
                    {name}: {quantity} unidades
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-2 text-sm text-gray-500">
                No hay productos registrados para este rango.
              </p>
            )}
          </div>
          <div className="mt-4 rounded-xl border border-gray-200 p-4">
            <p className="font-bold">Pedidos del rango</p>
            {orders.length ? (
              <ul className="mt-2 space-y-2 text-sm">
                {orders.map((order) => (
                  <li key={order.id} className="flex justify-between gap-3">
                    <span>
                      {order.customerName || "Pedido histórico"} ·{" "}
                      {formatOrderStatus(order.status)}
                    </span>
                    <strong>
                      {formatPrice(order.total || 0, store.currency || "COP")}
                    </strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-gray-500">
                No hay pedidos en las fechas seleccionadas.
              </p>
            )}
          </div>
          {cursor && orders.length % 25 === 0 && (
            <button
              type="button"
              onClick={() => void load(true)}
              className="mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm font-bold"
            >
              Cargar más
            </button>
          )}
        </>
      )}
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
      <p className="text-sm text-orange-800">{label}</p>
      <p className="mt-1 text-2xl font-black text-orange-950">{value}</p>
    </div>
  );
}

function OrdersQueue({ store }: { store: StoreAccess }) {
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [newOrderMessage, setNewOrderMessage] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [desktopAlerts, setDesktopAlerts] = useState(false);
  const seenOrdersRef = useRef(new Set<string>());
  const loadRequestRef = useRef(0);

  const load = async (nextPage = false, keepQueueVisible = false) => {
    const requestId = ++loadRequestRef.current;
    try {
      if (nextPage) {
        setLoadingMore(true);
      } else if (keepQueueVisible) {
        setRefreshing(true);
      } else {
        setState("loading");
      }
      const page = await getOrdersForStoreDay(
        store.id,
        store.timeZone || "America/Bogota",
        nextPage ? cursor : null,
      );
      if (requestId !== loadRequestRef.current) return;
      setOrders((current) =>
        nextPage ? mergeOrders(current, page.orders) : page.orders,
      );
      setCursor(page.cursor);
      setState("ready");
    } catch (error) {
      console.error("No se pudieron cargar los pedidos del día:", error);
      if (requestId !== loadRequestRef.current) return;
      if (keepQueueVisible)
        setFeedbackMessage(
          "No se pudieron actualizar los pedidos. Inténtalo de nuevo.",
        );
      else setState("error");
    } finally {
      if (requestId === loadRequestRef.current) {
        setLoadingMore(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    void load();
  }, [store.id, store.timeZone]);

  useEffect(() => {
    const key = `menu-templates:order-alerts:${store.id}`;
    setDesktopAlerts(
      typeof window !== "undefined" &&
        window.localStorage.getItem(key) === "enabled",
    );
    const subscribeWhenVisible = () => {
      if (document.visibilityState !== "visible") return () => undefined;
      return subscribeToActiveOrdersForStoreDay(
        store.id,
        store.timeZone || "America/Bogota",
        (incoming, initial) => {
          if (initial) {
            seenOrdersRef.current = new Set(incoming.map((order) => order.id));
            setOrders((current) => mergeOrders(current, incoming));
            return;
          }
          const newOrders = incoming.filter(
            (order) => !seenOrdersRef.current.has(order.id),
          );
          for (const order of incoming) {
            seenOrdersRef.current.add(order.id);
          }
          setOrders((current) => mergeOrders(current, incoming));
          if (!newOrders.length) return;
          setNewOrderCount((count) => count + newOrders.length);
          setNewOrderMessage(
            newOrders.length === 1
              ? "Nuevo pedido agregado a la cola."
              : `${newOrders.length} pedidos nuevos agregados a la cola.`,
          );
          if (
            window.localStorage.getItem(key) === "enabled" &&
            Notification.permission === "granted"
          )
            new Notification("Nuevo pedido", {
              body:
                newOrders.length === 1
                  ? "Revisa la cola operativa."
                  : `${newOrders.length} pedidos esperan atención.`,
            });
        },
        (error) => console.warn("No se pudo escuchar pedidos nuevos:", error),
      );
    };
    let unsubscribe = subscribeWhenVisible();
    const onVisibility = () => {
      unsubscribe();
      unsubscribe = subscribeWhenVisible();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [store.id, store.timeZone]);

  const enablePushAlerts = async () => {
    if (!auth.currentUser) {
      setFeedbackMessage("Inicia sesión nuevamente para activar push.");
      return;
    }
    try {
      await registerOrderPush(store.id, auth.currentUser);
      setFeedbackMessage(
        "Notificaciones push activadas para este dispositivo.",
      );
    } catch (error) {
      setFeedbackMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron activar las notificaciones push.",
      );
    }
  };

  const enableDesktopAlerts = async () => {
    const key = `menu-templates:order-alerts:${store.id}`;
    if (!("Notification" in window)) {
      setFeedbackMessage(
        "Este navegador no admite notificaciones de escritorio.",
      );
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      window.localStorage.setItem(key, "enabled");
      setDesktopAlerts(true);
      setFeedbackMessage("Notificaciones de escritorio activadas.");
    } else
      setFeedbackMessage(
        "El navegador bloqueó las notificaciones. Puedes habilitarlas desde sus ajustes.",
      );
  };

  const changeStatus = async (order: StoreOrder, nextStatus: OrderStatus) => {
    try {
      setUpdatingId(order.id);
      await transitionOrderStatus(store.id, order.id, nextStatus);
      setOrders((current) =>
        current.map((item) =>
          item.id === order.id ? { ...item, status: nextStatus } : item,
        ),
      );
    } catch (error) {
      console.error("No se pudo actualizar el pedido:", error);
      setState("error");
    } finally {
      setUpdatingId(null);
    }
  };

  if (state === "loading")
    return (
      <p className="mt-6 text-sm text-gray-500">Cargando la cola operativa…</p>
    );
  if (state === "error")
    return (
      <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
        No fue posible cargar o actualizar los pedidos.{" "}
        <button
          type="button"
          onClick={() => void load()}
          className="font-bold underline"
        >
          Reintentar
        </button>
      </div>
    );

  return (
    <section className="mt-6 text-left" aria-label="Cola de pedidos del día">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          {store.name || "Tienda"} · zona horaria:{" "}
          {store.timeZone || "America/Bogota"}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={refreshing}
            onClick={() => void load(false, true)}
            className="rounded-full bg-gray-950 px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
          >
            {refreshing ? "Actualizando…" : "Actualizar pedidos"}
          </button>
          <button
            type="button"
            onClick={() => void enableDesktopAlerts()}
            className="rounded-full border border-gray-300 px-3 py-1 text-xs font-bold text-gray-700"
          >
            {desktopAlerts
              ? "Alertas del navegador activadas"
              : "Activar alertas del navegador"}
          </button>
          <button
            type="button"
            onClick={() => void enablePushAlerts()}
            className="rounded-full border border-gray-300 px-3 py-1 text-xs font-bold text-gray-700"
          >
            Activar alertas push
          </button>
        </div>
      </div>
      {newOrderMessage && (
        <div
          role="status"
          className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-orange-50 p-3 text-sm font-bold text-orange-950"
        >
          <span>
            <span className="mr-2 inline-grid h-5 min-w-5 place-items-center rounded-full bg-orange-600 px-1 text-xs text-white">
              {newOrderCount}
            </span>
            {newOrderMessage}
          </span>
          <button
            type="button"
            onClick={() => {
              setNewOrderCount(0);
              setNewOrderMessage("");
            }}
            className="rounded-md px-2 py-1 text-xs underline underline-offset-2"
          >
            Cerrar
          </button>
        </div>
      )}
      {feedbackMessage && (
        <div
          role="status"
          className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-gray-100 p-3 text-sm font-bold text-gray-900"
        >
          <span>{feedbackMessage}</span>
          <button
            type="button"
            onClick={() => setFeedbackMessage("")}
            className="rounded-md px-2 py-1 text-xs underline underline-offset-2"
          >
            Cerrar
          </button>
        </div>
      )}
      <section
        className="mb-4 border-y border-gray-200 bg-gray-50 px-4 py-3"
        aria-label="Guía de estados de pedidos"
      >
        <ol className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-gray-700">
          {ORDER_STATUS_FLOW.map((status) => (
            <li key={status} className="inline-flex items-center gap-1.5">
              <span
                className={`h-2.5 w-2.5 rounded-full ${ORDER_STATUS_STYLES[status].dot}`}
                aria-hidden="true"
              />
              {ORDER_STATUS_LABELS[status]}
            </li>
          ))}
          <li className="inline-flex items-center gap-1.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${ORDER_STATUS_STYLES.cancelled.dot}`}
              aria-hidden="true"
            />
            Cancelado
          </li>
        </ol>
        <p className="mt-2 text-xs text-gray-600">
          En camino aplica solo a pedidos a domicilio; Cancelado es un estado
          final alternativo.
        </p>
      </section>
      {orders.length === 0 ? (
        <p className="rounded-xl bg-gray-100 p-5 text-sm text-gray-600">
          No hay pedidos para hoy.
        </p>
      ) : (
        <div className="grid max-h-[52rem] gap-3 overflow-y-auto overscroll-contain pr-1 lg:grid-cols-2 lg:pr-2">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              currency={store.currency}
              timeZone={store.timeZone || "America/Bogota"}
              storeSlug={store.slug}
              busy={updatingId === order.id}
              onStatusChange={changeStatus}
            />
          ))}
        </div>
      )}
      {cursor && (
        <button
          type="button"
          disabled={loadingMore}
          onClick={() => void load(true)}
          className="mt-5 rounded-xl border border-gray-300 px-4 py-2 text-sm font-bold text-gray-700 disabled:opacity-50"
        >
          {loadingMore ? "Cargando…" : "Ver pedidos anteriores"}
        </button>
      )}
    </section>
  );
}

function OrderCard({
  order,
  currency,
  timeZone,
  storeSlug,
  busy,
  onStatusChange,
}: {
  order: StoreOrder;
  currency?: string;
  timeZone: string;
  storeSlug?: string;
  busy: boolean;
  onStatusChange: (order: StoreOrder, status: OrderStatus) => Promise<void>;
}) {
  const actions: Partial<Record<OrderStatus, [string, OrderStatus]>> = {
    pending: ["Confirmar", "accepted"],
    accepted: ["Preparar", "preparing"],
    preparing: ["Marcar listo", "ready"],
    ready:
      order.type === "delivery"
        ? ["En camino", "out_for_delivery"]
        : ["Entregar", "delivered"],
    out_for_delivery: ["Entregar", "delivered"],
  };
  const action = order.status && actions[order.status];
  const statusStyle = getOrderStatusStyle(order.status);
  const trackingUrl =
    order.trackingCode && storeSlug
      ? `${window.location.origin}${withBasePath(`/t/${storeSlug}?pedido=${order.trackingCode}`)}`
      : "";
  const requestedAt = formatOrderTime(order.createdAt, timeZone);
  const isDelivery = order.type === "delivery";
  const modality = isDelivery ? "Domicilio" : "En tienda";
  const modalityDetail = isDelivery
    ? "Entrega a domicilio"
    : `Mesa ${order.tableNumber ?? "—"}`;
  const modalityIcon = isDelivery ? "/orders/delivery.svg" : "/orders/shop.svg";
  const location = isDelivery ? order.deliveryLocation : undefined;
  const mapUrl =
    location &&
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude)
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location.latitude},${location.longitude}`)}`
      : "";
  return (
    <article
      className={`h-full rounded-xl border border-gray-200 border-t-4 bg-white p-3 shadow-sm transition hover:shadow-md ${statusStyle?.line || "border-t-gray-300"}`}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gray-100">
          <img src={withBasePath(modalityIcon)} alt="" className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-black text-gray-950">
                {order.customerName || "Pedido histórico"}
              </h3>
              <p className="mt-0.5 text-xs font-medium text-gray-600">
                {modality} · {modalityDetail}
              </p>
              {requestedAt && (
                <p className="mt-0.5 text-xs font-medium tabular-nums text-gray-500">
                  Solicitado · {requestedAt}
                </p>
              )}
            </div>
            <p className="shrink-0 text-sm font-black tabular-nums text-gray-950">
              {formatPrice(order.total || 0, currency || "COP")}
            </p>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${statusStyle?.badge || "bg-gray-100 text-gray-900"}`}
            >
              {statusStyle?.icon && (
                <img
                  src={withBasePath(statusStyle.icon)}
                  alt=""
                  className="h-3 w-3"
                />
              )}
              {formatOrderStatus(order.status)}
            </span>
            {isDelivery && order.deliveryAddress && (
              <span
                title={order.deliveryAddress}
                className="min-w-0 flex-1 truncate text-xs text-gray-600"
              >
                {order.deliveryAddress}
              </span>
            )}
          </div>
        </div>
      </div>

      {order.items && order.items.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-gray-100 pt-2 text-xs text-gray-700">
          {order.items.map((item) => (
            <li
              key={item.itemId}
              className="flex items-baseline justify-between gap-3"
            >
              <span>{item.name || "Producto"}</span>
              <span className="shrink-0 font-bold tabular-nums">
                ×{item.quantity || 0}
              </span>
            </li>
          ))}
        </ul>
      )}

      {order.notes && (
        <p className="mt-2 border-t border-gray-100 pt-2 text-xs text-gray-700">
          <span className="font-bold text-gray-950">Notas:</span> {order.notes}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
        {action && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void onStatusChange(order, action[1])}
            className="rounded-md bg-gray-950 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-gray-800 disabled:opacity-50"
          >
            {action[0]}
          </button>
        )}
        {order.status !== "cancelled" && order.status !== "delivered" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void onStatusChange(order, "cancelled")}
            className="rounded-md px-2.5 py-1.5 text-xs font-bold text-red-800 transition hover:bg-red-50 disabled:opacity-50"
          >
            Cancelar
          </button>
        )}
        {mapUrl && (
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md px-2.5 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-50"
          >
            Ver mapa
          </a>
        )}
        {trackingUrl && order.customerPhone && (
          <a
            href={`https://wa.me/${(order.customerPhone || "").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Sigue tu pedido: ${trackingUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md px-2.5 py-1.5 text-xs font-bold text-green-700 transition hover:bg-green-50"
          >
            Enviar seguimiento
          </a>
        )}
      </div>
    </article>
  );
}
