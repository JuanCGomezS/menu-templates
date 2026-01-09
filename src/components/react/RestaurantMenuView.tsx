import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { getRestaurantWithData } from '../../lib/restaurant-helpers';
import { formatPrice, formatDayName, sortScheduleDays } from '../../lib/utils';
import { getTemplateComponent } from '../../lib/templates';

interface RestaurantData {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  currency: string;
  templateId: string;
  template?: { id: string; name: string } | null;
  contact?: {
    whatsapp?: string;
    instagram?: string;
    address?: string;
  };
  schedule?: Record<string, string>;
  categories: Array<{
    id: string;
    name: string;
    order: number;
    items: Array<{
      id: string;
      name: string;
      description?: string;
      price: number;
      order: number;
    }>;
  }>;
}

interface Props {
  slug: string;
}

export default function RestaurantMenuView({ slug }: Props) {
  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let restaurantsData: any[] = [];
    let categoriesData: any[] = [];
    let itemsData: any[] = [];
    let templatesData: any[] = [];
    let unsubscribeCategories: (() => void) | null = null;
    const itemUnsubscribes: (() => void)[] = [];

    const loadData = async () => {
      try {
        // Cargar restaurante por slug
        const restaurantsQuery = query(
          collection(db, 'restaurants'),
          where('slug', '==', slug)
        );

        const restaurantsSnapshot = await getDocs(restaurantsQuery);

        if (restaurantsSnapshot.empty) {
          setError('Restaurante no encontrado');
          setLoading(false);
          return;
        }

        const restaurantDoc = restaurantsSnapshot.docs[0];
        const restaurantData: any = {
          id: restaurantDoc.id,
          ...restaurantDoc.data()
        };

        if (!restaurantData.isActive) {
          setError('No disponible');
          setLoading(false);
          return;
        }

        restaurantsData = [restaurantData];

        // Cargar templates
        const templatesSnapshot = await getDocs(collection(db, 'templates'));
        templatesData = templatesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));

        // Suscribirse a cambios en categorías usando subcolecciones
        const categoriesRef = collection(db, 'restaurants', restaurantData.id, 'categories');

        unsubscribeCategories = onSnapshot(
          categoriesRef,
          async (categoriesSnapshot) => {
            // Limpiar suscripciones anteriores de items
            itemUnsubscribes.forEach(unsub => unsub());
            itemUnsubscribes.length = 0;

            categoriesData = categoriesSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data()
            }));

            // Suscribirse a items de cada categoría (subcolecciones anidadas)
            categoriesSnapshot.docs.forEach((categoryDoc) => {
              const itemsRef = collection(db, 'restaurants', restaurantData.id, 'categories', categoryDoc.id, 'items');

              const unsubscribeItems = onSnapshot(
                itemsRef,
                (itemsSnapshot) => {
                  // Actualizar items de esta categoría
                  const categoryItems = itemsSnapshot.docs.map((itemDoc) => ({
                    id: itemDoc.id,
                    categoryId: categoryDoc.id,
                    ...itemDoc.data()
                  }));

                  // Actualizar itemsData: remover items antiguos de esta categoría y agregar nuevos
                  itemsData = itemsData.filter(item => item.categoryId !== categoryDoc.id);
                  itemsData = [...itemsData, ...categoryItems];

                  updateRestaurant();
                },
                (err) => {
                  console.error(`Error en items de categoría ${categoryDoc.id}:`, err);
                }
              );

              itemUnsubscribes.push(unsubscribeItems);
            });

            // Si no hay categorías, actualizar de todas formas
            if (categoriesSnapshot.empty) {
              itemsData = [];
              updateRestaurant();
            }
          },
          (err) => {
            console.error('Error en categories:', err);
            setError('Error al cargar categorías');
          }
        );

        const updateRestaurant = () => {
          if (restaurantsData.length > 0) {
            const restaurantWithData = getRestaurantWithData(
              restaurantsData[0],
              categoriesData,
              itemsData,
              templatesData
            );
            setRestaurant(restaurantWithData);
            setLoading(false);
            setError(null);
          }
        };

        // Actualizar inicialmente
        updateRestaurant();
      } catch (err: any) {
        console.error('Error loading restaurant:', err);
        setError('Error al cargar el restaurante');
        setLoading(false);
      }
    };

    loadData();

    return () => {
      if (unsubscribeCategories) unsubscribeCategories();
      itemUnsubscribes.forEach(unsub => unsub());
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

  const templateComponent = getTemplateComponent(restaurant.templateId || '');
  const sortedSchedule = restaurant.schedule ? sortScheduleDays(restaurant.schedule) : [];

  switch (templateComponent) {
    case 'christmas':
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

function DefaultTemplate({ restaurant, sortedSchedule }: { restaurant: RestaurantData; sortedSchedule: Array<[string, string]> }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">{restaurant.name}</h1>
          {restaurant.contact?.address && (
            <p className="text-gray-600 flex items-center gap-2">
              <span>📍</span>
              {restaurant.contact.address}
            </p>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {restaurant.categories && restaurant.categories.length > 0 ? (
          <section className="bg-white rounded-xl shadow-md p-6 md:p-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Menú</h2>
              <div className="w-20 h-1 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full"></div>
            </div>

            {restaurant.categories.map((category) => (
              <div key={category.id} className="mb-12 last:mb-0">
                <div className="mb-6 pb-3 border-b-2 border-orange-500">
                  <h3 className="text-2xl font-bold text-gray-900">{category.name}</h3>
                </div>

                {category.items && category.items.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.items.map((item) => (
                      <div key={item.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                        <h4 className="font-semibold text-lg text-gray-900 mb-2">{item.name}</h4>
                        {item.description && (
                          <p className="text-gray-600 text-sm mb-3">{item.description}</p>
                        )}
                        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                          <span className="text-xl font-bold text-orange-600">
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
          <section className="bg-white rounded-xl shadow-md p-12 text-center">
            <p className="text-gray-500 text-lg">No hay categorías disponibles</p>
          </section>
        )}

        {restaurant.schedule && sortedSchedule.length > 0 && (
          <section className="mb-8 bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Horarios</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sortedSchedule.map(([day, scheduleValue]) => (
                <div key={day} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                  <span className="font-semibold text-gray-900">{formatDayName(day)}</span>
                  <span className={scheduleValue === 'closed' ? 'text-red-600' : 'text-gray-700'}>
                    {scheduleValue === 'closed' ? 'Cerrado' : scheduleValue}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {restaurant.contact && (restaurant.contact.whatsapp || restaurant.contact.instagram) && (
          <section className="mb-8 bg-white rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Contacto</h2>
            <div className="flex flex-wrap gap-4">
              {restaurant.contact.whatsapp && (
                <a
                  href={`https://wa.me/${restaurant.contact.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors"
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
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors"
                >
                  <span>📷</span>
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
