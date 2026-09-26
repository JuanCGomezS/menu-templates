import { useEffect, useState } from "react";
import { formatDayName, formatPrice, sortScheduleDays } from "../../lib/utils";
import { getStoreOpeningStatus } from "../../lib/store-hours";
import { getPublicStoreBySlug } from "../../lib/public-store-data";
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

type StoreData = PublicStore;
type ScheduleEntry = [string, string];

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

        const publicStore = await getPublicStoreBySlug(slug);

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
        setError("Error al cargar la tienda");
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
  const contentModel = normalizeStoreContent(store);
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
  const template = getTemplateComponent(contentModel.templateId || "");
  const schedule = contentModel.schedule
    ? sortScheduleDays(contentModel.schedule)
    : [];
  const opening = getStoreOpeningStatus(contentModel.schedule, contentModel.timeZone || "America/Bogota");
  const isOpen = opening.isOpen;
  const content = (
    <><StoreTemplateContent
      store={contentModel}
      schedule={schedule}
      theme={theme}
      isOpen={isOpen}
      template={template}
    />{!opening.isOpen && <StoreClosedNotice message={opening.message} />}</>
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
  return <aside className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-xl border border-[#ffb08a] bg-[#101828] p-4 text-white shadow-2xl"><p className="font-black">El negocio está cerrado</p><p className="mt-1 text-sm text-white/75">{message || "Puedes explorar la carta y volver cuando abramos."}</p></aside>;
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
    <ThemeFrame theme={theme}>
      <Layout
        store={store}
        schedule={schedule}
        theme={theme}
        isOpen={isOpen}
        onAddToCart={addItem}
      />
    </ThemeFrame>
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
          "--store-on-accent": "#ffffff",
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

function MinimalLayout(props: StoreViewProps) {
  const { store, schedule, theme, isOpen, onAddToCart } = props;
  const itemCount = store.categories.reduce(
    (count, category) => count + category.items.length,
    0,
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff7f0] px-3 py-3 text-slate-900 sm:px-5 sm:py-5">
      <div
        aria-hidden="true"
        className="absolute -left-20 top-80 h-64 w-64 rounded-full bg-[#bcebe2]/60 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -right-20 top-[38rem] h-72 w-72 rounded-full bg-[#ffced1]/55 blur-3xl"
      />
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2.25rem] border-4 border-slate-900 bg-[#fffdf8] shadow-[0_28px_80px_rgba(71,48,53,0.16)] sm:rounded-[3rem]">
        <MinimalHero
          store={store}
          theme={theme}
          isOpen={isOpen}
          itemCount={itemCount}
        />
        <section className="relative px-4 py-8 sm:px-8 sm:py-12 lg:px-12">
          <div
            aria-hidden="true"
            className="absolute left-4 top-8 h-14 w-14 rounded-full border-2 border-dashed border-[#f3bd51] opacity-70 sm:left-8"
          />
          <div
            aria-hidden="true"
            className="absolute right-4 top-32 h-9 w-9 rotate-12 rounded-[35%_65%_60%_40%] bg-[var(--store-accent)]/20 sm:right-10"
          />
          <div className="relative">
            <CategoryNav store={store} />
            {store.categories.length ? (
              <div className="space-y-7 sm:space-y-10">
                {store.categories.map((category, index) => (
                  <PosterCategorySection
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
        <MinimalInfoFooter store={store} schedule={schedule} />
      </div>
    </main>
  );
}

function MinimalHero({
  store,
  theme,
  isOpen,
  itemCount,
}: {
  store: StoreData;
  theme: ThemeConfig;
  isOpen: boolean | null;
  itemCount: number;
}) {
  const themeBadge = getThemeBadge(theme);

  return (
    <header className="relative overflow-hidden text-center">
      <div
        aria-hidden="true"
        className="h-12 border-b-4 border-slate-900 bg-[repeating-linear-gradient(90deg,#f5a8ac_0_38px,#fff8ee_38px_76px)] sm:h-16 sm:bg-[repeating-linear-gradient(90deg,#f5a8ac_0_58px,#fff8ee_58px_116px)]"
      />
      <div className="relative px-5 pb-10 pt-8 sm:px-10 sm:pb-14 sm:pt-11">
        <div
          aria-hidden="true"
          className="absolute left-[8%] top-8 h-16 w-16 rounded-[48%_52%_37%_63%] bg-[#bcebe2] sm:h-24 sm:w-24"
        />
        <div
          aria-hidden="true"
          className="absolute right-[9%] top-14 h-11 w-11 rotate-12 rounded-full bg-[#f6d86b] sm:h-16 sm:w-16"
        />
        {store.logoUrl && (
          <img
            src={store.logoUrl}
            alt={`Logo de ${store.name}`}
            className="relative mx-auto mb-4 h-20 w-20 rounded-2xl border border-slate-900/15 bg-[#fffdf8] object-contain p-1"
          />
        )}
        <p className="relative font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-slate-600">
          Selección de la casa
        </p>
        <h1 className="relative mx-auto mt-4 max-w-3xl break-words font-serif text-5xl font-black leading-[0.82] tracking-[-0.06em] [text-wrap:balance] sm:text-7xl lg:text-8xl">
          {store.name}
        </h1>
        <div className="relative mx-auto mt-6 flex max-w-xl flex-wrap items-center justify-center gap-2.5 text-sm font-semibold text-slate-700">
          <span className="rounded-full bg-[#bcebe2] px-3 py-1.5">
            {itemCount} opciones
          </span>
          {themeBadge && (
            <span className="rounded-full border border-slate-900/15 bg-[var(--store-accent)]/15 px-3 py-1.5">
              {themeBadge}
            </span>
          )}
          {isOpen !== null && (
            <span
              className={`rounded-full px-3 py-1.5 ${isOpen ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-800"}`}
            >
              {isOpen ? "Abierto ahora" : "Cerrado ahora"}
            </span>
          )}
        </div>
        {store.contact?.address && (
          <p className="relative mt-4 text-sm font-medium text-slate-600">
            {store.contact.address}
          </p>
        )}
      </div>
    </header>
  );
}

function PosterCategorySection({
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
  const panelClasses = ["bg-[#ffdfe0]", "bg-[#d9f3ef]", "bg-[#fff0ad]"];

  return (
    <section
      id={`category-${category.id}`}
      className={`relative overflow-hidden rounded-[2rem] border-2 border-slate-900 px-4 py-6 shadow-[5px_6px_0_#172033] sm:rounded-[2.5rem] sm:px-7 sm:py-8 ${panelClasses[index % panelClasses.length]}`}
    >
      <div
        aria-hidden="true"
        className={`absolute -right-5 -top-5 h-20 w-20 rounded-full border-2 border-slate-900/15 ${index % 2 ? "bg-[#f6d86b]" : "bg-[var(--store-accent)]/20"}`}
      />
      <div className="relative mb-6 flex items-end justify-between gap-4 border-b-2 border-slate-900/80 pb-4">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
            {String(index + 1).padStart(2, "0")} · Para elegir
          </p>
          <h2 className="mt-1 break-words font-serif text-3xl font-black leading-none tracking-[-0.04em] sm:text-4xl">
            {category.name}
          </h2>
        </div>
        <span className="shrink-0 rounded-full border-2 border-slate-900 bg-[#fffdf8] px-3 py-1 text-xs font-black">
          {category.items.length}
        </span>
      </div>
      {category.items.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {category.items.map((item, itemIndex) => (
            <PosterMenuItem
              key={item.id}
              item={item}
              store={store}
              imageOnRight={(itemIndex + index) % 2 === 1}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border-2 border-dashed border-slate-900/35 bg-[#fffdf8]/70 p-5 text-center font-semibold text-slate-600">
          No hay productos en esta categoría
        </p>
      )}
    </section>
  );
}

function PosterMenuItem({
  item,
  store,
  imageOnRight,
  onAddToCart,
}: {
  item: PublicItem;
  store: StoreData;
  imageOnRight: boolean;
  onAddToCart: (item: PublicItem) => void;
}) {
  const soldOut =
    item.trackStock && typeof item.stock === "number" && item.stock <= 0;
  const orderingEnabled =
    store.capabilities?.inStoreOrdering || store.capabilities?.deliveryOrdering;

  return (
    <article
      className={`group grid min-w-0 gap-4 rounded-[1.6rem] border-2 border-slate-900 bg-[#fffdf8] p-4 shadow-[3px_4px_0_rgba(23,32,51,0.85)] transition-transform hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none ${item.imageUrl ? "grid-cols-[minmax(0,1fr)_5.5rem] sm:grid-cols-[minmax(0,1fr)_7rem]" : ""} ${soldOut ? "opacity-60" : ""}`}
    >
      <div className={`min-w-0 ${imageOnRight ? "order-2" : ""}`}>
        <div className="flex items-start justify-between gap-3">
          <h3 className="break-words text-lg font-black leading-tight tracking-[-0.025em]">
            {item.name}
          </h3>
          <span className="shrink-0 rounded-full bg-slate-900 px-2.5 py-1 text-xs font-black text-white">
            {formatPrice(item.price, store.currency)}
          </span>
        </div>
        {item.description && (
          <p className="mt-2 break-words text-sm leading-5 text-slate-600">
            {item.description}
          </p>
        )}
        {soldOut ? (
          <p className="mt-3 text-sm font-black text-red-700">Agotado</p>
        ) : (
          orderingEnabled && (
            <button
              type="button"
              onClick={() => onAddToCart(item)}
              className="mt-3 rounded-full border-2 border-slate-900 bg-[#f6d86b] px-3 py-1.5 text-xs font-black text-slate-900 transition hover:bg-[var(--store-accent)]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              Agregar
            </button>
          )
        )}
      </div>
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt={item.name}
          className={`aspect-square min-h-[5.5rem] w-full self-center border-2 border-slate-900 object-cover shadow-[2px_3px_0_rgba(23,32,51,0.8)] sm:min-h-[7rem] ${imageOnRight ? "order-1 rounded-[62%_38%_58%_42%]" : "rounded-[38%_62%_42%_58%]"}`}
          loading="lazy"
        />
      )}
    </article>
  );
}

function MinimalInfoFooter({
  store,
  schedule,
}: {
  store: StoreData;
  schedule: ScheduleEntry[];
}) {
  return (
    <footer className="border-t-4 border-slate-900 bg-[#bcebe2] px-4 py-8 sm:px-8 sm:py-10 lg:px-12">
      <div className="grid gap-4 md:grid-cols-2">
        <ContactActions store={store} variant="minimal" />
        <ScheduleCard schedule={schedule} variant="minimal" />
      </div>
      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-slate-900/20 pt-5 text-sm font-medium text-slate-700">
        <span>
          {store.contact?.address || "Hecho para compartir buenos momentos."}
        </span>
        <span>
          © {new Date().getFullYear()} {store.name}
        </span>
      </div>
    </footer>
  );
}

function NaturalLayout(props: StoreViewProps) {
  const { store, schedule, isOpen } = props;

  return (
    <main className="min-h-screen overflow-hidden bg-[var(--store-bg)] text-[var(--store-text)]">
      <StoreHero
        store={store}
        isOpen={isOpen}
        align="left"
        badge="Fresco · Natural · Artesanal"
        variant="natural"
      />
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <div className="grid gap-6 lg:grid-cols-[19rem_1fr]">
          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-[2rem] border border-white/80 bg-white/75 p-5 shadow-[0_18px_55px_rgba(6,78,59,0.10)] ring-1 ring-emerald-100/70 backdrop-blur">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[var(--store-accent)]">
                Del día
              </p>
              <p className="mt-3 text-2xl font-black leading-tight text-emerald-950">
                Ingredientes frescos, preparados con calma.
              </p>
              <p className="mt-3 text-sm leading-6 text-emerald-900/70">
                Una carta simple de leer, con secciones claras y productos
                destacados sin ruido visual.
              </p>
            </div>
            <ContactActions store={store} variant="natural" />
            <ScheduleCard schedule={schedule} variant="natural" />
          </aside>
          <CategoryNav store={store} />
          <CategoryList store={store} variant="natural" />
        </div>
      </div>
      <StoreFooter store={store} />
    </main>
  );
}

function WarmLayout(props: StoreViewProps) {
  const { store, schedule, theme, isOpen, onAddToCart } = props;
  const featured = getFeaturedItems(store);

  return (
    <main className="min-h-screen overflow-hidden bg-[#17130f] text-[#271b13]">
      <WarmHero
        store={store}
        theme={theme}
        isOpen={isOpen}
        featured={featured}
        onAddToCart={onAddToCart}
      />
      <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8 lg:pt-12">
        <div
          aria-hidden="true"
          className="absolute left-0 top-24 hidden h-72 w-72 rounded-full bg-[var(--store-accent)]/15 blur-3xl lg:block"
        />
        {store.categories.length ? (
          <div className="relative space-y-8 lg:space-y-12">
            <CategoryNav store={store} />
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
          <div className="relative">
            <EmptyMenu />
          </div>
        )}
        <WarmServiceDeck store={store} schedule={schedule} />
      </div>
      <footer className="border-t border-[#f6e7c7]/15 px-4 py-8 text-center text-sm text-[#f6e7c7]/60">
        © {new Date().getFullYear()} {store.name}. Todos los derechos
        reservados.
      </footer>
    </main>
  );
}

function WarmHero({
  store,
  theme,
  isOpen,
  featured,
  onAddToCart,
}: {
  store: StoreData;
  theme: ThemeConfig;
  isOpen: boolean | null;
  featured: PublicItem[];
  onAddToCart: (item: PublicItem) => void;
}) {
  const heroItem = featured.find((item) => item.imageUrl) || featured[0];
  const supportingItems = featured
    .filter((item) => item.id !== heroItem?.id)
    .slice(0, 2);
  const themeBadge = getThemeBadge(theme);
  const orderingEnabled =
    store.capabilities?.inStoreOrdering || store.capabilities?.deliveryOrdering;

  return (
    <header className="relative isolate min-h-[38rem] overflow-hidden border-b border-[#f5dba3]/20 bg-[#17130f] px-4 pb-16 pt-5 text-[#fff8eb] sm:min-h-[42rem] sm:px-6 lg:min-h-[43rem] lg:px-8">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(193,132,51,0.27),transparent_23%),radial-gradient(circle_at_17%_85%,rgba(111,50,20,0.34),transparent_35%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#17130f] to-transparent"
      />
      <div className="relative mx-auto max-w-7xl">
        <div className="flex items-center justify-between gap-4 border-b border-[#f5dba3]/25 pb-4 text-[10px] font-bold uppercase tracking-[0.22em] text-[#f5dba3]/80 sm:text-xs">
          <span>La mesa de la casa</span>
          <span className="hidden sm:block">Cocina · Encuentro · Sabor</span>
          {themeBadge && (
            <span className="rounded-full border border-[var(--store-accent)]/50 bg-[var(--store-accent)]/15 px-3 py-1 text-[#fff8eb]">
              {themeBadge}
            </span>
          )}
        </div>
        <div className="grid items-center gap-10 pt-12 lg:grid-cols-[0.78fr_1.22fr] lg:pt-16">
          <div className="relative z-10 max-w-xl lg:pb-20">
            {store.logoUrl && (
              <img
                src={store.logoUrl}
                alt={`Logo de ${store.name}`}
                className="mb-5 h-20 w-20 border border-[#f5dba3]/40 bg-[#fff8eb] object-contain p-1"
              />
            )}
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-[#f1c978]">
              Cocina con carácter
            </p>
            <h1 className="mt-5 break-words font-serif text-5xl font-semibold leading-[0.9] tracking-[-0.055em] [text-wrap:balance] sm:text-7xl lg:text-8xl">
              {store.name}
            </h1>
            <div className="mt-7 flex flex-wrap items-center gap-2 text-sm">
              {isOpen !== null && (
                <span
                  className={`rounded-full border px-3 py-1.5 font-bold ${isOpen ? "border-emerald-300/45 bg-emerald-200/10 text-emerald-100" : "border-red-300/40 bg-red-200/10 text-red-100"}`}
                >
                  {isOpen ? "Abierto ahora" : "Cerrado ahora"}
                </span>
              )}
              {store.contact?.address && (
                <span className="max-w-full truncate text-[#f6e7c7]/75">
                  {store.contact.address}
                </span>
              )}
            </div>
            <p className="mt-8 max-w-md text-base leading-7 text-[#f6e7c7]/75">
              Una carta pensada para sentarse, compartir y volver por ese plato
              que se queda en la memoria.
            </p>
            {heroItem && orderingEnabled && !isSoldOut(heroItem) && (
              <button
                type="button"
                onClick={() => onAddToCart(heroItem)}
                className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#f1c978] px-5 py-3 text-sm font-black text-[#1e150e] shadow-[0_12px_35px_rgba(0,0,0,0.35)] transition hover:-translate-y-0.5 hover:bg-[#ffd98a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fff8eb] focus-visible:ring-offset-2 focus-visible:ring-offset-[#17130f] motion-reduce:transform-none motion-reduce:transition-none"
              >
                Pedir {heroItem.name}
                <span aria-hidden="true">→</span>
              </button>
            )}
          </div>
          <div className="relative mx-auto w-full max-w-2xl pb-4 pt-2 lg:pb-0">
            <div
              aria-hidden="true"
              className="absolute -right-8 top-4 h-[82%] w-[72%] border border-[#f5dba3]/25 bg-[#261b13] sm:-right-12"
            />
            <article className="relative w-[83%] overflow-hidden border border-[#f5dba3]/40 bg-[#2a1b12] p-2 shadow-[0_30px_70px_rgba(0,0,0,0.5)] sm:p-3">
              {heroItem?.imageUrl ? (
                <img
                  src={heroItem.imageUrl}
                  alt={heroItem.name}
                  className="aspect-[4/5] w-full object-cover"
                  fetchPriority="high"
                />
              ) : (
                <img
                  src={withBasePath("/menu-art-placeholder.svg")}
                  alt="Especialidades de la casa"
                  className="aspect-[4/5] w-full object-cover"
                />
              )}
              <div className="absolute inset-x-2 bottom-2 bg-gradient-to-t from-[#170f0a]/90 via-[#170f0a]/35 to-transparent p-5 sm:inset-x-3 sm:bottom-3 sm:p-7">
                <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#f3d48f]">
                  Selección del chef
                </p>
                <p className="mt-2 text-2xl font-semibold text-white sm:text-3xl">
                  {heroItem?.name || "Especial de la casa"}
                </p>
                {heroItem && (
                  <p className="mt-1 text-sm font-bold text-[#f3d48f]">
                    {formatPrice(heroItem.price, store.currency)}
                  </p>
                )}
              </div>
            </article>
            {supportingItems.map((item, index) => (
              <article
                key={item.id}
                className={`absolute z-10 hidden w-[40%] overflow-hidden border border-[#f5dba3]/40 bg-[#f7efe0] p-1.5 text-[#271b13] shadow-[0_22px_45px_rgba(0,0,0,0.45)] sm:block ${index === 0 ? "right-0 top-[13%] rotate-[7deg]" : "bottom-0 right-[7%] -rotate-[5deg]"}`}
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="aspect-[4/3] w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="aspect-[4/3] bg-[var(--store-accent)]/20" />
                )}
                <div className="p-3">
                  <p className="truncate font-serif text-lg font-semibold">
                    {item.name}
                  </p>
                  <p className="mt-1 text-xs font-bold text-[#80551e]">
                    {formatPrice(item.price, store.currency)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </header>
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
      className={`grid overflow-hidden border border-[#d5bd91] shadow-[0_20px_50px_rgba(0,0,0,0.18)] lg:grid-cols-[0.35fr_0.65fr] ${inverted ? "bg-[#d9c097]" : "bg-[#f9f3e7]"}`}
    >
      <header
        className={`relative flex min-h-52 flex-col justify-between overflow-hidden p-6 sm:p-9 ${inverted ? "bg-[#302016] text-[#fff8eb] lg:order-2" : "bg-[#e8d7b5] text-[#291b13]"}`}
      >
        <div
          aria-hidden="true"
          className="absolute -bottom-16 -right-12 h-48 w-48 rounded-full border-[18px] border-[var(--store-accent)]/25"
        />
        <p
          className={`relative text-[10px] font-bold uppercase tracking-[0.28em] ${inverted ? "text-[#f1c978]" : "text-[#80551e]"}`}
        >
          Carta de la casa
        </p>
        <div className="relative mt-8">
          <span className="font-mono text-sm opacity-60">
            {String(index + 1).padStart(2, "0")}
          </span>
          <h2 className="mt-3 break-words font-serif text-4xl font-semibold leading-none tracking-[-0.04em] sm:text-5xl">
            {category.name}
          </h2>
        </div>
        <p className="relative mt-7 text-sm font-semibold opacity-70">
          {category.items.length}{" "}
          {category.items.length === 1 ? "elección" : "elecciones"}
        </p>
      </header>
      <div
        className={`p-4 sm:p-7 ${inverted ? "bg-[#f2e7d2]" : "bg-[#fffaf1]"}`}
      >
        {category.items.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
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
          <p className="border border-dashed border-[#8b6a3e]/40 p-6 text-center text-[#765831]">
            No hay productos en esta categoría
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
  const soldOut = isSoldOut(item);
  const orderingEnabled =
    store.capabilities?.inStoreOrdering || store.capabilities?.deliveryOrdering;

  return (
    <article
      className={`group grid min-w-0 grid-cols-[1fr_5.75rem] gap-4 border border-[#d7c19b] bg-[#fffdf8] p-3 shadow-[0_8px_20px_rgba(73,47,20,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(73,47,20,0.14)] motion-reduce:transform-none motion-reduce:transition-none sm:grid-cols-[1fr_7rem] ${soldOut ? "opacity-55" : ""}`}
    >
      <div className="min-w-0 py-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="break-words font-serif text-xl font-semibold leading-tight">
            {item.name}
          </h3>
          <span className="shrink-0 font-mono text-xs font-bold text-[#80551e]">
            {formatPrice(item.price, store.currency)}
          </span>
        </div>
        {item.description && (
          <p className="mt-2 line-clamp-3 break-words text-sm leading-5 text-[#6f5941]">
            {item.description}
          </p>
        )}
        {soldOut ? (
          <p className="mt-3 text-xs font-black uppercase tracking-wider text-red-700">
            Agotado
          </p>
        ) : (
          orderingEnabled && (
            <button
              type="button"
              onClick={() => onAddToCart(item)}
              className="mt-3 text-xs font-black uppercase tracking-[0.13em] text-[#523617] underline decoration-[var(--store-accent)] decoration-2 underline-offset-4 transition hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#523617] focus-visible:ring-offset-2"
            >
              Agregar al pedido
            </button>
          )
        )}
      </div>
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.name}
          className="aspect-square h-full min-h-[5.75rem] w-full object-cover sm:min-h-[7rem]"
          loading="lazy"
        />
      ) : (
        <div
          aria-hidden="true"
          className="aspect-square min-h-[5.75rem] bg-[linear-gradient(135deg,rgba(183,130,55,0.3),rgba(255,250,241,0.9))] sm:min-h-[7rem]"
        />
      )}
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
  const hasContact = Boolean(
    store.contact?.whatsapp || store.contact?.instagram,
  );
  const hasSchedule = schedule.length > 0;

  if (!hasContact && !hasSchedule) return null;

  return (
    <section className="relative mt-8 grid gap-px overflow-hidden border border-[#f5dba3]/25 bg-[#f5dba3]/25 shadow-[0_20px_50px_rgba(0,0,0,0.2)] md:grid-cols-2 lg:mt-12">
      {hasContact && (
        <div className="bg-[#251a12] p-6 text-[#fff8eb] sm:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#f1c978]">
            A un mensaje de distancia
          </p>
          <div className="mt-5">
            <ContactActions store={store} variant="warm" />
          </div>
        </div>
      )}
      {hasSchedule && (
        <div className="bg-[#f5ead7] p-6 text-[#281b13] sm:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#80551e]">
            Encuentra tu momento
          </p>
          <div className="mt-5">
            <ScheduleCard schedule={schedule} variant="warm-light" />
          </div>
        </div>
      )}
    </section>
  );
}

function ElegantLayout(props: StoreViewProps) {
  const { store, schedule, isOpen } = props;

  return (
    <main className="min-h-screen bg-[var(--store-text)] text-[var(--store-surface)]">
      <StoreHero
        store={store}
        isOpen={isOpen}
        align="center"
        badge="Selección especial"
        variant="elegant"
      />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <ContactActions store={store} variant="elegant" />
          <ScheduleCard schedule={schedule} variant="elegant" />
        </div>
        <CategoryNav store={store} />
        <CategoryList store={store} variant="elegant" />
      </div>
      <StoreFooter store={store} />
    </main>
  );
}

function StoreHero({
  store,
  isOpen,
  align,
  badge,
  variant = "minimal",
}: {
  store: StoreData;
  isOpen: boolean | null;
  align: "left" | "center";
  badge?: string;
  variant?: "minimal" | "natural" | "warm" | "elegant";
}) {
  const isWarm = variant === "warm";
  const isElegant = variant === "elegant";
  const isNatural = variant === "natural";

  if (isNatural) {
    return (
      <header className="relative overflow-hidden px-4 py-6 md:py-8">
        <div
          aria-hidden="true"
          className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-emerald-300/30 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute right-0 top-10 h-64 w-64 rounded-full bg-orange-200/45 blur-3xl"
        />
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-8 rounded-[2.5rem] border border-white/80 bg-white/78 p-5 shadow-[0_28px_90px_rgba(6,78,59,0.14)] ring-1 ring-emerald-100/80 backdrop-blur md:p-8 lg:grid-cols-[1.02fr_0.98fr]">
          <div>
            <div className="mb-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-[var(--store-accent)] px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-[var(--store-on-accent)]">
                Plantilla Natural
              </span>
            </div>
            {badge && (
              <p className="mb-3 text-sm font-black uppercase tracking-[0.28em] text-[var(--store-accent)]">
                {badge}
              </p>
            )}
            <h1 className="break-words text-5xl font-black leading-none tracking-tight text-emerald-950 [text-wrap:balance] md:text-7xl">
              {store.name}
            </h1>
            {store.contact?.address && (
              <p className="mt-4 text-lg leading-7 text-emerald-900/70">
                📍 {store.contact.address}
              </p>
            )}

            {isOpen !== null && (
              <p
                className={`mt-6 inline-flex rounded-full px-4 py-2 text-sm font-black shadow-sm ${isOpen ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"}`}
              >
                {isOpen ? "Abierto ahora" : "Cerrado ahora"}
              </p>
            )}
          </div>
          <MenuPoster variant={variant} store={store} />
        </div>
      </header>
    );
  }

  return (
    <header
      className={`relative overflow-hidden px-4 py-12 md:py-16 ${isWarm ? "bg-[#111111]" : isElegant ? "bg-[#32180b]" : isNatural ? "bg-transparent" : "bg-[#fffaf0]"} shadow-sm`}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-3 bg-[var(--store-accent)]"
      />
      {isWarm && (
        <div
          aria-hidden="true"
          className="absolute -right-32 top-10 h-80 w-80 rounded-full bg-orange-500/30 blur-3xl"
        />
      )}
      {isNatural && (
        <div
          aria-hidden="true"
          className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-emerald-300/30 blur-3xl"
        />
      )}
      {isElegant && (
        <div
          aria-hidden="true"
          className="absolute inset-x-10 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent"
        />
      )}
      <div
        className={`relative z-10 mx-auto grid max-w-6xl items-center gap-10 ${variant === "minimal" ? "lg:grid-cols-[1.05fr_0.95fr]" : "lg:grid-cols-[0.95fr_1.05fr]"} ${align === "center" ? "text-center lg:text-left" : "text-left"}`}
      >
        <div>
          {badge && (
            <p
              className={`mb-4 text-sm font-black uppercase tracking-[0.28em] ${isWarm || isElegant ? "text-orange-300" : "text-[var(--store-accent)]"}`}
            >
              {badge}
            </p>
          )}
          <h1
            className={`break-words font-black tracking-tight [text-wrap:balance] ${isWarm ? "text-6xl uppercase leading-none text-white md:text-8xl" : isElegant ? "text-5xl leading-tight text-amber-50 md:text-7xl" : "text-5xl text-stone-950 md:text-7xl"}`}
          >
            {store.name}
          </h1>
          {store.contact?.address && (
            <p
              className={`mt-4 text-lg ${isWarm || isElegant ? "text-white/70" : "text-gray-600"}`}
            >
              📍 {store.contact.address}
            </p>
          )}

          {isOpen !== null && (
            <p
              className={`mt-6 inline-flex rounded-full px-4 py-2 text-sm font-black ${isOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
            >
              {isOpen ? "Abierto ahora" : "Cerrado ahora"}
            </p>
          )}
        </div>
        <MenuPoster variant={variant} store={store} />
      </div>
    </header>
  );
}

function MenuPoster({
  variant,
  store,
}: {
  variant: "minimal" | "natural" | "warm" | "elegant";
  store: StoreData;
}) {
  const isWarm = variant === "warm";
  const isElegant = variant === "elegant";
  const isNatural = variant === "natural";

  return (
    <div
      className={`relative mx-auto w-full max-w-sm ${isElegant ? "rotate-3" : isWarm ? "-rotate-2" : ""}`}
    >
      <div
        className={`relative overflow-hidden ${isNatural ? "rounded-[2.25rem]" : isElegant ? "rounded-[2rem]" : "rounded-[2.5rem]"} border ${isWarm ? "border-orange-400 bg-black" : isElegant ? "border-amber-300/50 bg-[#120907]" : isNatural ? "border-emerald-100 bg-gradient-to-br from-white to-emerald-50" : "border-white bg-white"} p-5 shadow-2xl`}
      >
        <div
          aria-hidden="true"
          className={`absolute inset-x-0 top-0 h-20 ${isWarm ? "bg-orange-500" : isElegant ? "bg-amber-900/60" : isNatural ? "bg-[var(--store-accent)]/10" : "bg-[var(--store-accent)]/15"}`}
        />
        {isNatural && (
          <div
            aria-hidden="true"
            className="absolute -right-10 bottom-6 h-32 w-32 rounded-full bg-lime-200/50 blur-2xl"
          />
        )}
        <img
          src={withBasePath("/menu-art-placeholder.svg")}
          alt=""
          width="900"
          height="900"
          loading="lazy"
          className={`relative mx-auto aspect-square w-52 object-cover ${isNatural ? "rounded-[2rem]" : isElegant ? "rounded-[1.5rem]" : "rounded-[2rem]"} shadow-xl`}
        />
        <div
          className={`relative mt-5 ${isWarm || isElegant ? "text-white" : "text-stone-950"}`}
        >
          <p
            className={`text-xs font-black uppercase tracking-[0.32em] ${isNatural ? "text-[var(--store-accent)]" : "opacity-70"}`}
          >
            Menú destacado
          </p>
          <p
            className={`mt-2 text-3xl font-black leading-none ${isNatural ? "text-emerald-950" : ""}`}
          >
            {store.categories[0]?.name || "Especial de la casa"}
          </p>
        </div>
      </div>
    </div>
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

function CategoryList({
  store,
  variant,
}: {
  store: StoreData;
  variant: "minimal" | "natural" | "warm" | "elegant";
}) {
  if (!store.categories.length) {
    return <EmptyMenu />;
  }

  return (
    <div className="space-y-10">
      {store.categories.map((category) => (
        <CategorySection
          key={category.id}
          store={store}
          category={category}
          variant={variant}
        />
      ))}
    </div>
  );
}

function CategorySection({
  store,
  category,
  variant,
}: {
  store: StoreData;
  category: PublicCategory;
  variant: "minimal" | "natural" | "warm" | "elegant";
}) {
  const headingClass = {
    minimal: "border-b border-slate-950/10 pb-4 text-slate-950",
    natural:
      "rounded-[1.5rem] border border-white/80 bg-white/80 px-4 py-3 text-emerald-950 shadow-sm ring-1 ring-emerald-100 backdrop-blur",
    warm: "rounded-2xl bg-orange-500 px-5 py-4 text-white shadow-[0_14px_40px_rgba(249,115,22,0.28)]",
    elegant: "border-b border-amber-200/30 pb-4 text-amber-50",
  }[variant];

  return (
    <section id={`category-${category.id}`} className="scroll-mt-6">
      <div className={`mb-5 flex items-center gap-3 ${headingClass}`}>
        <span
          aria-hidden="true"
          className={`h-2 w-2 ${variant === "minimal" ? "rounded-full bg-[var(--store-accent)] shadow-[0_0_0_5px_rgba(15,23,42,0.04)]" : variant === "warm" ? "rounded-full bg-white" : "rounded-full bg-[var(--store-accent)]"}`}
        />
        <h2
          className={`font-black ${variant === "minimal" ? "text-xl tracking-tight md:text-2xl" : variant === "warm" ? "text-3xl uppercase tracking-tight" : variant === "elegant" ? "font-serif text-3xl italic" : "text-2xl"}`}
        >
          {category.name}
        </h2>
      </div>
      {category.items.length ? (
        <div
          className={
            variant === "minimal" || variant === "elegant"
              ? "grid gap-3"
              : "grid gap-4 md:grid-cols-2"
          }
        >
          {category.items.map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              store={store}
              variant={variant}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-gray-500">
          No hay productos en esta categoría
        </p>
      )}
    </section>
  );
}

function MenuItemCard({
  item,
  store,
  variant,
}: {
  item: PublicItem;
  store: StoreData;
  variant: "minimal" | "natural" | "warm" | "elegant";
}) {
  const { addItem } = usePublicOrderCart();
  const soldOut =
    item.trackStock && typeof item.stock === "number" && item.stock <= 0;
  const orderingEnabled =
    store.capabilities?.inStoreOrdering || store.capabilities?.deliveryOrdering;
  const base =
    "border p-4 transition-transform transition-shadow hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transform-none motion-reduce:transition-none";
  const variants = {
    minimal:
      "rounded-[1.5rem] border-slate-950/8 bg-white/72 p-4 shadow-[0_14px_45px_rgba(15,23,42,0.06)] ring-1 ring-slate-950/[0.03] backdrop-blur hover:-translate-y-0.5 hover:shadow-[0_20px_55px_rgba(15,23,42,0.10)] motion-reduce:transform-none",
    natural:
      "rounded-[1.75rem] border-white/80 bg-white/86 shadow-[0_14px_45px_rgba(6,78,59,0.08)] ring-1 ring-emerald-100/70 backdrop-blur",
    warm: "rounded-[1.75rem] border-orange-300 bg-[#1b1b1b] text-white shadow-[0_16px_50px_rgba(0,0,0,0.25)]",
    elegant:
      "rounded-none border-x-0 border-b-0 border-t-amber-100/20 bg-transparent px-0 py-5 text-amber-50 shadow-none hover:translate-y-0 hover:shadow-none",
  };
  const priceClass =
    variant === "warm"
      ? "bg-orange-500 text-white"
      : variant === "elegant"
        ? "border border-amber-200/30 bg-transparent text-amber-100"
        : variant === "minimal"
          ? "bg-slate-950 text-white shadow-sm"
          : "bg-[var(--store-accent)] text-white";

  return (
    <article
      className={`${base} ${variants[variant]} ${soldOut ? "opacity-60" : ""}`}
    >
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt={item.name}
          className={`mb-4 h-40 w-full object-cover ${variant === "minimal" ? "rounded-[1.25rem]" : "rounded-2xl"}`}
          loading="lazy"
        />
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3
            className={`break-words ${variant === "minimal" ? "text-lg font-black tracking-tight" : variant === "elegant" ? "font-serif text-xl italic" : "font-black"}`}
          >
            {item.name}
          </h3>
          {item.description && (
            <p className="mt-1 break-words text-sm leading-6 opacity-75">
              {item.description}
            </p>
          )}
          {soldOut && (
            <p className="mt-2 text-sm font-bold text-red-600">Agotado</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span
            className={`rounded-full px-3 py-1 text-sm font-black ${priceClass}`}
          >
            {formatPrice(item.price, store.currency)}
          </span>
          {orderingEnabled && !soldOut && (
            <button
              type="button"
              onClick={() => addItem(item)}
              className="rounded-full bg-white px-3 py-1 text-xs font-black text-gray-950 shadow-sm ring-1 ring-black/10 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--store-accent)] focus-visible:ring-offset-2 motion-reduce:transform-none"
            >
              Agregar
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function _OrderCart({
  store,
  cart,
  onUpdateQuantity,
  onClear,
}: {
  store: StoreData;
  cart: CartLine[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onClear: () => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [type, setType] = useState<OrderType>(
    store.capabilities?.inStoreOrdering ? "in_store" : "delivery",
  );
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const total = useMemo(
    () => cart.reduce((sum, line) => sum + line.item.price * line.quantity, 0),
    [cart],
  );
  const orderingEnabled =
    store.capabilities?.inStoreOrdering || store.capabilities?.deliveryOrdering;

  if (!orderingEnabled || cart.length === 0) return null;

  const submitOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!customerName.trim() || !customerPhone.trim()) {
      setError("Nombre y teléfono son obligatorios.");
      return;
    }

    if (type === "delivery" && !deliveryAddress.trim()) {
      setError("La dirección es obligatoria para domicilio.");
      return;
    }

    setSubmitting(true);

    try {
      await addDoc(collection(db, "stores", store.id, "orders"), {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        type,
        status: "pending",
        items: cart.map((line) => ({
          itemId: line.item.id,
          name: line.item.name,
          price: line.item.price,
          quantity: line.quantity,
          subtotal: line.item.price * line.quantity,
        })),
        total,
        deliveryAddress: type === "delivery" ? deliveryAddress.trim() : "",
        notes: notes.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setCustomerName("");
      setCustomerPhone("");
      setDeliveryAddress("");
      setNotes("");
      onClear();
      setMessage("Pedido enviado. La tienda lo revisará en breve.");
    } catch (err) {
      console.error("Error al crear pedido:", err);
      setError(
        "No pudimos enviar el pedido. Intenta de nuevo o contacta por WhatsApp.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <aside className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-3xl rounded-[1.5rem] border border-gray-200 bg-white p-4 text-gray-950 shadow-2xl shadow-black/20 md:bottom-5">
      <form
        onSubmit={submitOrder}
        className="grid gap-4 md:grid-cols-[1fr_1fr] md:items-end"
      >
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-600">
            Tu pedido
          </p>
          <div className="mt-2 max-h-32 space-y-2 overflow-auto pr-1 text-sm">
            {cart.map((line) => (
              <div
                key={line.item.id}
                className="flex items-center justify-between gap-3"
              >
                <span className="min-w-0 truncate font-semibold">
                  {line.item.name}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateQuantity(line.item.id, line.quantity - 1)
                    }
                    className="h-7 w-7 rounded-full bg-gray-100 font-black"
                  >
                    −
                  </button>
                  <span className="w-5 text-center font-black">
                    {line.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateQuantity(line.item.id, line.quantity + 1)
                    }
                    className="h-7 w-7 rounded-full bg-gray-100 font-black"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-lg font-black">
            Total: {formatPrice(total, store.currency)}
          </p>
          {message && (
            <p className="mt-2 rounded-xl bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
              {message}
            </p>
          )}
          {error && (
            <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <select
            value={type}
            onChange={(event) => setType(event.target.value as OrderType)}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold outline-none focus:border-orange-500"
          >
            {store.capabilities?.inStoreOrdering && (
              <option value="in_store">En tienda</option>
            )}
            {store.capabilities?.deliveryOrdering && (
              <option value="delivery">Domicilio</option>
            )}
          </select>
          <input
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            placeholder="Nombre"
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orange-500"
            required
          />
          <input
            value={customerPhone}
            onChange={(event) => setCustomerPhone(event.target.value)}
            placeholder="Teléfono"
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orange-500"
            required
          />
          <input
            value={deliveryAddress}
            onChange={(event) => setDeliveryAddress(event.target.value)}
            placeholder="Dirección domicilio"
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orange-500 disabled:opacity-50"
            disabled={type !== "delivery"}
            required={type === "delivery"}
          />
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Notas"
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-orange-500 sm:col-span-2"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-orange-600 px-4 py-3 text-sm font-black text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2"
          >
            {submitting ? "Enviando…" : "Enviar pedido"}
          </button>
        </div>
      </form>
    </aside>
  );
}

function ContactActions({
  store,
  variant = "minimal",
}: {
  store: StoreData;
  variant?: "minimal" | "natural" | "warm" | "elegant";
}) {
  if (
    !store.contact?.whatsapp &&
    !store.contact?.instagram &&
    (typeof store.location?.latitude !== "number" ||
      typeof store.location?.longitude !== "number")
  )
    return null;

  const cardClass = {
    minimal:
      "border-white/70 bg-white/78 text-slate-950 shadow-[0_18px_55px_rgba(15,23,42,0.08)] ring-1 ring-slate-950/[0.03] backdrop-blur",
    natural:
      "border-white/80 bg-white/75 text-emerald-950 shadow-[0_14px_45px_rgba(6,78,59,0.08)] ring-1 ring-emerald-100/70 backdrop-blur",
    warm: "border-orange-300/40 bg-white/10 text-white backdrop-blur",
    elegant: "border-amber-200/25 bg-amber-950/30 text-amber-50",
  }[variant];

  return (
    <section className={`rounded-2xl border p-5 ${cardClass}`}>
      <h2 className="font-black">Contacto</h2>
      <div className="mt-4 grid gap-3">
        {store.contact.whatsapp && (
          <a
            className="rounded-xl bg-[#25D366] px-4 py-3 text-center font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2"
            href={`https://wa.me/${store.contact.whatsapp.replace(/[^0-9]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp
          </a>
        )}
        {store.contact.instagram && (
          <a
            className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 text-center font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-700 focus-visible:ring-offset-2"
            href={`https://instagram.com/${store.contact.instagram.replace("@", "")}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Instagram
          </a>
        )}
        {typeof store.location?.latitude === "number" &&
          typeof store.location?.longitude === "number" && (
            <a
              className="rounded-xl border border-current px-4 py-3 text-center font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--store-accent)]"
              href={`https://www.google.com/maps/search/?api=1&query=${store.location.latitude},${store.location.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver ubicación en el mapa
            </a>
          )}
      </div>
    </section>
  );
}

function ScheduleCard({
  schedule,
  variant = "minimal",
}: {
  schedule: ScheduleEntry[];
  variant?: "minimal" | "natural" | "warm" | "warm-light" | "elegant";
}) {
  if (!schedule.length) return null;
  const cardClass = {
    minimal:
      "border-white/70 bg-white/78 text-slate-950 shadow-[0_18px_55px_rgba(15,23,42,0.08)] ring-1 ring-slate-950/[0.03] backdrop-blur",
    natural:
      "border-white/80 bg-white/75 text-emerald-950 shadow-[0_14px_45px_rgba(6,78,59,0.08)] ring-1 ring-emerald-100/70 backdrop-blur",
    warm: "border-orange-300/40 bg-white/10 text-white backdrop-blur",
    "warm-light": "border-[#caaa76] bg-[#fffaf1] text-[#281b13]",
    elegant: "border-amber-200/25 bg-amber-950/30 text-amber-50",
  }[variant];
  const timeClass =
    variant === "warm" || variant === "elegant"
      ? "font-bold text-amber-200"
      : variant === "warm-light"
        ? "font-bold text-[#80551e]"
        : variant === "minimal"
          ? "font-bold text-slate-950"
          : "font-bold text-[var(--store-accent)]";

  return (
    <section className={`rounded-2xl border p-5 ${cardClass}`}>
      <h2 className="font-black">Horarios</h2>
      <div className="mt-4 space-y-2">
        {schedule.map(([day, value]) => (
          <div key={day} className="flex justify-between gap-4 text-sm">
            <span className="font-semibold">{formatDayName(day)}</span>
            <span
              className={
                value === "closed" ? "font-bold text-red-600" : timeClass
              }
            >
              {value === "closed" ? "Cerrado" : value}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function EmptyMenu() {
  return (
    <section className="rounded-3xl border border-dashed border-gray-300 bg-[var(--store-surface)] p-12 text-center text-gray-500">
      No hay productos disponibles
    </section>
  );
}

function StoreFooter({ store }: { store: StoreData }) {
  return (
    <footer className="py-8 text-center text-sm opacity-60">
      © {new Date().getFullYear()} {store.name}. Todos los derechos reservados.
    </footer>
  );
}

function getFeaturedItems(store: StoreData): PublicItem[] {
  return store.categories.flatMap((category) => category.items).slice(0, 4);
}

function isSoldOut(item: PublicItem) {
  return item.trackStock && typeof item.stock === "number" && item.stock <= 0;
}

function getThemeBadge(theme: ThemeConfig) {
  const badges: Partial<Record<ThemeConfig["component"], string>> = {
    christmas: "🎄 Navidad",
    "mothers-day": "🌷 Día de la Madre",
    halloween: "🎃 Halloween",
    valentine: "💝 San Valentín",
    "fathers-day": "⭐ Día del Padre",
    easter: "🌼 Pascua",
    independence: "🇨🇴 Temporada especial",
    velitas: "🕯️ Velitas",
  };

  return badges[theme.component] || null;
}
