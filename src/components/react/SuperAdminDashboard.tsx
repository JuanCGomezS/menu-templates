import { useEffect, useState } from "react";
import type React from "react";
import { ROLES } from "../../lib/auth";
import { getLimitedStoresForAdmin } from "../../lib/public-store-data";
import { withBasePath } from "../../lib/base-path";
import AppHeader from "./AppHeader";
import AppFooter from "./AppFooter";
import Messaging from "./Messaging";
import { useAuthSession } from "./useAuthSession";

type StoreType = "restaurant" | "food_business" | "product_store";
interface StoreRow {
  id: string;
  name?: string;
  slug?: string;
  active?: boolean;
  type?: StoreType;
}
const STORE_TYPES: Record<StoreType, string> = {
  restaurant: "Restaurante",
  food_business: "Emprendimiento de comida",
  product_store: "Catálogo de productos",
};

export default function SuperAdminDashboard() {
  const { state: sessionState, profile } = useAuthSession();
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [dataState, setDataState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const allowed =
    sessionState === "authenticated" && profile?.role === ROLES.SUPERADMIN;

  useEffect(() => {
    if (sessionState === "anonymous")
      window.location.assign(withBasePath("/login"));
  }, [sessionState]);

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    setDataState("loading");
    getLimitedStoresForAdmin()
      .then((rows) => {
        if (!active) return;
        setStores(rows as StoreRow[]);
        setDataState("ready");
      })
      .catch((reason) => {
        console.error("Error al cargar tiendas para superadmin:", reason);
        if (!active) return;
        setError("No pudimos cargar el listado de tiendas.");
        setDataState("error");
      });
    return () => {
      active = false;
    };
  }, [allowed]);

  if (sessionState === "loading")
    return (
      <DashboardShell title="Preparando panel">
        <LoadingPanel message="Comprobando sesión y permisos…" />
      </DashboardShell>
    );
  if (sessionState === "error")
    return (
      <DashboardShell title="No pudimos validar tu sesión">
        <p className="mt-4 text-gray-600">
          Revisa tu conexión y recarga la página.
        </p>
      </DashboardShell>
    );
  if (sessionState === "missing-profile")
    return (
      <DashboardShell title="Perfil incompleto">
        <p className="mt-4 text-gray-600">
          Tu cuenta no tiene un perfil de permisos. Contacta al administrador.
        </p>
      </DashboardShell>
    );
  if (sessionState === "anonymous")
    return (
      <DashboardShell title="Redirigiendo al acceso">
        <LoadingPanel message="Te llevamos al inicio de sesión…" />
      </DashboardShell>
    );
  if (!allowed)
    return (
      <DashboardShell title="Acceso denegado">
        <p className="mt-4 text-gray-600">
          Tu cuenta no tiene permiso para ver este panel.
        </p>
      </DashboardShell>
    );

  return (
    <DashboardShell title="Panel superadmin">
      {error && (
        <Messaging
          message={error}
          tone="error"
          onClose={() => setError(null)}
        />
      )}
      <div className="mt-6 flex justify-end">
        <a
          href={withBasePath("/admin/store/")}
          className="rounded-xl bg-orange-600 px-5 py-3 font-bold text-white shadow-sm transition hover:bg-orange-700"
        >
          Crear tienda
        </a>
      </div>
      {dataState === "loading" ? (
        <LoadingPanel message="Cargando tiendas…" />
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
          <div className="grid gap-4 bg-gray-950 px-5 py-3 text-sm font-bold text-white md:grid-cols-[1.1fr_0.9fr_0.6fr_0.8fr_auto_auto]">
            <span>Tienda</span>
            <span>Slug</span>
            <span>Estado</span>
            <span>Tipo</span>
            <span>Vista</span>
            <span>Acción</span>
          </div>
          {stores.length === 0 ? (
            <p className="px-5 py-6 text-gray-600">
              {dataState === "error"
                ? "No se pudo cargar el listado. Usa recargar para reintentar."
                : "Todavía no hay tiendas para mostrar."}
            </p>
          ) : (
            stores.map((store) => (
              <div
                key={store.id}
                className="grid gap-4 border-t border-gray-100 px-5 py-4 text-sm md:grid-cols-[1.1fr_0.9fr_0.6fr_0.8fr_auto_auto] md:items-center"
              >
                <span className="font-semibold text-gray-950">
                  {store.name || "Sin nombre"}
                </span>
                <span className="text-gray-600">
                  {store.slug || "Sin slug"}
                </span>
                <span
                  className={
                    store.active === false
                      ? "font-semibold text-red-600"
                      : "font-semibold text-green-700"
                  }
                >
                  {store.active === false ? "Inactiva" : "Activa"}
                </span>
                <span className="text-gray-600">
                  {store.type ? STORE_TYPES[store.type] : "Sin tipo"}
                </span>
                {store.slug ? (
                  <a
                    href={withBasePath(`/t/${store.slug}`)}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-gray-300 px-4 py-2 text-center font-bold text-gray-700"
                  >
                    Ver tienda
                  </a>
                ) : (
                  <span className="text-gray-400">Sin slug</span>
                )}
                <a
                  href={withBasePath(`/admin/store/?storeId=${store.id}`)}
                  className="rounded-xl bg-gray-950 px-4 py-2 text-center font-bold text-white"
                >
                  Editar
                </a>
              </div>
            ))
          )}
        </div>
      )}
    </DashboardShell>
  );
}

function LoadingPanel({ message }: { message: string }) {
  return (
    <div
      className="mt-6 animate-pulse rounded-2xl border border-gray-200 bg-white p-6 text-gray-600"
      role="status"
    >
      {message}
    </div>
  );
}
function DashboardShell({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#fff8ef] text-gray-950">
      <AppHeader />
      <section className="mx-auto min-h-[calc(100vh-9rem)] max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="text-4xl font-black tracking-tight">{title}</h1>
        {children}
      </section>
      <AppFooter />
    </main>
  );
}
