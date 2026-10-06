import { type JSX, useEffect, useState } from "react";
import { formatDayName, formatPrice, sortScheduleDays } from "../../lib/utils";
import { getStoreOpeningStatus } from "../../lib/store-hours";
import { getPublicStoreBySlug } from "../../lib/public-store-data";
import { isStoreSubscriptionActive } from "../../lib/subscription";
import {
  getTemplateComponent,
  resolveStoreTheme,
  type TemplateComponent,
  type ThemeConfig,
} from "../../lib/templates";
import { withBasePath } from "../../lib/base-path";
import type {
  PublicCategory,
  PublicItem,
  PublicStore,
} from "../../lib/store-helpers";
import {
  normalizeStoreContent,
  type StoreContentModel,
} from "../../lib/store-content";
import { PublicOrderCartProvider, usePublicOrderCart } from "./PublicOrderCart";
import OrderTrackingView from "./OrderTrackingView";
import LocationMap from "./LocationMap";
import StoreEffectLayer from "./StoreEffectLayer";

type StoreData = PublicStore;
type ScheduleEntry = [string, string];

function getValidLocation(location: StoreData["location"]) {
  const latitude = location?.latitude;
  const longitude = location?.longitude;
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  )
    return null;

  return { latitude, longitude };
}

interface Props {
  slug: string;
}

interface StoreViewProps {
  store: StoreContentModel;
  schedule: ScheduleEntry[];
  theme: ThemeConfig;
  isOpen: boolean | null;
  onAddToCart: (item: PublicItem) => void;
}

const layoutRenderers: Record<
  TemplateComponent,
  (props: StoreViewProps) => JSX.Element
> = {
  minimal: MinimalLayout,
  natural: NaturalLayout,
  warm: WarmLayout,
  elegant: ElegantLayout,
  confetti: ConfettiLayout,
  brasa: BrasaLayout,
  illustrated: IllustratedLayout,
  mascot: MascotLayout,
  frutal: FrutalLayout,
};

export default function RestaurantMenuView({ slug }: Props) {
  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const publicStore = await getPublicStoreBySlug(slug, {
          freshStore: true,
        });

        if (cancelled) return;

        if (!publicStore) {
          setStore(null);
          setError("Tienda no encontrada o inactiva");
          return;
        }

        setStore(publicStore);
      } catch (err) {
        if (cancelled) return;
        console.error("Error loading store:", err);
        setError(
          (err as { code?: string })?.code === "permission-denied"
            ? "Tienda no encontrada o inactiva"
            : "Error al cargar la tienda",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!store) return null;

  return <PublicStoreTemplateView store={store} />;
}

