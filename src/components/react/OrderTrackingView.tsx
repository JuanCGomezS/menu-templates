import { useCallback, useEffect, useState } from "react";
import {
  getPublicOrderTracking,
  type OrderStatus,
  type PublicOrderTracking,
} from "../../lib/orders";
import { withBasePath } from "../../lib/base-path";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Solicitado",
  accepted: "Confirmado",
  preparing: "En preparación",
  ready: "Listo",
  out_for_delivery: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const STATUS_ICONS: Partial<Record<OrderStatus, string>> = {
  pending: "/orders/accept.svg",
  accepted: "/orders/accept.svg",
  preparing: "/orders/cooking.svg",
  ready: "/orders/ready.svg",
  out_for_delivery: "/orders/send.svg",
  delivered: "/orders/delivered.svg",
};

const DELIVERY_STEPS: OrderStatus[] = [
  "pending",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
];

const IN_STORE_STEPS: OrderStatus[] = [
  "pending",
  "accepted",
  "preparing",
  "ready",
  "delivered",
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className="h-5 w-5">
      <path
        d="m3.25 8.25 2.9 2.9 6.6-6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CancelIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-6 w-6">
      <path
        d="m7 7 10 10M17 7 7 17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function formatUpdatedAt(tracking: PublicOrderTracking) {
  const updated = tracking.updatedAt?.toDate?.();
  return updated ? updated.toLocaleString() : null;
}

