import { useEffect, useState } from 'react';
import { formatDayName, formatPrice, sortScheduleDays } from '../../lib/utils';
import { getPublicStoreBySlug } from '../../lib/public-store-data';
import { getTemplateComponent, resolveStoreTheme, type TemplateComponent, type ThemeConfig } from '../../lib/templates';
import { withBasePath } from '../../lib/base-path';
import type { PublicCategory, PublicItem, PublicStore } from '../../lib/store-helpers';

type StoreData = PublicStore;
type ScheduleEntry = [string, string];

interface Props {
  slug: string;
}

interface StoreViewProps {
  store: StoreData;
  schedule: ScheduleEntry[];
  theme: ThemeConfig;
  isOpen: boolean | null;
}

const layoutRenderers: Record<TemplateComponent, (props: StoreViewProps) => JSX.Element> = {
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
          setError('Tienda no encontrada o inactiva');
          return;
        }

        setStore(publicStore);
      } catch (err) {
        if (cancelled) return;
        console.error('Error loading store:', err);
        setError('Error al cargar la tienda');
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
  const template = getTemplateComponent(store.templateId || '');
  const theme = resolveStoreTheme(store.templateId || '', store.themeId);
  const schedule = store.schedule ? sortScheduleDays(store.schedule) : [];
  const isOpen = getCurrentOpenStatus(store.schedule);
  const Layout = layoutRenderers[template] || MinimalLayout;

  return (
    <ThemeFrame theme={theme}>
      <Layout store={store} schedule={schedule} theme={theme} isOpen={isOpen} />
    </ThemeFrame>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center" role="status" aria-live="polite">
        <div aria-hidden="true" className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-b-4 border-t-4 border-orange-500 motion-reduce:animate-none" />
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
        <p className="mt-2 text-sm text-gray-600">Consulte con el administrador del sistema para obtener más información.</p>
      </div>
    </div>
  );
}

