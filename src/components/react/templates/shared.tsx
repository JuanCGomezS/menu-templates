import type { ReactNode } from "react";
import {
  isPublicItemSoldOut,
  type PublicItem,
} from "../../../lib/store-helpers";
import type { StoreContentModel } from "../../../lib/store-content";
import type { ThemeConfig } from "../../../lib/templates";
import { formatDayName, formatPrice } from "../../../lib/utils";
import { usePublicOrderCart } from "../PublicOrderCart";
import LocationMap from "../LocationMap";
import "./shared.css";

export interface TemplateProps {
  store: StoreContentModel;
  schedule: [string, string][];
  theme: ThemeConfig;
  isOpen: boolean | null;
  onAddToCart: (item: PublicItem) => void;
}

export function TemplateShell({
  children,
  variant,
  ...props
}: TemplateProps & { children: ReactNode; variant: string }) {
  return (
    <main
      className={`store-atelier atelier--${variant}`}
      data-theme={props.theme.component}
    >
      <ThemeDecoration theme={props.theme} />
      {children}
      <ServiceFooter store={props.store} schedule={props.schedule} />
    </main>
  );
}

function ThemeDecoration({ theme }: { theme: ThemeConfig }) {
  if (theme.component !== "mexican" && theme.component !== "christmas")
    return null;
  return (
    <div
      className={`atelier-decoration atelier-decoration--${theme.component}`}
      aria-hidden="true"
    >
      {theme.component === "mexican" ? (
        <svg
          viewBox="0 0 1200 80"
          preserveAspectRatio="xMidYMid slice"
          focusable="false"
        >
          <path
            d="M0 6Q600 60 1200 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          {Array.from({ length: 12 }, (_, index) => (
            <g
              key={index}
              transform={`translate(${index * 104 - 20} ${10 + Math.sin((index / 11) * Math.PI) * 20})`}
            >
              <path
                d="M0 0h88v39l-8 9-8-5-7 8-8-5-13 9-13-9-8 5-7-8-8 5-8-9z M16 10h8v14h-8z M64 10h8v14h-8z M44 6l13 15-13 16-13-16z"
                fill={
                  index % 3 === 0
                    ? "var(--store-accent-secondary)"
                    : index % 3 === 1
                      ? "var(--store-text)"
                      : "var(--store-accent-tertiary)"
                }
                fillRule="evenodd"
                stroke="currentColor"
                strokeWidth="0.6"
              />
            </g>
          ))}
        </svg>
      ) : (
        <svg
          viewBox="0 0 1200 96"
          preserveAspectRatio="xMidYMid slice"
          focusable="false"
        >
          <path
            d="M0 2Q300 88 600 16Q900 88 1200 2"
            fill="none"
            stroke="var(--store-accent-secondary)"
            strokeWidth="4"
          />
          {Array.from({ length: 15 }, (_, index) => (
            <g
              key={index}
              transform={`translate(${index * 86} ${15 + Math.sin((index / 14) * Math.PI * 2) ** 2 * 26})`}
            >
              <path
                d="M-22-10l22 14 22-14M-17-17L0-2l17-15"
                fill="none"
                stroke="var(--store-accent-secondary)"
                strokeWidth="3"
              />
              <path d="M0 5v15" stroke="currentColor" />
              <circle
                cy="28"
                r={index % 3 === 0 ? 12 : 5}
                fill={
                  index % 3 === 0
                    ? "var(--store-accent)"
                    : "var(--store-accent-tertiary)"
                }
              />
              {index % 3 === 0 && (
                <path
                  d="M-5 28H5M0 23v10"
                  stroke="var(--store-on-accent)"
                  strokeWidth="1.5"
                />
              )}
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}

export function Identity({
  store,
  isOpen,
}: Pick<TemplateProps, "store" | "isOpen">) {
  return (
    <div className="atelier-identity">
      <a href="#atelier-catalog" className="atelier-brand">
        {store.logoUrl && (
          <img src={store.logoUrl} alt="" width="48" height="48" />
        )}
        <span>{store.name}</span>
      </a>
      {isOpen !== null && (
        <span className="atelier-status">
          {isOpen ? "Abierto ahora" : "Cerrado ahora"}
        </span>
      )}
    </div>
  );
}

export function CatalogNav({ store }: Pick<TemplateProps, "store">) {
  if (!store.categories.length) return null;
  return (
    <nav className="atelier-nav" aria-label="Categorías">
      {store.categories.map((category) => (
        <a key={category.id} href={`#category-${category.id}`}>
          {category.name}
        </a>
      ))}
    </nav>
  );
}

export function CatalogEmpty() {
  return (
    <p className="atelier-empty" role="status">
      Pronto encontrarás productos aquí.
    </p>
  );
}

export function ProductRow({
  item,
  store,
  onAddToCart,
  image = true,
  className = "",
}: Pick<TemplateProps, "store" | "onAddToCart"> & {
  item: PublicItem;
  image?: boolean;
  className?: string;
}) {
  const soldOut = isPublicItemSoldOut(item);
  return (
    <article
      className={`atelier-item ${item.imageUrl && image ? "atelier-item--photo" : ""} ${className}`}
      data-sold-out={soldOut || undefined}
    >
      {image && item.imageUrl && (
        <img
          className="atelier-item-photo"
          src={item.imageUrl}
          alt={item.name}
          loading="lazy"
          width="320"
          height="320"
        />
      )}
      <div className="atelier-item-copy">
        <h3>{item.name}</h3>
        {item.description && <p>{item.description}</p>}
      </div>
      <ItemPurchase item={item} store={store} onAddToCart={onAddToCart} />
    </article>
  );
}

export function ItemPurchase({
  item,
  store,
  onAddToCart,
}: Pick<TemplateProps, "store" | "onAddToCart"> & { item: PublicItem }) {
  const { orderingOpen } = usePublicOrderCart();
  const soldOut = isPublicItemSoldOut(item);
  const canOrder =
    orderingOpen &&
    (store.capabilities?.inStoreOrdering ||
      store.capabilities?.deliveryOrdering);
  return (
    <div className="atelier-purchase">
      <span className="atelier-price">
        {formatPrice(item.price, store.currency)}
      </span>
      {soldOut ? (
        <span className="atelier-sold-out">Agotado</span>
      ) : canOrder ? (
        <button
          type="button"
          onClick={() => onAddToCart(item)}
          aria-label={`Agregar ${item.name} al pedido`}
        >
          Agregar{" "}
          <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14">
            <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

function ServiceFooter({
  store,
  schedule,
}: Pick<TemplateProps, "store" | "schedule">) {
  const { latitude, longitude } = store.location ?? {};
  const validLocation =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180;
  return (
    <footer className="atelier-footer">
      <div className="atelier-footer-grid">
        <section>
          <h2>{store.name}</h2>
          {store.contact?.address && <p>{store.contact.address}</p>}
          <div className="atelier-contact">
            {store.contact?.whatsapp && (
              <a
                href={`https://wa.me/${store.contact.whatsapp.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
            )}
            {store.contact?.instagram && (
              <a
                href={`https://instagram.com/${store.contact.instagram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Instagram
              </a>
            )}
          </div>
        </section>
        {schedule.length > 0 && (
          <section>
            <h2>Horarios</h2>
            <dl>
              {schedule.map(([day, hours]) => (
                <div key={day}>
                  <dt>{formatDayName(day)}</dt>
                  <dd>
                    {hours === "closed" ? "Cerrado" : hours.replace("-", " – ")}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>
      {validLocation && (
        <section className="atelier-location">
          <h2>Ubicación</h2>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir en Google Maps
          </a>
          <LocationMap
            location={{ latitude, longitude }}
            logoUrl={store.logoUrl}
            className="h-72 w-full"
            title={`Ubicación de ${store.name}`}
          />
        </section>
      )}
    </footer>
  );
}
