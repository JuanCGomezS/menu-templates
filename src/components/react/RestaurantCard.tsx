import { formatPrice, formatDayName, sortScheduleDays } from '../../lib/utils';

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  currency: string;
  template?: { name: string } | null;
  contact?: {
    whatsapp?: string;
    instagram?: string;
    address?: string;
  };
  schedule?: Record<string, string>;
  categories: Array<{
    id: string;
    name: string;
    items: Array<{
      name: string;
      description?: string;
      price: number;
    }>;
  }>;
}

interface Props {
  restaurant: Restaurant;
}

export default function RestaurantCard({ restaurant }: Props) {
  const sortedSchedule = restaurant.schedule
    ? sortScheduleDays(restaurant.schedule)
    : [];

  return (
    <article className="mb-16 bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
      <div className="bg-gradient-to-r from-orange-500 to-pink-500 p-6">
        <header className="mb-4">
          <h2 className="text-4xl font-bold text-white mb-4">{restaurant.name}</h2>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-white text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <p className="my-1">
                <strong className="font-semibold">Slug:</strong>{' '}
                <span className="opacity-90">{restaurant.slug}</span>
              </p>
              {restaurant.isActive && (
                <p className="my-1">
                  <strong className="font-semibold">URL Pública:</strong>{' '}
                  <a
                    href={`/menu-templates/m/${restaurant.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-90 underline hover:opacity-100 text-blue-200 hover:text-blue-100 transition-colors"
                  >
                    Ver menú público →
                  </a>
                </p>
              )}
              <p className="my-1">
                <strong className="font-semibold">Estado:</strong>{' '}
                <span
                  className={
                    restaurant.isActive ? 'text-green-200' : 'text-red-200'
                  }
                >
                  {restaurant.isActive ? '✅ Activo' : '❌ Inactivo'}
                </span>
              </p>
              <p className="my-1">
                <strong className="font-semibold">Moneda:</strong>{' '}
                <span className="opacity-90">{restaurant.currency}</span>
              </p>
              {restaurant.template && (
                <p className="my-1">
                  <strong className="font-semibold">Plantilla:</strong>{' '}
                  <span className="opacity-90">{restaurant.template.name}</span>
                </p>
              )}
            </div>
          </div>
        </header>
      </div>

      <div className="p-6 space-y-6">
        {restaurant.contact && (
          <div className="border-b border-gray-200 pb-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">📞</span>
                Contacto
              </h3>
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg p-5 border border-cyan-200">
                <ul className="list-none p-0 m-0 space-y-3">
                  {restaurant.contact.whatsapp && (
                    <li className="flex items-center py-2">
                      <span className="text-2xl mr-3">📱</span>
                      <div>
                        <span className="text-sm text-gray-600 font-medium">WhatsApp</span>
                        <p className="text-gray-900 font-semibold">
                          {restaurant.contact.whatsapp}
                        </p>
                      </div>
                    </li>
                  )}
                  {restaurant.contact.instagram && (
                    <li className="flex items-center py-2">
                      <span className="text-2xl mr-3">📷</span>
                      <div>
                        <span className="text-sm text-gray-600 font-medium">Instagram</span>
                        <p className="text-gray-900 font-semibold">
                          {restaurant.contact.instagram}
                        </p>
                      </div>
                    </li>
                  )}
                  {restaurant.contact.address && (
                    <li className="flex items-center py-2">
                      <span className="text-2xl mr-3">📍</span>
                      <div>
                        <span className="text-sm text-gray-600 font-medium">Dirección</span>
                        <p className="text-gray-900 font-semibold">
                          {restaurant.contact.address}
                        </p>
                      </div>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {restaurant.schedule && (
          <div className="border-b border-gray-200 pb-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">🕐</span>
                Horarios
              </h3>
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-5 border border-yellow-200">
                <ul className="list-none p-0 m-0 columns-1 md:columns-2 gap-4">
                  {sortedSchedule.map(([day, scheduleValue]) => (
                    <li
                      key={day}
                      className="py-2 [break-inside:avoid] border-b border-yellow-200 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-gray-900 font-semibold">
                          {formatDayName(day)}:
                        </strong>
                        <span
                          className={
                            scheduleValue === 'closed'
                              ? 'text-red-600 font-medium'
                              : 'text-gray-700 font-medium'
                          }
                        >
                          {scheduleValue === 'closed' ? 'Cerrado' : scheduleValue}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {restaurant.categories && restaurant.categories.length > 0 ? (
          <div className="menu-section pt-4">
            <div className="mb-8">
              <h3 className="text-3xl font-bold text-gray-900 mb-2">Menú</h3>
              <div className="w-20 h-1 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full"></div>
            </div>
            {restaurant.categories.map((category) => (
              <CategorySection
                key={category.id}
                category={category}
                currency={restaurant.currency}
              />
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-gray-500 italic">No hay categorías disponibles</p>
          </div>
        )}
      </div>
    </article>
  );
}

function CategorySection({
  category,
  currency
}: {
  category: {
    name: string;
    items: Array<{
      name: string;
      description?: string;
      price: number;
    }>;
  };
  currency: string;
}) {
  return (
    <section className="mb-12">
      <div className="mb-6 pb-3 border-b-2 border-orange-500">
        <h4 className="text-2xl font-bold text-gray-900 inline-block">
          {category.name}
        </h4>
      </div>
      {category.items && category.items.length > 0 ? (
        <ItemList items={category.items} currency={currency} />
      ) : (
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <p className="text-gray-500 italic">No hay items en esta categoría</p>
        </div>
      )}
    </section>
  );
}

function ItemList({
  items,
  currency
}: {
  items: Array<{
    name: string;
    description?: string;
    price: number;
  }>;
  currency: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item, index) => (
        <div
          key={index}
          className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden border border-gray-100"
        >
          <div className="w-full h-48 bg-gradient-to-br from-orange-100 to-pink-100 flex items-center justify-center">
            <svg
              className="w-24 h-24 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <div className="p-4">
            <h5 className="font-semibold text-lg text-gray-900 mb-2">{item.name}</h5>
            {item.description && (
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                {item.description}
              </p>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <span className="text-2xl font-bold text-orange-600">
                {formatPrice(item.price, currency)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