function ThemeFrame({ theme, children }: { theme: ThemeConfig; children: React.ReactNode }) {
  return (
    <div
      style={{
        '--store-accent': theme.tokens.accent,
        '--store-bg': theme.tokens.background,
        '--store-surface': theme.tokens.surface,
        '--store-text': theme.tokens.text,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

function MinimalLayout(props: StoreViewProps) {
  const { store, schedule, theme, isOpen } = props;

  return (
    <main className="min-h-screen bg-[#f7f3ea] text-stone-950">
      <StoreHero store={store} theme={theme} isOpen={isOpen} align="left" variant="minimal" />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="rounded-[2rem] border border-stone-300 bg-[#fffaf0] p-5 shadow-[0_24px_80px_rgba(41,37,36,0.10)] md:p-8">
          <div className="mb-8 flex items-center justify-between gap-4 border-b border-stone-300 pb-5">
            <p className="text-xs font-black uppercase tracking-[0.32em] text-stone-500">Carta de productos</p>
            <span className="font-serif text-4xl italic text-stone-300">Menu</span>
          </div>
          <CategoryList store={store} variant="minimal" />
        </section>
        <aside className="space-y-4">
          <ContactActions store={store} />
          <ScheduleCard schedule={schedule} />
        </aside>
      </div>
      <StoreFooter store={store} />
    </main>
  );
}

function NaturalLayout(props: StoreViewProps) {
  const { store, schedule, theme, isOpen } = props;

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_12%_8%,rgba(187,247,208,0.78),transparent_30%),radial-gradient(circle_at_88%_18%,rgba(254,215,170,0.72),transparent_28%),linear-gradient(135deg,#f7fee7,#fff7ed_58%,#ecfdf5)] text-emerald-950">
      <StoreHero store={store} theme={theme} isOpen={isOpen} align="left" badge="Fresco · Natural · Artesanal" variant="natural" />
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <div className="grid gap-6 lg:grid-cols-[19rem_1fr]">
          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-[2rem] border border-white/80 bg-white/75 p-5 shadow-[0_18px_55px_rgba(6,78,59,0.10)] ring-1 ring-emerald-100/70 backdrop-blur">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[var(--store-accent)]">Del día</p>
              <p className="mt-3 text-2xl font-black leading-tight text-emerald-950">Ingredientes frescos, preparados con calma.</p>
              <p className="mt-3 text-sm leading-6 text-emerald-900/70">Una carta simple de leer, con secciones claras y productos destacados sin ruido visual.</p>
            </div>
            <ContactActions store={store} variant="natural" />
            <ScheduleCard schedule={schedule} variant="natural" />
          </aside>
          <CategoryList store={store} variant="natural" />
        </div>
      </div>
      <StoreFooter store={store} />
    </main>
  );
}

function WarmLayout(props: StoreViewProps) {
  const { store, schedule, theme, isOpen } = props;
  const featured = getFeaturedItems(store);

  return (
    <main className="min-h-screen bg-[#111111] text-white">
      <StoreHero store={store} theme={theme} isOpen={isOpen} align="center" badge="Promos · Combos · Favoritos" variant="warm" />
      <div className="mx-auto max-w-6xl px-4 py-8">
        {featured.length > 0 && <FeaturedStrip store={store} items={featured} />}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_18rem]">
          <CategoryList store={store} variant="warm" />
          <aside className="space-y-4">
            <ContactActions store={store} variant="warm" />
            <ScheduleCard schedule={schedule} variant="warm" />
          </aside>
        </div>
      </div>
      <StoreFooter store={store} />
    </main>
  );
}

function ElegantLayout(props: StoreViewProps) {
  const { store, schedule, theme, isOpen } = props;

  return (
    <main className="min-h-screen bg-[#241209] text-amber-50">
      <StoreHero store={store} theme={theme} isOpen={isOpen} align="center" badge="Selección especial" variant="elegant" />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <ContactActions store={store} variant="elegant" />
          <ScheduleCard schedule={schedule} variant="elegant" />
        </div>
        <CategoryList store={store} variant="elegant" />
      </div>
      <StoreFooter store={store} />
    </main>
  );
}

function StoreHero({ store, theme, isOpen, align, badge, variant = 'minimal' }: {
  store: StoreData;
  theme: ThemeConfig;
  isOpen: boolean | null;
  align: 'left' | 'center';
  badge?: string;
  variant?: 'minimal' | 'natural' | 'warm' | 'elegant';
}) {
  const themeBadge = getThemeBadge(theme);
  const isWarm = variant === 'warm';
  const isElegant = variant === 'elegant';
  const isNatural = variant === 'natural';

  if (isNatural) {
    return (
      <header className="relative overflow-hidden px-4 py-6 md:py-8">
        <div aria-hidden="true" className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-emerald-300/30 blur-3xl" />
        <div aria-hidden="true" className="absolute right-0 top-10 h-64 w-64 rounded-full bg-orange-200/45 blur-3xl" />
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-8 rounded-[2.5rem] border border-white/80 bg-white/78 p-5 shadow-[0_28px_90px_rgba(6,78,59,0.14)] ring-1 ring-emerald-100/80 backdrop-blur md:p-8 lg:grid-cols-[1.02fr_0.98fr]">
          <div>
            <div className="mb-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-950 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-white">Plantilla Natural</span>
              <span className="rounded-full bg-[var(--store-accent)] px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-white shadow-sm">{themeBadge || 'Tema base'}</span>
            </div>
            {badge && <p className="mb-3 text-sm font-black uppercase tracking-[0.28em] text-[var(--store-accent)]">{badge}</p>}
            <h1 className="break-words text-5xl font-black leading-none tracking-tight text-emerald-950 [text-wrap:balance] md:text-7xl">{store.name}</h1>
            {store.contact?.address && <p className="mt-4 text-lg leading-7 text-emerald-900/70">📍 {store.contact.address}</p>}
            {isOpen !== null && (
              <p className={`mt-6 inline-flex rounded-full px-4 py-2 text-sm font-black shadow-sm ${isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
                {isOpen ? 'Abierto ahora' : 'Cerrado ahora'}
              </p>
            )}
          </div>
          <MenuPoster variant={variant} store={store} />
        </div>
      </header>
    );
  }

  return (
    <header className={`relative overflow-hidden px-4 py-12 md:py-16 ${isWarm ? 'bg-[#111111]' : isElegant ? 'bg-[#32180b]' : isNatural ? 'bg-transparent' : 'bg-[#fffaf0]'} shadow-sm`}>
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-3 bg-[var(--store-accent)]" />
      {isWarm && <div aria-hidden="true" className="absolute -right-32 top-10 h-80 w-80 rounded-full bg-orange-500/30 blur-3xl" />}
      {isNatural && <div aria-hidden="true" className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-emerald-300/30 blur-3xl" />}
      {isElegant && <div aria-hidden="true" className="absolute inset-x-10 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-300/70 to-transparent" />}
      {themeBadge && (
        <div className="absolute right-4 top-6 rounded-full bg-[var(--store-accent)] px-3 py-1 text-sm font-black text-white shadow-sm">
          {themeBadge}
        </div>
      )}
      <div className={`relative z-10 mx-auto grid max-w-6xl items-center gap-10 ${variant === 'minimal' ? 'lg:grid-cols-[1.05fr_0.95fr]' : 'lg:grid-cols-[0.95fr_1.05fr]'} ${align === 'center' ? 'text-center lg:text-left' : 'text-left'}`}>
        <div>
          {badge && <p className={`mb-4 text-sm font-black uppercase tracking-[0.28em] ${isWarm || isElegant ? 'text-orange-300' : 'text-[var(--store-accent)]'}`}>{badge}</p>}
          <h1 className={`break-words font-black tracking-tight [text-wrap:balance] ${isWarm ? 'text-6xl uppercase leading-none text-white md:text-8xl' : isElegant ? 'text-5xl leading-tight text-amber-50 md:text-7xl' : 'text-5xl text-stone-950 md:text-7xl'}`}>{store.name}</h1>
          {store.contact?.address && <p className={`mt-4 text-lg ${isWarm || isElegant ? 'text-white/70' : 'text-gray-600'}`}>📍 {store.contact.address}</p>}
          {isOpen !== null && (
            <p className={`mt-6 inline-flex rounded-full px-4 py-2 text-sm font-black ${isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {isOpen ? 'Abierto ahora' : 'Cerrado ahora'}
            </p>
          )}
        </div>
        <MenuPoster variant={variant} store={store} />
      </div>
    </header>
  );
}

function MenuPoster({ variant, store }: { variant: 'minimal' | 'natural' | 'warm' | 'elegant'; store: StoreData }) {
  const isWarm = variant === 'warm';
  const isElegant = variant === 'elegant';
  const isNatural = variant === 'natural';

  return (
    <div className={`relative mx-auto w-full max-w-sm ${isElegant ? 'rotate-3' : isWarm ? '-rotate-2' : ''}`}>
      <div className={`relative overflow-hidden ${isNatural ? 'rounded-[2.25rem]' : isElegant ? 'rounded-[2rem]' : 'rounded-[2.5rem]'} border ${isWarm ? 'border-orange-400 bg-black' : isElegant ? 'border-amber-300/50 bg-[#120907]' : isNatural ? 'border-emerald-100 bg-gradient-to-br from-white to-emerald-50' : 'border-white bg-white'} p-5 shadow-2xl`}>
        <div aria-hidden="true" className={`absolute inset-x-0 top-0 h-20 ${isWarm ? 'bg-orange-500' : isElegant ? 'bg-amber-900/60' : isNatural ? 'bg-[var(--store-accent)]/10' : 'bg-[var(--store-accent)]/15'}`} />
        {isNatural && <div aria-hidden="true" className="absolute -right-10 bottom-6 h-32 w-32 rounded-full bg-lime-200/50 blur-2xl" />}
        <img src={withBasePath('/menu-art-placeholder.svg')} alt="" width="900" height="900" loading="lazy" className={`relative mx-auto aspect-square w-52 object-cover ${isNatural ? 'rounded-[2rem]' : isElegant ? 'rounded-[1.5rem]' : 'rounded-[2rem]'} shadow-xl`} />
        <div className={`relative mt-5 ${isWarm || isElegant ? 'text-white' : 'text-stone-950'}`}>
          <p className={`text-xs font-black uppercase tracking-[0.32em] ${isNatural ? 'text-[var(--store-accent)]' : 'opacity-70'}`}>Menú destacado</p>
          <p className={`mt-2 text-3xl font-black leading-none ${isNatural ? 'text-emerald-950' : ''}`}>{store.categories[0]?.name || 'Especial de la casa'}</p>
        </div>
      </div>
    </div>
  );
}

function CategoryList({ store, variant }: { store: StoreData; variant: 'minimal' | 'natural' | 'warm' | 'elegant' }) {
  if (!store.categories.length) {
    return <EmptyMenu />;
  }

  return (
    <div className="space-y-10">
      {store.categories.map((category) => (
        <CategorySection key={category.id} store={store} category={category} variant={variant} />
      ))}
    </div>
  );
}

function CategorySection({ store, category, variant }: { store: StoreData; category: PublicCategory; variant: 'minimal' | 'natural' | 'warm' | 'elegant' }) {
  const headingClass = {
    minimal: 'border-b border-stone-300 pb-3 text-stone-950',
    natural: 'rounded-[1.5rem] border border-white/80 bg-white/80 px-4 py-3 text-emerald-950 shadow-sm ring-1 ring-emerald-100 backdrop-blur',
    warm: 'rounded-2xl bg-orange-500 px-5 py-4 text-white shadow-[0_14px_40px_rgba(249,115,22,0.28)]',
    elegant: 'border-b border-amber-200/30 pb-4 text-amber-50',
  }[variant];

  return (
    <section>
      <div className={`mb-5 flex items-center gap-3 ${headingClass}`}>
        <span aria-hidden="true" className={`h-2 w-2 rounded-full ${variant === 'warm' ? 'bg-white' : 'bg-[var(--store-accent)]'}`} />
        <h2 className={`font-black ${variant === 'warm' ? 'text-3xl uppercase tracking-tight' : variant === 'elegant' ? 'font-serif text-3xl italic' : 'text-2xl'}`}>{category.name}</h2>
      </div>
      {category.items.length ? (
        <div className={variant === 'minimal' || variant === 'elegant' ? 'grid gap-3' : 'grid gap-4 md:grid-cols-2'}>
          {category.items.map((item) => <MenuItemCard key={item.id} item={item} store={store} variant={variant} />)}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-gray-500">No hay productos en esta categoría</p>
      )}
    </section>
  );
}

function MenuItemCard({ item, store, variant }: { item: PublicItem; store: StoreData; variant: 'minimal' | 'natural' | 'warm' | 'elegant' }) {
  const soldOut = item.trackStock && typeof item.stock === 'number' && item.stock <= 0;
  const base = 'border p-4 transition-transform transition-shadow hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transform-none motion-reduce:transition-none';
  const variants = {
    minimal: 'rounded-none border-x-0 border-b-0 border-t-stone-200 bg-transparent px-0 py-5 shadow-none hover:translate-y-0 hover:shadow-none',
    natural: 'rounded-[1.75rem] border-white/80 bg-white/86 shadow-[0_14px_45px_rgba(6,78,59,0.08)] ring-1 ring-emerald-100/70 backdrop-blur',
    warm: 'rounded-[1.75rem] border-orange-300 bg-[#1b1b1b] text-white shadow-[0_16px_50px_rgba(0,0,0,0.25)]',
    elegant: 'rounded-none border-x-0 border-b-0 border-t-amber-100/20 bg-transparent px-0 py-5 text-amber-50 shadow-none hover:translate-y-0 hover:shadow-none',
  };
  const priceClass = variant === 'warm'
    ? 'bg-orange-500 text-white'
    : variant === 'elegant'
      ? 'border border-amber-200/30 bg-transparent text-amber-100'
      : 'bg-[var(--store-accent)] text-white';

  return (
    <article className={`${base} ${variants[variant]} ${soldOut ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className={`break-words ${variant === 'elegant' ? 'font-serif text-xl italic' : 'font-black'}`}>{item.name}</h3>
          {item.description && <p className="mt-1 break-words text-sm leading-6 opacity-75">{item.description}</p>}
          {soldOut && <p className="mt-2 text-sm font-bold text-red-600">Agotado</p>}
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-black ${priceClass}`}>
          {formatPrice(item.price, store.currency)}
        </span>
      </div>
    </article>
  );
}

function FeaturedStrip({ store, items }: { store: StoreData; items: PublicItem[] }) {
  return (
    <section>
      <p className="mb-3 text-sm font-black uppercase tracking-[0.24em] text-orange-300">Destacados</p>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {items.map((item) => (
          <article key={item.id} className="min-w-64 rounded-[2rem] border border-orange-300 bg-orange-500 p-5 text-white shadow-[0_18px_60px_rgba(249,115,22,0.28)]">
            <p className="text-xs font-black uppercase tracking-[0.2em] opacity-80">Recomendado</p>
            <h3 className="mt-2 text-xl font-black">{item.name}</h3>
            <p className="mt-4 text-lg font-black">{formatPrice(item.price, store.currency)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ContactActions({ store, variant = 'minimal' }: { store: StoreData; variant?: 'minimal' | 'natural' | 'warm' | 'elegant' }) {
  if (!store.contact?.whatsapp && !store.contact?.instagram) return null;
  const cardClass = {
    minimal: 'border-stone-300 bg-[#fffaf0] text-stone-950',
    natural: 'border-white/80 bg-white/75 text-emerald-950 shadow-[0_14px_45px_rgba(6,78,59,0.08)] ring-1 ring-emerald-100/70 backdrop-blur',
    warm: 'border-orange-300/40 bg-white/10 text-white backdrop-blur',
    elegant: 'border-amber-200/25 bg-amber-950/30 text-amber-50',
  }[variant];

  return (
    <section className={`rounded-2xl border p-5 ${cardClass}`}>
      <h2 className="font-black">Contacto</h2>
      <div className="mt-4 grid gap-3">
        {store.contact.whatsapp && (
          <a className="rounded-xl bg-[#25D366] px-4 py-3 text-center font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2" href={`https://wa.me/${store.contact.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
        )}
        {store.contact.instagram && (
          <a className="rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 text-center font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-700 focus-visible:ring-offset-2" href={`https://instagram.com/${store.contact.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer">
            Instagram
          </a>
        )}
      </div>
    </section>
  );
}

function ScheduleCard({ schedule, variant = 'minimal' }: { schedule: ScheduleEntry[]; variant?: 'minimal' | 'natural' | 'warm' | 'elegant' }) {
  if (!schedule.length) return null;
  const cardClass = {
    minimal: 'border-stone-300 bg-[#fffaf0] text-stone-950',
    natural: 'border-white/80 bg-white/75 text-emerald-950 shadow-[0_14px_45px_rgba(6,78,59,0.08)] ring-1 ring-emerald-100/70 backdrop-blur',
    warm: 'border-orange-300/40 bg-white/10 text-white backdrop-blur',
    elegant: 'border-amber-200/25 bg-amber-950/30 text-amber-50',
  }[variant];
  const timeClass = variant === 'warm' || variant === 'elegant' ? 'font-bold text-amber-200' : 'font-bold text-[var(--store-accent)]';

  return (
    <section className={`rounded-2xl border p-5 ${cardClass}`}>
      <h2 className="font-black">Horarios</h2>
      <div className="mt-4 space-y-2">
        {schedule.map(([day, value]) => (
          <div key={day} className="flex justify-between gap-4 text-sm">
            <span className="font-semibold">{formatDayName(day)}</span>
            <span className={value === 'closed' ? 'font-bold text-red-600' : timeClass}>{value === 'closed' ? 'Cerrado' : value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function EmptyMenu() {
  return <section className="rounded-3xl border border-dashed border-gray-300 bg-[var(--store-surface)] p-12 text-center text-gray-500">No hay productos disponibles</section>;
}

function StoreFooter({ store }: { store: StoreData }) {
  return <footer className="py-8 text-center text-sm opacity-60">© {new Date().getFullYear()} {store.name}. Todos los derechos reservados.</footer>;
}

function getFeaturedItems(store: StoreData): PublicItem[] {
  return store.categories.flatMap((category) => category.items).slice(0, 4);
}

function getThemeBadge(theme: ThemeConfig) {
  const badges: Partial<Record<ThemeConfig['component'], string>> = {
    christmas: '🎄 Navidad',
    'mothers-day': '🌷 Día de la Madre',
    halloween: '🎃 Halloween',
    valentine: '💝 San Valentín',
    'fathers-day': '⭐ Día del Padre',
    easter: '🌼 Pascua',
    independence: '🇨🇴 Temporada especial',
    velitas: '🕯️ Velitas',
  };

  return badges[theme.component] || null;
}

function getCurrentOpenStatus(schedule: StoreData['schedule']): boolean | null {
  if (!schedule || typeof window === 'undefined') return null;

  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const now = new Date();
  const today = schedule[dayKeys[now.getDay()]];

  if (!today || typeof today === 'string') return null;
  if (today.closed || !today.open || !today.close) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = timeToMinutes(today.open);
  const closeMinutes = timeToMinutes(today.close);

  if (openMinutes === null || closeMinutes === null) return null;

  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
}

function timeToMinutes(value: string): number | null {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}
