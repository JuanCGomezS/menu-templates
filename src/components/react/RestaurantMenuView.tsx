import { useEffect, useState, useRef } from 'react';
import { formatPrice, formatDayName, sortScheduleDays } from '../../lib/utils';
import { getTemplateComponent } from '../../lib/templates';
import { getPublicStoreBySlug } from '../../lib/public-store-data';
import type { PublicStore } from '../../lib/store-helpers';

type RestaurantData = PublicStore;

interface Props {
  slug: string;
}

export default function RestaurantMenuView({ slug }: Props) {
  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const store = await getPublicStoreBySlug(slug);

        if (cancelled) return;

        if (!store) {
          setRestaurant(null);
          setError('Tienda no encontrada o inactiva');
          setLoading(false);
          return;
        }

        setRestaurant(store);
        setLoading(false);
      } catch (err: any) {
        if (cancelled) return;

        console.error('Error loading store:', err);
        setError('Error al cargar la tienda');
        setLoading(false);
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-orange-500 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Cargando menú...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center max-w-md">
          <p className="text-2xl text-red-600 font-semibold mb-2">⚠️</p>
          <p className="text-xl text-red-600">{error}</p>
          <p className="text-gray-600 text-sm">Consulte con el administrador del sistema para obtener más información.</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return null;
  }

  const templateComponent: string = getTemplateComponent(restaurant.templateId || '');
  const sortedSchedule = restaurant.schedule ? sortScheduleDays(restaurant.schedule) : [];

  switch (templateComponent) {
    case 'christmas':
    case 'seasonal-christmas':
      return <ChristmasTemplate restaurant={restaurant} sortedSchedule={sortedSchedule} />;
    case 'halloween':
      return <HalloweenTemplate restaurant={restaurant} sortedSchedule={sortedSchedule} />;
    case 'velitas':
      return <VelitasTemplate restaurant={restaurant} sortedSchedule={sortedSchedule} />;
    case 'independence':
      return <IndependenceTemplate restaurant={restaurant} sortedSchedule={sortedSchedule} />;
    case 'easter':
      return <EasterTemplate restaurant={restaurant} sortedSchedule={sortedSchedule} />;
    case 'mothers-day':
      return <MothersDayTemplate restaurant={restaurant} sortedSchedule={sortedSchedule} />;
    case 'fathers-day':
      return <FathersDayTemplate restaurant={restaurant} sortedSchedule={sortedSchedule} />;
    case 'valentine':
      return <ValentineTemplate restaurant={restaurant} sortedSchedule={sortedSchedule} />;
    case 'elegant':
      return <ElegantTemplate restaurant={restaurant} sortedSchedule={sortedSchedule} />;
    case 'tropical':
      return <TropicalTemplate restaurant={restaurant} sortedSchedule={sortedSchedule} />;
    case 'dark':
      return <DarkTemplate restaurant={restaurant} sortedSchedule={sortedSchedule} />;
    case 'colorful':
      return <ColorfulTemplate restaurant={restaurant} sortedSchedule={sortedSchedule} />;
    case 'romantic':
      return <RomanticTemplate restaurant={restaurant} sortedSchedule={sortedSchedule} />;
    default:
      return <DefaultTemplate restaurant={restaurant} sortedSchedule={sortedSchedule} />;
  }
}

interface EmojiData {
  emoji: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  id: number;
}

interface EmojiDisplay {
  emoji: string;
  x: number;
  y: number;
  size: number;
  id: number;
}

const EMOJI_POOL = ['🍕', '🍔', '🌮', '🍜', '🍱', '🥘', '🍝', '🥗', '🍰', '🍨', '🥤', '☕', '🥐', '🍞', '🥩', '🐟', '🍣', '🍙', '🥟', '🍤'];
const EMOJI_COUNT = 10;
const BASE_SIZE = 40;
const SIZE_VARIATION = 20;
const BASE_VELOCITY = 2;
const FRICTION = 0.999;
const RANDOM_VARIATION_CHANCE = 0.01;
const RANDOM_VARIATION_STRENGTH = 0.1;