export function PublicStoreTemplateView({ store }: { store: StoreData }) {
  const [now, setNow] = useState(() => new Date());
  const contentModel = normalizeStoreContent(store);

  useEffect(() => {
    const originalTitle = document.title;
    const favicon =
      document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    const originalFavicon = favicon?.href;
    const originalFaviconType = favicon?.getAttribute("type");

    if (contentModel.name) document.title = contentModel.name;
    if (favicon && contentModel.logoUrl) {
      favicon.href = contentModel.logoUrl;
      favicon.removeAttribute("type");
    }

    return () => {
      document.title = originalTitle;
      if (favicon && originalFavicon) favicon.href = originalFavicon;
      if (favicon && originalFaviconType) favicon.type = originalFaviconType;
    };
  }, [contentModel.logoUrl, contentModel.name]);

  useEffect(() => {
    const refresh = () => setNow(new Date());
    let interval: number | undefined;
    const timeout = window.setTimeout(
      () => {
        refresh();
        interval = window.setInterval(refresh, 60_000);
      },
      60_000 - (Date.now() % 60_000),
    );
    const onVisibilityChange = () => {
      if (!document.hidden) refresh();
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearTimeout(timeout);
      if (interval !== undefined) window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);
  const trackingCode =
    typeof window === "undefined"
      ? ""
      : new URLSearchParams(window.location.search).get("pedido") || "";
  const theme = resolveStoreTheme(
    contentModel.templateId || "",
    contentModel.themeId,
  );
  if (trackingCode) {
    return (
      <ThemeFrame theme={theme}>
        <main className="flex min-h-screen items-center justify-center bg-[var(--store-bg)] px-4">
          <OrderTrackingView
            storeId={contentModel.id}
            trackingCode={trackingCode}
          />
        </main>
      </ThemeFrame>
    );
  }
  if (!isStoreSubscriptionActive(contentModel.subscription, now)) {
    return (
      <ThemeFrame theme={theme}>
        <main className="flex min-h-screen items-center justify-center bg-[var(--store-bg)] px-4">
          <StoreClosedNotice message="Esta tienda no está disponible en este momento." />
        </main>
      </ThemeFrame>
    );
  }
  const template = getTemplateComponent(contentModel.templateId || "");
  const schedule = contentModel.schedule
    ? sortScheduleDays(contentModel.schedule)
    : [];
  const opening = getStoreOpeningStatus(
    contentModel.schedule,
    contentModel.timeZone || "America/Bogota",
    now,
  );
  const isOpen = opening.isOpen;
  const content = (
    <ThemeFrame theme={theme}>
      {!opening.isOpen && <StoreClosedNotice message={opening.message} />}
      <StoreEffectLayer effectId={contentModel.effectId}>
        <StoreTemplateContent
          store={contentModel}
          schedule={schedule}
          theme={theme}
          isOpen={isOpen}
          template={template}
        />
      </StoreEffectLayer>
    </ThemeFrame>
  );
  return contentModel.capabilities?.inStoreOrdering ||
    contentModel.capabilities?.deliveryOrdering ? (
    <PublicOrderCartProvider store={contentModel} orderingOpen={opening.isOpen}>
      {content}
    </PublicOrderCartProvider>
  ) : (
    content
  );
}

function StoreClosedNotice({ message }: { message: string }) {
  return (
    <section
      className="pointer-events-none fixed left-1/2 top-3 z-40 w-fit max-w-[calc(100%-2rem)] -translate-x-1/2 px-1 sm:top-6"
      aria-labelledby="store-closed-title"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center gap-3 rounded-full border border-[var(--store-border)] bg-[var(--store-surface)] py-2 pl-2 pr-4 text-[var(--store-text)] shadow-[0_16px_36px_rgba(16,24,40,0.16)] motion-safe:animate-[store-closed-float_4s_ease-in-out_infinite]">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--store-bg)] ring-1 ring-[var(--store-border)]">
          <img
            src={withBasePath("/shop-close.svg")}
            alt=""
            aria-hidden="true"
            className="h-6 w-6 object-contain"
          />
        </div>
        <div className="min-w-0 pr-1">
          <h2
            id="store-closed-title"
            className="text-xs font-black leading-tight tracking-tight"
          >
            Cerrado ahora
          </h2>
          <p className="text-[11px] font-semibold leading-tight text-[var(--store-muted)]">
            Te invitamos a consultar los horarios
          </p>
        </div>
        <p className="sr-only">
          No estamos recibiendo pedidos en este momento.{" "}
          {message || "Consulta nuestro horario para volver a pedir."} Puedes
          explorar la carta mientras tanto.
        </p>
      </div>
      <style>{`
        @keyframes store-closed-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-0.35rem); }
        }
      `}</style>
    </section>
  );
}

function StoreTemplateContent({
  store,
  schedule,
  theme,
  isOpen,
  template,
}: Omit<StoreViewProps, "onAddToCart"> & { template: TemplateComponent }) {
  const { addItem } = usePublicOrderCart();
  const Layout = layoutRenderers[template] || MinimalLayout;

  return (
    <Layout
      store={store}
      schedule={schedule}
      theme={theme}
      isOpen={isOpen}
      onAddToCart={addItem}
    />
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center" role="status" aria-live="polite">
        <div
          aria-hidden="true"
          className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-4 border-t-4 border-orange-500 motion-reduce:animate-none"
        />
        <p className="text-xl text-gray-600">Cargando tienda…</p>
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="mb-2 text-2xl font-semibold text-red-600">⚠️</p>
        <p className="text-xl text-red-600">{message}</p>
        <p className="mt-2 text-sm text-gray-600">
          Consulte con el administrador del sistema para obtener más
          información.
        </p>
      </div>
    </div>
  );
}

function ThemeFrame({
  theme,
  children,
}: {
  theme: ThemeConfig;
  children: React.ReactNode;
}) {
  return (
    <div
      style={
        {
          "--store-accent": theme.tokens.accent,
          "--store-bg": theme.tokens.background,
          "--store-surface": theme.tokens.surface,
          "--store-text": theme.tokens.text,
          "--store-muted": `color-mix(in srgb, ${theme.tokens.text} 62%, ${theme.tokens.background})`,
          "--store-border": `color-mix(in srgb, ${theme.tokens.text} 18%, ${theme.tokens.surface})`,
          "--store-accent-soft": `color-mix(in srgb, ${theme.tokens.accent} 14%, ${theme.tokens.surface})`,
          "--store-accent-secondary":
            theme.tokens.accentSecondary ??
            `color-mix(in srgb, ${theme.tokens.accent} 62%, #67d1d0)`,
          "--store-accent-tertiary":
            theme.tokens.accentTertiary ??
            `color-mix(in srgb, ${theme.tokens.accent} 42%, #f7d86a)`,
          "--store-on-accent": theme.tokens.onAccent ?? "#ffffff",
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

function FrutalLayout(props: StoreViewProps) {
  const { store, schedule, isOpen, onAddToCart } = props;
  const photographs = store.items.filter((item) => item.imageUrl).slice(0, 3);

  return (
    <main className="min-h-screen overflow-hidden bg-[var(--store-bg)] text-[var(--store-text)] selection:bg-[var(--store-accent)] selection:text-[var(--store-on-accent)]">
      <header className="relative isolate min-h-[44rem] overflow-hidden border-b border-[var(--store-text)]/15 px-5 pb-20 pt-8 sm:px-10 lg:px-16">
        <FrutalBotanicalOrnament className="pointer-events-none absolute -right-20 top-8 h-72 w-72 rotate-12 opacity-15" />
        <nav
          aria-label="Categorías del catálogo"
          className="relative z-20 mx-auto flex max-w-5xl flex-col items-start gap-4 border-b border-[var(--store-text)]/20 pb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
        >
          <span className="font-serif text-lg font-semibold">{store.name}</span>
          {store.categories.length > 0 && (
            <div className="flex w-full gap-5 overflow-x-auto pb-1 text-sm sm:max-w-[70%] sm:pb-0">
              {store.categories.map((category) => (
                <a
                  key={category.id}
                  href={`#category-${category.id}`}
                  className="shrink-0 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--store-accent)]"
                >
                  {category.name}
                </a>
              ))}
            </div>
          )}
        </nav>

        <div className="relative mx-auto mt-16 flex max-w-6xl flex-col items-center text-center sm:mt-24">
          {photographs[0]?.imageUrl && (
            <FrutalPhotoFrame
              item={photographs[0]}
              className="hidden -rotate-6 sm:absolute sm:-left-6 sm:top-6 sm:block sm:w-56 lg:-left-16 lg:w-72"
              eager
            />
          )}
          {photographs[1]?.imageUrl && (
            <FrutalPhotoFrame
              item={photographs[1]}
              className="hidden rotate-6 sm:absolute sm:-right-5 sm:top-0 sm:block sm:w-48 lg:-right-12 lg:w-64"
              eager
            />
          )}
          {store.logoUrl && (
            <div className="relative z-10 mb-10 flex min-h-28 w-[min(24rem,88vw)] items-center justify-center border-y border-[var(--store-text)]/30 bg-[var(--store-surface)]/80 px-5 py-4 shadow-[0_18px_45px_rgba(40,25,20,0.12)] sm:min-h-32">
              <FrutalBotanicalOrnament className="pointer-events-none absolute -left-8 -top-8 h-20 w-20 -rotate-12 text-[var(--store-accent)] opacity-25" />
              <img
                src={store.logoUrl}
                alt={`Logo de ${store.name}`}
                className="relative max-h-28 w-full object-contain [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.48))_drop-shadow(0_-1px_1px_rgba(255,255,255,0.5))] sm:max-h-32"
              />
            </div>
          )}
          <h1 className="relative z-10 max-w-4xl break-words font-serif text-6xl leading-[0.84] tracking-[-0.04em] [text-wrap:balance] sm:text-8xl lg:text-9xl">
            {store.name}
          </h1>
          <div className="relative z-10 mt-9 flex flex-wrap justify-center gap-3">
            {isOpen !== null && (
              <span className="border border-[var(--store-text)] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em]">
                {isOpen ? "Abierto ahora" : "Cerrado ahora"}
              </span>
            )}
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("frutal-catalog")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="bg-[var(--store-text)] px-5 py-2.5 text-sm font-bold text-[var(--store-bg)] transition-colors hover:bg-[var(--store-accent)] hover:text-[var(--store-on-accent)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--store-accent)]/35"
            >
              Explorar catálogo
            </button>
          </div>
          {photographs[2]?.imageUrl && (
            <FrutalPhotoFrame
              item={photographs[2]}
              className="absolute -bottom-48 right-[8%] hidden w-40 -rotate-3 lg:block"
            />
          )}
        </div>
      </header>

      <section
        id="frutal-catalog"
        className="relative px-5 py-20 sm:px-10 lg:px-16 lg:py-28"
      >
        <div className="mx-auto max-w-6xl">
          {store.categories.length ? (
            <div className="space-y-28 lg:space-y-36">
              {store.categories.map((category, index) => (
                <FrutalCategory
                  key={category.id}
                  store={store}
                  category={category}
                  index={index}
                  onAddToCart={onAddToCart}
                />
              ))}
            </div>
          ) : (
            <EmptyMenu />
          )}
        </div>
      </section>
      <FrutalServiceFolio store={store} schedule={schedule} />
    </main>
  );
}

function FrutalPhotoFrame({
  item,
  className,
  eager = false,
}: {
  item: PublicItem;
  className: string;
  eager?: boolean;
}) {
  return (
    <figure
      className={`relative z-10 border border-[var(--store-text)]/15 bg-[var(--store-surface)] p-2 shadow-[0_22px_50px_rgba(40,25,20,0.16)] ${className}`}
    >
      <img
        src={item.imageUrl}
        alt={item.name}
        loading={eager ? "eager" : "lazy"}
        className="aspect-[4/3] w-full object-contain"
      />
      <figcaption className="px-1 pb-1 pt-2 text-left font-serif text-sm leading-tight">
        {item.name}
      </figcaption>
    </figure>
  );
}

function FrutalBotanicalOrnament({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 240 240" className={className}>
      <path
        d="M121 224c-3-76 7-137 52-196M128 167c-35-9-62-35-72-70 34 0 64 17 77 44M151 105c8-36 29-62 61-76 2 35-12 65-42 84M116 196c-35 1-64-14-84-43 31-10 63-1 86 23"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FrutalCategory({
  store,
  category,
  index,
  onAddToCart,
}: {
  store: StoreData;
  category: PublicCategory;
  index: number;
  onAddToCart: (item: PublicItem) => void;
}) {
  const categoryImage = category.items.find((item) => item.imageUrl);
  const imageFirst = index % 2 === 0;
  const categoryGrid = categoryImage
    ? `grid items-center gap-10 lg:gap-20 ${imageFirst ? "lg:grid-cols-[minmax(15rem,0.7fr)_minmax(0,1.3fr)]" : "lg:grid-cols-[minmax(0,1.3fr)_minmax(15rem,0.7fr)]"}`
    : "mx-auto max-w-3xl";

  return (
    <section id={`category-${category.id}`} className="relative scroll-mt-8">
      <div className={categoryGrid}>
        {categoryImage?.imageUrl && (
          <FrutalPhotoFrame
            item={categoryImage}
            className={`mx-auto w-full max-w-sm ${imageFirst ? "lg:order-1 lg:-rotate-2" : "lg:order-2 lg:rotate-2"}`}
          />
        )}
        <div className={imageFirst ? "lg:order-2" : "lg:order-1"}>
          <div className="mb-8 flex justify-center lg:justify-start">
            <h2 className="inline-block max-w-full break-words bg-[var(--store-text)] px-5 py-2 font-serif text-3xl italic leading-tight text-[var(--store-bg)] sm:text-4xl">
              {category.name}
            </h2>
          </div>
          {category.items.length ? (
            <div className="divide-y divide-[var(--store-text)]/15 border-y border-[var(--store-text)]/20">
              {category.items.map((item) => (
                <FrutalProduct
                  key={item.id}
                  item={item}
                  store={store}
                  onAddToCart={onAddToCart}
                />
              ))}
            </div>
          ) : (
            <p className="border-y border-[var(--store-text)]/20 py-6 text-sm text-[var(--store-text)]/70">
              No hay productos en esta categoría.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function FrutalProduct({
  item,
  store,
  onAddToCart,
}: {
  item: PublicItem;
  store: StoreData;
  onAddToCart: (item: PublicItem) => void;
}) {
  const { orderingOpen } = usePublicOrderCart();
  const soldOut = isSoldOut(item);
  const orderingEnabled =
    orderingOpen &&
    (store.capabilities?.inStoreOrdering ||
      store.capabilities?.deliveryOrdering);

  return (
    <article className="grid grid-cols-1 gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-5 sm:py-6">
      <div className="min-w-0">
        <div className="flex items-start gap-3">
          {item.imageUrl && (
            <img
              src={item.imageUrl}
              alt=""
              loading="lazy"
              className={`mt-1 h-12 w-12 shrink-0 bg-[var(--store-surface)] object-contain ${soldOut ? "opacity-45" : ""}`}
            />
          )}
          <div className="min-w-0">
            <h3 className="break-words font-serif text-xl leading-tight sm:text-2xl">
              {item.name}
            </h3>
            {item.description && (
              <p className="mt-1 break-words text-sm leading-6 text-[var(--store-text)]/70">
                {item.description}
              </p>
            )}
          </div>
        </div>
        {soldOut ? (
          <p className="mt-3 text-sm font-bold text-rose-700">Agotado</p>
        ) : (
          orderingEnabled && (
            <button
              type="button"
              onClick={() => onAddToCart(item)}
              className="mt-3 min-h-11 border-b-2 border-[var(--store-accent)] px-1 text-sm font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--store-accent)]/35"
            >
              Agregar al pedido
            </button>
          )
        )}
      </div>
      <span className="shrink-0 font-serif text-lg tabular-nums sm:justify-self-end sm:text-xl">
        {formatPrice(item.price, store.currency)}
      </span>
    </article>
  );
}

function FrutalServiceFolio({
  store,
  schedule,
}: Pick<StoreViewProps, "store" | "schedule">) {
  const contact = store.contact;
  const location = getValidLocation(store.location);
  const hasContact = Boolean(
    contact?.whatsapp || contact?.instagram || contact?.address || location,
  );
  if (!schedule.length && !hasContact) return null;

  return (
    <footer className="relative isolate overflow-hidden bg-[var(--store-text)] px-5 py-20 text-[var(--store-bg)] sm:px-10 lg:px-16 lg:py-28">
      <FrutalBotanicalOrnament className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 -rotate-12 opacity-10" />
      <div className="relative mx-auto max-w-6xl">
        <h2 className="max-w-4xl break-words font-serif text-5xl leading-[0.9] tracking-[-0.04em] [text-wrap:balance] sm:text-7xl">
          Información para tu próxima visita o pedido.
        </h2>
        <div className="mt-16 grid gap-14 lg:grid-cols-2 lg:gap-20">
          {schedule.length > 0 && (
            <section>
              <h3 className="border-b border-[var(--store-bg)]/25 pb-4 font-serif text-3xl italic">
                Horarios
              </h3>
              <dl className="mt-4 divide-y divide-[var(--store-bg)]/15">
                {schedule.map(([day, value]) => (
                  <div
                    key={day}
                    className="flex justify-between gap-5 py-3 text-sm"
                  >
                    <dt>{formatDayName(day)}</dt>
                    <dd className="font-bold text-right">
                      {value === "closed"
                        ? "Cerrado"
                        : formatScheduleTime(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          {hasContact && (
            <section>
              <h3 className="border-b border-[var(--store-bg)]/25 pb-4 font-serif text-3xl italic">
                Contacto
              </h3>
              <div className="mt-5 flex flex-wrap gap-5">
                {contact?.whatsapp && (
                  <a
                    href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-[var(--store-accent)] decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--store-accent)]"
                  >
                    WhatsApp
                  </a>
                )}
                {contact?.instagram && (
                  <a
                    href={`https://instagram.com/${contact.instagram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-[var(--store-accent)] decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--store-accent)]"
                  >
                    Instagram
                  </a>
                )}
              </div>
              {contact?.address && (
                <p className="mt-5 max-w-lg text-sm leading-6 text-[var(--store-bg)]/75">
                  {contact.address}
                </p>
              )}
            </section>
          )}
        </div>
        {location && (
          <section className="mt-16 border-t border-[var(--store-bg)]/20 pt-8">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <h3 className="font-serif text-3xl italic">Ubicación</h3>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-bold underline decoration-[var(--store-accent)] decoration-2 underline-offset-4"
              >
                Abrir en Google Maps
              </a>
            </div>
            <LocationMap
              location={location}
              className="h-72 w-full sm:h-96"
              title={`Ubicación de ${store.name}`}
            />
          </section>
        )}
      </div>
    </footer>
  );
}

function MascotLayout(props: StoreViewProps) {
  const { store, schedule, isOpen, onAddToCart } = props;
  const heroItem = store.items.find((item) => item.imageUrl);

  return (
    <main className="min-h-screen overflow-hidden bg-[#23443e] px-3 py-3 text-[#23443e] sm:px-5 sm:py-5">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-[#fff5d9] shadow-[0_30px_90px_rgba(5,28,24,0.42)] sm:rounded-[4rem]">
        <header className="relative isolate overflow-hidden px-5 pb-14 pt-20 sm:px-10 lg:px-16 lg:pb-20 lg:pt-28">
          <svg
            aria-hidden="true"
            viewBox="0 0 1200 170"
            preserveAspectRatio="none"
            className="absolute inset-x-0 top-0 h-32 w-full text-[#23443e]"
          >
            <path
              d="M0 0h1200v62c-45 0-38 74-83 74-53 0-20-102-79-102-48 0-25 78-75 78-61 0-24-112-91-112H0Z"
              fill="currentColor"
            />
          </svg>
          <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
            <div className="relative z-10">
              {store.logoUrl && (
                <div className="mb-9 flex min-h-32 w-[min(22rem,86vw)] -rotate-3 items-center justify-center rounded-[2rem] border-[0.45rem] border-[#23443e] bg-[#fff5d9] p-4 shadow-[0_18px_38px_rgba(35,68,62,0.2)]">
                  <img
                    src={store.logoUrl}
                    alt={`Logo de ${store.name}`}
                    className="max-h-32 w-full object-contain [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.48))_drop-shadow(0_-1px_1px_rgba(255,255,255,0.5))]"
                  />
                </div>
              )}
              <h1 className="mt-8 max-w-4xl break-words text-6xl font-black leading-[0.82] tracking-[-0.055em] [text-wrap:balance] sm:text-8xl lg:text-[7rem]">
                {store.name}
              </h1>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                {isOpen !== null && (
                  <span
                    className={`rounded-full border-2 border-[#23443e] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] ${isOpen ? "bg-[#8ed8c5]" : "bg-[#f3a8bd]"}`}
                  >
                    {isOpen ? "Abierto ahora" : "Cerrado ahora"}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById("mascot-catalog")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="rounded-full bg-[var(--store-accent)] px-5 py-3 text-sm font-black text-[var(--store-on-accent)] transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#23443e]/30 motion-reduce:transform-none"
                >
                  Ver catálogo
                </button>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-xl pb-4">
              {heroItem?.imageUrl && (
                <img
                  src={heroItem.imageUrl}
                  alt={heroItem.name}
                  fetchPriority="high"
                  className="absolute right-0 top-0 z-10 aspect-square w-[58%] rotate-6 rounded-[2rem] border-[0.65rem] border-[#fff5d9] object-cover shadow-[0_25px_55px_rgba(35,68,62,0.3)]"
                />
              )}
              <MascotCharacter />
            </div>
          </div>
        </header>
        <section
          id="mascot-catalog"
          className="px-5 py-12 sm:px-10 lg:px-16 lg:py-20"
        >
          <CategoryNav store={store} />
          {store.categories.length ? (
            <div className="mt-12 grid gap-8 lg:grid-cols-2">
              {store.categories.map((category, index) => (
                <MascotCategory
                  key={category.id}
                  store={store}
                  category={category}
                  index={index}
                  onAddToCart={onAddToCart}
                />
              ))}
            </div>
          ) : (
            <EmptyMenu />
          )}
        </section>
        <MascotServiceDeck store={store} schedule={schedule} />
      </div>
    </main>
  );
}

function MascotCharacter() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 420 500"
      className="relative w-full max-w-md text-[#23443e]"
    >
      <path
        d="M125 116h188l28 285c3 34-23 63-57 63H145c-34 0-60-29-57-63l37-285Z"
        fill="#f2a54a"
        stroke="currentColor"
        strokeWidth="12"
      />
      <path
        d="M154 116c0-62 112-62 112 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <circle cx="163" cy="235" r="12" fill="currentColor" />
      <circle cx="263" cy="235" r="12" fill="currentColor" />
      <path
        d="M173 281c25 24 52 24 80 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M90 270c-46 10-62 42-55 75M336 270c44 12 59 43 51 76M145 458l-22 31M278 458l24 31"
        fill="none"
        stroke="currentColor"
        strokeWidth="13"
        strokeLinecap="round"
      />
      <path
        d="M122 491h-45M302 491h46"
        stroke="currentColor"
        strokeWidth="13"
        strokeLinecap="round"
      />
      <path
        d="M107 170l58 20M294 169l-56 21"
        stroke="#ef76ad"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <circle
        cx="322"
        cy="120"
        r="38"
        fill="#8ed8c5"
        stroke="currentColor"
        strokeWidth="10"
      />
      <path
        d="m310 120 9 9 18-21"
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MascotCategory({
  store,
  category,
  index,
  onAddToCart,
}: {
  store: StoreData;
  category: PublicCategory;
  index: number;
  onAddToCart: (item: PublicItem) => void;
}) {
  const featured = category.items.find((item) => item.imageUrl);
  const ribbonClass =
    index % 2 === 0
      ? "bg-[#23443e] text-[#fff5d9]"
      : "bg-[var(--store-accent)] text-[var(--store-on-accent)]";
  return (
    <section
      id={`category-${category.id}`}
      className="relative overflow-hidden rounded-[2.25rem] border-2 border-[#23443e]/25 bg-[#fffaf0] p-5 sm:p-7"
    >
      <div
        className={`-mx-8 -mt-1 flex items-center justify-between gap-4 px-8 py-4 ${ribbonClass}`}
      >
        <h2 className="break-words text-3xl font-black leading-none tracking-[-0.04em]">
          {category.name}
        </h2>
        <span className="shrink-0 text-sm font-black">
          {category.items.length}
        </span>
      </div>
      {featured?.imageUrl && (
        <img
          src={featured.imageUrl}
          alt={featured.name}
          loading="lazy"
          className="mt-7 aspect-[16/8] w-full rotate-[-1deg] rounded-[1.5rem] border-4 border-[#23443e] object-cover shadow-[0_16px_30px_rgba(35,68,62,0.16)]"
        />
      )}
      {category.items.length ? (
        <div className="mt-6 divide-y divide-[#23443e]/15">
          {category.items.map((item) => (
            <MascotProduct
              key={item.id}
              item={item}
              store={store}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm font-semibold text-[#23443e]/70">
          No hay productos en esta categoría.
        </p>
      )}
    </section>
  );
}

function MascotProduct({
  item,
  store,
  onAddToCart,
}: {
  item: PublicItem;
  store: StoreData;
  onAddToCart: (item: PublicItem) => void;
}) {
  const { orderingOpen } = usePublicOrderCart();
  const soldOut = isSoldOut(item);
  const orderingEnabled =
    orderingOpen &&
    (store.capabilities?.inStoreOrdering ||
      store.capabilities?.deliveryOrdering);

  return (
    <article className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-4 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.name}
          loading="lazy"
          className={`h-16 w-16 rotate-[-2deg] rounded-2xl border-2 border-[#23443e] object-cover ${soldOut ? "opacity-45" : ""}`}
        />
      ) : (
        <span
          aria-hidden="true"
          className="mt-1 h-3 w-3 rounded-full bg-[#ef76ad]"
        />
      )}
      <div>
        <h3 className="break-words text-lg font-black leading-tight">
          {item.name}
        </h3>
        {item.description && (
          <p className="mt-1 break-words text-sm leading-5 text-[#23443e]/75">
            {item.description}
          </p>
        )}
      </div>
      <div className="col-span-2 flex items-center justify-between gap-4 text-left sm:col-span-1 sm:block sm:text-right">
        <p className="font-black tabular-nums">
          {formatPrice(item.price, store.currency)}
        </p>
        {soldOut ? (
          <span className="text-sm font-black text-rose-800 sm:mt-2 sm:block">
            Agotado
          </span>
        ) : (
          orderingEnabled && (
            <button
              type="button"
              onClick={() => onAddToCart(item)}
              className="min-h-11 rounded-full bg-[#8ed8c5] px-4 py-2 text-sm font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#23443e]/30 sm:mt-2"
            >
              Agregar
            </button>
          )
        )}
      </div>
    </article>
  );
}

function MascotServiceDeck({
  store,
  schedule,
}: Pick<StoreViewProps, "store" | "schedule">) {
  const contact = store.contact;
  const location = getValidLocation(store.location);
  const hasContact = Boolean(
    contact?.whatsapp || contact?.instagram || contact?.address || location,
  );
  const serviceTitle =
    store.type === "product_store"
      ? "Tu próxima compra empieza aquí."
      : "Tu próxima visita empieza aquí.";
  if (!schedule.length && !hasContact) return null;
  return (
    <footer className="relative overflow-hidden border-t-2 border-[#23443e]/20 bg-[#8ed8c5] px-5 py-12 sm:px-10 lg:px-16 lg:py-16">
      <div
        aria-hidden="true"
        className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[#ef76ad] opacity-55"
      />
      <div className="relative mx-auto max-w-7xl">
        <h2 className="max-w-2xl text-4xl font-black leading-[0.9] tracking-[-0.04em] sm:text-6xl">
          {serviceTitle}
        </h2>
        <div className="mt-10 grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
          <section className="rounded-[2rem] border-2 border-[#23443e] bg-[#fff5d9] p-6">
            <h3 className="text-xl font-black">Horarios</h3>
            {schedule.length ? (
              <dl className="mt-5 divide-y divide-[#23443e]/15">
                {schedule.map(([day, value]) => (
                  <div
                    key={day}
                    className="flex justify-between gap-4 py-3 text-sm"
                  >
                    <dt className="font-bold">{formatDayName(day)}</dt>
                    <dd
                      className={
                        value === "closed"
                          ? "font-black text-rose-700"
                          : "font-black"
                      }
                    >
                      {value === "closed"
                        ? "Cerrado"
                        : formatScheduleTime(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-4 text-sm text-[#23443e]/70">
                Consulta el horario con el negocio.
              </p>
            )}
          </section>
          {hasContact && (
            <section className="rounded-[2rem] border-2 border-[#23443e] bg-[#fff5d9] p-2">
              <div className="flex flex-wrap gap-3 p-4">
                {contact?.whatsapp && (
                  <a
                    href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-[#23443e] px-5 py-3 text-sm font-black text-[#fff5d9]"
                  >
                    WhatsApp
                  </a>
                )}
                {contact?.instagram && (
                  <a
                    href={`https://instagram.com/${contact.instagram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full bg-[#ef76ad] px-5 py-3 text-sm font-black"
                  >
                    Instagram
                  </a>
                )}
              </div>
              {!location && contact?.address && (
                <p className="px-4 pb-5 text-sm font-semibold text-[#23443e]/70">
                  {contact.address}
                </p>
              )}
              {location && (
                <>
                  <LocationMap
                    location={location}
                    className="h-64 w-full rounded-[1.5rem]"
                    title={`Ubicación de ${store.name}`}
                  />
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-semibold text-[#23443e]/70">
                      {contact?.address || "Ubicación del negocio"}
                    </p>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-black underline decoration-2 underline-offset-4"
                    >
                      Abrir mapa
                    </a>
                  </div>
                </>
              )}
            </section>
          )}
        </div>
      </div>
    </footer>
  );
}

function IllustratedLayout(props: StoreViewProps) {
  const { store, schedule, isOpen, onAddToCart } = props;

  return (
    <main className="min-h-screen overflow-hidden bg-[var(--store-bg)] text-[var(--store-text)]">
      <header className="relative isolate overflow-hidden border-b [border-color:color-mix(in_srgb,var(--store-accent)_28%,transparent)] px-5 py-16 text-center sm:px-10 sm:py-24">
        <svg
          aria-hidden="true"
          viewBox="0 0 220 160"
          className="absolute -left-12 top-4 w-56 rotate-[-8deg] text-[var(--store-accent)] opacity-35"
        >
          <path
            d="M12 104C44 29 102 17 201 53M20 130C72 73 130 67 205 91M47 145C91 116 140 111 190 124"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M62 87c18-28 42-38 70-31-7 24-24 42-53 53-11-6-17-13-17-22Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
        </svg>
        <svg
          aria-hidden="true"
          viewBox="0 0 180 180"
          className="absolute -right-10 bottom-0 w-52 rotate-12 text-[var(--store-accent)] opacity-30"
        >
          <path
            d="M31 140c6-64 38-101 96-111 18 52 2 92-49 121M55 130c22-38 43-62 65-73M62 98l-28-11M91 69l-10-31M110 91l34-17"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        <div className="relative mx-auto max-w-4xl">
          {store.logoUrl && (
            <div className="relative mx-auto mb-12 flex min-h-32 w-[min(24rem,86vw)] items-center justify-center border-y [border-color:color-mix(in_srgb,var(--store-accent)_55%,transparent)] bg-[var(--store-surface)]/75 px-7 py-5 shadow-[0_20px_50px_color-mix(in_srgb,var(--store-text)_12%,transparent)]">
              <span
                aria-hidden="true"
                className="absolute -left-5 top-1/2 h-px w-10 bg-[var(--store-accent)]"
              />
              <span
                aria-hidden="true"
                className="absolute -right-5 top-1/2 h-px w-10 bg-[var(--store-accent)]"
              />
              <img
                src={store.logoUrl}
                alt={`Logo de ${store.name}`}
                className="max-h-32 w-full object-contain [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.48))_drop-shadow(0_-1px_1px_rgba(255,255,255,0.5))]"
              />
            </div>
          )}
          <h1 className="break-words font-serif text-6xl font-black leading-[0.82] tracking-[-0.055em] [text-wrap:balance] sm:text-8xl lg:text-[7rem]">
            {store.name}
          </h1>
          <div className="mx-auto mt-7 h-px max-w-sm bg-[var(--store-accent)]" />
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm font-bold text-[var(--store-text)]/70">
            {isOpen !== null && (
              <span className={isOpen ? "text-emerald-800" : "text-rose-800"}>
                {isOpen ? "Abierto ahora" : "Cerrado ahora"}
              </span>
            )}
            {store.contact?.address && <span>{store.contact.address}</span>}
          </div>
        </div>
      </header>
      <section className="px-5 py-10 sm:px-10 lg:px-16 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <IllustratedNav store={store} />
          {store.categories.length ? (
            <div className="mt-14 space-y-20 lg:space-y-28">
              {store.categories.map((category, index) => (
                <IllustratedCategory
                  key={category.id}
                  store={store}
                  category={category}
                  index={index}
                  onAddToCart={onAddToCart}
                />
              ))}
            </div>
          ) : (
            <EmptyMenu />
          )}
        </div>
      </section>
      <IllustratedFooter store={store} schedule={schedule} />
    </main>
  );
}

function IllustratedCategory({
  store,
  category,
  index,
  onAddToCart,
}: {
  store: StoreData;
  category: PublicCategory;
  index: number;
  onAddToCart: (item: PublicItem) => void;
}) {
  const featured = category.items.find((item) => item.imageUrl);
  const reversed = index % 2 === 1;
  return (
    <section
      id={`category-${category.id}`}
      className={`grid items-start gap-8 border-t [border-color:color-mix(in_srgb,var(--store-accent)_35%,transparent)] pt-7 lg:grid-cols-[0.86fr_1.14fr] lg:gap-16 ${reversed ? "lg:[&>*:first-child]:order-2" : ""}`}
    >
      <div className="relative">
        {featured?.imageUrl ? (
          <img
            src={featured.imageUrl}
            alt={featured.name}
            loading="lazy"
            className="aspect-[4/3] w-full border [border-color:color-mix(in_srgb,var(--store-accent)_30%,transparent)] object-cover p-2 shadow-[0_24px_55px_color-mix(in_srgb,var(--store-text)_14%,transparent)]"
          />
        ) : (
          <svg
            aria-hidden="true"
            viewBox="0 0 320 220"
            className="w-full text-[var(--store-accent)] opacity-45"
          >
            <path
              d="M30 164c31-77 84-119 159-125 46 30 76 78 91 143-85 18-168 12-250-18Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              d="M70 155c35-47 76-74 124-81M100 177c39-31 83-46 132-45"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        )}
        <span className="absolute -bottom-4 -right-2 bg-[var(--store-accent)] px-4 py-2 font-serif text-2xl font-black text-[var(--store-on-accent)]">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>
      <div>
        <h2 className="break-words font-serif text-4xl font-black leading-[0.92] tracking-[-0.04em] sm:text-6xl">
          {category.name}
        </h2>
        {category.items.length ? (
          <div className="mt-7 divide-y [divide-color:color-mix(in_srgb,var(--store-text)_14%,transparent)]">
            {category.items.map((item) => (
              <IllustratedProduct
                key={item.id}
                item={item}
                store={store}
                onAddToCart={onAddToCart}
              />
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm text-[var(--store-text)]/70">
            No hay productos en esta categoría.
          </p>
        )}
      </div>
    </section>
  );
}

function IllustratedProduct({
  item,
  store,
  onAddToCart,
}: {
  item: PublicItem;
  store: StoreData;
  onAddToCart: (item: PublicItem) => void;
}) {
  const { orderingOpen } = usePublicOrderCart();
  const soldOut = isSoldOut(item);
  const orderingEnabled =
    orderingOpen &&
    (store.capabilities?.inStoreOrdering ||
      store.capabilities?.deliveryOrdering);

  return (
    <article
      className={`grid grid-cols-[minmax(0,1fr)_auto] gap-5 py-5 ${soldOut ? "opacity-55" : ""}`}
    >
      <div className="min-w-0">
        <h3 className="break-words text-lg font-black leading-tight">
          {item.name}
        </h3>
        {item.description && (
          <p className="mt-2 text-sm leading-6 text-[var(--store-text)]/70">
            {item.description}
          </p>
        )}
        {soldOut ? (
          <p className="mt-3 text-sm font-black text-rose-700">Agotado</p>
        ) : (
          orderingEnabled && (
            <button
              type="button"
              onClick={() => onAddToCart(item)}
              className="mt-3 text-sm font-black text-[var(--store-text)] underline decoration-[var(--store-accent)] decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--store-accent)]/35"
            >
              Agregar al pedido
            </button>
          )
        )}
      </div>
      <span className="shrink-0 font-serif text-lg font-bold text-[var(--store-text)] tabular-nums">
        {formatPrice(item.price, store.currency)}
      </span>
    </article>
  );
}

function IllustratedNav({ store }: { store: StoreContentModel }) {
  if (!store.navigation.length) return null;

  return (
    <nav aria-label="Categorías" className="flex gap-2 overflow-x-auto pb-2">
      {store.navigation.map((category) => (
        <a
          key={category.id}
          href={`#category-${category.id}`}
          className="shrink-0 border-b-2 border-[#bd4d73]/35 px-1 py-2 text-sm font-black text-[#6f4154] transition hover:border-[#bd4d73] hover:text-[#221d21] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#bd4d73]/35"
        >
          {category.label}
        </a>
      ))}
    </nav>
  );
}

function IllustratedFooter({
  store,
  schedule,
}: Pick<StoreViewProps, "store" | "schedule">) {
  const contact = store.contact;
  const location = getValidLocation(store.location);
  const hasContact = Boolean(
    contact?.whatsapp || contact?.instagram || contact?.address || location,
  );
  if (!schedule.length && !hasContact) return null;

  return (
    <footer className="relative overflow-hidden border-t [border-color:color-mix(in_srgb,var(--store-accent)_35%,transparent)] [background-color:color-mix(in_srgb,var(--store-accent)_16%,var(--store-bg))] px-5 py-12 sm:px-10 lg:px-16 lg:py-20">
      <svg
        aria-hidden="true"
        viewBox="0 0 240 150"
        className="absolute -right-10 top-4 w-64 text-[var(--store-accent)] opacity-25"
      >
        <path
          d="M20 124c34-73 91-108 172-103 21 42 18 81-9 116M54 121c38-42 81-69 129-79M91 126c36-25 72-40 108-45"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <div className="relative mx-auto max-w-7xl">
        <h2 className="max-w-2xl font-serif text-4xl font-black leading-[0.92] tracking-[-0.04em] sm:text-6xl">
          Colofón de visita
        </h2>
        <div className="mt-10 grid gap-10 lg:grid-cols-[0.72fr_1.28fr]">
          <section aria-labelledby="illustrated-hours">
            <h3
              id="illustrated-hours"
              className="border-b [border-color:color-mix(in_srgb,var(--store-accent)_35%,transparent)] pb-3 text-xl font-black"
            >
              Horarios
            </h3>
            {schedule.length ? (
              <dl className="divide-y [divide-color:color-mix(in_srgb,var(--store-text)_14%,transparent)]">
                {schedule.map(([day, value]) => (
                  <div
                    key={day}
                    className="flex justify-between gap-4 py-3 text-sm"
                  >
                    <dt className="font-bold">{formatDayName(day)}</dt>
                    <dd
                      className={
                        value === "closed"
                          ? "font-black text-rose-700"
                          : "font-black text-[var(--store-accent)]"
                      }
                    >
                      {value === "closed"
                        ? "Cerrado"
                        : formatScheduleTime(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-4 text-sm text-[var(--store-text)]/70">
                Consulta el horario directamente con el negocio.
              </p>
            )}
          </section>
          {hasContact && (
            <section aria-labelledby="illustrated-contact">
              <h3
                id="illustrated-contact"
                className="border-b [border-color:color-mix(in_srgb,var(--store-accent)_35%,transparent)] pb-3 text-xl font-black"
              >
                Contacto y ubicación
              </h3>
              <div className="mt-5 flex flex-wrap gap-3">
                {contact?.whatsapp && (
                  <a
                    href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-[var(--store-accent)] px-5 py-3 text-sm font-black text-[var(--store-on-accent)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--store-accent)]/35"
                  >
                    WhatsApp
                  </a>
                )}
                {contact?.instagram && (
                  <a
                    href={`https://instagram.com/${contact.instagram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border [border-color:color-mix(in_srgb,var(--store-accent)_50%,transparent)] px-5 py-3 text-sm font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--store-accent)]/35"
                  >
                    Instagram
                  </a>
                )}
              </div>
              {!location && contact?.address && (
                <p className="mt-5 text-sm font-semibold text-[var(--store-text)]/70">
                  {contact.address}
                </p>
              )}
              {location && (
                <div className="mt-6 grid overflow-hidden border [border-color:color-mix(in_srgb,var(--store-accent)_35%,transparent)] bg-[var(--store-surface)] lg:grid-cols-[1fr_auto]">
                  <LocationMap
                    location={location}
                    className="h-64 w-full"
                    title={`Ubicación de ${store.name}`}
                  />
                  <div className="flex max-w-xs flex-col justify-between gap-5 p-5">
                    <p className="text-sm font-semibold text-[var(--store-text)]/70">
                      {contact?.address || "Ubicación del negocio"}
                    </p>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-black text-[var(--store-accent)] underline decoration-2 underline-offset-4"
                    >
                      Abrir mapa
                    </a>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </footer>
  );
}

function BrasaLayout(props: StoreViewProps) {
  const { store, schedule, isOpen, onAddToCart } = props;
  const heroItem = store.items.find((item) => item.imageUrl);

  return (
    <main className="min-h-screen overflow-hidden bg-[#080808] text-[#fffaf0]">
      <header
        className={`relative isolate overflow-hidden border-b border-white/10 px-5 py-10 sm:px-10 lg:px-16 lg:py-16 ${heroItem ? "min-h-[46rem]" : "min-h-[30rem]"}`}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_74%_35%,rgba(234,167,44,0.2),transparent_24%),linear-gradient(115deg,#080808_45%,#17120a)]"
        />
        <div
          aria-hidden="true"
          className="absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-[#f3c856]/10 blur-3xl"
        />
        <div
          className={`relative mx-auto grid items-center gap-10 ${heroItem ? "max-w-7xl lg:grid-cols-[0.82fr_1.18fr]" : "max-w-5xl"}`}
        >
          <div className="relative z-10">
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
              {store.logoUrl && (
                <div className="flex min-h-32 w-[min(24rem,88vw)] items-center justify-center border border-[#f3c856]/65 bg-[#fffaf0] px-5 py-4 shadow-[0_22px_55px_rgba(0,0,0,0.42)]">
                  <img
                    src={store.logoUrl}
                    alt={`Logo de ${store.name}`}
                    className="max-h-32 w-full object-contain [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.48))_drop-shadow(0_-1px_1px_rgba(255,255,255,0.5))]"
                  />
                </div>
              )}
              {isOpen !== null && (
                <span
                  className={`border px-3 py-2 text-xs font-black uppercase tracking-[0.14em] ${isOpen ? "border-emerald-300/45 text-emerald-200" : "border-rose-300/45 text-rose-200"}`}
                >
                  {isOpen ? "Abierto" : "Cerrado"}
                </span>
              )}
            </div>
            <h1 className="mt-10 max-w-4xl break-words text-6xl font-black uppercase leading-[0.8] tracking-[-0.055em] [text-wrap:balance] sm:text-8xl lg:text-[7rem]">
              {store.name}
            </h1>
            <div className="mt-8 h-3 w-44 -rotate-2 bg-[#f3c856]" />
          </div>
          {heroItem?.imageUrl && (
            <div className="relative mx-auto w-full max-w-3xl">
              <div
                aria-hidden="true"
                className="absolute -inset-10 bg-[#f3c856]/10 blur-3xl"
              />
              <img
                src={heroItem.imageUrl}
                alt={heroItem.name}
                fetchPriority="high"
                className="relative aspect-[4/5] max-h-[42rem] w-full object-cover shadow-[0_38px_90px_rgba(0,0,0,0.62)] [clip-path:polygon(8%_0,100%_0,92%_100%,0_94%)]"
              />
            </div>
          )}
        </div>
      </header>
      <section className="px-5 py-10 sm:px-10 lg:px-16 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <CategoryNav store={store} />
          {store.categories.length ? (
            <div className="mt-12 space-y-20 lg:space-y-28">
              {store.categories.map((category, index) => (
                <BrasaCategory
                  key={category.id}
                  store={store}
                  category={category}
                  index={index}
                  onAddToCart={onAddToCart}
                />
              ))}
            </div>
          ) : (
            <EmptyMenu />
          )}
        </div>
      </section>
      <div className="mx-auto max-w-7xl">
        <BrasaServiceDeck store={store} schedule={schedule} />
      </div>
    </main>
  );
}

function BrasaCategory({
  store,
  category,
  index,
  onAddToCart,
}: {
  store: StoreData;
  category: PublicCategory;
  index: number;
  onAddToCart: (item: PublicItem) => void;
}) {
  const featured = category.items.find((item) => item.imageUrl);
  const reversed = index % 2 === 1;
  return (
    <section
      id={`category-${category.id}`}
      className={`grid items-center gap-8 lg:gap-16 ${featured ? "lg:grid-cols-[0.95fr_1.05fr]" : "max-w-4xl"} ${reversed && featured ? "lg:[&>*:first-child]:order-2" : ""}`}
    >
      {featured?.imageUrl && (
        <div>
          <img
            src={featured.imageUrl}
            alt={featured.name}
            loading="lazy"
            className="aspect-[5/4] w-full object-cover shadow-[0_28px_70px_rgba(0,0,0,0.5)] [clip-path:polygon(0_7%,94%_0,100%_92%,6%_100%)]"
          />
        </div>
      )}
      <div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="max-w-2xl break-words text-4xl font-black uppercase leading-[0.86] tracking-[-0.04em] sm:text-6xl">
            {category.name}
          </h2>
          <span className="text-sm font-black text-[#f3c856]">
            {category.items.length} opciones
          </span>
        </div>
        {category.items.length ? (
          <div className="mt-7 divide-y divide-white/10 border-y border-white/10">
            {category.items.map((item) => (
              <BrasaProduct
                key={item.id}
                item={item}
                store={store}
                onAddToCart={onAddToCart}
              />
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-[#fffaf0]/65">
            No hay productos en esta categoría.
          </p>
        )}
      </div>
    </section>
  );
}

function BrasaProduct({
  item,
  store,
  onAddToCart,
}: {
  item: PublicItem;
  store: StoreData;
  onAddToCart: (item: PublicItem) => void;
}) {
  const { orderingOpen } = usePublicOrderCart();
  const soldOut = isSoldOut(item);
  const orderingEnabled =
    orderingOpen &&
    (store.capabilities?.inStoreOrdering ||
      store.capabilities?.deliveryOrdering);

  return (
    <article
      className={`grid gap-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto_7rem] sm:items-center sm:gap-7 ${soldOut ? "opacity-55" : ""}`}
    >
      <div className="min-w-0">
        <h3 className="break-words text-xl font-black leading-tight sm:text-2xl">
          {item.name}
        </h3>
        {item.description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#fffaf0]/65">
            {item.description}
          </p>
        )}
        {soldOut ? (
          <p className="mt-3 text-sm font-black text-rose-300">Agotado</p>
        ) : (
          orderingEnabled && (
            <button
              type="button"
              onClick={() => onAddToCart(item)}
              className="mt-4 border-b-2 border-[#f3c856] pb-1 text-sm font-black text-[#f3c856] transition hover:text-[#fffaf0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#f3c856]/45"
            >
              Agregar al pedido
            </button>
          )
        )}
      </div>
      <p className="order-first text-xl font-black text-[#f3c856] sm:order-none sm:text-right">
        {formatPrice(item.price, store.currency)}
      </p>
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.name}
          className="h-28 w-28 rounded-full border-2 border-[var(--store-accent)] object-cover sm:h-28 sm:w-28"
          loading="lazy"
        />
      ) : (
        <div
          aria-hidden="true"
          className="hidden h-28 w-28 rounded-full border-2 border-dashed border-[var(--store-accent)]/60 sm:block"
        />
      )}
    </article>
  );
}

function BrasaServiceDeck({
  store,
  schedule,
}: Pick<StoreViewProps, "store" | "schedule">) {
  const hasContact = Boolean(
    store.contact?.whatsapp ||
      store.contact?.instagram ||
      store.contact?.address ||
      getValidLocation(store.location),
  );

  if (!hasContact && !schedule.length) return null;

  return (
    <section className="border-t border-white/15 px-5 py-10 sm:px-10 sm:py-14">
      <h2 className="max-w-2xl text-4xl font-black uppercase leading-[0.88] tracking-[-0.04em] sm:text-6xl">
        Visita {store.name}
      </h2>
      <div className="mt-5 h-2 w-32 -rotate-1 bg-[#f3c856]" />
      <div className="mt-9 grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
        <BrasaSchedule schedule={schedule} />
        <BrasaContact store={store} />
      </div>
    </section>
  );
}

function BrasaSchedule({ schedule }: { schedule: ScheduleEntry[] }) {
  return (
    <section
      aria-labelledby="brasa-schedule-title"
      className="border-y border-white/15 py-5"
    >
      <h3 id="brasa-schedule-title" className="text-xl font-black">
        Horarios
      </h3>
      {schedule.length ? (
        <dl className="mt-5 divide-y divide-white/10">
          {schedule.map(([day, value]) => (
            <div
              key={day}
              className="flex items-baseline justify-between gap-4 py-3 text-sm"
            >
              <dt className="font-bold">{formatDayName(day)}</dt>
              <dd
                className={
                  value === "closed"
                    ? "font-black text-rose-300"
                    : "font-black text-[#f3c856]"
                }
              >
                {value === "closed" ? "Cerrado" : formatScheduleTime(value)}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-4 text-sm leading-6 text-[#fffaf0]/65">
          Consulta la disponibilidad directamente con el negocio.
        </p>
      )}
    </section>
  );
}

function BrasaContact({ store }: { store: StoreData }) {
  const contact = store.contact;
  const location = getValidLocation(store.location);
  const hasContact =
    contact?.whatsapp || contact?.instagram || contact?.address || location;

  if (!hasContact) return null;

  return (
    <section aria-labelledby="brasa-contact-title">
      <h3 id="brasa-contact-title" className="text-xl font-black">
        Contacto y ubicación
      </h3>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {contact?.whatsapp && (
          <a
            href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-[#f3c856] bg-[#f3c856] px-5 py-4 text-center text-sm font-black text-[#111111] transition hover:-translate-y-0.5 hover:bg-[#fffaf0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#f3c856]/45 motion-reduce:transform-none motion-reduce:transition-none"
          >
            Escribir por WhatsApp
          </a>
        )}
        {contact?.instagram && (
          <a
            href={`https://instagram.com/${contact.instagram.replace("@", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-white/25 px-5 py-4 text-center text-sm font-black transition hover:-translate-y-0.5 hover:border-[#f3c856] hover:text-[#f3c856] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#f3c856]/45 motion-reduce:transform-none motion-reduce:transition-none"
          >
            Ver Instagram
          </a>
        )}
      </div>
      {!location && contact?.address && (
        <p className="mt-5 text-sm font-semibold text-[#fffaf0]/70">
          {contact.address}
        </p>
      )}
      {location && (
        <div className="mt-5 overflow-hidden border border-white/20 bg-[#151515] p-2 shadow-[0_18px_38px_rgba(0,0,0,0.35)]">
          <LocationMap
            location={location}
            className="h-64 w-full"
            title={`Ubicación de ${store.name}`}
          />
          <div className="flex flex-col gap-3 px-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-[#fffaf0]/70">
              {contact?.address || "Ubicación del negocio"}
            </p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-sm font-black text-[#f3c856] underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#f3c856]/45"
            >
              Abrir en Google Maps
            </a>
          </div>
        </div>
      )}
    </section>
  );
}

function ConfettiLayout(props: StoreViewProps) {
  const { store, schedule, isOpen, onAddToCart } = props;
  const heroItem = store.items.find((item) => item.imageUrl);

  return (
    <main className="min-h-screen overflow-hidden bg-[var(--store-bg)] text-[var(--store-text)]">
      <header
        className={`relative isolate overflow-hidden px-5 pb-14 pt-24 sm:px-10 lg:px-16 lg:pb-20 lg:pt-32 ${heroItem ? "min-h-[42rem]" : "min-h-[30rem]"}`}
      >
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 flex h-20 gap-2 px-2 sm:h-28"
        >
          {[
            "bg-[var(--store-accent)]",
            "bg-[var(--store-accent-secondary)]",
            "bg-[var(--store-accent-tertiary)]",
            "bg-[var(--store-accent-secondary)]",
            "bg-[var(--store-accent)]",
          ].map((colorClass, index) => (
            <span
              key={index}
              className={`flex-1 rounded-b-[2.5rem] ${colorClass}`}
            />
          ))}
        </div>
        <div
          className={`relative mx-auto grid items-center gap-10 ${heroItem ? "max-w-7xl lg:grid-cols-[1.05fr_0.95fr]" : "max-w-5xl"}`}
        >
          <div className="relative z-10">
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              {store.logoUrl && (
                <div className="relative flex min-h-32 w-[min(23rem,88vw)] -rotate-2 items-center justify-center rounded-[2rem] border-[0.45rem] border-white bg-white px-5 py-4 shadow-[0_20px_45px_rgba(58,35,54,0.2)]">
                  <span
                    aria-hidden="true"
                    className="absolute -right-4 -top-4 h-8 w-8 rounded-full bg-[var(--store-accent-tertiary)]"
                  />
                  <img
                    src={store.logoUrl}
                    alt={`Logo de ${store.name}`}
                    className="max-h-32 w-full object-contain [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.48))_drop-shadow(0_-1px_1px_rgba(255,255,255,0.5))]"
                  />
                </div>
              )}
              {isOpen !== null && (
                <span
                  className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.12em] ${isOpen ? "bg-emerald-100 text-emerald-900" : "bg-rose-100 text-rose-900"}`}
                >
                  {isOpen ? "Abierto ahora" : "Cerrado ahora"}
                </span>
              )}
            </div>
            <h1 className="mt-8 max-w-4xl break-words text-6xl font-black leading-[0.82] tracking-[-0.055em] [text-wrap:balance] sm:text-8xl lg:text-[7rem]">
              {store.name}
            </h1>
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("store-catalog")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="mt-9 rounded-full bg-[var(--store-accent)] px-6 py-3.5 text-sm font-black text-[var(--store-on-accent)] shadow-[0_16px_32px_color-mix(in_srgb,var(--store-accent)_30%,transparent)] transition hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--store-accent-secondary)] motion-reduce:transform-none motion-reduce:transition-none"
            >
              Explorar catálogo
            </button>
          </div>
          {heroItem?.imageUrl && (
            <div className="relative mx-auto w-full max-w-xl">
              <div
                aria-hidden="true"
                className="absolute -inset-5 rotate-3 rounded-[42%_58%_63%_37%] bg-[var(--store-accent-secondary)]"
              />
              <img
                src={heroItem.imageUrl}
                alt={heroItem.name}
                fetchPriority="high"
                className="relative aspect-square w-full -rotate-2 rounded-[55%_45%_38%_62%] border-[0.65rem] border-white object-cover shadow-[0_28px_60px_rgba(58,35,54,0.24)]"
              />
            </div>
          )}
        </div>
      </header>
      <section
        id="store-catalog"
        className="px-4 py-12 sm:px-8 lg:px-12 lg:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <CategoryNav store={store} />
          {store.categories.length ? (
            <div className="mt-12 space-y-16 lg:space-y-24">
              {store.categories.map((category, index) => (
                <ConfettiCategory
                  key={category.id}
                  store={store}
                  category={category}
                  index={index}
                  onAddToCart={onAddToCart}
                />
              ))}
            </div>
          ) : (
            <EmptyMenu />
          )}
        </div>
      </section>
      <ConfettiFooter store={store} schedule={schedule} />
    </main>
  );
}

function ConfettiCategory({
  store,
  category,
  index,
  onAddToCart,
}: {
  store: StoreData;
  category: PublicCategory;
  index: number;
  onAddToCart: (item: PublicItem) => void;
}) {
  const featured = category.items.find((item) => item.imageUrl);
  const reversed = index % 2 === 1;
  const panelClass =
    index % 3 === 0
      ? "bg-[var(--store-accent-secondary)]"
      : index % 3 === 1
        ? "bg-[var(--store-accent)]"
        : "bg-[var(--store-accent-tertiary)]";

  return (
    <section
      id={`category-${category.id}`}
      className={`grid items-center gap-7 lg:gap-12 ${featured ? "lg:grid-cols-[1.08fr_0.92fr]" : "max-w-4xl"} ${reversed && featured ? "lg:[&>*:first-child]:order-2" : ""}`}
    >
      <div className="relative overflow-hidden rounded-[2.5rem] bg-[var(--store-surface)] p-5 shadow-[0_24px_55px_color-mix(in_srgb,var(--store-text)_13%,transparent)] sm:p-8">
        <div className={`absolute inset-x-0 top-0 h-5 ${panelClass}`} />
        <div className="relative mt-3 flex flex-wrap items-end justify-between gap-4">
          <h2 className="max-w-3xl break-words text-4xl font-black leading-[0.9] tracking-[-0.04em] sm:text-6xl">
            {category.name}
          </h2>
          <span className="text-sm font-black text-[var(--store-muted)]">
            {category.items.length}{" "}
            {category.items.length === 1 ? "producto" : "productos"}
          </span>
        </div>
        {category.items.length ? (
          <div className="relative mt-7 divide-y [divide-color:color-mix(in_srgb,var(--store-text)_12%,transparent)]">
            {category.items.map((item) => (
              <ConfettiProduct
                key={item.id}
                item={item}
                store={store}
                onAddToCart={onAddToCart}
              />
            ))}
          </div>
        ) : (
          <p className="mt-7 text-sm text-[var(--store-muted)]">
            No hay productos en esta categoría.
          </p>
        )}
      </div>
      {featured?.imageUrl && (
        <div className="relative mx-auto w-full max-w-lg">
          <div
            aria-hidden="true"
            className={`absolute -inset-4 rotate-3 rounded-[42%_58%_51%_49%] ${panelClass} opacity-80`}
          />
          <img
            src={featured.imageUrl}
            alt={featured.name}
            loading="lazy"
            className="relative aspect-square w-full -rotate-2 rounded-[58%_42%_47%_53%] border-[0.55rem] border-white object-cover shadow-[0_24px_50px_rgba(58,35,54,0.2)]"
          />
        </div>
      )}
    </section>
  );
}

function ConfettiProduct({
  item,
  store,
  onAddToCart,
}: {
  item: PublicItem;
  store: StoreData;
  onAddToCart: (item: PublicItem) => void;
}) {
  const { orderingOpen } = usePublicOrderCart();
  const soldOut = isSoldOut(item);
  const orderingEnabled =
    orderingOpen &&
    (store.capabilities?.inStoreOrdering ||
      store.capabilities?.deliveryOrdering);

  return (
    <article
      className={`grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-4 ${soldOut ? "opacity-55" : ""}`}
    >
      <div className="min-w-0">
        <h3 className="break-words text-lg font-black leading-tight">
          {item.name}
        </h3>
        {item.description && (
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-[var(--store-muted)]">
            {item.description}
          </p>
        )}
      </div>
      <div className="text-right">
        <p className="font-black tabular-nums">
          {formatPrice(item.price, store.currency)}
        </p>
        {soldOut ? (
          <span className="mt-2 block text-xs font-black text-rose-700">
            Agotado
          </span>
        ) : (
          orderingEnabled && (
            <button
              type="button"
              onClick={() => onAddToCart(item)}
              className="mt-2 text-xs font-black underline decoration-[var(--store-accent)] decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--store-accent-secondary)]"
            >
              Agregar
            </button>
          )
        )}
      </div>
    </article>
  );
}

function ConfettiFooter({
  store,
  schedule,
}: Pick<StoreViewProps, "store" | "schedule">) {
  return (
    <footer className="relative overflow-hidden border-t-2 [border-color:color-mix(in_srgb,var(--store-text)_10%,transparent)] [background-color:color-mix(in_srgb,var(--store-accent-secondary)_20%,transparent)] px-5 py-10 sm:px-10 sm:py-14">
      <div
        aria-hidden="true"
        className="absolute -right-16 top-6 h-40 w-40 rounded-full border-[1.6rem] [border-color:color-mix(in_srgb,var(--store-accent)_28%,transparent)]"
      />
      <div className="relative mx-auto max-w-5xl">
        <h2 className="max-w-xl text-3xl font-black leading-[0.95] tracking-[-0.04em] sm:text-5xl">
          Encuéntranos cuando quieras.
        </h2>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--store-muted)]">
          Consulta horarios, escríbenos o abre la ubicación para planear tu
          visita.
        </p>
        <div className="mt-9 grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
          <ConfettiSchedule schedule={schedule} />
          <ConfettiContact store={store} />
        </div>
      </div>
    </footer>
  );
}

function ConfettiSchedule({ schedule }: { schedule: ScheduleEntry[] }) {
  return (
    <section
      aria-labelledby="confetti-schedule-title"
      className="border-y-2 [border-color:color-mix(in_srgb,var(--store-text)_15%,transparent)] py-5"
    >
      <h3 id="confetti-schedule-title" className="text-xl font-black">
        Horarios
      </h3>
      {schedule.length ? (
        <dl className="mt-5 divide-y [divide-color:color-mix(in_srgb,var(--store-text)_12%,transparent)]">
          {schedule.map(([day, value]) => (
            <div
              key={day}
              className="flex items-baseline justify-between gap-4 py-3 text-sm"
            >
              <dt className="font-bold">{formatDayName(day)}</dt>
              <dd
                className={
                  value === "closed"
                    ? "font-black text-rose-700"
                    : "font-black text-[var(--store-text)]"
                }
              >
                {value === "closed" ? "Cerrado" : formatScheduleTime(value)}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-4 text-sm leading-6 text-[var(--store-muted)]">
          Consulta la disponibilidad directamente con el negocio.
        </p>
      )}
    </section>
  );
}

function ConfettiContact({ store }: { store: StoreData }) {
  const contact = store.contact;
  const location = getValidLocation(store.location);
  const hasContact =
    contact?.whatsapp || contact?.instagram || contact?.address || location;

  if (!hasContact) return null;

  return (
    <section aria-labelledby="confetti-contact-title">
      <h3 id="confetti-contact-title" className="text-xl font-black">
        Contacto y ubicación
      </h3>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {contact?.whatsapp && (
          <a
            href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[1.35rem] bg-[var(--store-accent)] px-5 py-4 text-center text-sm font-black text-[var(--store-on-accent)] transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--store-accent-secondary)] motion-reduce:transform-none motion-reduce:transition-none"
          >
            Escribir por WhatsApp
          </a>
        )}
        {contact?.instagram && (
          <a
            href={`https://instagram.com/${contact.instagram.replace("@", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[1.35rem] border-2 [border-color:color-mix(in_srgb,var(--store-text)_18%,transparent)] bg-[var(--store-surface)] px-5 py-4 text-center text-sm font-black transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--store-accent-secondary)] motion-reduce:transform-none motion-reduce:transition-none"
          >
            Ver Instagram
          </a>
        )}
      </div>
      {!location && contact?.address && (
        <p className="mt-5 text-sm font-semibold text-[var(--store-muted)]">
          {contact.address}
        </p>
      )}
      {location && (
        <div className="mt-5 overflow-hidden rounded-[1.75rem] border-2 [border-color:color-mix(in_srgb,var(--store-text)_15%,transparent)] bg-[var(--store-surface)] p-2 shadow-[0_18px_38px_color-mix(in_srgb,var(--store-text)_14%,transparent)]">
          <LocationMap
            location={location}
            className="h-64 w-full rounded-[1.25rem]"
            title={`Ubicación de ${store.name}`}
          />
          <div className="flex flex-col gap-3 px-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-[var(--store-muted)]">
              {contact?.address || "Ubicación del negocio"}
            </p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-sm font-black underline decoration-[var(--store-accent)] decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--store-accent-secondary)]"
            >
              Abrir en Google Maps
            </a>
          </div>
        </div>
      )}
    </section>
  );
}

function MinimalLayout(props: StoreViewProps) {
  const { store, schedule, isOpen, onAddToCart } = props;
  const itemCount = store.categories.reduce(
    (count, category) => count + category.items.length,
    0,
  );
  const heroItem = store.items.find((item) => item.imageUrl);

  return (
    <main className="min-h-screen bg-[var(--store-bg)] text-[var(--store-text)] selection:bg-[var(--store-accent)] selection:text-[var(--store-on-accent)]">
      <MinimalHero
        store={store}
        isOpen={isOpen}
        itemCount={itemCount}
        heroItem={heroItem}
      />
      <section
        id="minimal-catalog"
        className="px-5 py-12 sm:px-10 lg:px-16 lg:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <MinimalCategoryNav store={store} />
          {store.categories.length ? (
            <div className="mt-14 space-y-20 lg:mt-20 lg:space-y-28">
              {store.categories.map((category) => (
                <MinimalCategorySection
                  key={category.id}
                  store={store}
                  category={category}
                  onAddToCart={onAddToCart}
                />
              ))}
            </div>
          ) : (
            <EmptyMenu />
          )}
        </div>
      </section>
      <MinimalServicePanel store={store} schedule={schedule} />
    </main>
  );
}

function MinimalHero({
  store,
  isOpen,
  itemCount,
  heroItem,
}: {
  store: StoreData;
  isOpen: boolean | null;
  itemCount: number;
  heroItem?: PublicItem;
}) {
  return (
    <header className="border-b border-[var(--store-text)]/20 px-5 py-8 sm:px-10 sm:py-12 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--store-text)]/20 pb-4 text-sm">
          <span>{itemCount} productos</span>
          {isOpen !== null && (
            <span className="inline-flex items-center gap-2 font-bold">
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${isOpen ? "bg-emerald-600" : "bg-rose-700"}`}
              />
              {isOpen ? "Abierto ahora" : "Cerrado ahora"}
            </span>
          )}
        </div>
        <div
          className={`grid items-end gap-10 pb-4 pt-12 sm:pt-16 ${heroItem ? "lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]" : "max-w-5xl"}`}
        >
          <div className="min-w-0">
            {store.logoUrl && (
              <div className="mb-10 flex min-h-28 w-full max-w-sm items-center justify-start border-y border-[var(--store-text)]/25 py-5">
                <img
                  src={store.logoUrl}
                  alt={`Logo de ${store.name}`}
                  className="max-h-28 w-full object-contain object-left [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.48))_drop-shadow(0_-1px_1px_rgba(255,255,255,0.5))]"
                />
              </div>
            )}
            <h1 className="max-w-4xl break-words text-6xl font-semibold leading-[0.88] tracking-[-0.04em] [text-wrap:balance] sm:text-8xl">
              {store.name}
            </h1>
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("minimal-catalog")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="mt-8 min-h-11 bg-[var(--store-text)] px-5 py-3 text-sm font-bold text-[var(--store-bg)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--store-accent)]/35"
            >
              Ver catálogo
            </button>
          </div>
          {heroItem?.imageUrl && (
            <figure className="border-t border-[var(--store-text)]/20 pt-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <img
                src={heroItem.imageUrl}
                alt={heroItem.name}
                fetchPriority="high"
                className="aspect-[4/3] w-full bg-[var(--store-surface)] object-contain"
              />
              <figcaption className="mt-3 grid gap-2 text-sm sm:flex sm:items-start sm:justify-between sm:gap-5">
                <span className="break-words font-semibold">
                  {heroItem.name}
                </span>
                <span className="tabular-nums sm:shrink-0">
                  {formatPrice(heroItem.price, store.currency)}
                </span>
              </figcaption>
            </figure>
          )}
        </div>
      </div>
    </header>
  );
}

function MinimalCategoryNav({ store }: { store: StoreContentModel }) {
  if (!store.categories.length) return null;
  return (
    <nav
      aria-label="Categorías"
      className="flex gap-6 overflow-x-auto border-b border-[var(--store-text)]/20 pb-4 text-sm"
    >
      {store.categories.map((category) => (
        <a
          key={category.id}
          href={`#category-${category.id}`}
          className="shrink-0 font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--store-accent)]"
        >
          {category.name}
        </a>
      ))}
    </nav>
  );
}

function MinimalCategorySection({
  store,
  category,
  onAddToCart,
}: {
  store: StoreData;
  category: PublicCategory;
  onAddToCart: (item: PublicItem) => void;
}) {
  return (
    <section
      id={`category-${category.id}`}
      className="scroll-mt-8 border-t border-[var(--store-text)]/30 pt-6 lg:grid lg:grid-cols-[minmax(12rem,0.48fr)_minmax(0,1.52fr)] lg:gap-16 lg:pt-8"
    >
      <div className="mb-8 lg:mb-0">
        <h2 className="max-w-md break-words text-4xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-5xl">
          {category.name}
        </h2>
        <p className="mt-3 text-sm text-[var(--store-muted)]">
          {category.items.length}{" "}
          {category.items.length === 1 ? "producto" : "productos"}
        </p>
      </div>
      {category.items.length ? (
        <div className="divide-y divide-[var(--store-text)]/15 border-b border-[var(--store-text)]/20">
          {category.items.map((item) => (
            <MinimalProduct
              key={item.id}
              item={item}
              store={store}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      ) : (
        <p className="border-y border-[var(--store-text)]/20 py-6 text-sm text-[var(--store-muted)]">
          No hay productos en esta categoría.
        </p>
      )}
    </section>
  );
}

function MinimalProduct({
  item,
  store,
  onAddToCart,
}: {
  item: PublicItem;
  store: StoreData;
  onAddToCart: (item: PublicItem) => void;
}) {
  const { orderingOpen } = usePublicOrderCart();
  const soldOut = isSoldOut(item);
  const orderingEnabled =
    orderingOpen &&
    (store.capabilities?.inStoreOrdering ||
      store.capabilities?.deliveryOrdering);

  return (
    <article
      className={`grid gap-4 py-6 sm:gap-6 ${item.imageUrl ? "sm:grid-cols-[6rem_minmax(0,1fr)_auto]" : "sm:grid-cols-[minmax(0,1fr)_auto]"}`}
    >
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt={item.name}
          loading="lazy"
          className={`aspect-square w-24 bg-[var(--store-surface)] object-contain ${soldOut ? "opacity-45" : ""}`}
        />
      )}
      <div className="min-w-0">
        <h3 className="break-words text-xl font-semibold leading-tight">
          {item.name}
        </h3>
        {item.description && (
          <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-[var(--store-muted)]">
            {item.description}
          </p>
        )}
      </div>
      <div className="flex flex-col items-start gap-2 sm:block sm:min-w-28 sm:text-right">
        <p className="font-semibold tabular-nums">
          {formatPrice(item.price, store.currency)}
        </p>
        {soldOut ? (
          <p className="text-sm font-bold text-[var(--store-text)] sm:mt-3">
            Agotado
          </p>
        ) : (
          orderingEnabled && (
            <button
              type="button"
              onClick={() => onAddToCart(item)}
              className="min-h-11 border-b-2 border-[var(--store-accent)] px-1 text-sm font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--store-accent)]/35 sm:mt-3"
            >
              Agregar
            </button>
          )
        )}
      </div>
    </article>
  );
}

function MinimalServicePanel({
  store,
  schedule,
}: {
  store: StoreData;
  schedule: ScheduleEntry[];
}) {
  const contact = store.contact;
  const location = getValidLocation(store.location);
  const hasContact = Boolean(
    contact?.whatsapp || contact?.instagram || contact?.address,
  );

  return (
    <footer className="border-t border-[var(--store-text)]/20 bg-[var(--store-text)] px-5 py-14 text-[var(--store-bg)] sm:px-10 lg:px-16 lg:py-20">
      <div className="mx-auto max-w-7xl">
        {(schedule.length > 0 || hasContact) && (
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
            {schedule.length > 0 && (
              <section>
                <h2 className="text-2xl font-semibold">Horarios</h2>
                <dl className="mt-6 divide-y divide-[var(--store-bg)]/15 border-y border-[var(--store-bg)]/20">
                  {schedule.map(([day, value]) => (
                    <div
                      key={day}
                      className="flex justify-between gap-5 py-3 text-sm"
                    >
                      <dt>{formatDayName(day)}</dt>
                      <dd className="text-right font-semibold">
                        {value === "closed"
                          ? "Cerrado"
                          : formatScheduleTime(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
            {hasContact && (
              <section>
                <h2 className="text-2xl font-semibold">Contacto</h2>
                <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm">
                  {contact?.whatsapp && (
                    <a
                      href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-[var(--store-accent)] decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--store-accent)]"
                    >
                      WhatsApp
                    </a>
                  )}
                  {contact?.instagram && (
                    <a
                      href={`https://instagram.com/${contact.instagram.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-[var(--store-accent)] decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--store-accent)]"
                    >
                      Instagram
                    </a>
                  )}
                </div>
                {contact?.address && (
                  <p className="mt-5 max-w-xl break-words text-sm leading-6 text-[var(--store-bg)]/75">
                    {contact.address}
                  </p>
                )}
              </section>
            )}
          </div>
        )}
        {location && (
          <section className="mt-12 border-t border-[var(--store-bg)]/20 pt-7">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-2xl font-semibold">Ubicación</h2>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-bold underline decoration-[var(--store-accent)] decoration-2 underline-offset-4"
              >
                Abrir en Google Maps
              </a>
            </div>
            <LocationMap
              location={location}
              className="h-64 w-full sm:h-80"
              title={`Ubicación de ${store.name}`}
            />
          </section>
        )}
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--store-bg)]/20 pt-5 text-sm">
          <span>{store.name}</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
}

function NaturalLayout(props: StoreViewProps) {
  const { store, schedule, isOpen, onAddToCart } = props;
  const heroItem =
    store.items.find((item) => item.imageUrl && !isSoldOut(item)) ||
    store.items.find((item) => item.imageUrl);

  return (
    <main className="min-h-screen bg-[var(--store-bg)] text-[var(--store-text)] selection:bg-[var(--store-accent)] selection:text-[var(--store-on-accent)]">
      <NaturalHero store={store} isOpen={isOpen} heroItem={heroItem} />
      <NaturalCategoryNav store={store} />
      <section
        id="natural-catalog"
        className="px-5 py-16 sm:px-10 lg:px-16 lg:py-24"
      >
        <div className="mx-auto max-w-7xl">
          {store.categories.length ? (
            <div className="space-y-24 lg:space-y-32">
              {store.categories.map((category, index) => (
                <NaturalCategory
                  key={category.id}
                  store={store}
                  category={category}
                  index={index}
                  onAddToCart={onAddToCart}
                />
              ))}
            </div>
          ) : (
            <EmptyMenu />
          )}
        </div>
      </section>
      <NaturalServicePanel store={store} schedule={schedule} />
    </main>
  );
}

function NaturalHero({
  store,
  isOpen,
  heroItem,
}: {
  store: StoreData;
  isOpen: boolean | null;
  heroItem?: PublicItem;
}) {
  return (
    <header className="relative isolate overflow-hidden border-b border-[var(--store-text)]/15 px-5 py-10 sm:px-10 sm:py-14 lg:px-16 lg:py-20">
      <NaturalBotanicalLines className="pointer-events-none absolute -left-20 -top-16 h-80 w-80 -rotate-12 text-[var(--store-accent)] opacity-20" />
      <NaturalBotanicalLines className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rotate-[145deg] text-[var(--store-accent-secondary)] opacity-15" />
      <div
        className={`relative mx-auto grid max-w-7xl items-center gap-12 ${heroItem ? "lg:grid-cols-[minmax(0,0.92fr)_minmax(22rem,1.08fr)]" : "max-w-5xl"}`}
      >
        <div className="min-w-0">
          {store.logoUrl && (
            <div className="mb-10 flex min-h-32 w-full max-w-md items-center justify-start border-y [border-color:color-mix(in_srgb,var(--store-accent)_45%,transparent)] bg-[var(--store-surface)]/80 px-6 py-5 shadow-[0_20px_55px_color-mix(in_srgb,var(--store-text)_10%,transparent)]">
              <img
                src={store.logoUrl}
                alt={`Logo de ${store.name}`}
                className="max-h-32 w-full object-contain object-left [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.48))_drop-shadow(0_-1px_1px_rgba(255,255,255,0.5))]"
              />
            </div>
          )}
          <h1 className="max-w-4xl break-words text-6xl font-semibold leading-[0.88] tracking-[-0.04em] [text-wrap:balance] sm:text-8xl">
            {store.name}
          </h1>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            {isOpen !== null && (
              <span className="inline-flex min-h-11 items-center gap-2 border border-[var(--store-text)]/30 bg-[var(--store-surface)] px-4 py-2 text-sm font-bold">
                <span
                  aria-hidden="true"
                  className={`h-2.5 w-2.5 rounded-full ${isOpen ? "bg-emerald-600" : "bg-rose-700"}`}
                />
                {isOpen ? "Abierto ahora" : "Cerrado ahora"}
              </span>
            )}
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("natural-catalog")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="min-h-11 bg-[var(--store-text)] px-5 py-3 text-sm font-bold text-[var(--store-bg)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--store-accent)]/35"
            >
              Explorar catálogo
            </button>
          </div>
        </div>
        {heroItem?.imageUrl && (
          <figure className="relative border border-[var(--store-text)]/15 bg-[var(--store-surface)] p-3 shadow-[0_30px_80px_color-mix(in_srgb,var(--store-text)_16%,transparent)] sm:p-5">
            <NaturalBotanicalLines className="pointer-events-none absolute -bottom-10 -left-12 h-36 w-36 rotate-12 text-[var(--store-accent)] opacity-35" />
            <img
              src={heroItem.imageUrl}
              alt={heroItem.name}
              fetchPriority="high"
              className="relative aspect-[4/3] w-full object-contain"
            />
            <figcaption className="relative mt-4 grid gap-2 border-t border-[var(--store-text)]/15 pt-4 text-sm sm:flex sm:items-start sm:justify-between sm:gap-5">
              <span className="break-words font-semibold">{heroItem.name}</span>
              <span className="grid gap-1 tabular-nums sm:shrink-0 sm:text-right">
                {formatPrice(heroItem.price, store.currency)}
                {isSoldOut(heroItem) && (
                  <strong className="text-xs">Agotado</strong>
                )}
              </span>
            </figcaption>
          </figure>
        )}
      </div>
    </header>
  );
}

function NaturalBotanicalLines({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 260 320" className={className}>
      <path
        d="M126 305C119 217 128 126 183 18M132 244c-50-10-84-43-96-92 48 2 85 24 105 66M151 174c7-51 34-89 79-113 7 48-9 91-57 124M121 278c-39 3-71-12-96-45 35-15 72-6 99 21"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NaturalCategoryNav({ store }: { store: StoreContentModel }) {
  if (!store.categories.length) return null;
  return (
    <nav
      aria-label="Categorías"
      className="sticky top-0 z-30 border-b border-[var(--store-text)]/15 bg-[var(--store-bg)]/95 px-5 py-4 backdrop-blur-sm sm:px-10 lg:px-16"
    >
      <div className="mx-auto flex max-w-7xl gap-6 overflow-x-auto pb-1 text-sm">
        {store.categories.map((category) => (
          <a
            key={category.id}
            href={`#category-${category.id}`}
            className="shrink-0 font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--store-accent)]"
          >
            {category.name}
          </a>
        ))}
      </div>
    </nav>
  );
}

function NaturalCategory({
  store,
  category,
  index,
  onAddToCart,
}: {
  store: StoreData;
  category: PublicCategory;
  index: number;
  onAddToCart: (item: PublicItem) => void;
}) {
  return (
    <section
      id={`category-${category.id}`}
      className="relative scroll-mt-24 border-t border-[var(--store-text)]/20 pt-8 lg:grid lg:grid-cols-[minmax(13rem,0.45fr)_minmax(0,1.55fr)] lg:gap-16"
    >
      <div className="relative mb-10 lg:mb-0">
        <NaturalBotanicalLines
          className={`pointer-events-none absolute -left-12 top-12 h-40 w-40 text-[var(--store-accent)] opacity-15 ${index % 2 ? "-scale-x-100" : ""}`}
        />
        <div className="relative">
          <h2 className="max-w-md break-words text-4xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-5xl">
            {category.name}
          </h2>
          <p className="mt-4 text-sm text-[var(--store-text)]">
            {category.items.length}{" "}
            {category.items.length === 1 ? "producto" : "productos"}
          </p>
        </div>
      </div>
      {category.items.length ? (
        <div className="grid gap-x-8 gap-y-10 md:grid-cols-2">
          {category.items.map((item) => (
            <NaturalProduct
              key={item.id}
              item={item}
              store={store}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      ) : (
        <p className="border-y border-[var(--store-text)]/20 py-6 text-sm text-[var(--store-text)]">
          No hay productos en esta categoría.
        </p>
      )}
    </section>
  );
}

function NaturalProduct({
  item,
  store,
  onAddToCart,
}: {
  item: PublicItem;
  store: StoreData;
  onAddToCart: (item: PublicItem) => void;
}) {
  const { orderingOpen } = usePublicOrderCart();
  const soldOut = isSoldOut(item);
  const orderingEnabled =
    orderingOpen &&
    (store.capabilities?.inStoreOrdering ||
      store.capabilities?.deliveryOrdering);
  return (
    <article className="border-t border-[var(--store-text)]/25 pt-5">
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt={item.name}
          loading="lazy"
          className={`mb-5 aspect-[4/3] w-full bg-[var(--store-surface)] object-contain ${soldOut ? "opacity-45" : ""}`}
        />
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="break-words text-xl font-semibold leading-tight">
            {item.name}
          </h3>
          {item.description && (
            <p className="mt-2 break-words text-sm leading-6 text-[var(--store-text)]">
              {item.description}
            </p>
          )}
        </div>
        <p className="shrink-0 font-semibold tabular-nums">
          {formatPrice(item.price, store.currency)}
        </p>
      </div>
      {soldOut ? (
        <p className="mt-4 text-sm font-bold">Agotado</p>
      ) : (
        orderingEnabled && (
          <button
            type="button"
            onClick={() => onAddToCart(item)}
            className="mt-4 min-h-11 border-b-2 border-[var(--store-accent)] px-1 text-sm font-bold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--store-accent)]/35"
          >
            Agregar
          </button>
        )
      )}
    </article>
  );
}

function NaturalServicePanel({
  store,
  schedule,
}: Pick<StoreViewProps, "store" | "schedule">) {
  const contact = store.contact;
  const location = getValidLocation(store.location);
  const hasContact = Boolean(
    contact?.whatsapp || contact?.instagram || contact?.address,
  );
  return (
    <footer className="relative isolate overflow-hidden border-t border-[var(--store-text)]/15 bg-[var(--store-surface)] px-5 py-16 sm:px-10 lg:px-16 lg:py-24">
      <NaturalBotanicalLines className="pointer-events-none absolute -bottom-28 -right-16 h-96 w-96 rotate-[160deg] text-[var(--store-accent)] opacity-10" />
      <div className="relative mx-auto max-w-7xl">
        {(schedule.length > 0 || hasContact) && (
          <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
            {schedule.length > 0 && (
              <section>
                <h2 className="text-3xl font-semibold">Horarios</h2>
                <dl className="mt-6 divide-y divide-[var(--store-text)]/15 border-y border-[var(--store-text)]/20">
                  {schedule.map(([day, value]) => (
                    <div
                      key={day}
                      className="flex justify-between gap-5 py-3 text-sm"
                    >
                      <dt>{formatDayName(day)}</dt>
                      <dd className="text-right font-semibold">
                        {value === "closed"
                          ? "Cerrado"
                          : formatScheduleTime(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
            {hasContact && (
              <section>
                <h2 className="text-3xl font-semibold">Contacto</h2>
                <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm">
                  {contact?.whatsapp && (
                    <a
                      href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-[var(--store-accent)] decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--store-accent)]"
                    >
                      WhatsApp
                    </a>
                  )}
                  {contact?.instagram && (
                    <a
                      href={`https://instagram.com/${contact.instagram.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-[var(--store-accent)] decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--store-accent)]"
                    >
                      Instagram
                    </a>
                  )}
                </div>
                {contact?.address && (
                  <p className="mt-5 max-w-xl break-words text-sm leading-6 text-[var(--store-text)]">
                    {contact.address}
                  </p>
                )}
              </section>
            )}
          </div>
        )}
        {location && (
          <section className="mt-14 border-t border-[var(--store-text)]/20 pt-8">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-3xl font-semibold">Ubicación</h2>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-bold underline decoration-[var(--store-accent)] decoration-2 underline-offset-4"
              >
                Abrir en Google Maps
              </a>
            </div>
            <LocationMap
              location={location}
              className="h-72 w-full sm:h-96"
              title={`Ubicación de ${store.name}`}
            />
          </section>
        )}
        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--store-text)]/20 pt-5 text-sm">
          <span>{store.name}</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
}

function WarmLayout(props: StoreViewProps) {
  const { store, schedule, isOpen, onAddToCart } = props;
  const featured = getFeaturedItems(store);

  return (
    <main className="min-h-screen bg-[var(--store-bg)] text-[var(--store-text)] selection:bg-[var(--store-accent)] selection:text-[var(--store-on-accent)]">
      <WarmHero store={store} isOpen={isOpen} featured={featured} />
      <section
        id="warm-catalog"
        className="px-4 py-12 sm:px-8 lg:px-12 lg:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <WarmCategoryNav store={store} />
          {store.categories.length ? (
            <div className="mt-12 space-y-12 lg:mt-16 lg:space-y-16">
              {store.categories.map((category, index) => (
                <WarmCategoryChapter
                  key={category.id}
                  store={store}
                  category={category}
                  index={index}
                  onAddToCart={onAddToCart}
                />
              ))}
            </div>
          ) : (
            <EmptyMenu />
          )}
        </div>
      </section>
      <WarmServiceDeck store={store} schedule={schedule} />
    </main>
  );
}

function WarmHero({
  store,
  isOpen,
  featured,
}: {
  store: StoreData;
  isOpen: boolean | null;
  featured: PublicItem[];
}) {
  const photographs = featured
    .filter((item) => item.imageUrl)
    .sort((left, right) => Number(isSoldOut(left)) - Number(isSoldOut(right)))
    .slice(0, 3);
  const heroItem = photographs[0];
  const supportingItems = photographs
    .filter((item) => item.id !== heroItem?.id)
    .slice(0, 2);

  return (
    <header className="relative isolate overflow-hidden bg-[var(--store-text)] px-5 py-10 text-[var(--store-bg)] sm:px-10 sm:py-14 lg:px-16 lg:py-20">
      <WarmWeave className="pointer-events-none absolute -right-24 -top-20 h-[34rem] w-[34rem] text-[var(--store-accent)] opacity-15" />
      <div className="relative mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.88fr)_minmax(24rem,1.12fr)]">
          <div className="min-w-0">
            {store.logoUrl && (
              <div className="mb-10 flex min-h-32 w-full max-w-md items-center justify-start border-y border-[var(--store-bg)]/30 bg-[var(--store-surface)] px-6 py-5 shadow-[0_22px_55px_rgba(0,0,0,0.24)]">
                <img
                  src={store.logoUrl}
                  alt={`Logo de ${store.name}`}
                  className="max-h-32 w-full object-contain object-left [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.48))_drop-shadow(0_-1px_1px_rgba(255,255,255,0.5))]"
                />
              </div>
            )}
            <h1 className="max-w-4xl break-words text-6xl font-semibold leading-[0.88] tracking-[-0.04em] [text-wrap:balance] sm:text-8xl">
              {store.name}
            </h1>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              {isOpen !== null && (
                <span className="inline-flex min-h-11 items-center gap-2 border border-[var(--store-bg)]/35 px-4 py-2 text-sm font-bold">
                  <span
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 rounded-full ${isOpen ? "bg-emerald-400" : "bg-rose-400"}`}
                  />
                  {isOpen ? "Abierto ahora" : "Cerrado ahora"}
                </span>
              )}
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("warm-catalog")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="min-h-11 bg-[var(--store-bg)] px-5 py-3 text-sm font-bold text-[var(--store-text)] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--store-accent)]/45"
              >
                Explorar catálogo
              </button>
            </div>
          </div>
          <div className="relative">
            {heroItem?.imageUrl ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-5">
                <figure className="col-span-2 border border-[var(--store-bg)]/20 bg-[var(--store-surface)] p-3 text-[var(--store-text)] shadow-[0_30px_70px_rgba(0,0,0,0.28)] sm:p-4 lg:col-span-1 lg:row-span-2">
                  <img
                    src={heroItem.imageUrl}
                    alt={heroItem.name}
                    fetchPriority="high"
                    className="aspect-[4/3] w-full object-contain lg:aspect-[4/5]"
                  />
                  <figcaption className="mt-3 grid gap-1 border-t border-[var(--store-text)]/15 pt-3 text-sm">
                    <span className="break-words font-semibold">
                      {heroItem.name}
                    </span>
                    <span className="tabular-nums">
                      {formatPrice(heroItem.price, store.currency)}
                    </span>
                    {isSoldOut(heroItem) && (
                      <strong className="text-xs">Agotado</strong>
                    )}
                  </figcaption>
                </figure>
                {supportingItems.map((item) => (
                  <figure
                    key={item.id}
                    className="border border-[var(--store-bg)]/20 bg-[var(--store-surface)] p-2 text-[var(--store-text)] shadow-[0_18px_45px_rgba(0,0,0,0.2)]"
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      loading="lazy"
                      className={`aspect-square w-full object-contain ${isSoldOut(item) ? "opacity-45" : ""}`}
                    />
                    <figcaption className="mt-2 break-words text-xs font-semibold">
                      <span>{item.name}</span>
                      {isSoldOut(item) && (
                        <strong className="mt-1 block">Agotado</strong>
                      )}
                    </figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <div className="flex min-h-80 items-center justify-center border border-[var(--store-bg)]/20 bg-[var(--store-bg)]/5">
                <WarmWeave className="h-72 w-72 text-[var(--store-accent)] opacity-55" />
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function WarmWeave({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 320 320" className={className}>
      <path
        d="M18 52C87 4 143 102 214 54c39-27 63-27 90-9M13 111c65-46 126 47 198 5 44-26 70-26 99-7M9 171c74-48 125 42 200 4 41-21 70-20 103-3M17 230c65-37 126 35 190 2 43-22 74-20 102-7M25 285c56-27 112 25 176 3 39-14 70-12 98-1"
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path
        d="M54 18c-42 73 47 126 3 203-20 35-18 64-9 87M118 12c-36 70 38 126 4 201-17 38-13 71-4 96M181 9c-30 70 32 128 3 201-14 36-10 70-2 100M245 15c-25 66 24 121 2 191-13 40-7 74 1 102"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        opacity=".72"
      />
    </svg>
  );
}

function WarmCategoryNav({ store }: { store: StoreContentModel }) {
  if (!store.categories.length) return null;
  return (
    <nav
      aria-label="Categorías"
      className="flex gap-6 overflow-x-auto border-y border-[var(--store-text)]/20 py-4 text-sm"
    >
      {store.categories.map((category) => (
        <a
          key={category.id}
          href={`#category-${category.id}`}
          className="shrink-0 font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--store-accent)]"
        >
          {category.name}
        </a>
      ))}
    </nav>
  );
}

function WarmCategoryChapter({
  store,
  category,
  index,
  onAddToCart,
}: {
  store: StoreData;
  category: PublicCategory;
  index: number;
  onAddToCart: (item: PublicItem) => void;
}) {
  const inverted = index % 2 === 1;
  return (
    <section
      id={`category-${category.id}`}
      className={`scroll-mt-8 overflow-hidden rounded-[2.5rem] border border-[var(--store-text)]/15 shadow-[0_24px_65px_color-mix(in_srgb,var(--store-text)_13%,transparent)] ${inverted ? "bg-[var(--store-accent-soft)]" : "bg-[var(--store-surface)]"}`}
    >
      <header
        className={`relative overflow-hidden px-6 py-8 sm:px-10 sm:py-10 ${inverted ? "bg-[var(--store-text)] text-[var(--store-bg)]" : "bg-[var(--store-accent)] text-[var(--store-on-accent)]"}`}
      >
        <WarmWeave className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 opacity-15" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="max-w-3xl break-words text-4xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-5xl">
            {category.name}
          </h2>
          <p className="w-fit shrink-0 bg-[var(--store-bg)] px-3 py-2 text-sm font-semibold text-[var(--store-text)]">
            {category.items.length}{" "}
            {category.items.length === 1 ? "producto" : "productos"}
          </p>
        </div>
      </header>
      <div className="p-5 sm:p-8 lg:p-10">
        {category.items.length ? (
          <div className="divide-y divide-[var(--store-text)]/15 border-b border-[var(--store-text)]/15">
            {category.items.map((item) => (
              <WarmMenuItem
                key={item.id}
                item={item}
                store={store}
                onAddToCart={onAddToCart}
              />
            ))}
          </div>
        ) : (
          <p className="border-y border-[var(--store-text)]/20 py-6 text-sm">
            No hay productos en esta categoría.
          </p>
        )}
      </div>
    </section>
  );
}

function WarmMenuItem({
  item,
  store,
  onAddToCart,
}: {
  item: PublicItem;
  store: StoreData;
  onAddToCart: (item: PublicItem) => void;
}) {
  const { orderingOpen } = usePublicOrderCart();
  const soldOut = isSoldOut(item);
  const orderingEnabled =
    orderingOpen &&
    (store.capabilities?.inStoreOrdering ||
      store.capabilities?.deliveryOrdering);
  return (
    <article
      className={`grid gap-5 py-6 sm:py-7 ${item.imageUrl ? "sm:grid-cols-[8rem_minmax(0,1fr)_auto]" : "sm:grid-cols-[minmax(0,1fr)_auto]"}`}
    >
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt={item.name}
          loading="lazy"
          className={`aspect-square w-32 bg-[var(--store-bg)] object-contain ${soldOut ? "opacity-45" : ""}`}
        />
      )}
      <div className="min-w-0">
        <h3 className="break-words text-xl font-semibold leading-tight sm:text-2xl">
          {item.name}
        </h3>
        {item.description && (
          <p className="mt-2 max-w-2xl break-words text-sm leading-6">
            {item.description}
          </p>
        )}
      </div>
      <div className="flex flex-col items-start gap-2 sm:block sm:min-w-32 sm:text-right">
        <p className="font-semibold tabular-nums">
          {formatPrice(item.price, store.currency)}
        </p>
        {soldOut ? (
          <p className="text-sm font-bold sm:mt-3">Agotado</p>
        ) : (
          orderingEnabled && (
            <button
              type="button"
              onClick={() => onAddToCart(item)}
              className="min-h-11 border-b-2 border-[var(--store-accent)] px-1 text-sm font-bold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--store-accent)]/35 sm:mt-3"
            >
              Agregar
            </button>
          )
        )}
      </div>
    </article>
  );
}

function WarmServiceDeck({
  store,
  schedule,
}: {
  store: StoreData;
  schedule: ScheduleEntry[];
}) {
  const contact = store.contact;
  const location = getValidLocation(store.location);
  const hasContact = Boolean(
    contact?.whatsapp || contact?.instagram || contact?.address,
  );
  return (
    <footer className="relative isolate overflow-hidden border-t border-[var(--store-text)]/15 bg-[var(--store-accent-soft)] px-5 py-16 sm:px-10 lg:px-16 lg:py-24">
      <WarmWeave className="pointer-events-none absolute -bottom-28 -left-24 h-96 w-96 text-[var(--store-accent)] opacity-10" />
      <div className="relative mx-auto max-w-7xl">
        {(schedule.length > 0 || hasContact) && (
          <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
            {schedule.length > 0 && (
              <section>
                <h2 className="text-3xl font-semibold">Horarios</h2>
                <dl className="mt-6 divide-y divide-[var(--store-text)]/15 border-y border-[var(--store-text)]/20">
                  {schedule.map(([day, value]) => (
                    <div
                      key={day}
                      className="flex justify-between gap-5 py-3 text-sm"
                    >
                      <dt>{formatDayName(day)}</dt>
                      <dd className="text-right font-semibold">
                        {value === "closed"
                          ? "Cerrado"
                          : formatScheduleTime(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
            {hasContact && (
              <section>
                <h2 className="text-3xl font-semibold">Contacto</h2>
                <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm">
                  {contact?.whatsapp && (
                    <a
                      href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-[var(--store-accent)] decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--store-accent)]"
                    >
                      WhatsApp
                    </a>
                  )}
                  {contact?.instagram && (
                    <a
                      href={`https://instagram.com/${contact.instagram.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-[var(--store-accent)] decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--store-accent)]"
                    >
                      Instagram
                    </a>
                  )}
                </div>
                {contact?.address && (
                  <p className="mt-5 max-w-xl break-words text-sm leading-6">
                    {contact.address}
                  </p>
                )}
              </section>
            )}
          </div>
        )}
        {location && (
          <section className="mt-14 border-t border-[var(--store-text)]/20 pt-8">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-3xl font-semibold">Ubicación</h2>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-bold underline decoration-[var(--store-accent)] decoration-2 underline-offset-4"
              >
                Abrir en Google Maps
              </a>
            </div>
            <LocationMap
              location={location}
              className="h-72 w-full sm:h-96"
              title={`Ubicación de ${store.name}`}
            />
          </section>
        )}
        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--store-text)]/20 pt-5 text-sm">
          <span>{store.name}</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
}

function ElegantLayout(props: StoreViewProps) {
  const { store, schedule, isOpen, onAddToCart } = props;
  const featured = store.categories.flatMap((category) => category.items);

  return (
    <main className="min-h-screen bg-[var(--store-bg)] text-[var(--store-text)] selection:bg-[var(--store-accent)] selection:text-[var(--store-on-accent)]">
      <ElegantHero store={store} isOpen={isOpen} featured={featured} />
      <ElegantCategoryNav store={store} />
      <div
        id="elegant-catalog"
        className="mx-auto max-w-[90rem] px-5 py-14 sm:px-8 lg:px-12 lg:py-24"
      >
        {store.categories.length ? (
          <div className="border-t border-[var(--store-text)]/25">
            {store.categories.map((category) => (
              <ElegantCategorySection
                key={category.id}
                store={store}
                category={category}
                onAddToCart={onAddToCart}
              />
            ))}
          </div>
        ) : (
          <EmptyMenu />
        )}
      </div>
      <ElegantServiceFolio store={store} schedule={schedule} />
    </main>
  );
}

function ElegantHero({
  store,
  isOpen,
  featured,
}: {
  store: StoreData;
  isOpen: boolean | null;
  featured: PublicItem[];
}) {
  const featuredItem = featured
    .filter((item) => item.imageUrl)
    .sort(
      (left, right) => Number(isSoldOut(left)) - Number(isSoldOut(right)),
    )[0];

  return (
    <header className="relative isolate overflow-hidden bg-[var(--store-text)] text-[var(--store-bg)]">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-10 [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:4rem_4rem]"
      />
      <div className="relative mx-auto max-w-[90rem] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
        <div className="flex items-center justify-between gap-6 border-b border-[var(--store-bg)]/25 pb-5 text-sm">
          <span className="break-words font-semibold">{store.name}</span>
          {isOpen !== null && (
            <span className="flex shrink-0 items-center gap-2 font-semibold">
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${isOpen ? "bg-[var(--store-accent)]" : "bg-[var(--store-bg)]/35"}`}
              />
              {isOpen ? "Abierto ahora" : "Cerrado ahora"}
            </span>
          )}
        </div>
        <div
          className={`grid gap-12 py-12 lg:items-center lg:py-20 ${featuredItem?.imageUrl ? "lg:grid-cols-[minmax(0,1.05fr)_minmax(24rem,0.95fr)]" : ""}`}
        >
          <div className="min-w-0">
            {store.logoUrl && (
              <div className="mb-10 flex min-h-32 w-full max-w-[24rem] items-center justify-start bg-[var(--store-surface)] px-6 py-5 shadow-[0_24px_60px_rgba(0,0,0,0.24)]">
                <img
                  src={store.logoUrl}
                  alt={`Logo de ${store.name}`}
                  className="max-h-32 w-full object-contain object-left [filter:drop-shadow(0_1px_1px_rgba(0,0,0,0.48))_drop-shadow(0_-1px_1px_rgba(255,255,255,0.5))]"
                />
              </div>
            )}
            <h1 className="max-w-5xl break-words text-6xl font-semibold leading-[0.88] tracking-[-0.04em] [text-wrap:balance] sm:text-8xl">
              {store.name}
            </h1>
            <div className="mt-9 flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
              {store.contact?.address && (
                <p className="max-w-xl break-words text-sm leading-6">
                  {store.contact.address}
                </p>
              )}
              <a
                href="#elegant-catalog"
                className="inline-flex min-h-11 shrink-0 items-center border-b-2 border-[var(--store-accent)] px-1 py-2 text-sm font-bold underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--store-bg)]"
              >
                Ver catálogo
              </a>
            </div>
          </div>
          {featuredItem?.imageUrl && (
            <figure className="bg-[var(--store-surface)] p-3 text-[var(--store-text)] shadow-[0_30px_80px_rgba(0,0,0,0.28)] sm:p-5">
              <div className="overflow-hidden bg-[var(--store-bg)]">
                <img
                  src={featuredItem.imageUrl}
                  alt={featuredItem.name}
                  fetchPriority="high"
                  className={`aspect-[4/3] w-full object-contain transition duration-700 ease-out hover:scale-[1.025] motion-reduce:transition-none ${isSoldOut(featuredItem) ? "opacity-45" : ""}`}
                />
              </div>
              <figcaption className="mt-4 flex flex-col gap-2 border-t border-[var(--store-text)]/20 pt-4 text-sm sm:flex-row sm:items-start sm:justify-between">
                <span className="break-words font-semibold">
                  {featuredItem.name}
                </span>
                <span className="flex shrink-0 items-center gap-3 tabular-nums">
                  <span>{formatPrice(featuredItem.price, store.currency)}</span>
                  {isSoldOut(featuredItem) && <strong>Agotado</strong>}
                </span>
              </figcaption>
            </figure>
          )}
        </div>
      </div>
    </header>
  );
}

function ElegantCategoryNav({ store }: { store: StoreContentModel }) {
  if (!store.categories.length) return null;
  return (
    <nav
      aria-label="Categorías"
      className="sticky top-0 z-30 border-b border-[var(--store-text)]/20 bg-[var(--store-bg)]"
    >
      <div className="mx-auto flex max-w-[90rem] gap-7 overflow-x-auto px-5 py-4 text-sm sm:px-8 lg:px-12">
        {store.categories.map((category) => (
          <a
            key={category.id}
            href={`#category-${category.id}`}
            className="shrink-0 font-semibold underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--store-text)]"
          >
            {category.name}
          </a>
        ))}
      </div>
    </nav>
  );
}

function ElegantCategorySection({
  store,
  category,
  onAddToCart,
}: {
  store: StoreData;
  category: PublicCategory;
  onAddToCart: (item: PublicItem) => void;
}) {
  return (
    <section
      id={`category-${category.id}`}
      className="scroll-mt-20 border-b border-[var(--store-text)]/25 py-10 lg:grid lg:grid-cols-[minmax(13rem,0.32fr)_minmax(0,1fr)] lg:gap-12 lg:py-16"
    >
      <header className="mb-8 lg:mb-0">
        <h2 className="max-w-md break-words text-4xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-5xl">
          {category.name}
        </h2>
        <p className="mt-4 text-sm font-semibold">
          {category.items.length}{" "}
          {category.items.length === 1 ? "producto" : "productos"}
        </p>
      </header>
      {category.items.length ? (
        <div className="divide-y divide-[var(--store-text)]/20 border-t border-[var(--store-text)]/20">
          {category.items.map((item) => (
            <ElegantMenuItem
              key={item.id}
              store={store}
              item={item}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      ) : (
        <p className="border-y border-[var(--store-text)]/20 py-6 text-sm">
          No hay productos en esta categoría.
        </p>
      )}
    </section>
  );
}

function ElegantMenuItem({
  store,
  item,
  onAddToCart,
}: {
  store: StoreData;
  item: PublicItem;
  onAddToCart: (item: PublicItem) => void;
}) {
  const { orderingOpen } = usePublicOrderCart();
  const soldOut = isSoldOut(item);
  const orderingEnabled =
    orderingOpen &&
    (store.capabilities?.inStoreOrdering ||
      store.capabilities?.deliveryOrdering);

  return (
    <article
      className={`grid gap-5 py-7 sm:py-8 ${item.imageUrl ? "sm:grid-cols-[9rem_minmax(0,1fr)_auto]" : "sm:grid-cols-[minmax(0,1fr)_auto]"}`}
    >
      {item.imageUrl && (
        <div className="overflow-hidden bg-[var(--store-surface)]">
          <img
            src={item.imageUrl}
            alt={item.name}
            loading="lazy"
            className={`aspect-square w-full object-contain transition duration-500 ease-out hover:scale-[1.03] motion-reduce:transition-none ${soldOut ? "opacity-45" : ""}`}
          />
        </div>
      )}
      <div className="min-w-0">
        <h3 className="break-words text-xl font-semibold leading-tight sm:text-2xl">
          {item.name}
        </h3>
        {item.description && (
          <p className="mt-3 max-w-2xl break-words text-sm leading-6">
            {item.description}
          </p>
        )}
      </div>
      <div className="flex flex-col items-start gap-2 sm:min-w-36 sm:items-end sm:text-right">
        <p className="font-semibold tabular-nums">
          {formatPrice(item.price, store.currency)}
        </p>
        {soldOut ? (
          <strong className="text-sm">Agotado</strong>
        ) : (
          orderingEnabled && (
            <button
              type="button"
              onClick={() => onAddToCart(item)}
              aria-label={`Agregar ${item.name} al pedido`}
              className="min-h-11 border-b-2 border-[var(--store-accent)] px-1 py-2 text-sm font-bold underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--store-text)]"
            >
              Agregar
            </button>
          )
        )}
      </div>
    </article>
  );
}

function ElegantServiceFolio({
  store,
  schedule,
}: {
  store: StoreData;
  schedule: ScheduleEntry[];
}) {
  const contact = store.contact;
  const location = getValidLocation(store.location);
  const hasContact = Boolean(
    contact?.whatsapp || contact?.instagram || contact?.address,
  );
  const hasDetails = schedule.length > 0 || hasContact;

  return (
    <footer className="bg-[var(--store-text)] px-5 py-16 text-[var(--store-bg)] sm:px-8 lg:px-12 lg:py-24">
      <div className="mx-auto max-w-[90rem]">
        {hasDetails && (
          <div className="grid gap-14 border-t border-[var(--store-bg)]/25 pt-10 lg:grid-cols-2 lg:gap-20">
            {schedule.length > 0 && (
              <section>
                <h2 className="text-3xl font-semibold">Horarios</h2>
                <dl className="mt-7 divide-y divide-[var(--store-bg)]/20 border-y border-[var(--store-bg)]/25">
                  {schedule.map(([day, value]) => (
                    <div
                      key={day}
                      className="flex justify-between gap-5 py-3 text-sm"
                    >
                      <dt>{formatDayName(day)}</dt>
                      <dd className="text-right font-semibold">
                        {value === "closed"
                          ? "Cerrado"
                          : formatScheduleTime(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
            {hasContact && (
              <section>
                <h2 className="text-3xl font-semibold">Contacto</h2>
                <div className="mt-7 flex flex-wrap gap-x-7 gap-y-4 text-sm">
                  {contact?.whatsapp && (
                    <a
                      href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-[var(--store-accent)] decoration-2 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--store-bg)]"
                    >
                      WhatsApp
                    </a>
                  )}
                  {contact?.instagram && (
                    <a
                      href={`https://instagram.com/${contact.instagram.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-[var(--store-accent)] decoration-2 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--store-bg)]"
                    >
                      Instagram
                    </a>
                  )}
                </div>
                {contact?.address && (
                  <p className="mt-6 max-w-xl break-words text-sm leading-6">
                    {contact.address}
                  </p>
                )}
              </section>
            )}
          </div>
        )}
        {location && (
          <section
            className={`${hasDetails ? "mt-16" : ""} border-t border-[var(--store-bg)]/25 pt-10`}
          >
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-3xl font-semibold">Ubicación</h2>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-bold underline decoration-[var(--store-accent)] decoration-2 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--store-bg)]"
              >
                Abrir en Google Maps
              </a>
            </div>
            <LocationMap
              location={location}
              className="h-72 w-full sm:h-96"
              title={`Ubicación de ${store.name}`}
            />
          </section>
        )}
        <div
          className={`${hasDetails || location ? "mt-16" : ""} flex flex-wrap items-center justify-between gap-4 border-t border-[var(--store-bg)]/25 pt-6 text-sm`}
        >
          <span className="break-words font-semibold">{store.name}</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </div>
    </footer>
  );
}

function CategoryNav({ store }: { store: StoreContentModel }) {
  if (!store.navigation.length) return null;
  return (
    <nav
      aria-label="Categorías"
      className="mb-7 flex gap-2 overflow-x-auto border-y border-[var(--store-border)] py-3"
    >
      <span className="shrink-0 text-xs font-bold uppercase tracking-[.16em] text-[var(--store-muted)]">
        Explorar
      </span>
      {store.navigation.map((category) => (
        <a
          key={category.id}
          href={`#category-${category.id}`}
          className="shrink-0 rounded-full border border-[var(--store-border)] px-3 py-1 text-xs font-bold transition hover:border-[var(--store-accent)] hover:text-[var(--store-accent)]"
        >
          {category.label}
        </a>
      ))}
    </nav>
  );
}

function formatScheduleTime(value: string) {
  const match = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/.exec(value);
  if (!match) return value;

  const formatTime = (hours: string, minutes: string) => {
    const hour = Number(hours);
    const suffix = hour < 12 ? "a. m." : "p. m.";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${suffix}`;
  };

  return `${formatTime(match[1], match[2])} – ${formatTime(match[3], match[4])}`;
}

function EmptyMenu() {
  return (
    <section className="rounded-3xl border border-dashed border-[var(--store-border)] bg-[var(--store-surface)] p-12 text-center text-[var(--store-text)]">
      No hay productos disponibles
    </section>
  );
}

function getFeaturedItems(store: StoreData): PublicItem[] {
  return store.categories.flatMap((category) => category.items).slice(0, 4);
}

function isSoldOut(item: PublicItem) {
  return item.trackStock && typeof item.stock === "number" && item.stock <= 0;
}
