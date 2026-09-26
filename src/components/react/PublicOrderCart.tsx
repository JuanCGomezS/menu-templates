import { createContext, useContext, useMemo, useState } from "react";
import type React from "react";
import {
  createPublicOrder,
  validatePublicOrder,
  type DeliveryLocation,
  type OrderMode,
} from "../../lib/orders";
import type { PublicItem, PublicStore } from "../../lib/store-helpers";
import { formatPrice } from "../../lib/utils";
import { withBasePath } from "../../lib/base-path";
import DeliveryLocationDialog from "./DeliveryLocationDialog";

type CartLine = { item: PublicItem; quantity: number };
type CartContextValue = { addItem: (item: PublicItem) => void };
type CheckoutStep = "products" | "details";

const CartContext = createContext<CartContextValue>({
  addItem: () => undefined,
});

export function usePublicOrderCart() {
  return useContext(CartContext);
}

export function PublicOrderCartProvider({
  store,
  children,
}: {
  store: PublicStore;
  children: React.ReactNode;
}) {
  const [mode, setMode] = useState<OrderMode | null>(
    store.capabilities?.inStoreOrdering
      ? "in_store"
      : store.capabilities?.deliveryOrdering
        ? "delivery"
        : null,
  );
  const [lines, setLines] = useState<CartLine[]>([]);
  const [step, setStep] = useState<CheckoutStep>("products");
  const [minimized, setMinimized] = useState(false);
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryLocation, setDeliveryLocation] =
    useState<DeliveryLocation | null>(null);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [trackingCode, setTrackingCode] = useState("");

  const addItem = (item: PublicItem) => {
    const available =
      mode === "delivery"
        ? item.availableForDelivery !== false
        : mode === "in_store"
          ? item.availableInStore !== false
          : false;

    if (!mode) {
      setNotice("Selecciona una modalidad antes de agregar productos.");
      setMinimized(false);
      return;
    }

    if (!available) {
      setNotice(
        `Este producto no está disponible para ${mode === "delivery" ? "domicilio" : "mesa"}.`,
      );
      setMinimized(false);
      return;
    }

    if (item.trackStock && typeof item.stock === "number" && item.stock < 1) {
      setNotice("Este producto está agotado.");
      return;
    }

    setLines((current) => {
      const existing = current.find((line) => line.item.id === item.id);
      if (existing)
        return current.map((line) =>
          line.item.id === item.id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      return [...current, { item, quantity: 1 }];
    });
    setNotice("Producto agregado al pedido.");
    setMinimized(false);
  };

  const total = useMemo(
    () => lines.reduce((sum, line) => sum + line.item.price * line.quantity, 0),
    [lines],
  );
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const needsLocationConfirmation = mode === "delivery" && !deliveryLocation;

  const updateQuantity = (itemId: string, quantity: number) =>
    setLines((current) =>
      quantity < 1
        ? current.filter((line) => line.item.id !== itemId)
        : current.map((line) =>
            line.item.id === itemId ? { ...line, quantity } : line,
          ),
    );

  const selectMode = (nextMode: OrderMode) => {
    setMode(nextMode);
    setLines([]);
    setNotice("");
    if (nextMode === "in_store") setDeliveryLocation(null);
  };

  const openLocationDialog = () => {
    if (deliveryAddress.trim().length < 5) {
      setNotice(
        "Escribe una dirección antes de confirmar el punto de entrega.",
      );
      return;
    }

    setLocationDialogOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!mode || submitting) return;

    const unavailable = lines.find(
      (line) =>
        (mode === "delivery"
          ? line.item.availableForDelivery === false
          : line.item.availableInStore === false) ||
        (line.item.trackStock &&
          typeof line.item.stock === "number" &&
          line.quantity > line.item.stock),
    );
    if (unavailable) {
      setNotice(
        `${unavailable.item.name} ya no está disponible para esta modalidad o cantidad.`,
      );
      return;
    }

    const validation = validatePublicOrder(
      {
        customerName,
        type: mode,
        items: lines.map((line) => ({
          itemId: line.item.id,
          name: line.item.name,
          quantity: line.quantity,
          price: line.item.price,
        })),
        total,
        notes,
        ...(mode === "in_store"
          ? { tableNumber: Number(tableNumber) }
          : {
              customerPhone,
              deliveryAddress,
              deliveryLocation: deliveryLocation || undefined,
            }),
      },
      store.capabilities || {},
    );

    if (!validation.valid) {
      setNotice(validation.message);
      return;
    }

    try {
      setSubmitting(true);
      setNotice("Enviando pedido…");
      const requestId = crypto.randomUUID().replace(/-/g, "");
      const code = await createPublicOrder(
        store.id,
        validation.value,
        requestId,
      );
      setTrackingCode(code);
      setLines([]);
      setStep("products");
      setCustomerName("");
      setTableNumber("");
      setCustomerPhone("");
      setDeliveryAddress("");
      setDeliveryLocation(null);
      setNotes("");
      setNotice(
        "Pedido enviado correctamente. La tienda lo confirmará pronto.",
      );
    } catch (error) {
      console.error("No se pudo crear el pedido:", error);
      const message = error instanceof Error ? error.message : "";
      setNotice(message.includes("cerrada") ? "El negocio está cerrado. Guarda esta carta y vuelve cuando abra." : "No se pudo enviar. Reintenta; tu carrito se conserva.");
    } finally {
      setSubmitting(false);
    }
  };

  const trackingUrl =
    trackingCode && typeof window !== "undefined"
      ? `${window.location.origin}${withBasePath(`/t/${store.slug}?pedido=${trackingCode}`)}`
      : "";
  const shareTracking = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "Seguimiento de pedido",
        url: trackingUrl,
      });
    } else {
      await navigator.clipboard.writeText(trackingUrl);
    }
  };

  return (
    <CartContext.Provider value={{ addItem }}>
      <>{children}</>
      <aside
        className="fixed bottom-4 right-4 z-50 w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-orange-200 bg-white p-4 shadow-[0_16px_42px_rgba(15,23,42,0.22)]"
        aria-label="Carrito de pedido"
      >
        <button
          type="button"
          onClick={() => setMinimized((value) => !value)}
          className="flex w-full items-center justify-between gap-3 text-left font-bold text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2"
        >
          <span className="flex items-center gap-2">
            <span
              className="material-icons-outlined text-orange-700"
              aria-hidden="true"
            >
              shopping_bag
            </span>
            Pedido ({itemCount})
          </span>
          <span className="text-sm font-semibold text-orange-700">
            {minimized ? "Abrir" : "Minimizar"}
          </span>
        </button>

        {!minimized && (
          <form onSubmit={submit} className="mt-4">
            <ol
              className="mb-4 grid grid-cols-2 gap-2 text-xs font-bold"
              aria-label="Progreso del pedido"
            >
              <li
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${step === "products" ? "bg-orange-100 text-orange-900" : "text-slate-500"}`}
              >
                <span className="grid h-5 w-5 place-items-center rounded-full bg-current text-[0.65rem] text-white">
                  1
                </span>
                Productos
              </li>
              <li
                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${step === "details" ? "bg-orange-100 text-orange-900" : "text-slate-500"}`}
              >
                <span className="grid h-5 w-5 place-items-center rounded-full bg-current text-[0.65rem] text-white">
                  2
                </span>
                Datos
              </li>
            </ol>

            {step === "products" ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-orange-50 p-1">
                  <button
                    type="button"
                    disabled={!store.capabilities?.inStoreOrdering}
                    onClick={() => selectMode("in_store")}
                    className={`rounded-lg px-2 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${mode === "in_store" ? "bg-orange-600 text-white shadow-sm" : "text-orange-950 hover:bg-white"}`}
                  >
                    En mesa
                  </button>
                  <button
                    type="button"
                    disabled={!store.capabilities?.deliveryOrdering}
                    onClick={() => selectMode("delivery")}
                    className={`rounded-lg px-2 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${mode === "delivery" ? "bg-orange-600 text-white shadow-sm" : "text-orange-950 hover:bg-white"}`}
                  >
                    Domicilio
                  </button>
                </div>

                {lines.length ? (
                  <ul className="max-h-40 space-y-2 overflow-auto pr-1 text-sm">
                    {lines.map((line) => (
                      <li
                        key={line.item.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="min-w-0 truncate font-medium">
                          {line.item.name} × {line.quantity}
                        </span>
                        <span className="flex shrink-0 items-center gap-1 rounded-lg bg-gray-100 p-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(line.item.id, line.quantity - 1)
                            }
                            className="grid h-6 w-6 place-items-center rounded-md font-bold hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
                            aria-label={`Quitar ${line.item.name}`}
                          >
                            −
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(line.item.id, line.quantity + 1)
                            }
                            className="grid h-6 w-6 place-items-center rounded-md font-bold hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
                            aria-label={`Agregar ${line.item.name}`}
                          >
                            +
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
                    Agrega productos del menú.
                  </p>
                )}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-sm font-medium text-slate-600">
                    Total
                  </span>
                  <span className="text-lg font-bold text-gray-950">
                    {formatPrice(total, store.currency)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("details")}
                  disabled={!lines.length || !mode}
                  className="w-full rounded-lg bg-gray-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continuar
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <p className="text-sm font-semibold text-slate-700">
                    {itemCount} producto{itemCount === 1 ? "" : "s"} ·{" "}
                    {formatPrice(total, store.currency)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setStep("products")}
                    className="text-sm font-semibold text-orange-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
                  >
                    Editar
                  </button>
                </div>
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Tu nombre"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-100"
                  required
                />
                {mode === "in_store" ? (
                  <input
                    value={tableNumber}
                    onChange={(event) => setTableNumber(event.target.value)}
                    type="number"
                    min="1"
                    max="999"
                    placeholder="Número de mesa"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-100"
                    required
                  />
                ) : (
                  <>
                    <input
                      value={customerPhone}
                      onChange={(event) => setCustomerPhone(event.target.value)}
                      type="tel"
                      placeholder="Teléfono"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-100"
                      required
                    />
                    <input
                      value={deliveryAddress}
                      onChange={(event) => {
                        setDeliveryAddress(event.target.value);
                        setDeliveryLocation(null);
                      }}
                      placeholder="Dirección"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-100"
                      required
                    />
                    <button
                      type="button"
                      onClick={openLocationDialog}
                      className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2 ${deliveryLocation ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" : "border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100"}`}
                    >
                      <span
                        className="material-icons-outlined text-[18px]"
                        aria-hidden="true"
                      >
                        {deliveryLocation ? "check_circle" : "location_on"}
                      </span>
                      {deliveryLocation
                        ? "Ubicación confirmada"
                        : "Confirmar dirección"}
                    </button>
                    {needsLocationConfirmation && (
                      <p className="text-xs leading-5 text-slate-600">
                        Confirma el punto exacto para habilitar el envío del
                        pedido.
                      </p>
                    )}
                  </>
                )}
                <input
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Notas (opcional)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-100"
                />
                <button
                  disabled={submitting || needsLocationConfirmation}
                  className="w-full rounded-lg bg-gray-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Enviando…" : "Confirmar pedido"}
                </button>
              </div>
            )}
            {trackingCode && (
              <div className="mt-3 rounded-xl bg-green-50 p-3 text-xs text-green-900">
                <p className="font-bold">Código: {trackingCode}</p>
                <a
                  className="mt-1 block break-all underline"
                  href={trackingUrl}
                >
                  Ver seguimiento
                </a>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void navigator.clipboard.writeText(trackingUrl)
                    }
                    className="font-bold underline"
                  >
                    Copiar enlace
                  </button>
                  <button
                    type="button"
                    onClick={() => void shareTracking()}
                    className="font-bold underline"
                  >
                    Compartir
                  </button>
                </div>
              </div>
            )}
            {notice && (
              <p
                aria-live="polite"
                className="mt-3 text-center text-xs leading-5 text-gray-600"
              >
                {notice}
              </p>
            )}
          </form>
        )}
      </aside>
      <DeliveryLocationDialog
        address={deliveryAddress}
        initialLocation={deliveryLocation}
        open={locationDialogOpen}
        onClose={() => setLocationDialogOpen(false)}
        onConfirm={(location) => {
          setDeliveryLocation(location);
          setLocationDialogOpen(false);
          setNotice("Ubicación confirmada. Ya puedes enviar el pedido.");
        }}
      />
    </CartContext.Provider>
  );
}