// Componente para emojis flotantes con física de colisiones
function FloatingEmojis() {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const emojisDataRef = useRef<EmojiData[]>([]);
  const [emojis, setEmojis] = useState<EmojiDisplay[]>([]);

  // Inicializar emojis
  const initializeEmojis = (): EmojiData[] => {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1000;
    const height = typeof window !== 'undefined' ? window.innerHeight : 1000;

    return EMOJI_POOL.slice(0, EMOJI_COUNT).map((emoji, index) => {
      const size = BASE_SIZE + (index % 3) * SIZE_VARIATION;
      return {
        emoji,
        x: Math.random() * Math.max(0, width - size),
        y: Math.random() * Math.max(0, height - size),
        vx: (Math.random() - 0.5) * BASE_VELOCITY,
        vy: (Math.random() - 0.5) * BASE_VELOCITY,
        size,
        id: index,
      };
    });
  };

  // Rebote en bordes
  const handleBoundaryBounce = (emoji: EmojiData, width: number, height: number): void => {
    if (emoji.x <= 0 || emoji.x >= width - emoji.size) {
      emoji.vx *= -1;
      emoji.x = Math.max(0, Math.min(emoji.x, width - emoji.size));
    }
    if (emoji.y <= 0 || emoji.y >= height - emoji.size) {
      emoji.vy *= -1;
      emoji.y = Math.max(0, Math.min(emoji.y, height - emoji.size));
    }
  };

  // Detectar y resolver colisiones
  const handleCollision = (emoji: EmojiData, other: EmojiData): void => {
    const dx = emoji.x - other.x;
    const dy = emoji.y - other.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = (emoji.size + other.size) / 2;

    if (distance >= minDistance || distance === 0) return;

    const nx = dx / distance;
    const ny = dy / distance;
    const relativeVx = emoji.vx - other.vx;
    const relativeVy = emoji.vy - other.vy;
    const relativeSpeed = relativeVx * nx + relativeVy * ny;

    // Solo procesar si se están acercando
    if (relativeSpeed >= 0) return;

    // Intercambiar componentes normales de velocidad
    const v1n = emoji.vx * nx + emoji.vy * ny;
    const v2n = other.vx * nx + other.vy * ny;
    const v1t = emoji.vx * (-ny) + emoji.vy * nx;
    const v2t = other.vx * (-ny) + other.vy * nx;

    emoji.vx = v2n * nx - v1t * ny;
    emoji.vy = v2n * ny + v1t * nx;
    other.vx = v1n * nx - v2t * ny;
    other.vy = v1n * ny + v2t * nx;

    // Separar para evitar solapamiento
    const overlap = (minDistance - distance) * 0.5;
    emoji.x += nx * overlap;
    emoji.y += ny * overlap;
    other.x -= nx * overlap;
    other.y -= ny * overlap;
  };

  // Aplicar física a un emoji
  const updateEmoji = (emoji: EmojiData, width: number, height: number, allEmojis: EmojiData[]): void => {
    emoji.x += emoji.vx;
    emoji.y += emoji.vy;

    handleBoundaryBounce(emoji, width, height);

    allEmojis.forEach((other) => {
      if (emoji.id !== other.id) {
        handleCollision(emoji, other);
      }
    });

    emoji.vx *= FRICTION;
    emoji.vy *= FRICTION;

    if (Math.random() < RANDOM_VARIATION_CHANCE) {
      emoji.vx += (Math.random() - 0.5) * RANDOM_VARIATION_STRENGTH;
      emoji.vy += (Math.random() - 0.5) * RANDOM_VARIATION_STRENGTH;
    }
  };

  useEffect(() => {
    const initialEmojis = initializeEmojis();
    emojisDataRef.current = initialEmojis;
    setEmojis(initialEmojis.map(({ emoji, x, y, size, id }) => ({ emoji, x, y, size, id })));

    const animate = () => {
      if (!containerRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const container = containerRef.current;
      const width = container.offsetWidth || window.innerWidth;
      const height = container.offsetHeight || window.innerHeight;

      emojisDataRef.current.forEach((emoji) => {
        updateEmoji(emoji, width, height, emojisDataRef.current);
      });

      setEmojis(emojisDataRef.current.map(({ emoji, x, y, size, id }) => ({ emoji, x, y, size, id })));
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    const timeoutId = setTimeout(animate, 200);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none">
      {emojis.map((emoji) => (
        <div
          key={emoji.id}
          className="absolute select-none pointer-events-none opacity-20 dark:opacity-10"
          style={{
            fontSize: `${emoji.size}px`,
            left: `${emoji.x}px`,
            top: `${emoji.y}px`,
            willChange: 'transform',
          }}
        >
          {emoji.emoji}
        </div>
      ))}
    </div>
  );
}

function DefaultTemplate({ restaurant, sortedSchedule }: { restaurant: RestaurantData; sortedSchedule: Array<[string, string]> }) {
  const getCategoryIcon = (categoryName: string): string => {
    // Usar un hash simple del nombre para seleccionar un emoji de forma determinística
    const emojis = ['🍽️', '🥤', '🍕', '🍝', '🥗', '🥩', '🐟', '🍨', '🍰', '☕', '🥐', '🍔', '🌮', '🍜', '🍱', '🥘'];
    let hash = 0;
    for (let i = 0; i < categoryName.length; i++) {
      hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return emojis[Math.abs(hash) % emojis.length];
  };

  const shouldUseLargeLayout = (items: any[]): boolean => {
    return items.some(item => item.description && item.description.length > 60);
  };

  // Obtener items destacados para la sección de ofertas (primeros 2 items de las primeras categorías)
  const getFeaturedItems = () => {
    const featured: Array<{ item: any; category: any }> = [];
    if (restaurant.categories && restaurant.categories.length > 0) {
      restaurant.categories.forEach((category) => {
        if (category.items && category.items.length > 0 && featured.length < 2) {
          featured.push({ item: category.items[0], category });
        }
      });
    }
    return featured;
  };

  const featuredItems = getFeaturedItems();

  const renderItem = (item: any, category: any, useLarge: boolean, index?: number) => {
    const isNew = index !== undefined && index < 2;
    const isPopular = index !== undefined && index === 0;

    if (useLarge) {
      return (
        <div
          key={item.id}
          className="relative bg-white dark:bg-slate-900 rounded-[2rem] p-4 flex gap-5 border-4 border-[#7C3AED]/20 dark:border-[#7C3AED]/40 shadow-xl overflow-hidden transform hover:scale-[1.02] transition-all duration-300"
        >
          <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-[#7C3AED]/5 rounded-full"></div>
          {isNew && (
            <div className="absolute top-2 left-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-md z-20">
              NUEVO
            </div>
          )}
          <div className="w-1/3 aspect-square rounded-2xl overflow-hidden shadow-inner flex-shrink-0 bg-gradient-to-br from-purple-200 to-pink-200 dark:from-purple-900 dark:to-pink-900 flex items-center justify-center">
            <span className="text-4xl">{getCategoryIcon(category.name)}</span>
          </div>
          <div className="flex flex-col justify-center py-2 relative z-10 flex-1">
            <h3 className="text-xl font-extrabold text-[#7C3AED] mb-1">{item.name}</h3>
            {item.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                {item.description}
              </p>
            )}
            <span className="bg-[#7C3AED] text-white px-3 py-1 rounded-full font-black text-sm inline-block w-fit">
              {formatPrice(item.price, restaurant.currency)}
            </span>
          </div>
        </div>
      );
    }

    return (
      <div
        key={item.id}
        className="group relative bg-white dark:bg-slate-900 border-4 border-white dark:border-slate-800 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:scale-[1.03]"
      >
        {isNew && (
          <div className="absolute top-2 left-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md z-20">
            NUEVO
          </div>
        )}
        {isPopular && (
          <div className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md z-20">
            ⭐ POPULAR
          </div>
        )}
        <div className="h-32 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 flex items-center justify-center p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-200/50 to-pink-200/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <span className="text-5xl relative z-10 transform group-hover:scale-110 transition-transform duration-300">{getCategoryIcon(category.name)}</span>
          <div className="absolute -top-1 -right-1 bg-[#7C3AED] text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-md z-20">
            {formatPrice(item.price, restaurant.currency)}
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-bold text-sm mb-1 leading-tight">{item.name}</h3>
          {item.description && (
            <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">
              {item.description}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen relative text-slate-800 dark:text-slate-100 overflow-hidden">
      {/* Fondo animado con emojis flotantes */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-purple-950 dark:via-pink-950 dark:to-blue-950"></div>
        
        {/* Componente de emojis flotantes con física */}
        <FloatingEmojis />
        
        {/* Overlay suave para mejor legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-t from-white/50 via-white/10 to-transparent dark:from-black/30 dark:via-black/5 pointer-events-none"></div>
      </div>

      <header className="bg-gradient-to-br from-[#7C3AED] via-purple-600 to-pink-600 pt-12 pb-8 px-6 rounded-b-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-40 h-40 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
        <div className="absolute bottom-[-5%] left-[-5%] w-32 h-32 bg-pink-500/20 rounded-full blur-xl"></div>
        <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
        <div className="relative z-10 flex flex-col items-center">
          <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-lg">{restaurant.name}</h1>
          {restaurant.contact?.address && (
            <div className="flex items-center gap-2 mt-2 text-white/80 text-sm">
              <span className="material-icons-outlined text-base">location_on</span>
              <p>{restaurant.contact.address}</p>
            </div>
          )}
        </div>
      </header>

      <main className="px-6 -mt-6 pb-20 relative z-20">
        {/* Sección de Ofertas Destacadas */}
        {featuredItems.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] mb-4 text-[#7C3AED] dark:text-[#7C3AED]/80 ml-2 drop-shadow-sm">
              Promociones Imperdibles
            </h2>
            <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-4 snap-x snap-mandatory">
              {featuredItems.map(({ item, category }, idx) => (
                <div
                  key={`featured-${item.id}`}
                  className={`flex-none w-72 h-40 rounded-[2rem] p-5 text-white relative overflow-hidden snap-center shadow-lg transform hover:scale-105 transition-all duration-300 ${
                    idx === 0
                      ? 'bg-gradient-to-br from-pink-500 to-purple-500'
                      : 'bg-gradient-to-br from-blue-500 to-purple-500'
                  }`}
                >
                  <div className="relative z-10 flex flex-col justify-between h-full">
                    <div>
                      <span className="bg-white/30 backdrop-blur-sm px-2 py-1 rounded-full text-[10px] font-bold shadow-md">
                        {idx === 0 ? 'SOLO HOY' : 'NUEVO'}
                      </span>
                      <h3 className="text-xl font-extrabold mt-1 line-clamp-2">{item.name}</h3>
                    </div>
                    <div className="flex items-center justify-between">
                      {item.description && (
                        <p className="text-xs font-medium opacity-90 line-clamp-1">
                          {item.description}
                        </p>
                      )}
                      <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
                        {formatPrice(item.price, restaurant.currency)}
                      </span>
                    </div>
                  </div>
                  <span className="material-icons-outlined absolute -right-4 -bottom-4 text-[120px] opacity-20 rotate-12">
                    {idx === 0 ? 'local_fire_department' : 'star'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Categorías */}
        {restaurant.categories && restaurant.categories.length > 0 ? (
          restaurant.categories.map((category) => {
            const useLargeLayout = shouldUseLargeLayout(category.items || []);
            return (
              <section key={category.id} className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-black flex items-center gap-2">
                    <span className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl transform hover:scale-110 transition-transform duration-300">
                      {getCategoryIcon(category.name)}
                    </span>
                    {category.name}
                  </h2>
                  <div className="h-1 flex-grow mx-4 bg-slate-200 dark:bg-slate-800 rounded-full opacity-50"></div>
                </div>

                {category.items && category.items.length > 0 ? (
                  <div className={useLargeLayout ? 'grid grid-cols-1 gap-6' : 'grid grid-cols-2 gap-5'}>
                    {category.items.map((item, idx) => renderItem(item, category, useLargeLayout, idx))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic text-center py-4">No hay items en esta categoría</p>
                )}
              </section>
            );
          })
        ) : (
          <section className="bg-white dark:bg-slate-900 rounded-[2rem] p-12 text-center shadow-xl">
            <p className="text-slate-500 text-lg">No hay categorías disponibles</p>
          </section>
        )}

        {/* Horarios */}
        {restaurant.schedule && sortedSchedule.length > 0 && (
          <section className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-inner mb-12 border-2 border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-[#7C3AED]/10 rounded-2xl flex items-center justify-center text-[#7C3AED]">
                <span className="material-icons-outlined">schedule</span>
              </div>
              <div>
                <h3 className="font-black text-lg">Horarios</h3>
                <p className="text-xs text-slate-400">Visítanos hoy mismo</p>
              </div>
            </div>
            <div className="space-y-3">
              {sortedSchedule.map(([day, scheduleValue]) => (
                <div key={day} className="flex justify-between text-sm">
                  <span className="font-semibold">{formatDayName(day)}</span>
                  <span className={scheduleValue === 'closed' ? 'text-red-600 font-bold' : 'text-[#7C3AED] font-bold'}>
                    {scheduleValue === 'closed' ? 'Cerrado' : scheduleValue}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Contacto */}
        {restaurant.contact && (restaurant.contact.whatsapp || restaurant.contact.instagram) && (
          <section className="mb-12">
            <div className="flex gap-3">
              {restaurant.contact.whatsapp && (
                <a
                  href={`https://wa.me/${restaurant.contact.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-[#25D366] text-white py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm shadow-lg shadow-green-200 dark:shadow-none hover:shadow-xl hover:scale-105 transition-all duration-300"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.148-.67-1.613-.918-2.214-.242-.587-.487-.508-.67-.518-.172-.01-.371-.011-.57-.011-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"></path>
                  </svg>
                  WhatsApp
                </a>
              )}
              {restaurant.contact.instagram && (
                <a
                  href={`https://instagram.com/${restaurant.contact.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white py-3 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm shadow-lg shadow-pink-200 dark:shadow-none hover:shadow-xl hover:scale-105 transition-all duration-300"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.332 3.608 1.308.975.975 1.245 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.063 1.366-.333 2.633-1.308 3.608-.975.975-2.242 1.245-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.063-2.633-.333-3.608-1.308-.975-.975-1.245-2.242-1.308-3.608-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.062-1.366.332-2.633 1.308-3.608.975-.975 2.242-1.245 3.608-1.308 1.266-.058 1.646-.07 4.85-.07M12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.355 2.618 6.778 6.98 6.978 1.28.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.058-1.28.072-1.689.072-4.948 0-3.259-.014-3.668-.072-4.948-.199-4.359-2.62-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"></path>
                  </svg>
                  Instagram
                </a>
              )}
            </div>
          </section>
        )}
      </main>

      <footer className="mt-12 py-6 text-center text-gray-600 text-sm">
        <p>© {new Date().getFullYear()} {restaurant.name}. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}

function ChristmasTemplate({ restaurant, sortedSchedule }: { restaurant: RestaurantData; sortedSchedule: Array<[string, string]> }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-green-50 to-red-50">
      <header className="bg-gradient-to-r from-red-600 to-green-600 text-white shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-4 text-4xl">🎄</div>
          <div className="absolute top-8 right-8 text-3xl">❄️</div>
          <div className="absolute bottom-4 left-1/4 text-2xl">🎁</div>
          <div className="absolute bottom-8 right-1/4 text-3xl">⭐</div>
        </div>
        <div className="container mx-auto px-4 py-12 max-w-6xl relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-3 drop-shadow-lg">{restaurant.name}</h1>
          {restaurant.contact?.address && (
            <p className="text-xl flex items-center gap-2 text-white/90">
              <span>📍</span>
              {restaurant.contact.address}
            </p>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {restaurant.contact && (restaurant.contact.whatsapp || restaurant.contact.instagram) && (
          <section className="mb-8 bg-white rounded-xl shadow-lg p-6 border-2 border-red-200">
            <h2 className="text-2xl font-bold text-red-800 mb-4 flex items-center gap-2">
              <span>🎄</span>
              Contacto
            </h2>
            <div className="flex flex-wrap gap-4">
              {restaurant.contact.whatsapp && (
                <a
                  href={`https://wa.me/${restaurant.contact.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors shadow-md"
                >
                  <span>📱</span>
                  WhatsApp
                </a>
              )}
              {restaurant.contact.instagram && (
                <a
                  href={`https://instagram.com/${restaurant.contact.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors shadow-md"
                >
                  <span>📷</span>
                  Instagram
                </a>
              )}
            </div>
          </section>
        )}

        {restaurant.schedule && sortedSchedule.length > 0 && (
          <section className="mb-8 bg-white rounded-xl shadow-lg p-6 border-2 border-green-200">
            <h2 className="text-2xl font-bold text-green-800 mb-4 flex items-center gap-2">
              <span>⏰</span>
              Horarios
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sortedSchedule.map(([day, scheduleValue]) => (
                <div key={day} className="flex justify-between items-center py-2 border-b border-red-100 last:border-b-0">
                  <span className="font-semibold text-gray-900">{formatDayName(day)}</span>
                  <span className={scheduleValue === 'closed' ? 'text-red-600 font-bold' : 'text-green-700 font-medium'}>
                    {scheduleValue === 'closed' ? 'Cerrado' : scheduleValue}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {restaurant.categories && restaurant.categories.length > 0 ? (
          <section className="bg-white rounded-xl shadow-lg p-6 md:p-8 border-2 border-red-300">
            <div className="mb-8 text-center">
              <h2 className="text-4xl font-bold text-red-800 mb-2 flex items-center justify-center gap-3">
                <span>🎄</span>
                Menú Navideño
                <span>🎁</span>
              </h2>
              <div className="w-32 h-1 bg-gradient-to-r from-red-500 to-green-500 rounded-full mx-auto"></div>
            </div>

            {restaurant.categories.map((category) => (
              <div key={category.id} className="mb-12 last:mb-0">
                <div className="mb-6 pb-3 border-b-2 border-red-500">
                  <h3 className="text-2xl font-bold text-red-700 flex items-center gap-2">
                    <span>⭐</span>
                    {category.name}
                  </h3>
                </div>

                {category.items && category.items.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.items.map((item) => (
                      <div key={item.id} className="bg-gradient-to-br from-red-50 to-green-50 rounded-lg p-4 border-2 border-red-200 hover:shadow-lg hover:border-red-400 transition-all">
                        <h4 className="font-semibold text-lg text-gray-900 mb-2">{item.name}</h4>
                        {item.description && (
                          <p className="text-gray-700 text-sm mb-3">{item.description}</p>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-red-300">
                          <span className="text-xl font-bold text-red-600">
                            {formatPrice(item.price, restaurant.currency)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic text-center py-4">No hay items en esta categoría</p>
                )}
              </div>
            ))}
          </section>
        ) : (
          <section className="bg-white rounded-xl shadow-lg p-12 text-center border-2 border-red-200">
            <p className="text-gray-500 text-lg">No hay categorías disponibles</p>
          </section>
        )}
      </main>

      <footer className="mt-12 py-6 text-center text-red-700 text-sm font-semibold">
        <p>🎄 ¡Feliz Navidad! © {new Date().getFullYear()} {restaurant.name} 🎁</p>
      </footer>
    </div>
  );
}

function HalloweenTemplate({ restaurant, sortedSchedule }: { restaurant: RestaurantData; sortedSchedule: Array<[string, string]> }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      <header className="bg-gradient-to-r from-orange-900 to-black text-orange-400 shadow-2xl relative overflow-hidden border-b-4 border-orange-600">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-4 left-4 text-5xl">🎃</div>
          <div className="absolute top-8 right-8 text-4xl">👻</div>
          <div className="absolute bottom-4 left-1/4 text-3xl">🦇</div>
          <div className="absolute bottom-8 right-1/4 text-4xl">🕷️</div>
        </div>
        <div className="container mx-auto px-4 py-12 max-w-6xl relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-3 drop-shadow-2xl text-orange-400">{restaurant.name}</h1>
          {restaurant.contact?.address && (
            <p className="text-xl flex items-center gap-2 text-orange-300">
              <span>📍</span>
              {restaurant.contact.address}
            </p>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {restaurant.contact && (restaurant.contact.whatsapp || restaurant.contact.instagram) && (
          <section className="mb-8 bg-gray-800 rounded-xl shadow-2xl p-6 border-2 border-orange-600">
            <h2 className="text-2xl font-bold text-orange-400 mb-4 flex items-center gap-2">
              <span>🦇</span>
              Contacto
            </h2>
            <div className="flex flex-wrap gap-4">
              {restaurant.contact.whatsapp && (
                <a
                  href={`https://wa.me/${restaurant.contact.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors shadow-lg"
                >
                  <span>📱</span>
                  WhatsApp
                </a>
              )}
              {restaurant.contact.instagram && (
                <a
                  href={`https://instagram.com/${restaurant.contact.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors shadow-lg"
                >
                  <span>📷</span>
                  Instagram
                </a>
              )}
            </div>
          </section>
        )}

        {restaurant.schedule && sortedSchedule.length > 0 && (
          <section className="mb-8 bg-gray-800 rounded-xl shadow-2xl p-6 border-2 border-purple-600">
            <h2 className="text-2xl font-bold text-purple-400 mb-4 flex items-center gap-2">
              <span>🕷️</span>
              Horarios
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sortedSchedule.map(([day, scheduleValue]) => (
                <div key={day} className="flex justify-between items-center py-2 border-b border-orange-800 last:border-b-0">
                  <span className="font-semibold text-orange-300">{formatDayName(day)}</span>
                  <span className={scheduleValue === 'closed' ? 'text-red-500 font-bold' : 'text-orange-400 font-medium'}>
                    {scheduleValue === 'closed' ? 'Cerrado' : scheduleValue}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {restaurant.categories && restaurant.categories.length > 0 ? (
          <section className="bg-gray-800 rounded-xl shadow-2xl p-6 md:p-8 border-2 border-orange-600">
            <div className="mb-8 text-center">
              <h2 className="text-4xl font-bold text-orange-400 mb-2 flex items-center justify-center gap-3">
                <span>🎃</span>
                Menú de Halloween
                <span>👻</span>
              </h2>
              <div className="w-32 h-1 bg-gradient-to-r from-orange-500 to-purple-500 rounded-full mx-auto"></div>
            </div>

            {restaurant.categories.map((category) => (
              <div key={category.id} className="mb-12 last:mb-0">
                <div className="mb-6 pb-3 border-b-2 border-orange-500">
                  <h3 className="text-2xl font-bold text-orange-400 flex items-center gap-2">
                    <span>🕸️</span>
                    {category.name}
                  </h3>
                </div>

                {category.items && category.items.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.items.map((item) => (
                      <div key={item.id} className="bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg p-4 border-2 border-orange-700 hover:shadow-xl hover:border-orange-500 transition-all">
                        <h4 className="font-semibold text-lg text-orange-300 mb-2">{item.name}</h4>
                        {item.description && (
                          <p className="text-gray-300 text-sm mb-3">{item.description}</p>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-orange-700">
                          <span className="text-xl font-bold text-orange-400">
                            {formatPrice(item.price, restaurant.currency)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 italic text-center py-4">No hay items en esta categoría</p>
                )}
              </div>
            ))}
          </section>
        ) : (
          <section className="bg-gray-800 rounded-xl shadow-2xl p-12 text-center border-2 border-orange-600">
            <p className="text-gray-400 text-lg">No hay categorías disponibles</p>
          </section>
        )}
      </main>

      <footer className="mt-12 py-6 text-center text-orange-400 text-sm font-semibold">
        <p>🎃 ¡Feliz Halloween! © {new Date().getFullYear()} {restaurant.name} 👻</p>
      </footer>
    </div>
  );
}

function VelitasTemplate({ restaurant, sortedSchedule }: { restaurant: RestaurantData; sortedSchedule: Array<[string, string]> }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-yellow-50 to-white">
      <header className="bg-gradient-to-r from-yellow-100 to-white shadow-lg relative overflow-hidden border-b-4 border-yellow-300">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-4 left-4 text-5xl">🕯️</div>
          <div className="absolute top-8 right-8 text-4xl">✨</div>
          <div className="absolute bottom-4 left-1/4 text-3xl">⭐</div>
          <div className="absolute bottom-8 right-1/4 text-4xl">🕯️</div>
        </div>
        <div className="container mx-auto px-4 py-12 max-w-6xl relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-3 text-yellow-800 drop-shadow-lg">{restaurant.name}</h1>
          {restaurant.contact?.address && (
            <p className="text-xl flex items-center gap-2 text-yellow-700">
              <span>📍</span>
              {restaurant.contact.address}
            </p>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {restaurant.contact && (restaurant.contact.whatsapp || restaurant.contact.instagram) && (
          <section className="mb-8 bg-white rounded-xl shadow-lg p-6 border-2 border-yellow-200">
            <h2 className="text-2xl font-bold text-yellow-800 mb-4 flex items-center gap-2">
              <span>🕯️</span>
              Contacto
            </h2>
            <div className="flex flex-wrap gap-4">
              {restaurant.contact.whatsapp && (
                <a
                  href={`https://wa.me/${restaurant.contact.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors shadow-md"
                >
                  <span>📱</span>
                  WhatsApp
                </a>
              )}
              {restaurant.contact.instagram && (
                <a
                  href={`https://instagram.com/${restaurant.contact.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors shadow-md"
                >
                  <span>📷</span>
                  Instagram
                </a>
              )}
            </div>
          </section>
        )}

        {restaurant.schedule && sortedSchedule.length > 0 && (
          <section className="mb-8 bg-white rounded-xl shadow-lg p-6 border-2 border-yellow-200">
            <h2 className="text-2xl font-bold text-yellow-800 mb-4 flex items-center gap-2">
              <span>⏰</span>
              Horarios
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sortedSchedule.map(([day, scheduleValue]) => (
                <div key={day} className="flex justify-between items-center py-2 border-b border-yellow-100 last:border-b-0">
                  <span className="font-semibold text-gray-900">{formatDayName(day)}</span>
                  <span className={scheduleValue === 'closed' ? 'text-red-600 font-bold' : 'text-yellow-700 font-medium'}>
                    {scheduleValue === 'closed' ? 'Cerrado' : scheduleValue}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {restaurant.categories && restaurant.categories.length > 0 ? (
          <section className="bg-white rounded-xl shadow-lg p-6 md:p-8 border-2 border-yellow-300">
            <div className="mb-8 text-center">
              <h2 className="text-4xl font-bold text-yellow-800 mb-2 flex items-center justify-center gap-3">
                <span>🕯️</span>
                Menú
                <span>✨</span>
              </h2>
              <div className="w-32 h-1 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full mx-auto"></div>
            </div>

            {restaurant.categories.map((category) => (
              <div key={category.id} className="mb-12 last:mb-0">
                <div className="mb-6 pb-3 border-b-2 border-yellow-500">
                  <h3 className="text-2xl font-bold text-yellow-700 flex items-center gap-2">
                    <span>⭐</span>
                    {category.name}
                  </h3>
                </div>

                {category.items && category.items.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.items.map((item) => (
                      <div key={item.id} className="bg-gradient-to-br from-yellow-50 to-white rounded-lg p-4 border-2 border-yellow-200 hover:shadow-lg hover:border-yellow-400 transition-all">
                        <h4 className="font-semibold text-lg text-gray-900 mb-2">{item.name}</h4>
                        {item.description && (
                          <p className="text-gray-700 text-sm mb-3">{item.description}</p>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-yellow-300">
                          <span className="text-xl font-bold text-yellow-700">
                            {formatPrice(item.price, restaurant.currency)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic text-center py-4">No hay items en esta categoría</p>
                )}
              </div>
            ))}
          </section>
        ) : (
          <section className="bg-white rounded-xl shadow-lg p-12 text-center border-2 border-yellow-200">
            <p className="text-gray-500 text-lg">No hay categorías disponibles</p>
          </section>
        )}
      </main>

      <footer className="mt-12 py-6 text-center text-yellow-700 text-sm font-semibold">
        <p>🕯️ ¡Feliz Día de las Velitas! © {new Date().getFullYear()} {restaurant.name} ✨</p>
      </footer>
    </div>
  );
}

function IndependenceTemplate({ restaurant, sortedSchedule }: { restaurant: RestaurantData; sortedSchedule: Array<[string, string]> }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-blue-50 to-red-50">
      <header className="bg-gradient-to-r from-yellow-400 via-blue-500 to-red-500 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-4 text-5xl">🇨🇴</div>
          <div className="absolute top-8 right-8 text-4xl">⭐</div>
          <div className="absolute bottom-4 left-1/4 text-3xl">🎉</div>
          <div className="absolute bottom-8 right-1/4 text-4xl">🇨🇴</div>
        </div>
        <div className="container mx-auto px-4 py-12 max-w-6xl relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-3 drop-shadow-2xl text-white">{restaurant.name}</h1>
          {restaurant.contact?.address && (
            <p className="text-xl flex items-center gap-2 text-white/90">
              <span>📍</span>
              {restaurant.contact.address}
            </p>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {restaurant.contact && (restaurant.contact.whatsapp || restaurant.contact.instagram) && (
          <section className="mb-8 bg-white rounded-xl shadow-lg p-6 border-2 border-yellow-400">
            <h2 className="text-2xl font-bold text-blue-700 mb-4 flex items-center gap-2">
              <span>🇨🇴</span>
              Contacto
            </h2>
            <div className="flex flex-wrap gap-4">
              {restaurant.contact.whatsapp && (
                <a
                  href={`https://wa.me/${restaurant.contact.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors shadow-md"
                >
                  <span>📱</span>
                  WhatsApp
                </a>
              )}
              {restaurant.contact.instagram && (
                <a
                  href={`https://instagram.com/${restaurant.contact.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors shadow-md"
                >
                  <span>📷</span>
                  Instagram
                </a>
              )}
            </div>
          </section>
        )}

        {restaurant.schedule && sortedSchedule.length > 0 && (
          <section className="mb-8 bg-white rounded-xl shadow-lg p-6 border-2 border-blue-400">
            <h2 className="text-2xl font-bold text-red-700 mb-4 flex items-center gap-2">
              <span>⏰</span>
              Horarios
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sortedSchedule.map(([day, scheduleValue]) => (
                <div key={day} className="flex justify-between items-center py-2 border-b border-yellow-200 last:border-b-0">
                  <span className="font-semibold text-gray-900">{formatDayName(day)}</span>
                  <span className={scheduleValue === 'closed' ? 'text-red-600 font-bold' : 'text-blue-700 font-medium'}>
                    {scheduleValue === 'closed' ? 'Cerrado' : scheduleValue}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {restaurant.categories && restaurant.categories.length > 0 ? (
          <section className="bg-white rounded-xl shadow-lg p-6 md:p-8 border-4 border-yellow-400">
            <div className="mb-8 text-center">
              <h2 className="text-4xl font-bold text-blue-700 mb-2 flex items-center justify-center gap-3">
                <span>🇨🇴</span>
                Menú
                <span>⭐</span>
              </h2>
              <div className="w-32 h-1 bg-gradient-to-r from-yellow-400 via-blue-500 to-red-500 rounded-full mx-auto"></div>
            </div>

            {restaurant.categories.map((category) => (
              <div key={category.id} className="mb-12 last:mb-0">
                <div className="mb-6 pb-3 border-b-2 border-yellow-500">
                  <h3 className="text-2xl font-bold text-red-700 flex items-center gap-2">
                    <span>🎉</span>
                    {category.name}
                  </h3>
                </div>

                {category.items && category.items.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.items.map((item) => (
                      <div key={item.id} className="bg-gradient-to-br from-yellow-50 via-blue-50 to-red-50 rounded-lg p-4 border-2 border-yellow-300 hover:shadow-lg hover:border-blue-400 transition-all">
                        <h4 className="font-semibold text-lg text-gray-900 mb-2">{item.name}</h4>
                        {item.description && (
                          <p className="text-gray-700 text-sm mb-3">{item.description}</p>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-blue-300">
                          <span className="text-xl font-bold text-red-600">
                            {formatPrice(item.price, restaurant.currency)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic text-center py-4">No hay items en esta categoría</p>
                )}
              </div>
            ))}
          </section>
        ) : (
          <section className="bg-white rounded-xl shadow-lg p-12 text-center border-2 border-yellow-400">
            <p className="text-gray-500 text-lg">No hay categorías disponibles</p>
          </section>
        )}
      </main>

      <footer className="mt-12 py-6 text-center text-blue-700 text-sm font-semibold">
        <p>🇨🇴 ¡Viva Colombia! © {new Date().getFullYear()} {restaurant.name} 🇨🇴</p>
      </footer>
    </div>
  );
}

function EasterTemplate({ restaurant, sortedSchedule }: { restaurant: RestaurantData; sortedSchedule: Array<[string, string]> }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      <header className="bg-gradient-to-r from-purple-700 to-purple-900 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-4 text-5xl">✝️</div>
          <div className="absolute top-8 right-8 text-4xl">🕊️</div>
          <div className="absolute bottom-4 left-1/4 text-3xl">⛪</div>
          <div className="absolute bottom-8 right-1/4 text-4xl">✝️</div>
        </div>
        <div className="container mx-auto px-4 py-12 max-w-6xl relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-3 drop-shadow-2xl text-white">{restaurant.name}</h1>
          {restaurant.contact?.address && (
            <p className="text-xl flex items-center gap-2 text-white/90">
              <span>📍</span>
              {restaurant.contact.address}
            </p>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {restaurant.contact && (restaurant.contact.whatsapp || restaurant.contact.instagram) && (
          <section className="mb-8 bg-white rounded-xl shadow-lg p-6 border-2 border-purple-200">
            <h2 className="text-2xl font-bold text-purple-800 mb-4 flex items-center gap-2">
              <span>✝️</span>
              Contacto
            </h2>
            <div className="flex flex-wrap gap-4">
              {restaurant.contact.whatsapp && (
                <a
                  href={`https://wa.me/${restaurant.contact.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors shadow-md"
                >
                  <span>📱</span>
                  WhatsApp
                </a>
              )}
              {restaurant.contact.instagram && (
                <a
                  href={`https://instagram.com/${restaurant.contact.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors shadow-md"
                >
                  <span>📷</span>
                  Instagram
                </a>
              )}
            </div>
          </section>
        )}

        {restaurant.schedule && sortedSchedule.length > 0 && (
          <section className="mb-8 bg-white rounded-xl shadow-lg p-6 border-2 border-purple-200">
            <h2 className="text-2xl font-bold text-purple-800 mb-4 flex items-center gap-2">
              <span>⏰</span>
              Horarios
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sortedSchedule.map(([day, scheduleValue]) => (
                <div key={day} className="flex justify-between items-center py-2 border-b border-purple-100 last:border-b-0">
                  <span className="font-semibold text-gray-900">{formatDayName(day)}</span>
                  <span className={scheduleValue === 'closed' ? 'text-red-600 font-bold' : 'text-purple-700 font-medium'}>
                    {scheduleValue === 'closed' ? 'Cerrado' : scheduleValue}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {restaurant.categories && restaurant.categories.length > 0 ? (
          <section className="bg-white rounded-xl shadow-lg p-6 md:p-8 border-2 border-purple-300">
            <div className="mb-8 text-center">
              <h2 className="text-4xl font-bold text-purple-800 mb-2 flex items-center justify-center gap-3">
                <span>✝️</span>
                Menú
                <span>🕊️</span>
              </h2>
              <div className="w-32 h-1 bg-gradient-to-r from-purple-500 to-purple-700 rounded-full mx-auto"></div>
            </div>

            {restaurant.categories.map((category) => (
              <div key={category.id} className="mb-12 last:mb-0">
                <div className="mb-6 pb-3 border-b-2 border-purple-500">
                  <h3 className="text-2xl font-bold text-purple-700 flex items-center gap-2">
                    <span>⛪</span>
                    {category.name}
                  </h3>
                </div>

                {category.items && category.items.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.items.map((item) => (
                      <div key={item.id} className="bg-gradient-to-br from-purple-50 to-white rounded-lg p-4 border-2 border-purple-200 hover:shadow-lg hover:border-purple-400 transition-all">
                        <h4 className="font-semibold text-lg text-gray-900 mb-2">{item.name}</h4>
                        {item.description && (
                          <p className="text-gray-700 text-sm mb-3">{item.description}</p>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-purple-300">
                          <span className="text-xl font-bold text-purple-600">
                            {formatPrice(item.price, restaurant.currency)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic text-center py-4">No hay items en esta categoría</p>
                )}
              </div>
            ))}
          </section>
        ) : (
          <section className="bg-white rounded-xl shadow-lg p-12 text-center border-2 border-purple-200">
            <p className="text-gray-500 text-lg">No hay categorías disponibles</p>
          </section>
        )}
      </main>

      <footer className="mt-12 py-6 text-center text-purple-700 text-sm font-semibold">
        <p>✝️ Semana Santa © {new Date().getFullYear()} {restaurant.name} 🕊️</p>
      </footer>
    </div>
  );
}

function MothersDayTemplate({ restaurant, sortedSchedule }: { restaurant: RestaurantData; sortedSchedule: Array<[string, string]> }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-pink-50">
      <header className="bg-gradient-to-r from-pink-400 to-rose-400 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-4 text-5xl">🌸</div>
          <div className="absolute top-8 right-8 text-4xl">💐</div>
          <div className="absolute bottom-4 left-1/4 text-3xl">🌺</div>
          <div className="absolute bottom-8 right-1/4 text-4xl">🌷</div>
        </div>
        <div className="container mx-auto px-4 py-12 max-w-6xl relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-3 drop-shadow-2xl text-white">{restaurant.name}</h1>
          {restaurant.contact?.address && (
            <p className="text-xl flex items-center gap-2 text-white/90">
              <span>📍</span>
              {restaurant.contact.address}
            </p>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {restaurant.contact && (restaurant.contact.whatsapp || restaurant.contact.instagram) && (
          <section className="mb-8 bg-white rounded-xl shadow-lg p-6 border-2 border-pink-200">
            <h2 className="text-2xl font-bold text-pink-800 mb-4 flex items-center gap-2">
              <span>💐</span>
              Contacto
            </h2>
            <div className="flex flex-wrap gap-4">
              {restaurant.contact.whatsapp && (
                <a
                  href={`https://wa.me/${restaurant.contact.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors shadow-md"
                >
                  <span>📱</span>
                  WhatsApp
                </a>
              )}
              {restaurant.contact.instagram && (
                <a
                  href={`https://instagram.com/${restaurant.contact.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors shadow-md"
                >
                  <span>📷</span>
                  Instagram
                </a>
              )}
            </div>
          </section>
        )}

        {restaurant.schedule && sortedSchedule.length > 0 && (
          <section className="mb-8 bg-white rounded-xl shadow-lg p-6 border-2 border-rose-200">
            <h2 className="text-2xl font-bold text-rose-800 mb-4 flex items-center gap-2">
              <span>⏰</span>
              Horarios
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sortedSchedule.map(([day, scheduleValue]) => (
                <div key={day} className="flex justify-between items-center py-2 border-b border-pink-100 last:border-b-0">
                  <span className="font-semibold text-gray-900">{formatDayName(day)}</span>
                  <span className={scheduleValue === 'closed' ? 'text-red-600 font-bold' : 'text-pink-700 font-medium'}>
                    {scheduleValue === 'closed' ? 'Cerrado' : scheduleValue}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {restaurant.categories && restaurant.categories.length > 0 ? (
          <section className="bg-white rounded-xl shadow-lg p-6 md:p-8 border-2 border-pink-300">
            <div className="mb-8 text-center">
              <h2 className="text-4xl font-bold text-pink-800 mb-2 flex items-center justify-center gap-3">
                <span>💐</span>
                Menú
                <span>🌸</span>
              </h2>
              <div className="w-32 h-1 bg-gradient-to-r from-pink-400 to-rose-500 rounded-full mx-auto"></div>
            </div>

            {restaurant.categories.map((category) => (
              <div key={category.id} className="mb-12 last:mb-0">
                <div className="mb-6 pb-3 border-b-2 border-pink-500">
                  <h3 className="text-2xl font-bold text-rose-700 flex items-center gap-2">
                    <span>🌺</span>
                    {category.name}
                  </h3>
                </div>

                {category.items && category.items.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.items.map((item) => (
                      <div key={item.id} className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg p-4 border-2 border-pink-200 hover:shadow-lg hover:border-pink-400 transition-all">
                        <h4 className="font-semibold text-lg text-gray-900 mb-2">{item.name}</h4>
                        {item.description && (
                          <p className="text-gray-700 text-sm mb-3">{item.description}</p>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-pink-300">
                          <span className="text-xl font-bold text-pink-600">
                            {formatPrice(item.price, restaurant.currency)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic text-center py-4">No hay items en esta categoría</p>
                )}
              </div>
            ))}
          </section>
        ) : (
          <section className="bg-white rounded-xl shadow-lg p-12 text-center border-2 border-pink-200">
            <p className="text-gray-500 text-lg">No hay categorías disponibles</p>
          </section>
        )}
      </main>

      <footer className="mt-12 py-6 text-center text-pink-700 text-sm font-semibold">
        <p>💐 ¡Feliz Día de la Madre! © {new Date().getFullYear()} {restaurant.name} 🌸</p>
      </footer>
    </div>
  );
}

function FathersDayTemplate({ restaurant, sortedSchedule }: { restaurant: RestaurantData; sortedSchedule: Array<[string, string]> }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-blue-50">
      <header className="bg-gradient-to-r from-blue-700 to-slate-800 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-4 text-5xl">👔</div>
          <div className="absolute top-8 right-8 text-4xl">🎩</div>
          <div className="absolute bottom-4 left-1/4 text-3xl">💼</div>
          <div className="absolute bottom-8 right-1/4 text-4xl">⭐</div>
        </div>
        <div className="container mx-auto px-4 py-12 max-w-6xl relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-3 drop-shadow-2xl text-white">{restaurant.name}</h1>
          {restaurant.contact?.address && (
            <p className="text-xl flex items-center gap-2 text-white/90">
              <span>📍</span>
              {restaurant.contact.address}
            </p>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {restaurant.contact && (restaurant.contact.whatsapp || restaurant.contact.instagram) && (
          <section className="mb-8 bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200">
            <h2 className="text-2xl font-bold text-blue-800 mb-4 flex items-center gap-2">
              <span>👔</span>
              Contacto
            </h2>
            <div className="flex flex-wrap gap-4">
              {restaurant.contact.whatsapp && (
                <a
                  href={`https://wa.me/${restaurant.contact.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors shadow-md"
                >
                  <span>📱</span>
                  WhatsApp
                </a>
              )}
              {restaurant.contact.instagram && (
                <a
                  href={`https://instagram.com/${restaurant.contact.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors shadow-md"
                >
                  <span>📷</span>
                  Instagram
                </a>
              )}
            </div>
          </section>
        )}

        {restaurant.schedule && sortedSchedule.length > 0 && (
          <section className="mb-8 bg-white rounded-xl shadow-lg p-6 border-2 border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span>⏰</span>
              Horarios
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sortedSchedule.map(([day, scheduleValue]) => (
                <div key={day} className="flex justify-between items-center py-2 border-b border-blue-100 last:border-b-0">
                  <span className="font-semibold text-gray-900">{formatDayName(day)}</span>
                  <span className={scheduleValue === 'closed' ? 'text-red-600 font-bold' : 'text-blue-700 font-medium'}>
                    {scheduleValue === 'closed' ? 'Cerrado' : scheduleValue}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {restaurant.categories && restaurant.categories.length > 0 ? (
          <section className="bg-white rounded-xl shadow-lg p-6 md:p-8 border-2 border-blue-300">
            <div className="mb-8 text-center">
              <h2 className="text-4xl font-bold text-blue-800 mb-2 flex items-center justify-center gap-3">
                <span>👔</span>
                Menú
                <span>💼</span>
              </h2>
              <div className="w-32 h-1 bg-gradient-to-r from-blue-500 to-slate-700 rounded-full mx-auto"></div>
            </div>

            {restaurant.categories.map((category) => (
              <div key={category.id} className="mb-12 last:mb-0">
                <div className="mb-6 pb-3 border-b-2 border-blue-500">
                  <h3 className="text-2xl font-bold text-slate-700 flex items-center gap-2">
                    <span>🎩</span>
                    {category.name}
                  </h3>
                </div>

                {category.items && category.items.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.items.map((item) => (
                      <div key={item.id} className="bg-gradient-to-br from-blue-50 to-slate-50 rounded-lg p-4 border-2 border-blue-200 hover:shadow-lg hover:border-blue-400 transition-all">
                        <h4 className="font-semibold text-lg text-gray-900 mb-2">{item.name}</h4>
                        {item.description && (
                          <p className="text-gray-700 text-sm mb-3">{item.description}</p>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-blue-300">
                          <span className="text-xl font-bold text-blue-600">
                            {formatPrice(item.price, restaurant.currency)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic text-center py-4">No hay items en esta categoría</p>
                )}
              </div>
            ))}
          </section>
        ) : (
          <section className="bg-white rounded-xl shadow-lg p-12 text-center border-2 border-blue-200">
            <p className="text-gray-500 text-lg">No hay categorías disponibles</p>
          </section>
        )}
      </main>

      <footer className="mt-12 py-6 text-center text-blue-700 text-sm font-semibold">
        <p>👔 ¡Feliz Día del Padre! © {new Date().getFullYear()} {restaurant.name} 💼</p>
      </footer>
    </div>
  );
}

function ValentineTemplate({ restaurant, sortedSchedule }: { restaurant: RestaurantData; sortedSchedule: Array<[string, string]> }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-rose-50">
      <header className="bg-gradient-to-r from-red-500 via-pink-500 to-rose-500 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-4 text-5xl">❤️</div>
          <div className="absolute top-8 right-8 text-4xl">💕</div>
          <div className="absolute bottom-4 left-1/4 text-3xl">💖</div>
          <div className="absolute bottom-8 right-1/4 text-4xl">💗</div>
        </div>
        <div className="container mx-auto px-4 py-12 max-w-6xl relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-3 drop-shadow-2xl text-white">{restaurant.name}</h1>
          {restaurant.contact?.address && (
            <p className="text-xl flex items-center gap-2 text-white/90">
              <span>📍</span>
              {restaurant.contact.address}
            </p>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {restaurant.contact && (restaurant.contact.whatsapp || restaurant.contact.instagram) && (
          <section className="mb-8 bg-white rounded-xl shadow-lg p-6 border-2 border-red-200">
            <h2 className="text-2xl font-bold text-red-800 mb-4 flex items-center gap-2">
              <span>❤️</span>
              Contacto
            </h2>
            <div className="flex flex-wrap gap-4">
              {restaurant.contact.whatsapp && (
                <a
                  href={`https://wa.me/${restaurant.contact.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors shadow-md"
                >
                  <span>📱</span>
                  WhatsApp
                </a>
              )}
              {restaurant.contact.instagram && (
                <a
                  href={`https://instagram.com/${restaurant.contact.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors shadow-md"
                >
                  <span>📷</span>
                  Instagram
                </a>
              )}
            </div>
          </section>
        )}

        {restaurant.schedule && sortedSchedule.length > 0 && (
          <section className="mb-8 bg-white rounded-xl shadow-lg p-6 border-2 border-pink-200">
            <h2 className="text-2xl font-bold text-pink-800 mb-4 flex items-center gap-2">
              <span>⏰</span>
              Horarios
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sortedSchedule.map(([day, scheduleValue]) => (
                <div key={day} className="flex justify-between items-center py-2 border-b border-red-100 last:border-b-0">
                  <span className="font-semibold text-gray-900">{formatDayName(day)}</span>
                  <span className={scheduleValue === 'closed' ? 'text-red-600 font-bold' : 'text-pink-700 font-medium'}>
                    {scheduleValue === 'closed' ? 'Cerrado' : scheduleValue}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {restaurant.categories && restaurant.categories.length > 0 ? (
          <section className="bg-white rounded-xl shadow-lg p-6 md:p-8 border-2 border-red-300">
            <div className="mb-8 text-center">
              <h2 className="text-4xl font-bold text-red-800 mb-2 flex items-center justify-center gap-3">
                <span>❤️</span>
                Menú del Amor
                <span>💕</span>
              </h2>
              <div className="w-32 h-1 bg-gradient-to-r from-red-500 via-pink-500 to-rose-500 rounded-full mx-auto"></div>
            </div>

            {restaurant.categories.map((category) => (
              <div key={category.id} className="mb-12 last:mb-0">
                <div className="mb-6 pb-3 border-b-2 border-red-500">
                  <h3 className="text-2xl font-bold text-pink-700 flex items-center gap-2">
                    <span>💖</span>
                    {category.name}
                  </h3>
                </div>

                {category.items && category.items.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.items.map((item) => (
                      <div key={item.id} className="bg-gradient-to-br from-red-50 to-pink-50 rounded-lg p-4 border-2 border-red-200 hover:shadow-lg hover:border-pink-400 transition-all">
                        <h4 className="font-semibold text-lg text-gray-900 mb-2">{item.name}</h4>
                        {item.description && (
                          <p className="text-gray-700 text-sm mb-3">{item.description}</p>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-red-300">
                          <span className="text-xl font-bold text-red-600">
                            {formatPrice(item.price, restaurant.currency)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic text-center py-4">No hay items en esta categoría</p>
                )}
              </div>
            ))}
          </section>
        ) : (
          <section className="bg-white rounded-xl shadow-lg p-12 text-center border-2 border-red-200">
            <p className="text-gray-500 text-lg">No hay categorías disponibles</p>
          </section>
        )}
      </main>

      <footer className="mt-12 py-6 text-center text-red-700 text-sm font-semibold">
        <p>❤️ ¡Feliz San Valentín! © {new Date().getFullYear()} {restaurant.name} 💕</p>
      </footer>
    </div>
  );
}

function ElegantTemplate({ restaurant, sortedSchedule }: { restaurant: RestaurantData; sortedSchedule: Array<[string, string]> }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <header className="bg-gradient-to-r from-black via-gray-900 to-black border-b-4 border-yellow-600 shadow-2xl">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <h1 className="text-5xl md:text-6xl font-bold mb-3 text-yellow-400 drop-shadow-2xl">{restaurant.name}</h1>
          {restaurant.contact?.address && (
            <p className="text-xl flex items-center gap-2 text-gray-300">
              <span>📍</span>
              {restaurant.contact.address}
            </p>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {restaurant.contact && (restaurant.contact.whatsapp || restaurant.contact.instagram) && (
          <section className="mb-8 bg-gray-800 rounded-xl shadow-lg p-6 border-2 border-yellow-600">
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">Contacto</h2>
            <div className="flex flex-wrap gap-4">
              {restaurant.contact.whatsapp && (
                <a
                  href={`https://wa.me/${restaurant.contact.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors shadow-md"
                >
                  <span>📱</span>
                  WhatsApp
                </a>
              )}
              {restaurant.contact.instagram && (
                <a
                  href={`https://instagram.com/${restaurant.contact.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors shadow-md"
                >
                  <span>📷</span>
                  Instagram
                </a>
              )}
            </div>
          </section>
        )}

        {restaurant.schedule && sortedSchedule.length > 0 && (
          <section className="mb-8 bg-gray-800 rounded-xl shadow-lg p-6 border-2 border-yellow-600">
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">Horarios</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sortedSchedule.map(([day, scheduleValue]) => (
                <div key={day} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-b-0">
                  <span className="font-semibold text-gray-300">{formatDayName(day)}</span>
                  <span className={scheduleValue === 'closed' ? 'text-red-400 font-bold' : 'text-yellow-400 font-medium'}>
                    {scheduleValue === 'closed' ? 'Cerrado' : scheduleValue}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {restaurant.categories && restaurant.categories.length > 0 ? (
          <section className="bg-gray-800 rounded-xl shadow-lg p-6 md:p-8 border-2 border-yellow-600">
            <div className="mb-8 text-center">
              <h2 className="text-4xl font-bold text-yellow-400 mb-2">Menú</h2>
              <div className="w-32 h-1 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-full mx-auto"></div>
            </div>

            {restaurant.categories.map((category) => (
              <div key={category.id} className="mb-12 last:mb-0">
                <div className="mb-6 pb-3 border-b-2 border-yellow-500">
                  <h3 className="text-2xl font-bold text-yellow-400">{category.name}</h3>
                </div>

                {category.items && category.items.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.items.map((item) => (
                      <div key={item.id} className="bg-gray-900 rounded-lg p-4 border-2 border-gray-700 hover:shadow-xl hover:border-yellow-500 transition-all">
                        <h4 className="font-semibold text-lg text-white mb-2">{item.name}</h4>
                        {item.description && (
                          <p className="text-gray-400 text-sm mb-3">{item.description}</p>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                          <span className="text-xl font-bold text-yellow-400">
                            {formatPrice(item.price, restaurant.currency)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 italic text-center py-4">No hay items en esta categoría</p>
                )}
              </div>
            ))}
          </section>
        ) : (
          <section className="bg-gray-800 rounded-xl shadow-lg p-12 text-center border-2 border-yellow-600">
            <p className="text-gray-400 text-lg">No hay categorías disponibles</p>
          </section>
        )}
      </main>

      <footer className="mt-12 py-6 text-center text-yellow-400 text-sm font-semibold">
        <p>© {new Date().getFullYear()} {restaurant.name}. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}

function TropicalTemplate({ restaurant, sortedSchedule }: { restaurant: RestaurantData; sortedSchedule: Array<[string, string]> }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-cyan-50 to-blue-100">
      <header className="bg-gradient-to-r from-green-400 via-cyan-400 to-blue-400 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-4 text-5xl">🌴</div>
          <div className="absolute top-8 right-8 text-4xl">🌺</div>
          <div className="absolute bottom-4 left-1/4 text-3xl">🍹</div>
          <div className="absolute bottom-8 right-1/4 text-4xl">🌊</div>
        </div>
        <div className="container mx-auto px-4 py-12 max-w-6xl relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-3 drop-shadow-2xl text-white">{restaurant.name}</h1>
          {restaurant.contact?.address && (
            <p className="text-xl flex items-center gap-2 text-white/90">
              <span>📍</span>
              {restaurant.contact.address}
            </p>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {restaurant.contact && (restaurant.contact.whatsapp || restaurant.contact.instagram) && (
          <section className="mb-8 bg-white rounded-xl shadow-lg p-6 border-2 border-green-200">
            <h2 className="text-2xl font-bold text-green-800 mb-4 flex items-center gap-2">
              <span>🌴</span>
              Contacto
            </h2>
            <div className="flex flex-wrap gap-4">
              {restaurant.contact.whatsapp && (
                <a
                  href={`https://wa.me/${restaurant.contact.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors shadow-md"
                >
                  <span>📱</span>
                  WhatsApp
                </a>
              )}
              {restaurant.contact.instagram && (
                <a
                  href={`https://instagram.com/${restaurant.contact.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors shadow-md"
                >
                  <span>📷</span>
                  Instagram
                </a>
              )}
            </div>
          </section>
        )}

        {restaurant.schedule && sortedSchedule.length > 0 && (
          <section className="mb-8 bg-white rounded-xl shadow-lg p-6 border-2 border-cyan-200">
            <h2 className="text-2xl font-bold text-cyan-800 mb-4 flex items-center gap-2">
              <span>⏰</span>
              Horarios
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sortedSchedule.map(([day, scheduleValue]) => (
                <div key={day} className="flex justify-between items-center py-2 border-b border-green-100 last:border-b-0">
                  <span className="font-semibold text-gray-900">{formatDayName(day)}</span>
                  <span className={scheduleValue === 'closed' ? 'text-red-600 font-bold' : 'text-green-700 font-medium'}>
                    {scheduleValue === 'closed' ? 'Cerrado' : scheduleValue}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {restaurant.categories && restaurant.categories.length > 0 ? (
          <section className="bg-white rounded-xl shadow-lg p-6 md:p-8 border-2 border-green-300">
            <div className="mb-8 text-center">
              <h2 className="text-4xl font-bold text-green-800 mb-2 flex items-center justify-center gap-3">
                <span>🌴</span>
                Menú Tropical
                <span>🌺</span>
              </h2>
              <div className="w-32 h-1 bg-gradient-to-r from-green-400 via-cyan-400 to-blue-400 rounded-full mx-auto"></div>
            </div>

            {restaurant.categories.map((category) => (
              <div key={category.id} className="mb-12 last:mb-0">
                <div className="mb-6 pb-3 border-b-2 border-green-500">
                  <h3 className="text-2xl font-bold text-cyan-700 flex items-center gap-2">
                    <span>🌊</span>
                    {category.name}
                  </h3>
                </div>

                {category.items && category.items.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.items.map((item) => (
                      <div key={item.id} className="bg-gradient-to-br from-green-50 to-cyan-50 rounded-lg p-4 border-2 border-green-200 hover:shadow-lg hover:border-cyan-400 transition-all">
                        <h4 className="font-semibold text-lg text-gray-900 mb-2">{item.name}</h4>
                        {item.description && (
                          <p className="text-gray-700 text-sm mb-3">{item.description}</p>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-green-300">
                          <span className="text-xl font-bold text-green-600">
                            {formatPrice(item.price, restaurant.currency)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic text-center py-4">No hay items en esta categoría</p>
                )}
              </div>
            ))}
          </section>
        ) : (
          <section className="bg-white rounded-xl shadow-lg p-12 text-center border-2 border-green-200">
            <p className="text-gray-500 text-lg">No hay categorías disponibles</p>
          </section>
        )}
      </main>

      <footer className="mt-12 py-6 text-center text-green-700 text-sm font-semibold">
        <p>🌴 ¡Disfruta el sabor tropical! © {new Date().getFullYear()} {restaurant.name} 🌺</p>
      </footer>
    </div>
  );
}

function DarkTemplate({ restaurant, sortedSchedule }: { restaurant: RestaurantData; sortedSchedule: Array<[string, string]> }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <header className="bg-black border-b-4 border-purple-500 shadow-2xl">
        <div className="container mx-auto px-4 py-12 max-w-6xl">
          <h1 className="text-5xl md:text-6xl font-bold mb-3 text-purple-400 drop-shadow-2xl">{restaurant.name}</h1>
          {restaurant.contact?.address && (
            <p className="text-xl flex items-center gap-2 text-gray-400">
              <span>📍</span>
              {restaurant.contact.address}
            </p>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {restaurant.contact && (restaurant.contact.whatsapp || restaurant.contact.instagram) && (
          <section className="mb-8 bg-gray-900 rounded-xl shadow-lg p-6 border-2 border-purple-500">
            <h2 className="text-2xl font-bold text-purple-400 mb-4">Contacto</h2>
            <div className="flex flex-wrap gap-4">
              {restaurant.contact.whatsapp && (
                <a
                  href={`https://wa.me/${restaurant.contact.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors shadow-md"
                >
                  <span>📱</span>
                  WhatsApp
                </a>
              )}
              {restaurant.contact.instagram && (
                <a
                  href={`https://instagram.com/${restaurant.contact.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors shadow-md"
                >
                  <span>📷</span>
                  Instagram
                </a>
              )}
            </div>
          </section>
        )}

        {restaurant.schedule && sortedSchedule.length > 0 && (
          <section className="mb-8 bg-gray-900 rounded-xl shadow-lg p-6 border-2 border-purple-500">
            <h2 className="text-2xl font-bold text-purple-400 mb-4">Horarios</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sortedSchedule.map(([day, scheduleValue]) => (
                <div key={day} className="flex justify-between items-center py-2 border-b border-gray-700 last:border-b-0">
                  <span className="font-semibold text-gray-300">{formatDayName(day)}</span>
                  <span className={scheduleValue === 'closed' ? 'text-red-400 font-bold' : 'text-purple-400 font-medium'}>
                    {scheduleValue === 'closed' ? 'Cerrado' : scheduleValue}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {restaurant.categories && restaurant.categories.length > 0 ? (
          <section className="bg-gray-900 rounded-xl shadow-lg p-6 md:p-8 border-2 border-purple-500">
            <div className="mb-8 text-center">
              <h2 className="text-4xl font-bold text-purple-400 mb-2">Menú</h2>
              <div className="w-32 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-auto"></div>
            </div>

            {restaurant.categories.map((category) => (
              <div key={category.id} className="mb-12 last:mb-0">
                <div className="mb-6 pb-3 border-b-2 border-purple-500">
                  <h3 className="text-2xl font-bold text-purple-400">{category.name}</h3>
                </div>

                {category.items && category.items.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.items.map((item) => (
                      <div key={item.id} className="bg-black rounded-lg p-4 border-2 border-gray-700 hover:shadow-xl hover:border-purple-500 transition-all">
                        <h4 className="font-semibold text-lg text-white mb-2">{item.name}</h4>
                        {item.description && (
                          <p className="text-gray-400 text-sm mb-3">{item.description}</p>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                          <span className="text-xl font-bold text-purple-400">
                            {formatPrice(item.price, restaurant.currency)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 italic text-center py-4">No hay items en esta categoría</p>
                )}
              </div>
            ))}
          </section>
        ) : (
          <section className="bg-gray-900 rounded-xl shadow-lg p-12 text-center border-2 border-purple-500">
            <p className="text-gray-400 text-lg">No hay categorías disponibles</p>
          </section>
        )}
      </main>

      <footer className="mt-12 py-6 text-center text-purple-400 text-sm font-semibold">
        <p>© {new Date().getFullYear()} {restaurant.name}. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}

function ColorfulTemplate({ restaurant, sortedSchedule }: { restaurant: RestaurantData; sortedSchedule: Array<[string, string]> }) {
  const colorSchemes = [
    { bg: 'from-pink-50 to-yellow-50', border: 'border-pink-300', hover: 'hover:border-pink-500', text: 'text-pink-600' },
    { bg: 'from-yellow-50 to-green-50', border: 'border-yellow-300', hover: 'hover:border-yellow-500', text: 'text-yellow-600' },
    { bg: 'from-green-50 to-blue-50', border: 'border-green-300', hover: 'hover:border-green-500', text: 'text-green-600' },
    { bg: 'from-blue-50 to-pink-50', border: 'border-blue-300', hover: 'hover:border-blue-500', text: 'text-blue-600' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-200 via-yellow-200 via-green-200 to-blue-200">
      <header className="bg-gradient-to-r from-pink-500 via-yellow-400 via-green-400 to-blue-500 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-4 text-5xl">🌈</div>
          <div className="absolute top-8 right-8 text-4xl">🎨</div>
          <div className="absolute bottom-4 left-1/4 text-3xl">✨</div>
          <div className="absolute bottom-8 right-1/4 text-4xl">🎉</div>
        </div>
        <div className="container mx-auto px-4 py-12 max-w-6xl relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-3 drop-shadow-2xl text-white">{restaurant.name}</h1>
          {restaurant.contact?.address && (
            <p className="text-xl flex items-center gap-2 text-white/90">
              <span>📍</span>
              {restaurant.contact.address}
            </p>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {restaurant.contact && (restaurant.contact.whatsapp || restaurant.contact.instagram) && (
          <section className="mb-8 bg-white rounded-xl shadow-lg p-6 border-4 border-pink-400">
            <h2 className="text-2xl font-bold text-pink-600 mb-4 flex items-center gap-2">
              <span>🌈</span>
              Contacto
            </h2>
            <div className="flex flex-wrap gap-4">
              {restaurant.contact.whatsapp && (
                <a
                  href={`https://wa.me/${restaurant.contact.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors shadow-md"
                >
                  <span>📱</span>
                  WhatsApp
                </a>
              )}
              {restaurant.contact.instagram && (
                <a
                  href={`https://instagram.com/${restaurant.contact.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors shadow-md"
                >
                  <span>📷</span>
                  Instagram
                </a>
              )}
            </div>
          </section>
        )}

        {restaurant.schedule && sortedSchedule.length > 0 && (
          <section className="mb-8 bg-white rounded-xl shadow-lg p-6 border-4 border-yellow-400">
            <h2 className="text-2xl font-bold text-yellow-600 mb-4 flex items-center gap-2">
              <span>⏰</span>
              Horarios
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sortedSchedule.map(([day, scheduleValue]) => (
                <div key={day} className="flex justify-between items-center py-2 border-b-2 border-green-200 last:border-b-0">
                  <span className="font-semibold text-gray-900">{formatDayName(day)}</span>
                  <span className={scheduleValue === 'closed' ? 'text-red-600 font-bold' : 'text-blue-600 font-medium'}>
                    {scheduleValue === 'closed' ? 'Cerrado' : scheduleValue}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {restaurant.categories && restaurant.categories.length > 0 ? (
          <section className="bg-white rounded-xl shadow-lg p-6 md:p-8 border-4 border-green-400">
            <div className="mb-8 text-center">
              <h2 className="text-4xl font-bold text-pink-600 mb-2 flex items-center justify-center gap-3">
                <span>🌈</span>
                Menú Colorido
                <span>🎨</span>
              </h2>
              <div className="w-32 h-2 bg-gradient-to-r from-pink-500 via-yellow-400 via-green-400 to-blue-500 rounded-full mx-auto"></div>
            </div>

            {restaurant.categories.map((category, catIndex) => {
              const colorScheme = colorSchemes[catIndex % colorSchemes.length];
              return (
                <div key={category.id} className="mb-12 last:mb-0">
                  <div className={`mb-6 pb-3 border-b-4 ${colorScheme.border}`}>
                    <h3 className={`text-2xl font-bold ${colorScheme.text} flex items-center gap-2`}>
                      <span>✨</span>
                      {category.name}
                    </h3>
                  </div>

                  {category.items && category.items.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {category.items.map((item) => (
                        <div key={item.id} className={`bg-gradient-to-br ${colorScheme.bg} rounded-lg p-4 border-2 ${colorScheme.border} ${colorScheme.hover} transition-all hover:shadow-lg`}>
                          <h4 className="font-semibold text-lg text-gray-900 mb-2">{item.name}</h4>
                          {item.description && (
                            <p className="text-gray-700 text-sm mb-3">{item.description}</p>
                          )}
                          <div className={`flex justify-between items-center pt-2 border-t ${colorScheme.border}`}>
                            <span className={`text-xl font-bold ${colorScheme.text}`}>
                              {formatPrice(item.price, restaurant.currency)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic text-center py-4">No hay items en esta categoría</p>
                  )}
                </div>
              );
            })}
          </section>
        ) : (
          <section className="bg-white rounded-xl shadow-lg p-12 text-center border-4 border-pink-400">
            <p className="text-gray-500 text-lg">No hay categorías disponibles</p>
          </section>
        )}
      </main>

      <footer className="mt-12 py-6 text-center text-pink-600 text-sm font-semibold">
        <p>🌈 ¡Disfruta de colores vibrantes! © {new Date().getFullYear()} {restaurant.name} 🎨</p>
      </footer>
    </div>
  );
}

function RomanticTemplate({ restaurant, sortedSchedule }: { restaurant: RestaurantData; sortedSchedule: Array<[string, string]> }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-lavender-50">
      <header className="bg-gradient-to-r from-rose-300 via-pink-300 to-lavender-300 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 left-4 text-5xl">💝</div>
          <div className="absolute top-8 right-8 text-4xl">🌹</div>
          <div className="absolute bottom-4 left-1/4 text-3xl">✨</div>
          <div className="absolute bottom-8 right-1/4 text-4xl">💕</div>
        </div>
        <div className="container mx-auto px-4 py-12 max-w-6xl relative z-10">
          <h1 className="text-5xl md:text-6xl font-bold mb-3 drop-shadow-2xl text-rose-800">{restaurant.name}</h1>
          {restaurant.contact?.address && (
            <p className="text-xl flex items-center gap-2 text-rose-700">
              <span>📍</span>
              {restaurant.contact.address}
            </p>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {restaurant.contact && (restaurant.contact.whatsapp || restaurant.contact.instagram) && (
          <section className="mb-8 bg-white rounded-xl shadow-lg p-6 border-2 border-rose-200">
            <h2 className="text-2xl font-bold text-rose-700 mb-4 flex items-center gap-2">
              <span>💝</span>
              Contacto
            </h2>
            <div className="flex flex-wrap gap-4">
              {restaurant.contact.whatsapp && (
                <a
                  href={`https://wa.me/${restaurant.contact.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors shadow-md"
                >
                  <span>📱</span>
                  WhatsApp
                </a>
              )}
              {restaurant.contact.instagram && (
                <a
                  href={`https://instagram.com/${restaurant.contact.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors shadow-md"
                >
                  <span>📷</span>
                  Instagram
                </a>
              )}
            </div>
          </section>
        )}

        {restaurant.schedule && sortedSchedule.length > 0 && (
          <section className="mb-8 bg-white rounded-xl shadow-lg p-6 border-2 border-pink-200">
            <h2 className="text-2xl font-bold text-pink-700 mb-4 flex items-center gap-2">
              <span>⏰</span>
              Horarios
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sortedSchedule.map(([day, scheduleValue]) => (
                <div key={day} className="flex justify-between items-center py-2 border-b border-rose-100 last:border-b-0">
                  <span className="font-semibold text-gray-900">{formatDayName(day)}</span>
                  <span className={scheduleValue === 'closed' ? 'text-red-600 font-bold' : 'text-rose-600 font-medium'}>
                    {scheduleValue === 'closed' ? 'Cerrado' : scheduleValue}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {restaurant.categories && restaurant.categories.length > 0 ? (
          <section className="bg-white rounded-xl shadow-lg p-6 md:p-8 border-2 border-rose-300">
            <div className="mb-8 text-center">
              <h2 className="text-4xl font-bold text-rose-700 mb-2 flex items-center justify-center gap-3">
                <span>💝</span>
                Menú
                <span>🌹</span>
              </h2>
              <div className="w-32 h-1 bg-gradient-to-r from-rose-400 via-pink-400 to-lavender-400 rounded-full mx-auto"></div>
            </div>

            {restaurant.categories.map((category) => (
              <div key={category.id} className="mb-12 last:mb-0">
                <div className="mb-6 pb-3 border-b-2 border-rose-400">
                  <h3 className="text-2xl font-bold text-pink-700 flex items-center gap-2">
                    <span>✨</span>
                    {category.name}
                  </h3>
                </div>

                {category.items && category.items.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.items.map((item) => (
                      <div key={item.id} className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-lg p-4 border-2 border-rose-200 hover:shadow-lg hover:border-pink-400 transition-all">
                        <h4 className="font-semibold text-lg text-gray-900 mb-2">{item.name}</h4>
                        {item.description && (
                          <p className="text-gray-700 text-sm mb-3">{item.description}</p>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-rose-300">
                          <span className="text-xl font-bold text-rose-600">
                            {formatPrice(item.price, restaurant.currency)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic text-center py-4">No hay items en esta categoría</p>
                )}
              </div>
            ))}
          </section>
        ) : (
          <section className="bg-white rounded-xl shadow-lg p-12 text-center border-2 border-rose-200">
            <p className="text-gray-500 text-lg">No hay categorías disponibles</p>
          </section>
        )}
      </main>

      <footer className="mt-12 py-6 text-center text-rose-600 text-sm font-semibold">
        <p>💝 Con amor © {new Date().getFullYear()} {restaurant.name} 🌹</p>
      </footer>
    </div>
  );
}