export default function OrderTrackingView({
  storeId,
  trackingCode,
}: {
  storeId: string;
  trackingCode: string;
}) {
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">(
    "loading",
  );
  const [tracking, setTracking] = useState<PublicOrderTracking | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadTracking = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await getPublicOrderTracking(storeId, trackingCode);
      setTracking(result);
      setState(result ? "ready" : "missing");
    } catch {
      setState("error");
    } finally {
      setRefreshing(false);
    }
  }, [storeId, trackingCode]);

  useEffect(() => {
    void loadTracking();
  }, [loadTracking]);

  if (state === "loading") {
    return (
      <div
        className="rounded-3xl bg-white p-6 text-center shadow-[0_18px_48px_rgba(16,24,40,0.12)]"
        role="status"
      >
        Consultando estado del pedido…
      </div>
    );
  }

  if (state === "missing") {
    return (
      <div className="rounded-3xl bg-white p-6 text-center shadow-[0_18px_48px_rgba(16,24,40,0.12)]">
        No encontramos ese código de seguimiento.
      </div>
    );
  }

  if (state === "error" || !tracking) {
    return (
      <div className="rounded-3xl bg-red-50 p-6 text-center text-red-700 shadow-[0_18px_48px_rgba(16,24,40,0.12)]">
        No fue posible consultar el pedido. Intenta nuevamente.
      </div>
    );
  }

  const updatedAt = formatUpdatedAt(tracking);

  if (tracking.status === "cancelled") {
    return (
      <section
        className="w-full max-w-3xl rounded-3xl border border-[var(--store-border,#d7dcd5)] bg-white p-6 text-center shadow-[0_18px_48px_rgba(16,24,40,0.12)] sm:p-8"
        aria-labelledby="tracking-title"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-700">
          <CancelIcon />
        </div>
        <h1
          id="tracking-title"
          className="mt-4 text-3xl font-black tracking-tight text-gray-950"
        >
          Pedido cancelado
        </h1>
        <p
          role="status"
          aria-live="polite"
          className="mt-2 text-sm leading-6 text-gray-600"
        >
          Este pedido no continuará en la ruta de preparación.
        </p>
        {updatedAt && (
          <p className="mt-5 text-xs tabular-nums text-gray-500">
            Última actualización: {updatedAt}
          </p>
        )}
        <button
          type="button"
          onClick={() => void loadTracking()}
          disabled={refreshing}
          className="mt-6 min-h-11 rounded-full border border-gray-300 px-5 py-2 text-sm font-bold text-gray-800 transition hover:border-gray-500 disabled:cursor-wait disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--store-accent,#ff5a1f)]"
        >
          {refreshing ? "Actualizando…" : "Actualizar estado"}
        </button>
      </section>
    );
  }

  const steps = tracking.type === "delivery" ? DELIVERY_STEPS : IN_STORE_STEPS;
  const currentStep = steps.indexOf(tracking.status);
  const currentIcon = STATUS_ICONS[tracking.status];

  return (
    <section
      className="w-full max-w-3xl rounded-3xl border border-[var(--store-border,#d7dcd5)] bg-white p-5 shadow-[0_18px_48px_rgba(16,24,40,0.12)] sm:p-8"
      aria-labelledby="tracking-title"
    >
      <style>{`@keyframes tracking-status-breathe { 0%, 100% { transform: scale(1); box-shadow: 0 0 0 5px rgba(255,90,31,.15); } 50% { transform: scale(1.08); box-shadow: 0 0 0 10px rgba(255,90,31,0); } } @keyframes tracking-status-cook { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } } @keyframes tracking-status-drive { 0%, 100% { transform: translateX(-2px); } 50% { transform: translateX(2px); } } .tracking-status-current { animation: tracking-status-breathe 2.2s ease-in-out infinite; } .tracking-status-preparing img { animation: tracking-status-cook 1.8s ease-in-out infinite; } .tracking-status-out_for_delivery img { animation: tracking-status-drive 1.2s ease-in-out infinite; } @media (prefers-reduced-motion: reduce) { .tracking-status-current, .tracking-status-preparing img, .tracking-status-out_for_delivery img { animation: none; } }`}</style>
      <header className="text-center">
        <h1
          id="tracking-title"
          className={`${currentIcon ? "mt-3" : "mt-1"} text-3xl font-black tracking-tight text-gray-950 sm:text-4xl`}
        >
          {STATUS_LABELS[tracking.status]}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-gray-600">
          {tracking.type === "delivery"
            ? "Tu pedido a domicilio está avanzando en esta ruta."
            : "Tu pedido está avanzando en esta ruta."}
        </p>
      </header>

      <ol
        aria-label="Etapas del pedido"
        className="mt-8 flex snap-x overflow-x-auto px-1 pb-3 [scrollbar-color:var(--store-accent,#ff5a1f)_transparent] [scrollbar-width:thin] sm:overflow-visible"
      >
        {steps.map((status, index) => {
          const isCompleted = currentStep > index;
          const isCurrent = currentStep === index;
          const isFuture = currentStep < index;
          const accessibleState = isCurrent
            ? "estado actual"
            : isCompleted
              ? "completado"
              : "pendiente";

          return (
            <li
              key={status}
              aria-current={isCurrent ? "step" : undefined}
              className="relative flex min-w-28 flex-1 snap-start flex-col items-center text-center sm:min-w-0"
            >
              {index < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`absolute left-[calc(50%+1.25rem)] right-[calc(-50%+1.25rem)] top-5 h-px ${isCompleted ? "bg-[var(--store-accent,#ff5a1f)]" : "bg-[var(--store-border,#d7dcd5)]"}`}
                />
              )}
              <span
                className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 ${isCompleted ? "border-[var(--store-accent,#ff5a1f)] bg-[var(--store-accent,#ff5a1f)] text-white" : isCurrent ? `tracking-status-current tracking-status-${status} border-[var(--store-accent,#ff5a1f)] bg-white text-[var(--store-accent,#ff5a1f)]` : "border-[var(--store-border,#d7dcd5)] bg-white text-gray-400"}`}
              >
                {isCompleted ? (
                  <CheckIcon />
                ) : STATUS_ICONS[status] ? (
                  <img
                    src={withBasePath(STATUS_ICONS[status])}
                    alt=""
                    className={`h-5 w-5 ${isFuture ? "opacity-40" : ""}`}
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 rounded-full bg-current/60"
                  />
                )}
              </span>
              <span
                className={`mt-3 min-h-10 px-1 text-xs font-bold leading-5 ${isFuture ? "text-gray-500" : "text-gray-900"}`}
              >
                {STATUS_LABELS[status]}
              </span>
              <span className="sr-only"> — {accessibleState}</span>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex flex-col items-center gap-4 border-t border-[var(--store-border,#d7dcd5)] pt-5 sm:flex-row sm:justify-between">
        {updatedAt ? (
          <p className="text-xs tabular-nums text-gray-500">
            Última actualización: {updatedAt}
          </p>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => void loadTracking()}
          disabled={refreshing}
          className="min-h-11 rounded-full border border-gray-300 px-5 py-2 text-sm font-bold text-gray-800 transition hover:border-gray-500 disabled:cursor-wait disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--store-accent,#ff5a1f)]"
        >
          {refreshing ? "Actualizando…" : "Actualizar estado"}
        </button>
      </div>
    </section>
  );
}
